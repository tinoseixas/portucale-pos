'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Clock, Briefcase, Camera } from 'lucide-react'
import { mockServices as initialServices } from '@/lib/data'
import { mockEmployee } from '@/lib/data'
import type { Service } from '@/lib/types'
import { format, differenceInMinutes } from 'date-fns'
import { ca } from 'date-fns/locale';

function calculateTotalTime(services: Service[]): string {
    const totalMinutes = services.reduce((total, service) => {
        if (service.startTime && service.endTime) {
            const [startHour, startMinute] = service.startTime.split(':').map(Number);
            const [endHour, endMinute] = service.endTime.split(':').map(Number);

            const startDate = new Date(0);
            startDate.setUTCHours(startHour, startMinute);

            const endDate = new Date(0);
            endDate.setUTCHours(endHour, endMinute);

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
    const [services] = useState<Service[]>(initialServices)
    const [employee] = useState(mockEmployee);
    const totalTime = calculateTotalTime(services);
    const today = format(new Date(), 'dd MMMM, yyyy', { locale: ca });

    const allPhotos = services.flatMap(s => s.photos);

    return (
        <div className="max-w-4xl mx-auto space-y-8">
             <div>
                <h1 className="text-3xl font-bold">Informe Diari</h1>
                <p className="text-muted-foreground">Resum de l'activitat per a {employee.name} el {today}.</p>
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
                                <div className="text-2xl font-bold">{services.length}</div>
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
                            {services.map(service => (
                                <Card key={service.id} className="bg-background">
                                    <CardContent className="pt-6">
                                        <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
                                            <p className="text-muted-foreground flex-1 pr-4">{service.description}</p>
                                            <div className="flex items-center gap-2 text-sm font-medium text-primary flex-shrink-0">
                                                <Clock className="h-4 w-4" />
                                                <span>{service.startTime} - {service.endTime}</span>
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
                                {allPhotos.map((photoUrl, index) => (
                                    <div key={index} className="relative aspect-square rounded-lg overflow-hidden shadow-md group">
                                        <Image
                                            src={photoUrl}
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
