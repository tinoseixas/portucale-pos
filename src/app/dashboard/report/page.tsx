'use client'

import { useMemo } from 'react'
import Image from 'next/image'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Clock, Briefcase, Camera, Video, Calendar as CalendarIcon, FileText } from 'lucide-react'
import type { ServiceRecord, Employee } from '@/lib/types'
import { format, differenceInMinutes, parseISO, isValid, startOfDay } from 'date-fns'
import { ca } from 'date-fns/locale';
import { useCollection, useDoc, useFirestore, useUser, useMemoFirebase } from '@/firebase'
import { collection, doc } from 'firebase/firestore'

function calculateTotalTime(services: ServiceRecord[]): string {
    if (!services) return '0h 0m';

    const totalMinutes = services.reduce((total, service) => {
        if (service.arrivalDateTime && service.departureDateTime) {
            const startDate = parseISO(service.arrivalDateTime);
            const endDate = parseISO(service.departureDateTime);

            if (!isValid(startDate) || !isValid(endDate)) {
              return total;
            }

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

type GroupedServices = {
    [key: string]: {
        services: ServiceRecord[];
        totalTime: string;
    }
};

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
    
    const totalTimeOverall = useMemo(() => calculateTotalTime(services || []), [services]);
    const today = format(new Date(), 'dd MMMM, yyyy', { locale: ca });
    const allMedia = services?.flatMap(s => s.media || []) || [];

    const groupedServices = useMemo(() => {
        if (!services) return {};
        
        const sortedServices = [...services].sort((a, b) => parseISO(b.arrivalDateTime).getTime() - parseISO(a.arrivalDateTime).getTime());

        return sortedServices.reduce((acc: GroupedServices, service) => {
            const day = format(startOfDay(parseISO(service.arrivalDateTime)), 'yyyy-MM-dd');
            if (!acc[day]) {
                acc[day] = { services: [], totalTime: '' };
            }
            acc[day].services.push(service);
            return acc;
        }, {});
    }, [services]);

     Object.keys(groupedServices).forEach(day => {
        groupedServices[day].totalTime = calculateTotalTime(groupedServices[day].services);
    });

    if (isLoadingServices || isLoadingEmployee) {
        return <p>Carregant informe...</p>;
    }
    
    return (
        <div className="max-w-4xl mx-auto space-y-8">
             <div>
                <h1 className="text-3xl font-bold">Informe d'Activitat</h1>
                <p className="text-muted-foreground">Resum de l'activitat per a {employee?.firstName || user?.email}.</p>
            </div>
            <Card className="shadow-lg">
                <CardHeader>
                    {/* Summary section */}
                    <CardTitle>Resum General</CardTitle>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center pt-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Hores Totals</CardTitle>
                                <Clock className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{totalTimeOverall}</div>
                            </CardContent>
                        </Card>
                         <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Serveis Totals</CardTitle>
                                <Briefcase className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{services?.length || 0}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Fotos/Vídeos</CardTitle>
                                <Camera className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{allMedia.length}</div>
                            </CardContent>
                        </Card>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <Separator />

                    {/* Daily Services section */}
                    <div>
                        <h3 className="text-xl font-semibold mb-4">Detall per Dia</h3>
                        <div className="space-y-6">
                            {Object.keys(groupedServices).length > 0 ? (
                                Object.entries(groupedServices).map(([day, data]) => (
                                <Card key={day} className="bg-background/50">
                                    <CardHeader>
                                        <div className="flex flex-col sm:flex-row justify-between sm:items-center">
                                            <CardTitle className="text-lg flex items-center gap-2">
                                                <CalendarIcon className="h-5 w-5" />
                                                {format(parseISO(day), 'EEEE, dd MMMM yyyy', { locale: ca })}
                                            </CardTitle>
                                            <div className="flex items-center gap-2 font-bold text-primary text-lg mt-2 sm:mt-0">
                                                <Clock className="h-5 w-5" />
                                                <span>{data.totalTime}</span>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        {data.services.map(service => {
                                            const arrival = parseISO(service.arrivalDateTime);
                                            const departure = parseISO(service.departureDateTime);
                                            return (
                                                <div key={service.id} className="p-3 rounded-md border bg-card/50">
                                                    <div className="flex justify-between items-start gap-4">
                                                        <div className="flex-1">
                                                             <div className="flex items-center gap-2 text-sm font-medium text-primary mb-1">
                                                                <Clock className="h-4 w-4" />
                                                                <span>
                                                                    {isValid(arrival) ? format(arrival, 'HH:mm') : 'N/A'} - {isValid(departure) ? format(departure, 'HH:mm') : 'N/A'}
                                                                </span>
                                                            </div>
                                                            <p className="text-muted-foreground flex items-start gap-2">
                                                                <FileText className="h-4 w-4 mt-1 flex-shrink-0" />
                                                                <span>{service.description}</span>
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </CardContent>
                                </Card>
                            ))
                            ) : (
                                <p className="text-muted-foreground text-center py-4">No s'han trobat serveis per mostrar.</p>
                            )}
                        </div>
                    </div>
                    
                    {allMedia.length > 0 && (
                       <>
                        <Separator />
                        <div>
                            <h3 className="text-xl font-semibold mb-4">Galeria de Multimèdia</h3>
                             <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                {allMedia.map((media, index) => (
                                    <div key={index} className="relative aspect-square rounded-lg overflow-hidden shadow-md group">
                                       {media.type === 'image' ? (
                                            <Image
                                                src={media.dataUrl}
                                                alt={`Media ${index + 1}`}
                                                fill
                                                sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                                                style={{ objectFit: 'cover' }}
                                                className="transition-transform duration-300 group-hover:scale-105"
                                            />
                                        ) : (
                                            <video src={media.dataUrl} className="w-full h-full object-cover" controls />
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                       </>
                    )}
                </CardContent>
                <CardFooter>
                    <p className="text-xs text-muted-foreground w-full text-center">Aquest és un informe generat automàticament.</p>
                </CardFooter>
            </Card>
        </div>
    )
}
