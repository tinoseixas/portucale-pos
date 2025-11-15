'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Clock, FileText, Camera, ArrowLeft, Save } from 'lucide-react'
import { useToast } from "@/hooks/use-toast"

export default function NewServicePage() {
  const router = useRouter()
  const { toast } = useToast()
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [description, setDescription] = useState('')
  const [photos, setPhotos] = useState<File[]>([])

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setPhotos(Array.from(e.target.files))
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Here you would typically send data to a server
    console.log({ startTime, endTime, description, photos })
    
    toast({
        title: "Servei desat!",
        description: "El nou servei ha estat registrat correctament.",
    })
    
    router.push('/dashboard')
  }

  return (
    <div className="max-w-2xl mx-auto">
       <Button variant="ghost" onClick={() => router.back()} className="mb-4 -ml-4">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Tornar
      </Button>
      <Card>
        <CardHeader>
          <CardTitle>Registrar Nou Servei</CardTitle>
          <CardDescription>Omple els detalls del servei realitzat.</CardDescription>
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
              <Label htmlFor="photos" className="flex items-center gap-2"><Camera className="h-4 w-4 text-muted-foreground" /> Captura de Fotos</Label>
              <Input id="photos" type="file" multiple onChange={handlePhotoChange} />
              {photos.length > 0 && (
                <p className="text-sm text-muted-foreground mt-2">{photos.length} foto(s) seleccionada(s).</p>
              )}
            </div>

            <div className="flex justify-end pt-4">
              <Button type="submit" className="bg-accent hover:bg-accent/90 text-accent-foreground">
                <Save className="mr-2 h-4 w-4"/>
                Desa el Servei
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
