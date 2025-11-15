import type { ServiceRecord } from '@/lib/types'
import Link from 'next/link'
import Image from 'next/image'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Clock, Camera, Edit, Hash } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { Button } from './ui/button'
import { PlaceHolderImages } from '@/lib/placeholder-images'

interface ServiceCardProps {
  service: ServiceRecord;
}

function getPhotoUrl(photoId: string): string {
    const photo = PlaceHolderImages.find(p => p.id === photoId);
    return photo ? photo.imageUrl : 'https://placehold.co/100x100';
}

export function ServiceCard({ service }: ServiceCardProps) {
  const startTime = service.arrivalDateTime ? format(parseISO(service.arrivalDateTime), 'HH:mm') : 'N/A'
  const endTime = service.departureDateTime ? format(parseISO(service.departureDateTime), 'HH:mm') : 'N/A'
  
  const photoUrls = service.photoIds?.slice(0, 3).map(getPhotoUrl) || [];

  return (
    <Card className="transition-all hover:shadow-lg flex flex-col">
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg">Servei #{service.id.slice(-6)}</CardTitle>
          <div className="flex items-center gap-2 text-sm font-medium text-primary flex-shrink-0">
            <Clock className="h-4 w-4" />
            <span>{startTime} - {endTime}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 space-y-4 flex flex-col">
        <p className="text-muted-foreground line-clamp-2 h-10 flex-grow">{service.description}</p>
        
        {photoUrls.length > 0 && (
            <div className="flex items-center gap-2">
                {photoUrls.map((url, index) => (
                    <div key={index} className="relative h-16 w-16 rounded-md overflow-hidden border">
                         <Image src={url} alt={`Foto ${index + 1}`} fill style={{ objectFit: 'cover' }} sizes="64px" />
                    </div>
                ))}
                {service.photoIds && service.photoIds.length > 3 && (
                    <div className="flex items-center justify-center h-16 w-16 rounded-md border bg-muted text-muted-foreground text-xs">
                        +{service.photoIds.length - 3}
                    </div>
                )}
            </div>
        )}

        <div className="flex items-center text-sm text-muted-foreground">
            <Hash className="h-4 w-4 mr-2" />
            <span>{service.albarans?.length || 0} albarà(ns)</span>
        </div>
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Camera className="h-4 w-4" />
                <span>{service.photoIds?.length || 0} foto(s)</span>
            </div>
             <Button asChild variant="outline" size="sm">
                <Link href={`/dashboard/edit/${service.id}`}>
                    <Edit className="mr-2 h-4 w-4" />
                    Editar
                </Link>
            </Button>
        </div>
      </CardContent>
    </Card>
  )
}
