
'use client'

import { useEffect, useState, useMemo, useRef, Suspense } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Clock, Camera, ArrowLeft, Save, Trash2, Plus, X, Video, Calendar as CalendarIcon, Briefcase, Users, Package, Euro, ImagePlus, PenTool, Loader2, Trash, Edit, Utensils, Sparkles, ReceiptText } from 'lucide-react'
import { useToast } from "@/hooks/use-toast"
import { useFirestore, useUser, useDoc, useMemoFirebase, useCollection, updateDocumentNonBlocking } from '@/firebase'
import { doc, collection, query, orderBy, setDoc, where, addDoc, getDocs } from 'firebase/firestore'
import type { ServiceRecord, Customer, Employee, Project, ExtraCostItem, Article } from '@/lib/types'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { translateToCatalan } from '@/ai/flows/translate-service-record'

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
                if (!ctx) return reject(new Error('Error al canvas'));
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', IMAGE_QUALITY));
            };
            img.src = event.target?.result as string;
        };
        reader.readAsDataURL(file);
    });
}

function EditServiceContent() {
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
  const [hasInitialized, setHasInitialized] = useState(false);

  const recordOwnerId = searchParams.get('ownerId');

  const serviceDocRef = useMemoFirebase(() => {
    if (!recordOwnerId || !serviceId || !firestore) return null;
    return doc(firestore, `employees/${recordOwnerId}/serviceRecords`, serviceId);
  }, [firestore, recordOwnerId, serviceId]);
  
  const { data: service, isLoading } = useDoc<ServiceRecord>(serviceDocRef)
  
  const customersQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'customers'), orderBy('name', 'asc')) : null, [firestore]);
  const { data: customers } = useCollection<Customer>(customersQuery);

  const articlesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'articles'), orderBy('description', 'asc')) : null, [firestore]);
  const { data: articles } = useCollection<Article>(articlesQuery);

  const [date, setDate] = useState<Date | undefined>()
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [description, setDescription] = useState('')
  const [projectName, setProjectName] = useState('');
  const [projectId, setProjectId] = useState('');
  const [pendingTasks, setPendingTasks] = useState('');
  const [media, setMedia] = useState<MediaFile[]>([])
  const [materials, setMaterials] = useState<Material[]>([{ description: '', quantity: 1, unitPrice: 0 }]);
  const [additionalCosts, setAdditionalCosts] = useState<ExtraCostItem[]>([{ description: '', quantity: 1, unitPrice: 0 }]);
  const [showCamera, setShowCamera] = useState(false);
  const [customerId, setCustomerId] = useState<string>('');
  const [employeeId, setEmployeeId] = useState<string>('');
  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false)
  const [isSignatureDialogOpen, setIsSignatureDialogOpen] = useState(false)
  const [serviceHourlyRate, setServiceHourlyRate] = useState<number | ''>('');
  const [customerSignatureName, setCustomerSignatureName] = useState('');
  const [customerSignatureDataUrl, setCustomerSignatureDataUrl] = useState('');
  const [isLunchSubtracted, setIsLunchSubtracted] = useState(true);

  const [isNewProjectDialogOpen, setIsNewProjectDialogOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [isCreatingProject, setIsCreatingProject] = useState(false);

  const projectsQuery = useMemoFirebase(() => {
      if (!firestore || !customerId || customerId === 'none') return null;
      return query(collection(firestore, 'projects'), where('customerId', '==', customerId));
  }, [firestore, customerId]);
  
  const { data: allProjects } = useCollection<Project>(projectsQuery);
  
  const activeProjects = useMemo(() => {
      if (!allProjects) return [];
      const filtered = allProjects.filter(p => p.status === 'active');
      const seen = new Set();
      return filtered.filter(p => {
          const nameKey = p.name.toLowerCase().trim();
          if (seen.has(nameKey)) return false;
          seen.add(nameKey);
          return true;
      }).sort((a, b) => a.name.localeCompare(b.name));
  }, [allProjects]);

  useEffect(() => {
    if (service && !hasInitialized) {
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
      
      if (service.additionalCosts?.length) {
          setAdditionalCosts(service.additionalCosts);
      } else if (service.extraCosts) {
          setAdditionalCosts([{ description: 'Altres costos (llegat)', quantity: 1, unitPrice: service.extraCosts }]);
      } else {
          setAdditionalCosts([{ description: '', quantity: 1, unitPrice: 0 }]);
      }

      setCustomerSignatureName(service.customerSignatureName || '');
      setCustomerSignatureDataUrl(service.customerSignatureDataUrl || '');
      setServiceHourlyRate(service.serviceHourlyRate ?? '');
      setIsLunchSubtracted(service.isLunchSubtracted ?? true);
      setHasInitialized(true);
    }
  }, [service, hasInitialized]);

  useEffect(() => {
    if (projectId && projectId !== 'none') {
        const p = activeProjects.find(x => x.id === projectId);
        if (p) setProjectName(p.name);
    }
  }, [projectId, activeProjects]);

  const handleCreateProject = async () => {
      if (!firestore || !newProjectName.trim() || !customerId) return;
      setIsCreatingProject(true);
      try {
          const customer = customers?.find(c => c.id === customerId);
          const nameToSave = newProjectName.trim();
          const projectRef = await addDoc(collection(firestore, 'projects'), {
              name: nameToSave,
              customerId: customerId,
              customerName: customer?.name || 'N/A',
              status: 'active',
              createdAt: new Date().toISOString()
          });
          setProjectName(nameToSave);
          setProjectId(projectRef.id);
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
    if (!description.trim()) return;
    setIsTranslating(true);
    try {
        const result = await translateToCatalan({ text: description });
        setDescription(result.translatedText);
        toast({ title: "Traducció completada" });
    } catch (e) {
        console.error(e);
        toast({ variant: 'destructive', title: "Error en la traducció" });
    } finally {
        setIsTranslating(false);
    }
  };

  const handleGalleryUpload = async (input: React.ChangeEvent<HTMLInputElement>) => {
    const files = input.target.files;
    if (!files) return;
    for (let i = 0; i < files.length; i++) {
        try {
            const url = await resizeAndCompressImage(files[i]);
            setMedia(prev => [...prev, { type: 'image', dataUrl: url }]);
        } catch (err) {
            console.error("Error al processar la imatge", err);
        }
    }
    if (galleryInputRef.current) galleryInputRef.current.value = '';
  }

  const handleMaterialDescriptionChange = (index: number, value: string) => {
    const newMaterials = [...materials];
    newMaterials[index].description = value;
    
    // Si coincideix exactament amb un article, suggerir el preu
    const match = articles?.find(a => a.description.toLowerCase() === value.toLowerCase());
    if (match) {
        newMaterials[index].unitPrice = match.unitPrice;
    }
    
    setMaterials(newMaterials);
  };

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
        
        // Auto-save new articles to catalog
        const masterArticles = articles || [];
        for (const mat of materials) {
            if (mat.description.trim() !== '') {
                const exists = masterArticles.some(a => a.description.toLowerCase() === mat.description.trim().toLowerCase());
                if (!exists) {
                    const artRef = doc(collection(firestore, 'articles'));
                    await setDoc(artRef, {
                        id: artRef.id,
                        description: mat.description.trim(),
                        unitPrice: mat.unitPrice,
                        updatedAt: new Date().toISOString()
                    });
                }
            }
        }

        const updatedData: Partial<ServiceRecord> = {
            arrivalDateTime,
            departureDateTime,
            description: description || "Servei realitzat",
            projectName: projectName || "Obra sense nom",
            projectId: projectId || '',
            pendingTasks: pendingTasks || '',
            customerId: customerId || '',
            customerName: selectedCustomer?.name || (service?.customerName || ''),
            employeeId: employeeId || service?.employeeId || '',
            employeeName: service?.employeeName || '',
            serviceHourlyRate: typeof serviceHourlyRate === 'number' ? serviceHourlyRate : (service?.serviceHourlyRate || 0),
            media: media || [],
            materials: materials.filter(m => m.description.trim() !== ''),
            additionalCosts: additionalCosts.filter(c => c.description.trim() !== ''),
            customerSignatureName: customerSignatureName || '',
            customerSignatureDataUrl: customerSignatureDataUrl || '',
            updatedAt: new Date().toISOString(),
            isLunchSubtracted: isLunchSubtracted,
        };

        await setDoc(serviceDocRef, updatedData, { merge: true });
        toast({ title: "Registre desat i catàleg actualitzat" });
        router.push('/dashboard');
    } catch (error) {
        toast({ variant: 'destructive', title: 'Error al desar' });
    } finally {
        setIsSaving(false);
    }
  }

  const handleSoftDelete = () => {
    if (!serviceDocRef) return;
    updateDocumentNonBlocking(serviceDocRef, { deleted: true, deletedAt: new Date().toISOString() });
    toast({ title: "Enviat a la paperera", description: "Pots recuperar-lo si cal." });
    router.push('/dashboard');
  };

  if (isUserLoading || isLoading || isSaving) return <div className="p-12 text-center h-[80vh] flex flex-col items-center justify-center"><Loader2 className="h-16 w-16 animate-spin mx-auto text-primary" /><p className="mt-6 font-bold text-slate-400">Processant...</p></div>
  if (!service) return <div className="p-12 text-center">Registre no trobat.</div>
  if (showCamera) return <CameraCapture onCapture={(url, type) => { setMedia(prev => [...prev, { type, dataUrl: url }]); setShowCamera(false); }} onClose={() => setShowCamera(false)} />;

  return (
      <div className="max-w-2xl mx-auto space-y-8 pb-24 px-4">
        <datalist id="articles-master-list">
            {articles?.map(a => <option key={a.id} value={a.description}>{a.unitPrice.toFixed(2)} €</option>)}
        </datalist>

        <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => router.back()} className="font-bold">
                <ArrowLeft className="mr-2 h-4 w-4" /> Enrere
            </Button>
        </div>
        
        <CustomerSelectionDialog
          open={isCustomerDialogOpen}
          onOpenChange={setIsCustomerDialogOpen}
          customers={customers || []}
          onCustomerSelect={(c) => { setCustomerId(c.id); setProjectId('none'); setProjectName(''); setIsCustomerDialogOpen(false); }}
        />

        <ServiceConfirmationDialog
          open={isSignatureDialogOpen}
          onOpenChange={setIsSignatureDialogOpen}
          onConfirm={(n, s) => { setCustomerSignatureName(n); setCustomerSignatureDataUrl(s); }}
          initialName={customerSignatureName || customers?.find(c => c.id === customerId)?.name || ''}
        />
        
        <Card className="border-none shadow-2xl rounded-3xl overflow-hidden bg-white">
          <CardHeader className="bg-slate-900 text-white p-6 sm:p-8">
            <div className="flex justify-between items-center">
                <div className="space-y-1">
                    <CardTitle className="text-2xl font-black tracking-tight">Informe de treball</CardTitle>
                    <CardDescription className="text-slate-400 font-medium">Tècnic: {service.employeeName || '...'}</CardDescription>
                </div>
                <div className="bg-primary/20 p-3 rounded-2xl hidden sm:block">
                    <Briefcase className="h-8 w-8 text-primary" />
                </div>
            </div>
          </CardHeader>
          <CardContent className="pt-8 sm:pt-10 px-6 sm:px-10 space-y-10">
            <form onSubmit={handleSubmit} className="space-y-10">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div className="space-y-3">
                    <Label className="font-bold text-xs text-slate-400">Data del servei</Label>
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
                        <Label className="font-bold text-xs text-slate-400">Hora inici</Label>
                        <Input type="time" required value={startTime} onChange={(e) => setStartTime(e.target.value)} className="h-16 rounded-2xl border-2 font-black text-xl text-center bg-slate-50" />
                    </div>
                    <div className="space-y-3">
                        <Label className="font-bold text-xs text-slate-400">Hora final</Label>
                        <Input type="time" required value={endTime} onChange={(e) => setEndTime(e.target.value)} className="h-16 rounded-2xl border-2 font-black text-xl text-center bg-slate-50" />
                    </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 bg-slate-50 p-6 rounded-3xl border-2 border-dashed">
                  <div className="space-y-3">
                      <Label className="font-bold text-xs text-slate-400">Preu hora treballador (€/h)</Label>
                      <div className="relative">
                          <Input 
                              type="number" 
                              step="0.01"
                              value={serviceHourlyRate} 
                              onChange={(e) => setServiceHourlyRate(e.target.value === '' ? '' : Number(e.target.value))} 
                              className="h-14 pl-10 rounded-xl border-2 font-bold text-lg bg-white" 
                          />
                          <Euro className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-primary" />
                      </div>
                  </div>
                  <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                          <div className="bg-primary/10 p-2 rounded-xl text-primary">
                            <Utensils className="h-5 w-5" />
                          </div>
                          <div className="space-y-0.5">
                              <p className="font-bold text-sm">Descomptar hora de dinar</p>
                              <p className="text-[10px] text-slate-400 font-medium italic">Interval 13:00h - 14:00h</p>
                          </div>
                      </div>
                      <Switch checked={isLunchSubtracted} onCheckedChange={setIsLunchSubtracted} />
                  </div>
              </div>

              <div className="space-y-4">
                <Label className="font-bold text-xs text-slate-400">Client i obra associada</Label>
                <Button type="button" variant="outline" onClick={() => setIsCustomerDialogOpen(true)} className="h-16 w-full justify-start px-6 rounded-2xl border-2 font-black text-lg bg-slate-50 overflow-hidden text-slate-700">
                    <Users className="mr-4 h-6 w-6 text-primary shrink-0" />
                    <span className="truncate">{customers?.find(c => c.id === customerId)?.name || 'Selecciona un client'}</span>
                </Button>
                
                {customerId && customerId !== 'none' && (
                    <div className="flex gap-2">
                        <div className="flex-1">
                            <Select value={projectId} onValueChange={setProjectId}>
                                <SelectTrigger className="h-16 rounded-2xl border-2 font-bold text-lg bg-slate-50">
                                    <SelectValue placeholder="Selecciona una obra activa" />
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
                                    <DialogTitle>Nova obra</DialogTitle>
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
                <div className="flex justify-between items-center px-1">
                    <Label className="font-bold text-xs text-slate-400">Descripció dels treballs realitzats</Label>
                    <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm" 
                        onClick={handleTranslate} 
                        disabled={isTranslating || !description.trim()}
                        className="text-primary hover:text-primary/80 font-bold text-[10px] gap-1.5"
                    >
                        {isTranslating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                        Traduir amb IA
                    </Button>
                </div>
                <Textarea 
                    placeholder="Què s'ha fet avui?" 
                    value={description} 
                    onChange={(e) => setDescription(e.target.value)} 
                    rows={5} 
                    className="rounded-3xl border-2 font-medium text-lg p-6 bg-slate-50" 
                />
              </div>

              <div className="space-y-3">
                <Label className="font-bold text-xs text-amber-600">Tasques pendents de finalitzar</Label>
                <Textarea placeholder="Indica si falta alguna cosa per acabar..." value={pendingTasks} onChange={(e) => setPendingTasks(e.target.value)} rows={2} className="border-amber-200 bg-amber-50/50 rounded-2xl p-6 font-medium" />
              </div>

              <div className="space-y-6 rounded-[2.5rem] border-2 border-slate-100 p-6 sm:p-8 bg-slate-50/50 shadow-inner">
                  <Label className="font-black text-slate-900 flex items-center gap-3 text-xl"><Package className="h-6 w-6 text-primary" /> Materials utilitzats</Label>
                  <div className="space-y-4">
                      {materials.map((m, i) => (
                          <div key={i} className="bg-white p-6 rounded-3xl border-2 shadow-sm space-y-4">
                              <div className="flex gap-3">
                                <Input 
                                    placeholder="Descripció de l'article" 
                                    list="articles-master-list"
                                    value={m.description} 
                                    onChange={(e) => handleMaterialDescriptionChange(i, e.target.value)} 
                                    className="border-none shadow-none font-bold text-lg h-12 px-0 focus-visible:ring-0" 
                                />
                                <Button type="button" variant="ghost" size="icon" onClick={() => setMaterials(materials.filter((_, idx) => idx !== i))} className="text-red-400"><Trash className="h-6 w-6" /></Button>
                              </div>
                              <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-1">
                                    <Label className="text-[10px] text-slate-400 font-bold ml-1">Quantitat</Label>
                                    <Input type="number" placeholder="0" value={m.quantity} onChange={(e) => { const nm = [...materials]; nm[i].quantity = Number(e.target.value); setMaterials(nm); }} className="h-14 rounded-xl bg-slate-50 border-none font-bold text-lg text-center" />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[10px] text-slate-400 font-bold ml-1">Preu unitari</Label>
                                    <div className="relative">
                                        <Input type="number" placeholder="0.00" value={m.unitPrice} onChange={(e) => { const nm = [...materials]; nm[i].unitPrice = Number(e.target.value); setMaterials(nm); }} className="h-14 pl-10 rounded-xl bg-slate-50 border-none font-bold text-lg" />
                                        <Euro className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                    </div>
                                </div>
                              </div>
                          </div>
                      ))}
                  </div>
                  <Button type="button" variant="ghost" onClick={() => setMaterials([...materials, { description: '', quantity: 1, unitPrice: 0 }])} className="w-full h-16 border-4 border-dashed border-slate-200 rounded-3xl font-bold text-slate-400 uppercase text-xs">+ Afegir un altre article</Button>
              </div>

              <div className="space-y-6 rounded-[2.5rem] border-2 border-slate-100 p-6 sm:p-8 bg-slate-50/50 shadow-inner">
                  <Label className="font-black text-slate-900 flex items-center gap-3 text-xl"><ReceiptText className="h-6 w-6 text-primary" /> Altres costos del servei</Label>
                  <div className="space-y-4">
                      {additionalCosts.map((c, i) => (
                          <div key={i} className="bg-white p-6 rounded-3xl border-2 shadow-sm space-y-4">
                              <div className="flex gap-3">
                                <Input placeholder="Descripció (peatges, dietes, etc.)" value={c.description} onChange={(e) => { const nc = [...additionalCosts]; nc[i].description = e.target.value; setAdditionalCosts(nc); }} className="border-none shadow-none font-bold text-lg h-12 px-0 focus-visible:ring-0" />
                                <Button type="button" variant="ghost" size="icon" onClick={() => setAdditionalCosts(additionalCosts.filter((_, idx) => idx !== i))} className="text-red-400"><Trash className="h-6 w-6" /></Button>
                              </div>
                              <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-1">
                                    <Label className="text-[10px] text-slate-400 font-bold ml-1">Quantitat</Label>
                                    <Input type="number" placeholder="0" value={c.quantity} onChange={(e) => { const nc = [...additionalCosts]; nc[i].quantity = Number(e.target.value); setAdditionalCosts(nc); }} className="h-14 rounded-xl bg-slate-50 border-none font-bold text-lg text-center" />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[10px] text-slate-400 font-bold ml-1">Preu</Label>
                                    <div className="relative">
                                        <Input type="number" placeholder="0.00" value={c.unitPrice} onChange={(e) => { const nc = [...additionalCosts]; nc[i].unitPrice = Number(e.target.value); setAdditionalCosts(nc); }} className="h-14 pl-10 rounded-xl bg-slate-50 border-none font-bold text-lg" />
                                        <Euro className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                    </div>
                                </div>
                              </div>
                          </div>
                      ))}
                  </div>
                  <Button type="button" variant="ghost" onClick={() => setAdditionalCosts([...additionalCosts, { description: '', quantity: 1, unitPrice: 0 }])} className="w-full h-16 border-4 border-dashed border-slate-200 rounded-3xl font-bold text-slate-400 uppercase text-xs">+ Afegir concepte addicional</Button>
                  <p className="text-[10px] text-slate-400 font-bold italic pl-1">Aquests costos es sumaran al subtotal net del document de facturació.</p>
              </div>

              <div className="space-y-6">
                  <div className="flex justify-between items-center px-1">
                    <Label className="font-black text-slate-900 flex items-center gap-3 text-xl"><Camera className="h-6 w-6 text-primary" /> Galeria d'imatges</Label>
                    <div className="flex gap-2">
                        <input type="file" ref={galleryInputRef} onChange={handleGalleryUpload} accept="image/*" multiple className="hidden" />
                        <Button type="button" variant="outline" size="sm" onClick={() => setShowCamera(true)} className="font-bold h-12 rounded-2xl px-4 sm:px-6 border-2 text-[10px] sm:text-xs">Càmera</Button>
                        <Button type="button" variant="outline" size="sm" onClick={() => galleryInputRef.current?.click()} className="font-bold h-12 rounded-2xl px-4 sm:px-6 border-2 text-[10px] sm:text-xs">Pujar arxius</Button>
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

              <div className="space-y-4 rounded-[2.5rem] border-4 border-primary/5 p-6 sm:p-8 bg-primary/5 shadow-inner text-center sm:text-left">
                  <Label className="font-black flex items-center justify-center sm:justify-start gap-3 text-primary text-xl"><PenTool className="h-6 w-6" /> Signatura de conformitat</Label>
                  {customerSignatureDataUrl ? (
                    <div className="flex flex-col sm:flex-row items-center justify-between bg-white p-6 rounded-3xl border-2 shadow-lg gap-4">
                        <div className="text-center sm:text-left">
                            <p className="text-[10px] text-slate-400 font-bold uppercase">Confirmat per:</p>
                            <p className="font-black text-slate-900 text-xl">{customerSignatureName}</p>
                        </div>
                        <div className="relative h-24 w-40"><Image src={customerSignatureDataUrl} alt="Signatura" fill style={{ objectFit: 'contain' }} /></div>
                        <Button type="button" variant="ghost" size="icon" onClick={() => setIsSignatureDialogOpen(true)} className="text-primary rounded-2xl h-12 w-12"><Edit className="h-6 w-6" /></Button>
                    </div>
                  ) : (
                    <Button type="button" variant="outline" onClick={() => setIsSignatureDialogOpen(true)} className="w-full h-24 border-dashed border-4 border-primary/20 text-primary font-black shadow-sm rounded-3xl text-sm">
                        <PenTool className="mr-2 sm:mr-4 h-6 sm:h-8 w-6 sm:w-8" /> Recollir signatura del client
                    </Button>
                  )}
              </div>

              <div className="flex flex-col sm:flex-row justify-between items-center pt-12 border-t-2 border-slate-100 gap-6">
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button type="button" variant="ghost" className="text-red-500 font-bold h-16 w-full sm:w-auto rounded-2xl px-8 transition-colors">Eliminar registre</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="rounded-[2.5rem] p-10">
                        <AlertDialogHeader><AlertDialogTitle className="text-2xl font-black">Moure a la paperera?</AlertDialogTitle></AlertDialogHeader>
                        <AlertDialogDescription className="text-base font-medium">El registre no s'esborrarà definitivament, podràs recuperar-lo des de la secció de paperera.</AlertDialogDescription>
                        <AlertDialogFooter className="pt-6">
                            <AlertDialogCancel className="rounded-2xl h-14 font-bold border-2">Tornar</AlertDialogCancel>
                            <AlertDialogAction onClick={handleSoftDelete} className="bg-red-600 rounded-2xl h-14 font-black uppercase tracking-widest">Esborrar</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
                <Button type="submit" className="bg-primary px-10 sm:px-20 h-20 text-xl sm:text-2xl font-black shadow-2xl tracking-tighter hover:scale-[1.02] transition-all rounded-3xl w-full sm:w-auto" disabled={isSaving}>
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Guardar canvis
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
  );
}

export default function EditServicePage() {
    return (
        <Suspense fallback={<div className="p-12 text-center h-[80vh] flex flex-col items-center justify-center"><Loader2 className="h-16 w-16 animate-spin mx-auto text-primary" /><p className="mt-6 font-bold text-slate-400">Carregant...</p></div>}>
            <EditServiceContent />
        </Suspense>
    );
}
