'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Clock, FileText, Camera, ArrowLeft, Save, Trash2, Hash, Plus, X, Video, Calendar as CalendarIcon, Info, Briefcase, AlertTriangle, Users, Package, Euro, User as UserIcon, ImagePlus, PenTool, CheckCircle, Loader2, Sparkles, ScanLine, Trash, Scan } from 'lucide-react'
import { useToast } from "@/hooks/use-toast"
import { useFirestore, useUser, useDoc, useMemoFirebase, useCollection } from '@/firebase'
import { doc, deleteDoc, collection, query, getDocs, collectionGroup, orderBy, runTransaction, setDoc, where } from 'firebase/firestore'
import type { ServiceRecord, Customer, Employee, Albaran } from '@/lib/types'
import Image from 'next/image'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { CameraCapture } from '@/components/CameraCapture'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { format, parseISO, isValid } from 'date-fns'
import { ca } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { CustomerSelectionDialog } from '@/components/CustomerSelectionDialog'
import { ServiceConfirmationDialog } from '@/components/ServiceConfirmationDialog'
import { translateToCatalan } from '@/ai/flows/translate-service-record'
import { extractMaterialsFromPhoto } from '@/ai/flows/extract-materials'

type MediaFile = {
  type: 'image' | 'video';
  dataUrl: string;
};

type Material = {
    description: string;
    quantity: number;
    unitPrice: number;
    imageDataUrl?: string;
}

const MAX_IMAGE_WIDTH = 2000; // Resolució alta per a OCR
const IMAGE_QUALITY = 0.9; // Qualitat màxima per a IA

function resizeAndCompressImage(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = document.createElement('img');
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let { width, height } = img;
                if (width > MAX_IMAGE_WIDTH) {
                    height = Math.round((height * MAX_IMAGE_WIDTH) / width);
                    width = MAX_IMAGE_WIDTH;
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx) return reject(new Error('Canvas Error'));
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', IMAGE_QUALITY));
            };
            img.src = event.target?.result as string;
        };
        reader.readAsDataURL(file);
    });
}

