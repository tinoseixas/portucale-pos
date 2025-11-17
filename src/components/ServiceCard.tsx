'use client'

import type { ServiceRecord, Employee } from '@/lib/types'
import Link from 'next/link'
import Image from 'next/image'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Clock, Camera, Edit, Hash, Video, Calendar, User, AlertCircle } from 'lucide-react'
import { format, parseISO, isValid } from 'date-fns'
import { Button } from './ui/button'
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase'
import { doc } from 'firebase/firestore'
import { Skeleton } from './ui/skeleton'
import { Badge } from './ui/badge'

interface ServiceCardProps {
  service: ServiceRecord;
  isUserAdmin?: boolean;
}

// A new sub-component to fetch and display the employee name
function EmployeeName({ employeeId }: { employeeId: string }) {
  const firestore = useFirestore()
  
  const employeeDocRef = useMemoFirebase(() => {
    if (!employeeId) return null;
    return doc(firestore, 'employees', employeeId);
  }, [firestore, employeeId]);

  const { data: employee, isLoading } = useDoc<Employee>(employeeDocRef);

  if (isLoading) {
    return <Skeleton className="h-5 w-32" />;
  }

  if (!employee) {
     return (
      <div className="flex items-center text-sm text-muted-foreground font-medium">
        <User className="h-4 w-4 mr-2" />
        <span>Empleat desconegut</span>
      </div>
    )
  }

  const employeeName = `${employee.firstName} ${employee.lastName}`;

  return (
    <div className="flex items-center text-sm text-muted-foreground font-medium">
      <User className="h-4 w-4 mr-2" />
      <span>{employeeName}</span>
    </div>
  )
}


export function ServiceCard({ service, isUserAdmin }: ServiceCardProps) {
  const arrival = parseISO(service.arrivalDateTime);
  const departure = parseISO(service.departureDateTime);

  const isInProgress = arrival.getTime() === departure.getTime();
  
  const startTime = isValid(arrival) ? format(arrival, 'HH:mm') : 'N/A'
  const endTime = !isInProgress && isValid(departure) ? format(departure, 'HH:mm') : '--:--'
  const serviceDate = isValid(arrival) ? format(arrival, 'dd/MM/yyyy') : 'N/A'
  
  const mediaItems = service.media?.slice(0, 3) || [];

  // For admins, the edit link needs to include the owner's ID
  const editLink = isUserAdmin ? `/dashboard/edit/${service.id}?ownerId=${service.employeeId}` : `/dashboard/edit/${service.id}`;

  return (
    <Card className="transition-all hover:shadow-lg flex flex-col">
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg">Servei #{service.id.slice(-6)}</CardTitle>
           {isInProgress ? (
             <Badge variant="destructive" className="flex items-center gap-1.5">
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
      </CardHeader>
      <CardContent className="flex-1 space-y-4 flex flex-col">
        {isUserAdmin && service.employeeId && <EmployeeName employeeId={service.employeeId} />}

        <p className="text-muted-foreground line-clamp-2 h-10 flex-grow">{service.description}</p>
        
        {mediaItems.length > 0 && (
            <div className="flex items-center gap-2">
                {mediaItems.map((media, index) => (
                    <div key={index} className="relative h-16 w-16 rounded-md overflow-hidden border">
                         {media.type === 'image' ? (
                            <Image src={media.dataUrl} alt={`Media ${index + 1}`} fill style={{ objectFit: 'cover' }} sizes="64px" />
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
