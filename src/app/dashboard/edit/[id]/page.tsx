'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Clock, FileText, Camera, ArrowLeft, Save, Trash2, Hash, Plus, X } from 'lucide-react'
import { useToast } from "@/hooks/use-toast"
import { useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase'
import { doc, deleteDoc } from 'firebase/firestore'
import type { ServiceRecord } from '@/lib/types'
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates'
import Image from 'next/image'
import { PlaceHolderImages } from '@/lib/placeholder-images'
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

export default function EditServicePage() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const { user } = useUser()
  const firestore = useFirestore()
  const serviceId = params.id as string

  const serviceDocRef = useMemoFirebase(() => {
    if (!user || !serviceId) return null
    return doc(firestore, `employees/${user.uid}/serviceRecords`, serviceId)
  }, [firestore, user, serviceId])

  const { data: service, isLoading } = useDoc<ServiceRecord>(serviceDocRef)

  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [description, setDescription] = useState('')
  const [photos, setPhotos] = useState<File[]>([])
  const [existingPhotoIds, setExistingPhotoIds] = useState<string[]>([]);
  const [albarans, setAlbarans] = useState<string[]>(['']);


  useEffect(() => {
    if (service) {
      const arrival = new Date(service.arrivalDateTime)
      const departure = new Date(service.departureDateTime)
      setStartTime(`${arrival.getHours().toString().padStart(2, '0')}:${arrival.getMinutes().toString().padStart(2, '0')}`)
      setEndTime(`${departure.getHours().toString().padStart(2, '0')}:${departure.getMinutes().toString().padStart(2, '0')}`)
      setDescription(service.description)
      setExistingPhotoIds(service.photoIds || [])
      setAlbarans(service.albarans?.length > 0 ? service.albarans : [''])
    }
  }, [service])

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setPhotos(Array.from(e.target.files))
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !serviceDocRef) return

    const today = new Date().toISOString().split('T')[0]
    const arrivalDateTime = new Date(`${today}T${startTime}`).toISOString()
    const departureDateTime = new Date(`${today}T${endTime}`).toISOString()

    const newPhotoIds = photos.map((_, index) => {
        return PlaceHolderImages[(existingPhotoIds.length + index) % PlaceHolderImages.length].id;
    });

    const filteredAlbarans = albarans.filter(a => a.trim() !== '')

    const updatedData = {
      arrivalDateTime,
      departureDateTime,
      description,
      photoIds: [...existingPhotoIds, ...newPhotoIds],
      albarans: filteredAlbarans,
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
  
  const getPhotoUrl = (id: string) => {
      return PlaceHolderImages.find(p => p.id === id)?.imageUrl || 'https://placehold.co/100x100';
  }

  if (isLoading) {
    return <p>Carregant servei...</p>
  }

  if (!service) {
    return <p>No s'ha trobat el servei.</p>
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Button variant="ghost" onClick={() => router.back()} className="mb-4 -ml-4">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Tornar
      </Button>
      <Card>
        <CardHeader>
          <CardTitle>Editar Servei #{serviceId.slice(-6)}</CardTitle>
          <CardDescription>Modifica els detalls del servei realitzat.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
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
              <Label htmlFor="photos" className="flex items-center gap-2"><Camera className="h-4 w-4 text-muted-foreground" /> Fotos Adjuntades</Label>
               {existingPhotoIds.length > 0 && (
                 <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                    {existingPhotoIds.map(photoId => (
                        <div key={photoId} className="relative aspect-square rounded-md overflow-hidden">
                            <Image src={getPhotoUrl(photoId)} alt="Foto del servei" fill style={{objectFit: "cover"}} sizes="100px" />
                        </div>
                    ))}
                 </div>
              )}
              <Input id="photos" type="file" multiple onChange={handlePhotoChange} accept="image/*" />
              {photos.length > 0 && (
                <p className="text-sm text-muted-foreground mt-2">{photos.length} nova(es) foto(s) seleccionada(es).</p>
              )}
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
    </div>
  )
}
