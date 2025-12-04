'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Clock, FileText, Camera, ArrowLeft, Save, Trash2, Hash, Plus, X, Video, Calendar as CalendarIcon, Info, Briefcase, AlertTriangle, Users, Package, Euro, MapPin, User as UserIcon, ImagePlus } from 'lucide-react'
import { useToast } from "@/hooks/use-toast"
import { useFirestore, useUser, useDoc, useMemoFirebase, useCollection } from '@/firebase'
import { doc, deleteDoc, collection, query, getDocs, collectionGroup, orderBy } from 'firebase/firestore'
import type { ServiceRecord, Customer, Employee } from '@/lib/types'
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
import { format, parseISO, isValid, differenceInMinutes } from 'date-fns'
import { ca } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { CustomerSelectionDialog } from '@/components/CustomerSelectionDialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

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
const MAX_IMAGE_HEIGHT = 1024;
const IMAGE_QUALITY = 0.85; // 85% JPEG quality

function resizeAndCompressImage(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = document.createElement('img');
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let { width, height } = img;

                if (width > height) {
                    if (width > MAX_IMAGE_WIDTH) {
                        height = Math.round((height * MAX_IMAGE_WIDTH) / width);
                        width = MAX_IMAGE_WIDTH;
                    }
                } else {
                    if (height > MAX_IMAGE_HEIGHT) {
                        width = Math.round((width * MAX_IMAGE_HEIGHT) / height);
                        height = MAX_IMAGE_HEIGHT;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    return reject(new Error('Could not get canvas context'));
                }
                ctx.drawImage(img, 0, 0, width, height);

                resolve(canvas.toDataURL('image/jpeg', IMAGE_QUALITY));
            };
            img.onerror = reject;
            img.src = event.target?.result as string;
        };
        reader.onerror = reject;
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

  // Get the ownerId from the query parameter to build the direct path
  const recordOwnerId = searchParams.get('ownerId');

  const serviceDocRef = useMemoFirebase(() => {
    // Wait until all required IDs are available
    if (!recordOwnerId || !serviceId || !firestore) return null;
    return doc(firestore, `employees/${recordOwnerId}/serviceRecords`, serviceId);
  }, [firestore, recordOwnerId, serviceId]);
  
  const { data: service, isLoading } = useDoc<ServiceRecord>(serviceDocRef)
  
  const customersQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null
    return query(collection(firestore, 'customers'), orderBy('name', 'asc'))
  }, [firestore, user]);
  
  const { data: customers, isLoading: isLoadingCustomers } = useCollection<Customer>(customersQuery);

  const employeesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'employees'), orderBy('firstName', 'asc'));
  }, [firestore]);
  const { data: employees, isLoading: isLoadingEmployees } = useCollection<Employee>(employeesQuery);

  const projectNamesQuery = useMemoFirebase(() => {
      if (!firestore) return null;
      // This query can be slow, but it's for an auxiliary feature (autocomplete)
      // It won't block the main functionality.
      return query(collectionGroup(firestore, 'serviceRecords'));
  }, [firestore]);

  const { data: allServices, isLoading: isLoadingAllServices } = useCollection<ServiceRecord>(projectNamesQuery);

  const projectNames = useMemo(() => {
      if (!allServices) return [];
      const uniqueProjectNames = [...new Set(allServices.map(d => d.projectName).filter(Boolean))];
      return uniqueProjectNames;
  }, [allServices]);
  
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
  const [serviceHourlyRate, setServiceHourlyRate] = useState<number | ''>('');


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
      } else {
        setEndTime('')
      }
      
      setDescription(service.description !== "Servei en curs..." ? service.description : '')
      setProjectName(service.projectName || '');
      setPendingTasks(service.pendingTasks || '');
      setCustomerId(service.customerId || '');
      setEmployeeId(service.employeeId || '');
      setMedia(service.media || [])
      setAlbarans(service.albarans?.length > 0 ? service.albarans : [''])
      if (service.materials && service.materials.length > 0) {
        setMaterials(service.materials)
      } else {
        setMaterials([{ description: '', quantity: 1, unitPrice: 0 }]);
      }
      // Set service hourly rate
      const employee = employees?.find(e => e.id === service.employeeId);
      setServiceHourlyRate(service.serviceHourlyRate ?? employee?.hourlyRate ?? '');

    } else if (employees && !service) {
      // Pre-fill for new service in-progress
      const currentEmployee = employees.find(e => e.id === user?.uid);
      setEmployeeId(user?.uid || '');
      setServiceHourlyRate(currentEmployee?.hourlyRate ?? '');
    }
  }, [service, employees, user])

  useEffect(() => {
    if (!date && service === undefined) { 
      setDate(new Date());
    }
  }, [date, service]); 

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
        const files = Array.from(e.target.files);
        toast({ title: 'Processant imatges...', description: 'Si us plau, espera un moment.' });
        try {
            const filePromises = files.map(async (file) => {
                if (file.type.startsWith('image/')) {
                    const compressedDataUrl = await resizeAndCompressImage(file);
                    return { type: 'image' as const, dataUrl: compressedDataUrl };
                } else if (file.type.startsWith('video/')) {
                    // Temporarily disabling video upload to avoid size issues
                    toast({ variant: 'destructive', title: 'Càrrega de vídeo desactivada', description: 'La càrrega de vídeos està temporalment desactivada.' });
                    return null;
                }
                return null;
            });

            const newFiles = (await Promise.all(filePromises)).filter((file): file is MediaFile => file !== null);
            setMedia(prev => [...prev, ...newFiles]);
            toast({ title: 'Imatges afegides!', description: 'Les imatges han estat comprimides i afegides.' });
        } catch (error) {
            console.error('Error processing files:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'No s\'ha pogut processar un dels fitxers.' });
        } finally {
            // Reset the input value to allow selecting the same file again
            e.target.value = '';
        }
    }
};

  const handleAlbaranChange = (index: number, value: string) => {
    const newAlbarans = [...albarans]
    newAlbarans[index] = value
    setAlbarans(newAlbarans)
  }

  const addAlbaranInput = () => {
    setAlbarans([...albarans, ''])
  }

  const removeAlbaranInput = (index: number) => {
    const newAlbarans = albarans.filter((_, i) => i !== index)
    setAlbarans(newAlbarans)
  }
  
  const handleMaterialChange = (index: number, field: keyof Material, value: string | number) => {
    const newMaterials = [...materials];
    const material = newMaterials[index];
    if (field === 'description') {
        material.description = value as string;
    } else {
        const numValue = Number(value);
        if (!isNaN(numValue) && numValue >= 0) {
            if (field === 'quantity') material.quantity = numValue;
            if (field === 'unitPrice') material.unitPrice = numValue;
        }
    }
    setMaterials(newMaterials);
  };

  const addMaterialInput = () => {
    setMaterials([...materials, { description: '', quantity: 1, unitPrice: 0 }]);
  };

  const removeMaterialInput = (index: number) => {
    const newMaterials = materials.filter((_, i) => i !== index);
    setMaterials(newMaterials);
  };
    
  const handleMaterialImageUploadClick = (index: number) => {
    setSelectedMaterialIndex(index);
    materialImageInputRef.current?.click();
  };

  const handleMaterialImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && selectedMaterialIndex !== null) {
      const file = e.target.files[0];
      try {
        toast({ title: 'Processant imatge del material...' });
        const compressedDataUrl = await resizeAndCompressImage(file);
        const newMaterials = [...materials];
        newMaterials[selectedMaterialIndex].imageDataUrl = compressedDataUrl;
        setMaterials(newMaterials);
        toast({ title: 'Imatge del material afegida!' });
      } catch (error) {
        console.error('Error processing material image:', error);
        toast({ variant: 'destructive', title: 'Error', description: "No s'ha pogut processar la imatge." });
      } finally {
        // Reset the input and index
        e.target.value = '';
        setSelectedMaterialIndex(null);
      }
    }
  };

  const removeMaterialImage = (index: number) => {
    const newMaterials = [...materials];
    newMaterials[index].imageDataUrl = undefined;
    setMaterials(newMaterials);
  };

  const handleCapture = (dataUrl: string, type: 'image' | 'video') => {
    setMedia(prev => [...prev, { type, dataUrl }]);
    setShowCamera(false);
  };
  
  const removeMedia = (index: number) => {
    setMedia(prev => prev.filter((_, i) => i !== index));
  }
  
  const handleCustomerSelect = (customer: Customer) => {
    setCustomerId(customer.id);
    setIsCustomerDialogOpen(false);
  };


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!serviceDocRef || !date || !startTime || !endTime) {
        toast({
            variant: 'destructive',
            title: 'Camps obligatoris',
            description: "Si us plau, omple la data i les hores d'inici i final.",
        });
        return;
    }

    const selectedDateStr = format(date, 'yyyy-MM-dd')
    const arrivalDate = new Date(`${selectedDateStr}T${startTime}`);
    const departureDate = new Date(`${selectedDateStr}T${endTime}`);
    
    if (!isValid(arrivalDate) || !isValid(departureDate) || departureDate <= arrivalDate) {
        toast({ variant: 'destructive', title: 'Data/hora invàlida', description: "La hora de sortida ha de ser posterior a la d'arribada." });
        return;
    }
    
    const arrivalDateTime = arrivalDate.toISOString();
    const departureDateTime = departureDate.toISOString();
    const filteredAlbarans = albarans.filter(a => a.trim() !== '');
    const processedMaterials = materials.filter(m => m.description.trim() !== '');
    const selectedCustomer = customers?.find(c => c.id === customerId);
    const selectedEmployee = employees?.find(e => e.id === employeeId);
    
    const updatedData: Partial<ServiceRecord> = {
      arrivalDateTime,
      departureDateTime,
      description: description || "Servei finalitzat",
      projectName,
      pendingTasks,
      customerId,
      customerName: selectedCustomer?.name || service?.customerName || '',
      employeeId: selectedEmployee?.id || service?.employeeId,
      employeeName: (selectedEmployee ? `${selectedEmployee.firstName} ${selectedEmployee.lastName}` : service?.employeeName) || '',
      serviceHourlyRate: typeof serviceHourlyRate === 'number' ? serviceHourlyRate : undefined,
      media: media, 
      albarans: filteredAlbarans,
      materials: processedMaterials,
      updatedAt: new Date().toISOString(),
    }

    updateDocumentNonBlocking(serviceDocRef, updatedData)

    toast({
      title: "Servei actualitzat!",
      description: "El servei ha estat modificat correctament.",
    })
    router.push('/dashboard')
  }
  
  const handleDelete = async () => {
    if (!serviceDocRef) return;
    try {
      await deleteDoc(serviceDocRef);
      toast({
        title: 'Servei eliminat',
        description: 'El registre del servei ha estat eliminat correctament.',
      });
      router.push('/dashboard');
    } catch (error) {
       toast({
        variant: 'destructive',
        title: 'Error',
        description: "No s'ha pogut eliminar el servei.",
      });
    }
  }

  const customerName = useMemo(() => {
      if (isLoadingCustomers || !customers) return service?.customerName || '';
      return customers.find(c => c.id === customerId)?.name || service?.customerName || 'Cap client assignat';
  }, [customerId, customers, isLoadingCustomers, service]);

  if (isUserLoading || isLoading || isLoadingCustomers || isLoadingAllServices || isLoadingEmployees) {
    return <p>Carregant servei...</p>
  }

  if (!service) {
    return <p>No s'ha trobat el servei o no tens permisos per veure'l.</p>
  }

  if (showCamera) {
    return <CameraCapture onCapture={handleCapture} onClose={() => setShowCamera(false)} />;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <Button variant="ghost" onClick={() => router.back()} className="mb-4 -ml-4">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Tornar
      </Button>
      
      <CustomerSelectionDialog
        open={isCustomerDialogOpen}
        onOpenChange={setIsCustomerDialogOpen}
        customers={customers || []}
        onCustomerSelect={handleCustomerSelect}
      />
      
      <input
        type="file"
        ref={materialImageInputRef}
        onChange={handleMaterialImageFileChange}
        accept="image/*"
        className="hidden"
      />

      <Card>
        <CardHeader>
          <CardTitle>Editar Servei #{serviceId.slice(-6)}</CardTitle>
          <CardDescription>Modifica os detalls do servei realitzat.</CardDescription>
          {service.updatedAt && (
             <p className="text-xs text-muted-foreground pt-2 flex items-center gap-1">
              <Info className="h-3 w-3" />
              Última modificació: {format(new Date(service.updatedAt), "dd/MM/yyyy 'a les' HH:mm", { locale: ca })}
            </p>
          )}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            
            <div className="space-y-2">
                <Label htmlFor="date">Data del Servei</Label>
                 <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? format(date, "PPP", { locale: ca }) : <span>Tria una data</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={setDate}
                      initialFocus
                      locale={ca}
                    />
                  </PopoverContent>
                </Popover>
              </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start-time" className="flex items-center gap-2"><Clock className="h-4 w-4 text-muted-foreground" /> Hora d'Arribada</Label>
                <Input id="start-time" type="time" required value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-time" className="flex items-center gap-2"><Clock className="h-4 w-4 text-muted-foreground" /> Hora de Sortida</Label>
                <Input id="end-time" type="time" required value={endTime} onChange={(e) => setEndTime(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="employeeId" className="flex items-center gap-2"><UserIcon className="h-4 w-4 text-muted-foreground" /> Tècnic</Label>
                    <Select value={employeeId} onValueChange={setEmployeeId} disabled={isLoadingEmployees}>
                        <SelectTrigger id="employeeId">
                            <SelectValue placeholder={isLoadingEmployees ? "A carregar tècnics..." : "Selecciona un tècnic..."} />
                        </SelectTrigger>
                        <SelectContent>
                            {employees?.map(e => (
                            <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="serviceHourlyRate" className="flex items-center gap-2"><Euro className="h-4 w-4 text-muted-foreground" /> Preu/Hora Mà d'Obra</Label>
                    <Input 
                        id="serviceHourlyRate" 
                        type="number" 
                        value={serviceHourlyRate}
                        onChange={(e) => setServiceHourlyRate(e.target.value === '' ? '' : Number(e.target.value))}
                        placeholder="Preu per defecte"
                    />
                </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="customerId" className="flex items-center gap-2"><Users className="h-4 w-4 text-muted-foreground" /> Client</Label>
                <div className="flex items-center gap-2">
                    <Input value={customerName} readOnly disabled className="flex-grow bg-muted" />
                    <Button type="button" variant="outline" onClick={() => setIsCustomerDialogOpen(true)}>
                        Seleccionar
                    </Button>
                </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="projectName" className="flex items-center gap-2"><Briefcase className="h-4 w-4 text-muted-foreground" /> Nom de l'Obra</Label>
              <Input id="projectName" placeholder="Ex: Reforma Client A" value={projectName} onChange={(e) => setProjectName(e.target.value)} list="project-names" />
              <datalist id="project-names">
                {projectNames.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description" className="flex items-center gap-2"><FileText className="h-4 w-4 text-muted-foreground" /> Descripció del Servei</Label>
              <Textarea id="description" placeholder="Descriu les tasques realitzades..." value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pendingTasks" className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-muted-foreground" /> Pendents de l'Obra</Label>
              <Textarea id="pendingTasks" placeholder="Descriu tasques o materials pendents..." value={pendingTasks} onChange={(e) => setPendingTasks(e.target.value)} rows={3} />
            </div>
            
            <div className="space-y-4 rounded-lg border p-4">
                <Label className="flex items-center gap-2 text-base font-semibold"><Package className="h-5 w-5 text-muted-foreground" /> Materials i Mà d'Obra</Label>
                 <div className="space-y-3">
                    {materials.map((material, index) => (
                        <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                            <Input
                                type="text"
                                placeholder="Descripció"
                                value={material.description}
                                onChange={(e) => handleMaterialChange(index, 'description', e.target.value)}
                                className="col-span-12 md:col-span-5"
                            />
                            <div className="col-span-4 md:col-span-2 relative">
                                <Input
                                    type="number"
                                    placeholder="Quant."
                                    value={material.quantity}
                                    onChange={(e) => handleMaterialChange(index, 'quantity', e.target.value)}
                                    className="pl-2 pr-1"
                                    min="0"
                                    step="any"
                                />
                            </div>
                            <div className="col-span-5 md:col-span-2 relative">
                                <Input
                                    type="number"
                                    placeholder="Preu/u."
                                    value={material.unitPrice}
                                    onChange={(e) => handleMaterialChange(index, 'unitPrice', e.target.value)}
                                    className="pl-7 pr-1"
                                    min="0"
                                    step="any"
                                />
                                <Euro className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="col-span-3 md:col-span-3 flex justify-end items-center gap-1">
                                <Button type="button" variant="outline" size="icon" onClick={() => handleMaterialImageUploadClick(index)}>
                                    <ImagePlus className="h-4 w-4" />
                                </Button>
                                {material.imageDataUrl && (
                                    <Button type="button" variant="ghost" size="icon" onClick={() => removeMaterialImage(index)}>
                                        <X className="h-4 w-4 text-destructive" />
                                    </Button>
                                )}
                            </div>
                            {material.imageDataUrl && (
                                <div className="col-span-12 md:col-start-6">
                                    <Image src={material.imageDataUrl} alt="Preview" width={64} height={64} className="rounded-md object-cover" />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addMaterialInput} className="mt-2">
                    <Plus className="mr-2 h-4 w-4" /> Afegir Línia
                </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="albarans" className="flex items-center gap-2"><Hash className="h-4 w-4 text-muted-foreground" /> Nº d'Albarà</Label>
              <div className="space-y-2">
                {albarans.map((albaran, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      type="text"
                      placeholder={`Albarà #${index + 1}`}
                      value={albaran}
                      onChange={(e) => handleAlbaranChange(index, e.target.value)}
                    />
                    {albarans.length > 1 && (
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeAlbaranInput(index)}>
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addAlbaranInput} className="mt-2">
                <Plus className="mr-2 h-4 w-4" /> Afegir Albarà
              </Button>
            </div>

             <div className="space-y-2">
              <Label className="flex items-center gap-2"><Camera className="h-4 w-4 text-muted-foreground" /> Fotos i Vídeos</Label>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 my-4">
                {media.map((m, index) => (
                  <div key={index} className="relative group aspect-square rounded-md overflow-hidden">
                    {m.type === 'image' ? (
                      <Image src={m.dataUrl} alt={`Previsualització ${index + 1}`} fill style={{ objectFit: 'cover' }} sizes="100px" />
                    ) : (
                      <div className="w-full h-full bg-black flex items-center justify-center">
                         <Video className="h-8 w-8 text-white" />
                      </div>
                    )}
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeMedia(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 flex-col sm:flex-row">
                 <Button type="button" variant="outline" onClick={() => setShowCamera(true)} className="flex-1">
                    <Camera className="mr-2 h-4 w-4" /> Usar Càmera
                 </Button>
                <Label htmlFor="media-upload" className="flex-1 cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2">
                    <Plus className="mr-2 h-4 w-4" /> Pujar Fitxer
                </Label>
                 <Input id="media-upload" type="file" multiple onChange={handleFileChange} accept="image/*" className="hidden" />
              </div>
              <p className="text-sm text-muted-foreground mt-2">{media.length} fitxer(s) seleccionat(s).</p>
            </div>


            <div className="flex flex-col sm:flex-row justify-between items-center pt-4 gap-4">
               <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="destructive" className="w-full sm:w-auto">
                    <Trash2 className="mr-2 h-4 w-4"/>
                    Eliminar
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Estàs segur?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Aquesta acció no es pot desfer. Això eliminarà permanentment el registre del servei.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel·lar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <Button type="submit" className="bg-accent hover:bg-accent/90 text-accent-foreground w-full sm:w-auto">
                <Save className="mr-2 h-4 w-4"/>
                Desa els Canvis
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
