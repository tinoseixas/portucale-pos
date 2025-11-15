import type { ServiceRecord } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Clock, Camera } from 'lucide-react'
import { format, parseISO } from 'date-fns'

interface ServiceCardProps {
  service: ServiceRecord;
}

export function ServiceCard({ service }: ServiceCardProps) {
  const startTime = service.arrivalDateTime ? format(parseISO(service.arrivalDateTime), 'HH:mm') : 'N/A'
  const endTime = service.departureDateTime ? format(parseISO(service.departureDateTime), 'HH:mm') : 'N/A'
  
  return (
    <Card className="transition-all hover:shadow-lg hover:-translate-y-1">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg">Servei #{service.id.slice(-6)}</CardTitle>
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            <Clock className="h-4 w-4" />
            <span>{startTime} - {endTime}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground mb-4 line-clamp-2">{service.description}</p>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Camera className="h-4 w-4" />
            <span>{service.photoIds?.length || 0} foto(s)</span>
        </div>
      </CardContent>
    </Card>
  )
}
