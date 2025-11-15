'use client'

import { useMemo } from 'react'
import Image from 'next/image'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Clock, Briefcase, Camera } from 'lucide-react'
import type { ServiceRecord, Employee } from '@/lib/types'
import { format, differenceInMinutes, parseISO } from 'date-fns'
import { ca } from 'date-fns/locale';
import { useCollection, useDoc, useFirestore, useUser, useMemoFirebase } from '@/firebase'
import { collection, doc } from 'firebase/firestore'

function calculateTotalTime(services: ServiceRecord[]): string {
    if (!services) return '0h 0m';

    const totalMinutes = services.reduce((total, service) => {
        if (service.arrivalDateTime && service.departureDateTime) {
            const startDate = parseISO(service.arrivalDateTime);
            const endDate = parseISO(service.departureDateTime);

            if (endDate < startDate) { // handles overnight shifts
                endDate.setDate(endDate.getDate() + 1);
            }

            return total + differenceInMinutes(endDate, startDate);
        }
        return total;
    }, 0);

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    return `${hours}h ${minutes}m`;
}


export default function ReportPage() {
    const { user } = useUser();
    const firestore = useFirestore();

    const serviceRecordsQuery = useMemoFirebase(() => {
        if (!user) return null;
        return collection(firestore, `employees/${user.uid}/serviceRecords`);
    }, [firestore, user]);

    const employeeDocRef = useMemoFirebase(() => {
        if (!user) return null;
        return doc(firestore, `employees/${user.uid}`);
    }, [firestore, user]);

    const { data: services, isLoading: isLoadingServices } = useCollection<ServiceRecord>(serviceRecordsQuery);
    const { data: employee, isLoading: isLoadingEmployee } = useDoc<Employee>(employeeDocRef);
    
    const totalTime = useMemo(() => calculateTotalTime(services || []), [services]);
    const today = format(new Date(), 'dd MMMM, yyyy', { locale: ca });

    const allPhotos = services?.flatMap(s => s.photoIds.map(id => ({ id, url: 'https://placehold.co/600x400' }))) || [];

    if (isLoadingServices || isLoadingEmployee) {
        return <p>Carregant informe...</p>;
    }
    
    return (
        <div className="max-w-4xl mx-auto space-y-8">
             <div>
                <h1 className="text-3xl font-bold">Informe Diari</h1>
                <p className="text-muted-foreground">Resum de l'activitat per a {employee?.firstName || user?.email} el {today}.</p>
            </div>
            <Card className="shadow-lg">
                <CardHeader>
                    {/* Summary section */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Hores Totals</CardTitle>
                                <Clock className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{totalTime}</div>
                            </CardContent>
                        </Card>
                         <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Serveis</CardTitle>
                                <Briefcase className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{services?.length || 0}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Fotos</CardTitle>
                                <Camera className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{allPhotos.length}</div>
                            </CardContent>
                        </Card>
                    </div>
                </CardHeader>
                <CardContent className="space-y-8">
                    <Separator />

                    {/* Services list section */}
                    <div>
                        <h3 className="text-lg font-semibold mb-4">Detall de Serveis</h3>
                        <div className="space-y-4">
                            {services && services.map(service => (
                                <Card key={service.id} className="bg-background">
                                    <CardContent className="pt-6">
                                        <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
                                            <p className="text-muted-foreground flex-1 pr-4">{service.description}</p>
                                            <div className="flex items-center gap-2 text-sm font-medium text-primary flex-shrink-0">
                                                <Clock className="h-4 w-4" />
                                                <span>{format(parseISO(service.arrivalDateTime), 'HH:mm')} - {format(parseISO(service.departureDateTime), 'HH:mm')}</span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                    
                    <Separator />

                    {/* Photos section */}
                    {allPhotos.length > 0 && (
                        <div>
                            <h3 className="text-lg font-semibold mb-4">Galeria de Fotos</h3>
                             <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                {allPhotos.map((photo, index) => (
                                    <div key={index} className="relative aspect-square rounded-lg overflow-hidden shadow-md group">
                                        <Image
                                            src={photo.url}
                                            alt={`Foto del servei ${index + 1}`}
                                            fill
                                            sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                                            style={{ objectFit: 'cover' }}
                                            className="transition-transform duration-300 group-hover:scale-105"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </CardContent>
                <CardFooter>
                    <p className="text-xs text-muted-foreground w-full text-center">Aquest és un informe generat automàticament.</p>
                </CardFooter>
            </Card>
        </div>
    )
}
