'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Clock, FileText, Camera, ArrowLeft, Save, Trash2, Hash, Plus, X, Video, Calendar as CalendarIcon, Map, Info } from 'lucide-react'
import { useToast } from "@/hooks/use-toast"
import { useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase'
import { doc, deleteDoc } from 'firebase/firestore'
import type { ServiceRecord } from '@/lib/types'
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
import { format } from 'date-fns'
import { ca } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { ADMIN_EMAIL } from '@/lib/admin'
import { LocationTracker } from '@/components/LocationTracker'

const ServiceRouteMap = dynamic(() => import('@/components/ServiceRouteMap'), {
  ssr: false,
  loading: () => <p>Carregant mapa...</p>
})

type MediaFile = {
  type: 'image' | 'video';
  dataUrl: string;
  file?: File;
};

export default function EditServicePage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const { user } = useUser()
  const firestore = useFirestore()
  const serviceId = params.id as string

  // For admins, the owner's ID might be in the query params
  const ownerId = searchParams.get('ownerId')
  const isUserAdmin = user?.email === ADMIN_EMAIL
  const docOwnerId = isUserAdmin && ownerId ? ownerId : user?.uid

  const serviceDocRef = useMemoFirebase(() => {
    if (!docOwnerId || !serviceId) return null
    return doc(firestore, `employees/${docOwnerId}/serviceRecords`, serviceId)
  }, [firestore, docOwnerId, serviceId])

  const { data: service, isLoading } = useDoc<ServiceRecord>(serviceDocRef)
  
  const [date, setDate] = useState<Date | undefined>(new Date())
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [description, setDescription] = useState('')
  const [media, setMedia] = useState<MediaFile[]>([])
  const [albarans, setAlbarans] = useState<string[]>(['']);
  const [showCamera, setShowCamera] = useState(false);
  const [isTracking, setIsTracking] = useState(false);


  useEffect(() => {
    if (service) {
      const arrival = new Date(service.arrivalDateTime)
      const departure = new Date(service.departureDateTime)
      setDate(arrival)
      setStartTime(`${arrival.getHours().toString().padStart(2, '0')}:${arrival.getMinutes().toString().padStart(2, '0')}`)
      setEndTime(`${departure.getHours().toString().padStart(2, '0')}:${departure.getMinutes().toString().padStart(2, '0')}`)
      setDescription(service.description)
      setMedia(service.media || [])
      setAlbarans(service.albarans?.length > 0 ? service.albarans : [''])
    }
  }, [service])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      files.forEach(file => {
        const reader = new FileReader();
        reader.onload = (event) => {
          const dataUrl = event.target?.result as string;
          const type = file.type.startsWith('image/') ? 'image' : 'video';
          setMedia(prev => [...prev, { type, dataUrl, file }]);
        };
        reader.readAsDataURL(file);
      });
    }
  }

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
  
  const handleCapture = (dataUrl: string, type: 'image' | 'video') => {
    setMedia(prev => [...prev, { type, dataUrl }]);
    setShowCamera(false);
  };
  
  const removeMedia = (index: number) => {
    setMedia(prev => prev.filter((_, i) => i !== index));
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!serviceDocRef || !date) return

    const selectedDateStr = format(date, 'yyyy-MM-dd')
    const arrivalDateTime = new Date(`${selectedDateStr}T${startTime}`).toISOString()
    const departureDateTime = new Date(`${selectedDateStr}T${endTime}`).toISOString()

    const filteredAlbarans = albarans.filter(a => a.trim() !== '')

    const updatedData = {
      arrivalDateTime,
      departureDateTime,
      description,
      media: media.map(({type, dataUrl}) => ({type, dataUrl})),
      albarans: filteredAlbarans,
      updatedAt: new Date().toISOString(),
    }

    updateDocumentNonBlocking(serviceDocRef, updatedData)

    toast({
      title: "Servei actualitzat!",
      description: "El servei ha estat modificat correctament.",
    })
    setIsTracking(false);
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

  if (isLoading) {
    return <p>Carregant servei...</p>
  }

  if (!service) {
    return <p>No s'ha trobat el servei.</p>
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
      {!isUserAdmin && docOwnerId && serviceId && (
        <LocationTracker
          employeeId={docOwnerId}
          serviceRecordId={serviceId}
          isTracking={isTracking}
          setIsTracking={setIsTracking}
        />
      )}
      <Card>
        <CardHeader>
          <CardTitle>Editar Servei #{serviceId.slice(-6)}</CardTitle>
          <CardDescription>Modifica els detalls do servei realitzat.</CardDescription>
          {isUserAdmin && service.updatedAt && (
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
            
            <div className="space-y-2">
              <Label htmlFor="description" className="flex items-center gap-2"><FileText className="h-4 w-4 text-muted-foreground" /> Descripció del Servei</Label>
              <Textarea id="description" placeholder="Descriu les tasques realitzades..." required value={description} onChange={(e) => setDescription(e.target.value)} rows={5} />
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
              
              {media.length > 0 && (
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
              )}
              
              <div className="flex gap-2">
                 <Button type="button" variant="outline" onClick={() => setShowCamera(true)} className="flex-1">
                    <Camera className="mr-2 h-4 w-4" /> Usar Càmera
                 </Button>
                <Label htmlFor="media-upload" className="flex-1 cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2">
                    <Plus className="mr-2 h-4 w-4" /> Pujar Fitxer
                </Label>
                 <Input id="media-upload" type="file" multiple onChange={handleFileChange} accept="image/*,video/*" className="hidden" />
              </div>
              <p className="text-sm text-muted-foreground mt-2">{media.length} fitxer(s) seleccionat(s).</p>
            </div>


            <div className="flex justify-between items-center pt-4">
               <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="destructive">
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

              <Button type="submit" className="bg-accent hover:bg-accent/90 text-accent-foreground">
                <Save className="mr-2 h-4 w-4"/>
                Desa els Canvis
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {isUserAdmin && docOwnerId && serviceId && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Map className="h-5 w-5" /> Ruta del Servei</CardTitle>
            <CardDescription>Visualització del percurs realitzat durant el servei.</CardDescription>
          </CardHeader>
          <CardContent>
             <ServiceRouteMap employeeId={docOwnerId} serviceId={serviceId} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
