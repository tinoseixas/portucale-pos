import type { ServiceRecord } from '@/lib/types'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Clock, Camera, Edit, Hash } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { Button } from './ui/button'

interface ServiceCardProps {
  service: ServiceRecord;
}

export function ServiceCard({ service }: ServiceCardProps) {
  const startTime = service.arrivalDateTime ? format(parseISO(service.arrivalDateTime), 'HH:mm') : 'N/A'
  const endTime = service.departureDateTime ? format(parseISO(service.departureDateTime), 'HH:mm') : 'N/A'
  
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
      <CardContent className="flex-1 space-y-4">
        <p className="text-muted-foreground mb-4 line-clamp-2 h-10">{service.description}</p>
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
