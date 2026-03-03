'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Clock, FileText, Camera, ArrowLeft, Save, Trash2, Hash, Plus, X, Video, Calendar as CalendarIcon, Info, Briefcase, AlertTriangle, Users, Package, Euro, User as UserIcon, ImagePlus, PenTool, CheckCircle, Loader2, Sparkles, ScanLine, Trash } from 'lucide-react'
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

const MAX_IMAGE_WIDTH = 1600; // Augmentat per a millor OCR
const IMAGE_QUALITY = 0.7; 

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
  const [isSaving, setIsSaving] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);

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
        toast({ title: 'Text traduït al català' });
    } catch (e) {
        toast({ variant: 'destructive', title: 'Error en traduir' });
    } finally {
        setIsTranslating(false);
    }
  }

  const handleOCR = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsExtracting(true);
    toast({ title: 'Processant imatge...', description: 'Llegint contingut amb IA.' });
    
    try {
        const dataUrl = await resizeAndCompressImage(file);
        const res = await extractMaterialsFromPhoto({ photoDataUri: dataUrl });
        
        if (res.materials && res.materials.length > 0) {
            // Netegem línies buides actuals
            const currentFilledMaterials = materials.filter(m => m.description.trim() !== '' || m.unitPrice > 0);
            
            // Afegim els nous materials extrets
            setMaterials([...currentFilledMaterials, ...res.materials.map(m => ({ ...m, imageDataUrl: dataUrl }))]);
            
            toast({ 
                title: 'Lectura completada', 
                description: `S'han afegit ${res.materials.length} articles nous.` 
            });
        } else {
            toast({ 
                variant: 'destructive',
                title: 'No s\'han trobat dades', 
                description: "L'IA no ha pogut identificar articles clarament. Prova amb una altra foto." 
            });
        }
    } catch (e: any) {
        console.error("OCR Error:", e);
        toast({ 
            variant: 'destructive', 
            title: 'Error de lectura', 
            description: e.message || 'No s\'ha pogut processar la foto.' 
        });
    } finally {
        setIsExtracting(false);
        if (ocrInputRef.current) ocrInputRef.current.value = '';
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
        toast({ variant: 'destructive', title: 'Camps obligatoris' });
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
            description: description || "Servei finalitzat",
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
        toast({ title: "Registre desat", description: `El servei s'ha actualitzat correctament.` });
        router.push('/dashboard');
    } catch (error) {
        console.error(error);
        toast({ variant: 'destructive', title: 'Error al desar' });
    } finally {
        setIsSaving(false);
    }
  }

  if (isUserLoading || isLoading || isSaving) return <div className="p-8 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto" /><p className="mt-2">Processant informació...</p></div>
  if (!service) return <p>No s'ha trobat el servei.</p>
  if (showCamera) return <CameraCapture onCapture={(url, type) => { setMedia(prev => [...prev, { type, dataUrl: url }]); setShowCamera(false); }} onClose={() => setShowCamera(false)} />;

  return (
      <div className="max-w-2xl mx-auto space-y-8 pb-20">
        <Button variant="ghost" onClick={() => router.back()} className="mb-4 -ml-4">
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
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
                <CardTitle>Editar Registre de Servei</CardTitle>
                <CardDescription>Finalitza o modifica els detalls del treball.</CardDescription>
            </div>
            <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={handleTranslate} 
                disabled={isTranslating}
                className="bg-primary/5 text-primary border-primary/20 hover:bg-primary/10"
            >
                {isTranslating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                Traduir a Català
            </Button>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                  <Label>Data del Servei</Label>
                   <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal h-12">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date ? format(date, "PPP", { locale: ca }) : <span>Tria una data</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={date} onSelect={setDate} initialFocus locale={ca} /></PopoverContent>
                  </Popover>
                </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Arribada</Label>
                  <Input type="time" required value={startTime} onChange={(e) => setStartTime(e.target.value)} className="h-12" />
                </div>
                <div className="space-y-2">
                  <Label>Sortida</Label>
                  <Input type="time" required value={endTime} onChange={(e) => setEndTime(e.target.value)} className="h-12" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Client</Label>
                <div className="flex gap-2">
                    <Input value={customers?.find(c => c.id === customerId)?.name || 'Cap client assignat'} readOnly disabled className="bg-muted h-12 flex-grow" />
                    <Button type="button" variant="outline" onClick={() => setIsCustomerDialogOpen(true)} className="h-12 px-6">Seleccionar</Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Nom de l'Obra / Projecte</Label>
                <div className="relative">
                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Ex: Reforma Cuina" value={projectName} onChange={(e) => setProjectName(e.target.value)} className="pl-10 h-12" />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Descripció del Treball</Label>
                <Textarea placeholder="Què s'ha fet?" value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
              </div>

              <div className="space-y-2">
                <Label>Tasques Pendents</Label>
                <Textarea placeholder="Ha quedat alguna cosa pendent?" value={pendingTasks} onChange={(e) => setPendingTasks(e.target.value)} rows={2} className="border-amber-200 focus-visible:ring-amber-500" />
              </div>

              <div className="space-y-4 rounded-lg border p-4 bg-slate-50">
                  <div className="flex justify-between items-center">
                    <Label className="font-bold flex items-center gap-2"><Package className="h-4 w-4" /> Materials i Despeses</Label>
                    <div className="flex gap-2">
                        <input type="file" ref={ocrInputRef} onChange={handleOCR} accept="image/*" className="hidden" />
                        <Button type="button" variant="outline" size="sm" onClick={() => ocrInputRef.current?.click()} disabled={isExtracting} className="bg-cyan-50 text-cyan-700 border-cyan-200">
                            {isExtracting ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <ScanLine className="h-3 w-3 mr-2" />}
                            Llegir Albarà Foto
                        </Button>
                    </div>
                  </div>
                   <div className="space-y-3">
                      {materials.map((m, i) => (
                          <div key={i} className="flex gap-2 items-start bg-white p-2 rounded border shadow-sm">
                              <div className="flex-grow space-y-2">
                                <Input placeholder="Material" value={m.description} onChange={(e) => { const nm = [...materials]; nm[i].description = e.target.value; setMaterials(nm); }} className="border-none shadow-none font-medium h-8 px-1" />
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <Input type="number" placeholder="Cant." value={m.quantity} onChange={(e) => { const nm = [...materials]; nm[i].quantity = Number(e.target.value); setMaterials(nm); }} className="h-8 pl-1" />
                                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground uppercase">ut.</span>
                                    </div>
                                    <div className="relative flex-1">
                                        <Input type="number" placeholder="PVP" value={m.unitPrice} onChange={(e) => { const nm = [...materials]; nm[i].unitPrice = Number(e.target.value); setMaterials(nm); }} className="h-8 pl-1" />
                                        <Euro className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                                    </div>
                                </div>
                              </div>
                              <Button type="button" variant="ghost" size="icon" onClick={() => setMaterials(materials.filter((_, idx) => idx !== i))} className="text-destructive h-8 w-8"><Trash className="h-4 w-4" /></Button>
                          </div>
                      ))}
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={() => setMaterials([...materials, { description: '', quantity: 1, unitPrice: 0 }])} className="w-full h-10">+ Afegir Línia Manual</Button>
              </div>

              <div className="space-y-4 rounded-lg border p-4">
                  <div className="flex justify-between items-center">
                    <Label className="font-bold flex items-center gap-2"><Camera className="h-4 w-4" /> Galeria Fotogràfica</Label>
                    <div className="flex gap-2">
                        <input type="file" ref={galleryInputRef} onChange={handleGalleryUpload} accept="image/*" multiple className="hidden" />
                        <Button type="button" variant="outline" size="sm" onClick={() => setShowCamera(true)}><Camera className="h-3 w-3 mr-2" /> Càmera</Button>
                        <Button type="button" variant="outline" size="sm" onClick={() => galleryInputRef.current?.click()}><ImagePlus className="h-3 w-3 mr-2" /> Galeria</Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {media.map((m, i) => (
                          <div key={i} className="relative aspect-square rounded-md overflow-hidden border group">
                              {m.type === 'image' ? <Image src={m.dataUrl} alt={`Foto ${i}`} fill className="object-cover" /> : <div className="w-full h-full bg-black flex items-center justify-center"><Video className="text-white" /></div>}
                              <button type="button" onClick={() => setMedia(media.filter((_, idx) => idx !== i))} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"><X className="h-3 w-3" /></button>
                          </div>
                      ))}
                  </div>
              </div>

              <div className="space-y-4 rounded-lg border p-4 bg-primary/5 border-primary/10">
                  <Label className="font-black flex items-center gap-2 text-primary"><PenTool className="h-4 w-4" /> Signatura del Client</Label>
                  {customerSignatureDataUrl ? (
                    <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-primary/20 shadow-sm">
                        <div>
                            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Confirmat per:</p>
                            <p className="font-black text-slate-900">{customerSignatureName}</p>
                        </div>
                        <div className="relative h-16 w-32 border-l pl-3"><Image src={customerSignatureDataUrl} alt="Signature" fill style={{ objectFit: 'contain' }} /></div>
                        <Button type="button" variant="ghost" size="icon" onClick={() => setIsSignatureDialogOpen(true)} className="text-primary"><Edit className="h-4 w-4" /></Button>
                    </div>
                  ) : (
                    <Button type="button" variant="outline" onClick={() => setIsSignatureDialogOpen(true)} className="w-full h-14 border-dashed border-primary/40 text-primary font-bold hover:bg-primary/5">
                        <PenTool className="mr-2 h-5 w-5" /> RECOLLIR SIGNATURA ARA
                    </Button>
                  )}
              </div>

              <div className="flex justify-between items-center pt-6 border-t gap-4">
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button type="button" variant="ghost" className="text-destructive font-bold h-12"><Trash2 className="mr-2 h-4 w-4" /> Eliminar</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Segur que vols eliminar?</AlertDialogTitle><AlertDialogDescription>Aquesta acció esborrarà el registre de servei de forma permanent.</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Enrere</AlertDialogCancel>
                            <AlertDialogAction onClick={async () => { await deleteDoc(serviceDocRef!); router.push('/dashboard'); }} className="bg-destructive">Eliminar definitivament</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
                <Button type="submit" className="bg-primary px-10 h-12 text-lg font-black shadow-lg" disabled={isSaving}>
                    {isSaving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
                    DESAR REGISTRE
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
  );
}
