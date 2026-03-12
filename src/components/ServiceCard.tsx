'use client'

import type { ServiceRecord, Employee } from '@/lib/types'
import Link from 'next/link'
import Image from 'next/image'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Clock, Camera, Edit, Hash, Video, Calendar, User, AlertCircle, AlertTriangle, Briefcase, Building } from 'lucide-react'
import { format, parseISO, isValid } from 'date-fns'
import { Button } from './ui/button'
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase'
import { doc } from 'firebase/firestore'
import { Skeleton } from './ui/skeleton'
import { Badge } from './ui/badge'
import { cn } from '@/lib/utils'

interface ServiceCardProps {
  service: ServiceRecord;
}

function EmployeeNameDisplay({ service }: { service: ServiceRecord }) {
  const firestore = useFirestore()
  const employeeId = service.employeeId;
  
  const employeeDocRef = useMemoFirebase(() => {
    if (!employeeId) return null;
    return doc(firestore, 'employees', employeeId);
  }, [firestore, employeeId]);

  const { data: employee, isLoading } = useDoc<Employee>(employeeDocRef);

  if (isLoading) return <Skeleton className="h-5 w-32" />;

  const displayName = employee ? `${employee.firstName} ${employee.lastName}` : (service.employeeName || 'Tècnic');

  return (
    <div className="flex items-center text-sm text-muted-foreground font-medium">
      <User className="h-4 w-4 mr-2" />
      <span>{displayName}</span>
    </div>
  )
}


export function ServiceCard({ service }: ServiceCardProps) {
  if (!service) return null;

  const arrival = parseISO(service.arrivalDateTime);
  const departure = parseISO(service.departureDateTime);

  const isInProgress = arrival.getTime() === departure.getTime();
  const hasPendingTasks = service.pendingTasks && service.pendingTasks.trim() !== '';
  
  const startTime = isValid(arrival) ? format(arrival, 'HH:mm') : 'N/A'
  const endTime = !isInProgress && isValid(departure) ? format(departure, 'HH:mm') : '--:--'
  const serviceDate = isValid(arrival) ? format(arrival, 'dd/MM/yyyy') : 'N/A'
  
  const mediaItems = service.media?.slice(0, 3) || [];
  const editLink = `/dashboard/edit/${service.id}?ownerId=${service.employeeId}`;

  return (
    <Card className={cn(
        "transition-all hover:shadow-lg flex flex-col",
        hasPendingTasks && "border-destructive/50 ring-2 ring-destructive/20"
      )}>
      <CardHeader>
        <div className="flex justify-between items-start gap-2">
          <CardTitle className="text-lg line-clamp-1 flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-primary" />
            {service.projectName || `Servei #${service.id.slice(-6)}`}
          </CardTitle>
           {isInProgress ? (
             <Badge variant="outline" className="flex items-center gap-1.5 border-yellow-500 text-yellow-600">
                <AlertCircle className="h-3 w-3" />
                En Curs
             </Badge>
           ) : (
            <div className="flex items-center gap-2 text-sm font-medium text-primary flex-shrink-0">
                <Clock className="h-4 w-4" />
                <span>{startTime} - {endTime}</span>
            </div>
           )}
        </div>
         <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>{serviceDate}</span>
          </div>
          <EmployeeNameDisplay service={service} />
          {service.customerName && (
             <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
                <Building className="h-4 w-4" />
                <span>{service.customerName}</span>
            </div>
          )}
      </CardHeader>
      <CardContent className="flex-1 space-y-4 flex flex-col">
        
        <p className="text-muted-foreground line-clamp-2 h-10 flex-grow">{service.description}</p>
        
        {hasPendingTasks && (
            <div className="p-2 bg-destructive/10 rounded-md">
                <p className="text-xs font-bold text-destructive flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    TASQUES PENDENTS
                </p>
                <p className="text-sm text-destructive/90 line-clamp-2">{service.pendingTasks}</p>
            </div>
        )}
        
        {mediaItems.length > 0 && (
            <div className="flex items-center gap-2">
                {mediaItems.map((media, index) => (
                    <div key={index} className="relative h-16 w-16 rounded-md overflow-hidden border">
                         {media.type === 'image' ? (
                            <Image src={media.dataUrl} alt={`Foto ${index + 1}`} fill style={{ objectFit: 'cover' }} sizes="64px" />
                         ) : (
                            <div className="w-full h-full bg-black flex items-center justify-center">
                                <Video className="h-8 w-8 text-white" />
                            </div>
                         )}
                    </div>
                ))}
                {service.media && service.media.length > 3 && (
                    <div className="flex items-center justify-center h-16 w-16 rounded-md border bg-muted text-muted-foreground text-xs">
                        +{service.media.length - 3}
                    </div>
                )}
            </div>
        )}

        <div className="flex items-center text-sm text-muted-foreground">
            <Hash className="h-4 w-4 mr-2" />
            <span>{service.albarans?.length || 0} albarà(ns)</span>
        </div>
        <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Camera className="h-4 w-4" />
                <span>{service.media?.length || 0} fitxer(s)</span>
            </div>
             <Button asChild variant="outline" size="sm">
                <Link href={editLink}>
                    <Edit className="mr-2 h-4 w-4" />
                    {isInProgress ? 'Completar' : 'Editar'}
                </Link>
            </Button>
        </div>
      </CardContent>
    </Card>
  )
}