export default function EditServicePage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const { user, isUserLoading } = useUser()
  const firestore = useFirestore()
  const serviceId = params.id as string
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const ocrInputRef = useRef<HTMLInputElement>(null);
  const lineOcrInputRef = useRef<HTMLInputElement>(null);
  
  const [isSaving, setIsSaving] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [activeLineIndex, setActiveLineIndex] = useState<number | null>(null);

  const recordOwnerId = searchParams.get('ownerId');

  const serviceDocRef = useMemoFirebase(() => {
    if (!recordOwnerId || !serviceId || !firestore) return null;
    return doc(firestore, `employees/${recordOwnerId}/serviceRecords`, serviceId);
  }, [firestore, recordOwnerId, serviceId]);
  
  const { data: service, isLoading } = useDoc<ServiceRecord>(serviceDocRef)
  
  const customersQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'customers'), orderBy('name', 'asc')) : null, [firestore]);
  const { data: customers } = useCollection<Customer>(customersQuery);

  const employeesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'employees')) : null, [firestore]);
  const { data: employees } = useCollection<Employee>(employeesQuery);

  const uniqueCustomers = useMemo(() => {
    if (!customers) return [];
    const seen = new Set();
    return customers.filter(c => {
      const nameKey = c.name.toLowerCase().trim();
      if (seen.has(nameKey)) return false;
      seen.add(nameKey);
      return true;
    });
  }, [customers]);

  const [date, setDate] = useState<Date | undefined>()
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [description, setDescription] = useState('')
  const [projectName, setProjectName] = useState('');
  const [pendingTasks, setPendingTasks] = useState('');
  const [media, setMedia] = useState<MediaFile[]>([])
  const [materials, setMaterials] = useState<Material[]>([{ description: '', quantity: 1, unitPrice: 0 }]);
  const [showCamera, setShowCamera] = useState(false);
  const [customerId, setCustomerId] = useState<string>('');
  const [employeeId, setEmployeeId] = useState<string>('');
  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false)
  const [isSignatureDialogOpen, setIsSignatureDialogOpen] = useState(false)
  const [serviceHourlyRate, setServiceHourlyRate] = useState<number | ''>('');
  const [customerSignatureName, setCustomerSignatureName] = useState('');
  const [customerSignatureDataUrl, setCustomerSignatureDataUrl] = useState('');

  useEffect(() => {
    if (service) {
      const arrival = parseISO(service.arrivalDateTime);
      const departure = parseISO(service.departureDateTime);
      if (isValid(arrival)) {
        setDate(arrival)
        setStartTime(format(arrival, 'HH:mm'))
      }
      if (isValid(departure) && arrival.getTime() !== departure.getTime()) {
        setEndTime(format(departure, 'HH:mm'))
      }
      setDescription(service.description !== "Servei en curs..." ? service.description : '')
      setProjectName(service.projectName || '');
      setPendingTasks(service.pendingTasks || '');
      setCustomerId(service.customerId || '');
      setEmployeeId(service.employeeId || '');
      setMedia(service.media || [])
      setMaterials(service.materials?.length ? service.materials : [{ description: '', quantity: 1, unitPrice: 0 }]);
      setCustomerSignatureName(service.customerSignatureName || '');
      setCustomerSignatureDataUrl(service.customerSignatureDataUrl || '');
      setServiceHourlyRate(service.serviceHourlyRate ?? '');
    }
  }, [service]);

  const handleTranslate = async () => {
    if (!description && !pendingTasks) return;
    setIsTranslating(true);
    try {
        if (description) {
            const res = await translateToCatalan({ text: description });
            setDescription(res.translatedText);
        }
        if (pendingTasks) {
            const res = await translateToCatalan({ text: pendingTasks });
            setPendingTasks(res.translatedText);
        }
        toast({ title: 'Text corregit al català' });
    } catch (e) {
        toast({ variant: 'destructive', title: 'Error en traducció' });
    } finally {
        setIsTranslating(false);
    }
  }

  const handleOCR = async (e: React.ChangeEvent<HTMLInputElement>, lineIndex: number | null = null) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsExtracting(true);
    toast({ title: lineIndex !== null ? 'Escanejant línia...' : 'Processant tiquet...', description: 'L\'IA està llegint les dades.' });
    
    try {
        const dataUrl = await resizeAndCompressImage(file);
        const res = await extractMaterialsFromPhoto({ 
            photoDataUri: dataUrl,
            isSingleItem: lineIndex !== null
        });
        
        if (res.materials && res.materials.length > 0) {
            if (lineIndex !== null) {
                // Actualitzar una línia específica
                const newMaterials = [...materials];
                const item = res.materials[0];
                newMaterials[lineIndex] = {
                    description: item.description,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    imageDataUrl: dataUrl
                };
                setMaterials(newMaterials);
                toast({ title: 'Línia actualitzada!' });
            } else {
                // Afegir nous materials detectats
                const currentFilledMaterials = materials.filter(m => m.description.trim() !== '' || m.unitPrice > 0);
                const newDetected = res.materials.map(m => ({ ...m, imageDataUrl: dataUrl }));
                setMaterials([...currentFilledMaterials, ...newDetected]);
                toast({ title: 'Tiquet processat', description: `S'han afegit ${res.materials.length} articles.` });
            }
        } else {
            toast({ variant: 'destructive', title: 'No s\'han detectat dades', description: 'Prova de fer la foto amb més llum i més a prop.' });
        }
    } catch (e: any) {
        console.error("OCR Error:", e);
        toast({ variant: 'destructive', title: 'Error de l\'IA', description: 'No s\'ha pogut processar la imatge.' });
    } finally {
        setIsExtracting(false);
        if (ocrInputRef.current) ocrInputRef.current.value = '';
        if (lineOcrInputRef.current) lineOcrInputRef.current.value = '';
        setActiveLineIndex(null);
    }
  }

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    for (let i = 0; i < files.length; i++) {
        const url = await resizeAndCompressImage(files[i]);
        setMedia(prev => [...prev, { type: 'image', dataUrl: url }]);
    }
    if (galleryInputRef.current) galleryInputRef.current.value = '';
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!firestore || !serviceDocRef || !date || !startTime || !endTime) {
        toast({ variant: 'destructive', title: 'Camps obligatoris buits' });
        return;
    }

    setIsSaving(true);
    const selectedDateStr = format(date, 'yyyy-MM-dd')
    const arrivalDateTime = new Date(`${selectedDateStr}T${startTime}`).toISOString();
    const departureDateTime = new Date(`${selectedDateStr}T${endTime}`).toISOString();
    const selectedCustomer = customers?.find(c => c.id === customerId);
    const selectedEmployee = employees?.find(e => e.id === employeeId);
    
    try {
        const employeeNameStr = selectedEmployee ? `${selectedEmployee.firstName} ${selectedEmployee.lastName}` : '';

        const updatedData: Partial<ServiceRecord> = {
            arrivalDateTime,
            departureDateTime,
            description: description || "Servei realitzat",
            projectName: projectName.trim(),
            pendingTasks,
            customerId,
            customerName: selectedCustomer?.name || '',
            employeeId: employeeId,
            employeeName: employeeNameStr,
            serviceHourlyRate: Number(serviceHourlyRate) || undefined,
            media,
            materials: materials.filter(m => m.description.trim() !== ''),
            customerSignatureName,
            customerSignatureDataUrl,
            status: service?.status || 'pendent',
            updatedAt: new Date().toISOString(),
        };

        await setDoc(serviceDocRef, updatedData, { merge: true });
        toast({ title: "Registre guardat", description: `S'ha actualitzat el registre correctament.` });
        router.push('/dashboard');
    } catch (error) {
        console.error(error);
        toast({ variant: 'destructive', title: 'Error al desar' });
    } finally {
        setIsSaving(false);
    }
  }

  if (isUserLoading || isLoading || isSaving) return <div className="p-12 text-center"><Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" /><p className="mt-4 font-black uppercase tracking-widest text-slate-400">Processant dades...</p></div>
  if (!service) return <p>Registre no trobat.</p>
  if (showCamera) return <CameraCapture onCapture={(url, type) => { setMedia(prev => [...prev, { type, dataUrl: url }]); setShowCamera(false); }} onClose={() => setShowCamera(false)} />;

  return (
      <div className="max-w-2xl mx-auto space-y-8 pb-24 px-4">
        <Button variant="ghost" onClick={() => router.back()} className="mb-2 -ml-4 font-bold">
          <ArrowLeft className="mr-2 h-4 w-4" /> Tornar
        </Button>
        
        <CustomerSelectionDialog
          open={isCustomerDialogOpen}
          onOpenChange={setIsCustomerDialogOpen}
          customers={uniqueCustomers}
          onCustomerSelect={(c) => { setCustomerId(c.id); setIsCustomerDialogOpen(false); }}
        />

        <ServiceConfirmationDialog
          open={isSignatureDialogOpen}
          onOpenChange={setIsSignatureDialogOpen}
          onConfirm={(n, s) => { setCustomerSignatureName(n); setCustomerSignatureDataUrl(s); }}
          initialName={customerSignatureName || customers?.find(c => c.id === customerId)?.name || ''}
        />
        
        <Card className="border-none shadow-2xl rounded-3xl overflow-hidden">
          <CardHeader className="bg-slate-900 text-white p-6">
            <div className="flex justify-between items-center">
                <div>
                    <CardTitle className="text-2xl font-black uppercase tracking-tighter">Detall del Servei</CardTitle>
                    <CardDescription className="text-slate-400">Técnico: {service.employeeName || 'No assignat'}</CardDescription>
                </div>
                <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={handleTranslate} 
                    disabled={isTranslating}
                    className="bg-white/10 text-white border-white/20 hover:bg-white/20 font-bold"
                >
                    {isTranslating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2 text-yellow-400" />}
                    Traduir IA
                </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-8 space-y-8">
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Label className="font-black text-xs uppercase tracking-widest text-slate-500">Data del Treball</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-bold h-14 rounded-xl border-2">
                            <CalendarIcon className="mr-2 h-5 w-5 text-primary" />
                            {date ? format(date, "PPP", { locale: ca }) : <span>Tria data</span>}
                        </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={date} onSelect={setDate} initialFocus locale={ca} /></PopoverContent>
                    </Popover>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label className="font-black text-xs uppercase tracking-widest text-slate-500">Entrada</Label>
                        <Input type="time" required value={startTime} onChange={(e) => setStartTime(e.target.value)} className="h-14 rounded-xl border-2 font-bold text-lg" />
                    </div>
                    <div className="space-y-2">
                        <Label className="font-black text-xs uppercase tracking-widest text-slate-500">Sortida</Label>
                        <Input type="time" required value={endTime} onChange={(e) => setEndTime(e.target.value)} className="h-14 rounded-xl border-2 font-bold text-lg" />
                    </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="font-black text-xs uppercase tracking-widest text-slate-500">Client i Obra</Label>
                <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsCustomerDialogOpen(true)} className="h-14 flex-grow justify-start px-4 rounded-xl border-2 font-bold text-left overflow-hidden">
                        <Users className="mr-2 h-5 w-5 text-primary shrink-0" />
                        <span className="truncate">{customers?.find(c => c.id === customerId)?.name || 'Seleccionar Client'}</span>
                    </Button>
                </div>
                <div className="relative mt-2">
                    <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <Input placeholder="Nom de l'Obra / Projecte" value={projectName} onChange={(e) => setProjectName(e.target.value)} className="pl-12 h-14 rounded-xl border-2 font-bold" />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="font-black text-xs uppercase tracking-widest text-slate-500">Descripció de la feina</Label>
                <Textarea placeholder="Què has fet avui?" value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className="rounded-2xl border-2 font-medium text-base p-4" />
              </div>

              <div className="space-y-2">
                <Label className="font-black text-xs uppercase tracking-widest text-amber-600">Tasques Pendents</Label>
                <Textarea placeholder="Alguna cosa pendent per demà?" value={pendingTasks} onChange={(e) => setPendingTasks(e.target.value)} rows={2} className="border-amber-200 focus-visible:ring-amber-500 bg-amber-50/30 rounded-2xl p-4 font-medium" />
              </div>

              {/* MATERIALS SECTION */}
              <div className="space-y-4 rounded-3xl border-2 border-slate-100 p-6 bg-slate-50 shadow-inner">
                  <div className="flex justify-between items-center mb-2">
                    <Label className="font-black text-slate-900 flex items-center gap-2 uppercase tracking-tighter text-lg"><Package className="h-5 w-5 text-primary" /> Materials i Despeses</Label>
                    <div className="flex gap-2">
                        <input type="file" ref={ocrInputRef} onChange={(e) => handleOCR(e)} accept="image/*" className="hidden" />
                        <Button type="button" variant="outline" size="sm" onClick={() => ocrInputRef.current?.click()} disabled={isExtracting} className="bg-primary text-white hover:bg-primary/90 border-none shadow-lg font-black h-10 px-4 rounded-xl">
                            {isExtracting && activeLineIndex === null ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ScanLine className="h-4 w-4 mr-2" />}
                            LLEGIR TIQUET
                        </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                      <input type="file" ref={lineOcrInputRef} onChange={(e) => handleOCR(e, activeLineIndex)} accept="image/*" className="hidden" />
                      {materials.map((m, i) => (
                          <div key={i} className="bg-white p-4 rounded-2xl border-2 shadow-sm space-y-3 transition-all hover:border-primary/40 group">
                              <div className="flex gap-2">
                                <Input placeholder="Descripció article" value={m.description} onChange={(e) => { const nm = [...materials]; nm[i].description = e.target.value; setMaterials(nm); }} className="border-none shadow-none font-bold text-base h-10 px-0 focus-visible:ring-0" />
                                <Button type="button" variant="ghost" size="icon" onClick={() => { setActiveLineIndex(i); lineOcrInputRef.current?.click(); }} className="h-10 w-10 text-cyan-600 hover:bg-cyan-50 rounded-xl">
                                    {isExtracting && activeLineIndex === i ? <Loader2 className="h-5 w-5 animate-spin" /> : <Scan className="h-5 w-5" />}
                                </Button>
                                <Button type="button" variant="ghost" size="icon" onClick={() => setMaterials(materials.filter((_, idx) => idx !== i))} className="text-red-400 h-10 w-10 hover:bg-red-50 rounded-xl"><Trash className="h-5 w-5" /></Button>
                              </div>
                              <div className="flex gap-4">
                                <div className="relative flex-1">
                                    <Input type="number" placeholder="Quant." value={m.quantity} onChange={(e) => { const nm = [...materials]; nm[i].quantity = Number(e.target.value); setMaterials(nm); }} className="h-12 pl-4 rounded-xl bg-slate-50 border-none font-bold" />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 uppercase font-black">uts.</span>
                                </div>
                                <div className="relative flex-1">
                                    <Input type="number" placeholder="Preu" value={m.unitPrice} onChange={(e) => { const nm = [...materials]; nm[i].unitPrice = Number(e.target.value); setMaterials(nm); }} className="h-12 pl-4 rounded-xl bg-slate-50 border-none font-bold" />
                                    <Euro className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                </div>
                              </div>
                              {m.imageDataUrl && <div className="relative h-12 w-20 rounded-lg overflow-hidden border mt-1"><Image src={m.imageDataUrl} alt="Snippet" fill className="object-cover" /></div>}
                          </div>
                      ))}
                  </div>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setMaterials([...materials, { description: '', quantity: 1, unitPrice: 0 }])} className="w-full h-12 border-2 border-dashed border-slate-300 hover:bg-white rounded-2xl font-black text-slate-400 uppercase text-xs">+ AFEGIR ARTICLE</Button>
              </div>

              {/* MEDIA SECTION */}
              <div className="space-y-4 rounded-3xl border-2 border-slate-100 p-6 bg-white shadow-sm">
                  <div className="flex justify-between items-center">
                    <Label className="font-black text-slate-900 flex items-center gap-2 uppercase tracking-tighter text-lg"><Camera className="h-5 w-5 text-primary" /> Galeria Fotos</Label>
                    <div className="flex gap-2">
                        <input type="file" ref={galleryInputRef} onChange={handleGalleryUpload} accept="image/*" multiple className="hidden" />
                        <Button type="button" variant="outline" size="sm" onClick={() => setShowCamera(true)} className="font-bold h-10 rounded-xl px-4 border-2"><Camera className="h-4 w-4 mr-2" /> Càmera</Button>
                        <Button type="button" variant="outline" size="sm" onClick={() => galleryInputRef.current?.click()} className="font-bold h-10 rounded-xl px-4 border-2"><ImagePlus className="h-4 w-4 mr-2" /> Galeria</Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
                      {media.map((m, i) => (
                          <div key={i} className="relative aspect-square rounded-2xl overflow-hidden border-2 border-slate-100 group shadow-md">
                              {m.type === 'image' ? <Image src={m.dataUrl} alt={`Foto ${i}`} fill className="object-cover" /> : <div className="w-full h-full bg-slate-900 flex items-center justify-center"><Video className="text-white" /></div>}
                              <button type="button" onClick={() => setMedia(media.filter((_, idx) => idx !== i))} className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-xl"><X className="h-4 w-4" /></button>
                          </div>
                      ))}
                  </div>
              </div>

              {/* SIGNATURE SECTION */}
              <div className="space-y-4 rounded-3xl border-2 border-primary/10 p-6 bg-primary/5">
                  <Label className="font-black flex items-center gap-2 text-primary uppercase tracking-tighter text-lg"><PenTool className="h-5 w-5" /> Signatura del Client</Label>
                  {customerSignatureDataUrl ? (
                    <div className="flex items-center justify-between bg-white p-5 rounded-2xl border-2 shadow-sm">
                        <div>
                            <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">Confirmat per:</p>
                            <p className="font-black text-slate-900 text-lg">{customerSignatureName}</p>
                        </div>
                        <div className="relative h-20 w-32 border-l-2 pl-4"><Image src={customerSignatureDataUrl} alt="Signature" fill style={{ objectFit: 'contain' }} /></div>
                        <Button type="button" variant="ghost" size="icon" onClick={() => setIsSignatureDialogOpen(true)} className="text-primary hover:bg-primary/5 rounded-xl"><Edit className="h-5 w-5" /></Button>
                    </div>
                  ) : (
                    <Button type="button" variant="outline" onClick={() => setIsSignatureDialogOpen(true)} className="w-full h-20 border-dashed border-2 border-primary/40 text-primary font-black hover:bg-primary/10 transition-all uppercase tracking-widest shadow-sm rounded-2xl">
                        <PenTool className="mr-3 h-7 w-7" /> Recollir Signatura Ara
                    </Button>
                  )}
              </div>

              <div className="flex flex-col sm:flex-row justify-between items-center pt-10 border-t gap-4">
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button type="button" variant="ghost" className="text-red-500 font-bold h-14 w-full sm:w-auto hover:bg-red-50 rounded-2xl"><Trash2 className="mr-2 h-5 w-5" /> Eliminar Registre</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="rounded-3xl">
                        <AlertDialogHeader><AlertDialogTitle>Segur que vols eliminar?</AlertDialogTitle><AlertDialogDescription>Aquesta acció esborrarà el registre de servei de forma permanent.</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel className="rounded-xl">Enrere</AlertDialogCancel>
                            <AlertDialogAction onClick={async () => { await deleteDoc(serviceDocRef!); router.push('/dashboard'); }} className="bg-red-600 rounded-xl">Eliminar definitivament</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
                <Button type="submit" className="bg-primary px-16 h-16 text-xl font-black shadow-2xl uppercase tracking-tighter hover:scale-[1.03] transition-all rounded-2xl w-full sm:w-auto" disabled={isSaving}>
                    {isSaving ? <Loader2 className="mr-3 h-7 w-7 animate-spin" /> : <Save className="mr-3 h-7 w-7" />}
                    GUARDAR TREBALL
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
  );
}
