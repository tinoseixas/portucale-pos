
'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Clock, FileText, Camera, ArrowLeft, Save, Trash2, Hash, Plus, X, Video, Calendar as CalendarIcon, Info, Briefcase, AlertTriangle, Users, Package, Euro, User as UserIcon, ImagePlus, PenTool, CheckCircle, Loader2 } from 'lucide-react'
import { useToast } from "@/hooks/use-toast"
import { useFirestore, useUser, useDoc, useMemoFirebase, useCollection } from '@/firebase'
import { doc, deleteDoc, collection, query, getDocs, collectionGroup, orderBy, runTransaction, setDoc } from 'firebase/firestore'
import type { ServiceRecord, Customer, Employee, Albaran } from '@/lib/types'
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { calculateTotalAmount } from '@/lib/calculations'

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

const MAX_IMAGE_WIDTH = 1024;
const IMAGE_QUALITY = 0.6; // Optimitzat per pes

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
  const materialImageInputRef = useRef<HTMLInputElement>(null);
  const [selectedMaterialIndex, setSelectedMaterialIndex] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

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
  const [pendingTasks, setPendingTasks] = useState('');
  const [media, setMedia] = useState<MediaFile[]>([])
  const [albarans, setAlbarans] = useState<string[]>(['']);
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
      setAlbarans(service.albarans?.length > 0 ? service.albarans : [''])
      setMaterials(service.materials?.length ? service.materials : [{ description: '', quantity: 1, unitPrice: 0 }]);
      setCustomerSignatureName(service.customerSignatureName || '');
      setCustomerSignatureDataUrl(service.customerSignatureDataUrl || '');
      setServiceHourlyRate(service.serviceHourlyRate ?? '');
    }
  }, [service]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
        const files = Array.from(e.target.files);
        toast({ title: 'Processant...' });
        const newFiles = await Promise.all(files.map(async f => ({ type: 'image' as const, dataUrl: await resizeAndCompressImage(f) })));
        setMedia(prev => [...prev, ...newFiles]);
    }
  };

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
        let finalAlbaranNumber = service?.albaranNumber;

        // Assignar número d'albarà si no en té
        if (!finalAlbaranNumber) {
            const counterRef = doc(firestore, "counters", "albarans");
            finalAlbaranNumber = await runTransaction(firestore, async (transaction) => {
                const counterDoc = await transaction.get(counterRef);
                const nextNum = (counterDoc.exists() ? counterDoc.data().lastNumber : 0) + 1;
                transaction.set(counterRef, { lastNumber: nextNum }, { merge: true });
                return nextNum;
            });
        }

        const employeeNameStr = selectedEmployee ? `${selectedEmployee.firstName} ${selectedEmployee.lastName}` : '';

        const updatedData: Partial<ServiceRecord> = {
            arrivalDateTime,
            departureDateTime,
            description: description || "Servei finalitzat",
            projectName,
            pendingTasks,
            customerId,
            customerName: selectedCustomer?.name || '',
            employeeId: employeeId,
            employeeName: employeeNameStr,
            serviceHourlyRate: Number(serviceHourlyRate) || undefined,
            media,
            albarans: albarans.filter(a => a.trim() !== ''),
            materials: materials.filter(m => m.description.trim() !== ''),
            customerSignatureName,
            customerSignatureDataUrl,
            albaranNumber: finalAlbaranNumber,
            status: service?.status || 'pendent',
            updatedAt: new Date().toISOString(),
        };

        // 1. Actualitzar el registre de servei
        await setDoc(serviceDocRef, updatedData, { merge: true });

        // 2. Crear/Actualitzar l'Albarà 1:1
        const { totalGeneral } = calculateTotalAmount([ { ...updatedData, id: serviceId } as ServiceRecord ], employees || []);
        const albaranRef = doc(firestore, 'albarans', serviceId);
        const albaranData: Albaran = {
            id: serviceId,
            albaranNumber: finalAlbaranNumber,
            createdAt: service?.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            customerId: customerId,
            customerName: selectedCustomer?.name || 'N/A',
            projectName: projectName || 'Sense nom',
            serviceRecordIds: [serviceId],
            totalAmount: totalGeneral,
            status: (service?.status as any) || 'pendent',
            employeeId: employeeId,
            employeeName: employeeNameStr,
        };
        await setDoc(albaranRef, albaranData);

        toast({ title: "Desat correctament", description: `Albarà #${finalAlbaranNumber} actualitzat.` });
        router.push('/dashboard');
    } catch (error) {
        console.error(error);
        toast({ variant: 'destructive', title: 'Error al desar' });
    } finally {
        setIsSaving(false);
    }
  }

  if (isUserLoading || isLoading || isSaving) return <div className="p-8 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto" /><p className="mt-2">Desant dades i generant albarà...</p></div>
  if (!service) return <p>No s'ha trobat el servei.</p>
  if (showCamera) return <CameraCapture onCapture={(url, type) => { setMedia(prev => [...prev, { type, dataUrl: url }]); setShowCamera(false); }} onClose={() => setShowCamera(false)} />;

  return (
      <div className="max-w-2xl mx-auto space-y-8">
        <Button variant="ghost" onClick={() => router.back()} className="mb-4 -ml-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Tornar
        </Button>
        
        <CustomerSelectionDialog
          open={isCustomerDialogOpen}
          onOpenChange={setIsCustomerDialogOpen}
          customers={customers || []}
          onCustomerSelect={(c) => { setCustomerId(c.id); setIsCustomerDialogOpen(false); }}
        />

        <ServiceConfirmationDialog
          open={isSignatureDialogOpen}
          onOpenChange={setIsSignatureDialogOpen}
          onConfirm={(n, s) => { setCustomerSignatureName(n); setCustomerSignatureDataUrl(s); }}
          initialName={customerSignatureName || customers?.find(c => c.id === customerId)?.name || ''}
        />
        
        <Card>
          <CardHeader>
            <CardTitle>Editar Servei {service.albaranNumber ? `#${service.albaranNumber}` : ''}</CardTitle>
            <CardDescription>Cada servei genera automàticament el seu propi albarà.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                  <Label>Data del Servei</Label>
                   <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
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
                  <Input type="time" required value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Sortida</Label>
                  <Input type="time" required value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Client</Label>
                <div className="flex gap-2">
                    <Input value={customers?.find(c => c.id === customerId)?.name || 'Cap client assignat'} readOnly disabled className="bg-muted" />
                    <Button type="button" variant="outline" onClick={() => setIsCustomerDialogOpen(true)}>Seleccionar</Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Nom de l'Obra</Label>
                <Input placeholder="Ex: Reforma Cuina" value={projectName} onChange={(e) => setProjectName(e.target.value)} />
              </div>
              
              <div className="space-y-2">
                <Label>Descripció del Treball</Label>
                <Textarea placeholder="Què s'ha fet avui?" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
              </div>

              <div className="space-y-4 rounded-lg border p-4">
                  <Label className="font-bold flex items-center gap-2"><Package className="h-4 w-4" /> Materials</Label>
                   <div className="space-y-3">
                      {materials.map((m, i) => (
                          <div key={i} className="flex gap-2 items-center">
                              <Input placeholder="Material" value={m.description} onChange={(e) => { const nm = [...materials]; nm[i].description = e.target.value; setMaterials(nm); }} className="flex-grow" />
                              <Input type="number" placeholder="Cant." value={m.quantity} onChange={(e) => { const nm = [...materials]; nm[i].quantity = Number(e.target.value); setMaterials(nm); }} className="w-20" />
                              <Button type="button" variant="ghost" size="icon" onClick={() => setMaterials(materials.filter((_, idx) => idx !== i))}><X className="h-4 w-4" /></Button>
                          </div>
                      ))}
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={() => setMaterials([...materials, { description: '', quantity: 1, unitPrice: 0 }])}>+ Afegir Línia</Button>
              </div>

              <div className="space-y-4 rounded-lg border p-4 bg-muted/20">
                  <Label className="font-bold flex items-center gap-2"><PenTool className="h-4 w-4" /> Signatura</Label>
                  {customerSignatureDataUrl ? (
                    <div className="space-y-2">
                        <p className="text-xs">Signat per: <strong>{customerSignatureName}</strong></p>
                        <div className="relative h-20 w-40 border bg-white rounded"><Image src={customerSignatureDataUrl} alt="Signature" fill style={{ objectFit: 'contain' }} /></div>
                        <Button type="button" variant="ghost" size="sm" onClick={() => setIsSignatureDialogOpen(true)}>Canviar</Button>
                    </div>
                  ) : (
                    <Button type="button" variant="outline" onClick={() => setIsSignatureDialogOpen(true)} className="w-full">Recollir Signatura</Button>
                  )}
              </div>

              <div className="flex justify-between items-center pt-4">
                <Button type="button" variant="destructive" onClick={async () => { if(confirm('Segur?')) { await deleteDoc(serviceDocRef!); router.push('/dashboard'); } }}><Trash2 className="mr-2 h-4 w-4" /> Eliminar</Button>
                <Button type="submit" className="bg-primary px-8" disabled={isSaving}><Save className="mr-2 h-4 w-4" /> {isSaving ? 'Desant...' : 'Desar Canvis'}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
  );
}
