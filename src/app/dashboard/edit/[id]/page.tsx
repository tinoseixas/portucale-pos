
'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Clock, Camera, ArrowLeft, Save, Trash2, Plus, X, Video, Calendar as CalendarIcon, Briefcase, Users, Package, Euro, ImagePlus, PenTool, Loader2, Sparkles, Trash, Edit } from 'lucide-react'
import { useToast } from "@/hooks/use-toast"
import { useFirestore, useUser, useDoc, useMemoFirebase, useCollection } from '@/firebase'
import { doc, deleteDoc, collection, query, orderBy, setDoc, where, addDoc } from 'firebase/firestore'
import type { ServiceRecord, Customer, Employee, Project } from '@/lib/types'
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
import { CustomerSelectionDialog } from '@/components/CustomerSelectionDialog'
import { ServiceConfirmationDialog } from '@/components/ServiceConfirmationDialog'
import { translateToCatalan } from '@/ai/flows/translate-service-record'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

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

const MAX_IMAGE_WIDTH = 1200; 
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
  
  const [isSaving, setIsSaving] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);

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

  const [date, setDate] = useState<Date | undefined>()
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [description, setDescription] = useState('')
  const [projectName, setProjectName] = useState('');
  const [projectId, setProjectId] = useState('');
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

  const [isNewProjectDialogOpen, setIsNewProjectDialogOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [isCreatingProject, setIsCreatingProject] = useState(false);

  const projectsQuery = useMemoFirebase(() => {
      if (!firestore || !customerId || customerId === 'none') return null;
      // Simplificamos para evitar erro de índice composto
      return query(collection(firestore, 'projects'), where('customerId', '==', customerId));
  }, [firestore, customerId]);
  
  const { data: allProjects, isLoading: isLoadingProjects } = useCollection<Project>(projectsQuery);
  const activeProjects = useMemo(() => allProjects?.filter(p => p.status === 'active'), [allProjects]);

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
      setProjectId(service.projectId || '');
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

  const handleCreateProject = async () => {
      if (!firestore || !newProjectName.trim() || !customerId) return;
      setIsCreatingProject(true);
      try {
          const customer = customers?.find(c => c.id === customerId);
          const projectRef = await addDoc(collection(firestore, 'projects'), {
              name: newProjectName.trim(),
              customerId: customerId,
              customerName: customer?.name || 'N/A',
              status: 'active',
              createdAt: new Date().toISOString()
          });
          setProjectId(projectRef.id);
          setProjectName(newProjectName.trim());
          setIsNewProjectDialogOpen(false);
          setNewProjectName('');
          toast({ title: "Obra creada" });
      } catch (e) {
          toast({ variant: 'destructive', title: "Error" });
      } finally {
          setIsCreatingProject(false);
      }
  };

  const handleTranslate = async () => {
    if (!description && !pendingTasks) return;
    setIsTranslating(true);
    try {
        if (description) {
            const res = await translateToCatalan({ text: description });
            if (res && res.translatedText) setDescription(res.translatedText);
        }
        if (pendingTasks) {
            const res = await translateToCatalan({ text: pendingTasks });
            if (res && res.translatedText) setPendingTasks(res.translatedText);
        }
        toast({ title: 'Text corregit correctament' });
    } catch (e) {
        toast({ variant: 'destructive', title: 'Error traducció' });
    } finally {
        setIsTranslating(false);
    }
  }

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    for (let i = 0; i < files.length; i++) {
        try {
            const url = await resizeAndCompressImage(files[i]);
            setMedia(prev => [...prev, { type: 'image', dataUrl: url }]);
        } catch (err) {
            console.error("Error processing image", err);
        }
    }
    if (galleryInputRef.current) galleryInputRef.current.value = '';
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!firestore || !serviceDocRef || !date || !startTime || !endTime) {
        toast({ variant: 'destructive', title: 'Falten dades' });
        return;
    }

    setIsSaving(true);
    
    try {
        const selectedDateStr = format(date, 'yyyy-MM-dd')
        const arrivalDateTime = new Date(`${selectedDateStr}T${startTime}`).toISOString();
        const departureDateTime = new Date(`${selectedDateStr}T${endTime}`).toISOString();
        const selectedCustomer = customers?.find(c => c.id === customerId);
        const selectedProject = activeProjects?.find(p => p.id === projectId);
        const finalProjectName = selectedProject?.name || projectName;

        const updatedData: Partial<ServiceRecord> = {
            arrivalDateTime,
            departureDateTime,
            description: description || "Servei realitzat",
            projectName: finalProjectName.trim(),
            projectId: projectId || '',
            pendingTasks: pendingTasks || '',
            customerId: customerId || '',
            customerName: selectedCustomer?.name || (service?.customerName || ''),
            employeeId: employeeId || service?.employeeId || '',
            employeeName: service?.employeeName || '',
            serviceHourlyRate: typeof serviceHourlyRate === 'number' ? serviceHourlyRate : (service?.serviceHourlyRate || 0),
            media: media || [],
            materials: materials.filter(m => m.description.trim() !== ''),
            customerSignatureName: customerSignatureName || '',
            customerSignatureDataUrl: customerSignatureDataUrl || '',
            updatedAt: new Date().toISOString(),
        };

        await setDoc(serviceDocRef, updatedData, { merge: true });
        toast({ title: "Registre guardat" });
        router.push('/dashboard');
    } catch (error) {
        toast({ variant: 'destructive', title: 'Error al desar' });
    } finally {
        setIsSaving(false);
    }
  }

  if (isUserLoading || isLoading || isSaving) return <div className="p-12 text-center h-[80vh] flex flex-col items-center justify-center"><Loader2 className="h-16 w-16 animate-spin mx-auto text-primary" /><p className="mt-6 font-black uppercase tracking-widest text-slate-400">Processant...</p></div>
  if (!service) return <div className="p-12 text-center">Registre no trobat.</div>
  if (showCamera) return <CameraCapture onCapture={(url, type) => { setMedia(prev => [...prev, { type, dataUrl: url }]); setShowCamera(false); }} onClose={() => setShowCamera(false)} />;

  return (
      <div className="max-w-2xl mx-auto space-y-8 pb-24 px-4">
        <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => router.back()} className="font-bold">
                <ArrowLeft className="mr-2 h-4 w-4" /> Enrere
            </Button>
        </div>
        
        <CustomerSelectionDialog
          open={isCustomerDialogOpen}
          onOpenChange={setIsCustomerDialogOpen}
          customers={customers || []}
          onCustomerSelect={(c) => { setCustomerId(c.id); setProjectId('none'); setIsCustomerDialogOpen(false); }}
        />

        <ServiceConfirmationDialog
          open={isSignatureDialogOpen}
          onOpenChange={setIsSignatureDialogOpen}
          onConfirm={(n, s) => { setCustomerSignatureName(n); setCustomerSignatureDataUrl(s); }}
          initialName={customerSignatureName || customers?.find(c => c.id === customerId)?.name || ''}
        />
        
        <Card className="border-none shadow-2xl rounded-3xl overflow-hidden bg-white">
          <CardHeader className="bg-slate-900 text-white p-8">
            <div className="flex justify-between items-center">
                <div className="space-y-1">
                    <CardTitle className="text-3xl font-black uppercase tracking-tighter">Informe de Treball</CardTitle>
                    <CardDescription className="text-slate-400 font-medium">Tècnic: {service.employeeName || '...'}</CardDescription>
                </div>
                <div className="bg-primary/20 p-3 rounded-2xl">
                    <Briefcase className="h-8 w-8 text-primary" />
                </div>
            </div>
          </CardHeader>
          <CardContent className="pt-10 space-y-10">
            <form onSubmit={handleSubmit} className="space-y-10">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div className="space-y-3">
                    <Label className="font-black text-xs uppercase tracking-[0.2em] text-slate-400">Data</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-bold h-16 rounded-2xl border-2 bg-slate-50">
                            <CalendarIcon className="mr-3 h-6 w-6 text-primary" />
                            {date ? format(date, "PPP", { locale: ca }) : <span>Tria data</span>}
                        </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={date} onSelect={setDate} initialFocus locale={ca} /></PopoverContent>
                    </Popover>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                        <Label className="font-black text-xs uppercase tracking-[0.2em] text-slate-400">Inici</Label>
                        <Input type="time" required value={startTime} onChange={(e) => setStartTime(e.target.value)} className="h-16 rounded-2xl border-2 font-black text-xl text-center bg-slate-50" />
                    </div>
                    <div className="space-y-3">
                        <Label className="font-black text-xs uppercase tracking-[0.2em] text-slate-400">Final</Label>
                        <Input type="time" required value={endTime} onChange={(e) => setEndTime(e.target.value)} className="h-16 rounded-2xl border-2 font-black text-xl text-center bg-slate-50" />
                    </div>
                </div>
              </div>

              <div className="space-y-4">
                <Label className="font-black text-xs uppercase tracking-[0.2em] text-slate-400">Client i Obra</Label>
                <Button type="button" variant="outline" onClick={() => setIsCustomerDialogOpen(true)} className="h-16 w-full justify-start px-6 rounded-2xl border-2 font-black text-lg bg-slate-50 overflow-hidden text-slate-700">
                    <Users className="mr-4 h-6 w-6 text-primary shrink-0" />
                    <span className="truncate">{customers?.find(c => c.id === customerId)?.name || 'Selecciona un client'}</span>
                </Button>
                
                {customerId && customerId !== 'none' && (
                    <div className="flex gap-2">
                        <div className="flex-1">
                            <Select value={projectId} onValueChange={setProjectId}>
                                <SelectTrigger className="h-16 rounded-2xl border-2 font-black text-lg bg-slate-50">
                                    <SelectValue placeholder="Selecciona obra activa" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Cap obra seleccionada</SelectItem>
                                    {activeProjects?.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <Dialog open={isNewProjectDialogOpen} onOpenChange={setIsNewProjectDialogOpen}>
                            <DialogTrigger asChild>
                                <Button type="button" variant="outline" className="h-16 w-16 rounded-2xl border-2 bg-slate-50"><Plus className="h-6 w-6" /></Button>
                            </DialogTrigger>
                            <DialogContent className="rounded-3xl">
                                <DialogHeader>
                                    <DialogTitle>Nova Obra</DialogTitle>
                                    <DialogDescription>Afegeix una nova obra activa per a aquest client.</DialogDescription>
                                </DialogHeader>
                                <div className="py-4"><Input placeholder="Nom de l'obra" value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)} className="h-12 rounded-xl font-bold" /></div>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setIsNewProjectDialogOpen(false)}>Cancel·lar</Button>
                                    <Button onClick={handleCreateProject} disabled={isCreatingProject || !newProjectName.trim()} className="bg-primary font-bold">Crear</Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                )}
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between items-end mb-2">
                    <Label className="font-black text-xs uppercase tracking-[0.2em] text-slate-400">Treballs realitzats</Label>
                    <Button 
                        type="button" 
                        variant="outline" 
                        size="sm" 
                        onClick={handleTranslate} 
                        disabled={isTranslating}
                        className="bg-primary/5 text-primary border-primary/20 font-black uppercase text-[10px] tracking-widest h-8 px-4 rounded-xl"
                    >
                        {isTranslating ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <Sparkles className="h-3 w-3 mr-2" />}
                        Traduir (IA)
                    </Button>
                </div>
                <Textarea placeholder="Descriu la teva feina..." value={description} onChange={(e) => setDescription(e.target.value)} rows={5} className="rounded-3xl border-2 font-medium text-lg p-6 bg-slate-50" />
              </div>

              <div className="space-y-3">
                <Label className="font-black text-xs uppercase tracking-[0.2em] text-amber-600">Tasques pendents</Label>
                <Textarea placeholder="Falta alguna cosa?" value={pendingTasks} onChange={(e) => setPendingTasks(e.target.value)} rows={2} className="border-amber-200 bg-amber-50/50 rounded-2xl p-6 font-medium" />
              </div>

              {/* MATERIALS */}
              <div className="space-y-6 rounded-[2.5rem] border-2 border-slate-100 p-8 bg-slate-50/50 shadow-inner">
                  <Label className="font-black text-slate-900 flex items-center gap-3 uppercase tracking-tighter text-xl"><Package className="h-6 w-6 text-primary" /> Materials</Label>
                  <div className="space-y-4">
                      {materials.map((m, i) => (
                          <div key={i} className="bg-white p-6 rounded-3xl border-2 shadow-sm space-y-4">
                              <div className="flex gap-3">
                                <Input placeholder="Descripció" value={m.description} onChange={(e) => { const nm = [...materials]; nm[i].description = e.target.value; setMaterials(nm); }} className="border-none shadow-none font-black text-lg h-12 px-0 focus-visible:ring-0" />
                                <Button type="button" variant="ghost" size="icon" onClick={() => setMaterials(materials.filter((_, idx) => idx !== i))} className="text-red-400"><Trash className="h-6 w-6" /></Button>
                              </div>
                              <div className="grid grid-cols-2 gap-6">
                                <Input type="number" placeholder="Quant." value={m.quantity} onChange={(e) => { const nm = [...materials]; nm[i].quantity = Number(e.target.value); setMaterials(nm); }} className="h-16 rounded-2xl bg-slate-50 border-none font-black text-xl text-center" />
                                <div className="relative">
                                    <Input type="number" placeholder="PVP" value={m.unitPrice} onChange={(e) => { const nm = [...materials]; nm[i].unitPrice = Number(e.target.value); setMaterials(nm); }} className="h-16 pl-6 rounded-2xl bg-slate-50 border-none font-black text-xl" />
                                    <Euro className="absolute right-6 top-1/2 -translate-y-1/2 h-6 w-6 text-slate-400" />
                                </div>
                              </div>
                          </div>
                      ))}
                  </div>
                  <Button type="button" variant="ghost" onClick={() => setMaterials([...materials, { description: '', quantity: 1, unitPrice: 0 }])} className="w-full h-16 border-4 border-dashed border-slate-200 rounded-3xl font-black text-slate-400 uppercase text-xs">+ AFEGIR ARTICLE</Button>
              </div>

              {/* GALERIA */}
              <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <Label className="font-black text-slate-900 flex items-center gap-3 uppercase tracking-tighter text-xl"><Camera className="h-6 w-6 text-primary" /> Galeria</Label>
                    <div className="flex gap-2">
                        <input type="file" ref={galleryInputRef} onChange={handleGalleryUpload} accept="image/*" multiple className="hidden" />
                        <Button type="button" variant="outline" size="sm" onClick={() => setShowCamera(true)} className="font-black h-12 rounded-2xl px-6 border-2">Càmera</Button>
                        <Button type="button" variant="outline" size="sm" onClick={() => galleryInputRef.current?.click()} className="font-black h-12 rounded-2xl px-6 border-2">Arxius</Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
                      {media.map((m, i) => (
                          <div key={i} className="relative aspect-square rounded-[2rem] overflow-hidden border-4 border-white shadow-xl group">
                              {m.type === 'image' ? <Image src={m.dataUrl} alt={`Foto ${i}`} fill className="object-cover" /> : <div className="w-full h-full bg-slate-900 flex items-center justify-center"><Video className="text-white" /></div>}
                              <button type="button" onClick={() => setMedia(media.filter((_, idx) => idx !== i))} className="absolute top-3 right-3 bg-red-600 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 z-10"><X className="h-4 w-4" /></button>
                          </div>
                      ))}
                  </div>
              </div>

              {/* SIGNATURA */}
              <div className="space-y-4 rounded-[2.5rem] border-4 border-primary/5 p-8 bg-primary/5 shadow-inner">
                  <Label className="font-black flex items-center gap-3 text-primary uppercase tracking-tighter text-xl"><PenTool className="h-6 w-6" /> Firma</Label>
                  {customerSignatureDataUrl ? (
                    <div className="flex items-center justify-between bg-white p-6 rounded-3xl border-2 shadow-lg">
                        <div>
                            <p className="text-[10px] text-slate-400 uppercase font-black">Confirmat per:</p>
                            <p className="font-black text-slate-900 text-xl">{customerSignatureName}</p>
                        </div>
                        <div className="relative h-24 w-40"><Image src={customerSignatureDataUrl} alt="Signature" fill style={{ objectFit: 'contain' }} /></div>
                        <Button type="button" variant="ghost" size="icon" onClick={() => setIsSignatureDialogOpen(true)} className="text-primary rounded-2xl h-12 w-12"><Edit className="h-6 w-6" /></Button>
                    </div>
                  ) : (
                    <Button type="button" variant="outline" onClick={() => setIsSignatureDialogOpen(true)} className="w-full h-24 border-dashed border-4 border-primary/20 text-primary font-black shadow-sm rounded-3xl text-sm">
                        <PenTool className="mr-4 h-8 w-8" /> Recollir Signatura
                    </Button>
                  )}
              </div>

              <div className="flex flex-col sm:flex-row justify-between items-center pt-12 border-t-2 border-slate-100 gap-6">
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button type="button" variant="ghost" className="text-red-500 font-bold h-16 w-full sm:w-auto rounded-2xl px-8 transition-colors">Eliminar Registre</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="rounded-[2.5rem] p-10">
                        <AlertDialogHeader><AlertDialogTitle className="text-2xl font-black uppercase">Segur que vols eliminar?</AlertDialogTitle></AlertDialogHeader>
                        <AlertDialogFooter className="pt-6">
                            <AlertDialogCancel className="rounded-2xl h-14 font-bold border-2">Enrere</AlertDialogCancel>
                            <AlertDialogAction onClick={async () => { await deleteDoc(serviceDocRef!); router.push('/dashboard'); }} className="bg-red-600 rounded-2xl h-14 font-black uppercase tracking-widest">Eliminar definitivament</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
                <Button type="submit" className="bg-primary px-20 h-20 text-2xl font-black shadow-2xl uppercase tracking-tighter hover:scale-[1.02] transition-all rounded-3xl w-full sm:w-auto" disabled={isSaving}>
                    {isSaving ? <Loader2 className="mr-4 h-8 w-8 animate-spin" /> : <Save className="mr-4 h-8 w-8" />}
                    GUARDAR TREBALL
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
  );
}
