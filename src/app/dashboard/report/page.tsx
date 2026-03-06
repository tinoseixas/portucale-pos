'use client'

import { useMemo } from 'react'
import Image from 'next/image'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Clock, Briefcase, Camera, Calendar as CalendarIcon, FileText } from 'lucide-react'
import type { ServiceRecord, Employee } from '@/lib/types'
import { format, parseISO, isValid, startOfDay } from 'date-fns'
import { ca } from 'date-fns/locale';
import { useCollection, useDoc, useFirestore, useUser, useMemoFirebase } from '@/firebase'
import { collection, doc } from 'firebase/firestore'
import { calculateServiceEffectiveMinutes } from '@/lib/calculations'

function calculateTotalTime(services: ServiceRecord[]): string {
    if (!services) return '0h 0m';

    const totalMinutes = services.reduce((total, service) => {
        return total + calculateServiceEffectiveMinutes(service);
    }, 0);

    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.round(totalMinutes % 60);

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
        return <p className="p-8 text-center">Carregant informe...</p>;
    }
    
    return (
        <div className="max-w-4xl mx-auto space-y-8">
             <div>
                <h1 className="text-3xl font-bold uppercase tracking-tight">Informe d'Activitat</h1>
                <p className="text-muted-foreground">Resum de l'activitat per a {employee?.firstName || user?.email}.</p>
            </div>
            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle>Resum General</CardTitle>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center pt-4">
                        <Card className="bg-slate-50">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-xs font-black uppercase text-slate-400">Hores Totals</CardTitle>
                                <Clock className="h-4 w-4 text-primary" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-black text-primary">{totalTimeOverall}</div>
                            </CardContent>
                        </Card>
                         <Card className="bg-slate-50">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-xs font-black uppercase text-slate-400">Serveis</CardTitle>
                                <Briefcase className="h-4 w-4 text-primary" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-black text-primary">{services?.length || 0}</div>
                            </CardContent>
                        </Card>
                        <Card className="bg-slate-50">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-xs font-black uppercase text-slate-400">Arxius</CardTitle>
                                <Camera className="h-4 w-4 text-primary" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-black text-primary">{allMedia.length}</div>
                            </CardContent>
                        </Card>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <Separator />

                    {/* Daily Services section */}
                    <div>
                        <h3 className="text-xl font-black mb-4 uppercase tracking-tight">Detall per Dia</h3>
                        <div className="space-y-6">
                            {Object.keys(groupedServices).length > 0 ? (
                                Object.entries(groupedServices).map(([day, data]) => (
                                <Card key={day} className="border-none bg-slate-50/50 shadow-sm">
                                    <CardHeader>
                                        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                                            <CardTitle className="text-lg flex items-center gap-2 font-black uppercase">
                                                <CalendarIcon className="h-5 w-5 text-primary" />
                                                {format(parseISO(day), 'EEEE, dd MMMM yyyy', { locale: ca })}
                                            </CardTitle>
                                            <div className="flex items-center gap-2 font-black text-primary bg-white px-4 py-1 rounded-full shadow-sm">
                                                <Clock className="h-4 w-4" />
                                                <span>{data.totalTime}</span>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        {data.services.map(service => {
                                            const arrival = parseISO(service.arrivalDateTime);
                                            const departure = parseISO(service.departureDateTime);
                                            const isInProgress = arrival.getTime() === departure.getTime();
                                            const effectiveMinutes = calculateServiceEffectiveMinutes(service);
                                            return (
                                                <div key={service.id} className="p-4 rounded-xl border bg-white shadow-sm">
                                                    <div className="flex justify-between items-start gap-4">
                                                        <div className="flex-1">
                                                             <div className="flex items-center gap-2 text-sm font-black text-primary mb-2 uppercase">
                                                                <Clock className="h-4 w-4" />
                                                                <span>
                                                                    {isValid(arrival) ? format(arrival, 'HH:mm') : 'N/A'} - {isInProgress ? 'En curs' : (isValid(departure) ? format(departure, 'HH:mm') : 'N/A')}
                                                                </span>
                                                                <span className="text-[10px] text-slate-400">({(effectiveMinutes/60).toFixed(2)}h)</span>
                                                            </div>
                                                            <p className="text-slate-700 flex items-start gap-2 font-medium">
                                                                <FileText className="h-4 w-4 mt-1 flex-shrink-0 text-slate-300" />
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
                                <p className="text-muted-foreground text-center py-8 italic">No s'han trobat serveis per mostrar.</p>
                            )}
                        </div>
                    </div>
                    
                    {allMedia.length > 0 && (
                       <>
                        <Separator />
                        <div>
                            <h3 className="text-xl font-black mb-4 uppercase tracking-tight">Galeria Multimèdia</h3>
                             <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                                {allMedia.map((media, index) => (
                                    <div key={index} className="relative aspect-square rounded-xl overflow-hidden shadow-md border-2 border-white">
                                       {media.type === 'image' ? (
                                            <Image
                                                src={media.dataUrl}
                                                alt={`Media ${index + 1}`}
                                                fill
                                                sizes="(max-width: 640px) 33vw, 20vw"
                                                style={{ objectFit: 'cover' }}
                                            />
                                        ) : (
                                            <video src={media.dataUrl} className="w-full h-full object-cover" />
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                       </>
                    )}
                </CardContent>
                <CardFooter className="bg-slate-50 rounded-b-lg">
                    <p className="text-[10px] text-slate-400 w-full text-center font-bold uppercase tracking-widest">TS Serveis - Registre d'Activitat Automàtic</p>
                </CardFooter>
            </Card>
        </div>
    )
}
