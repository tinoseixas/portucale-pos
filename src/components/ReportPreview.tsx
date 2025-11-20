'use client'
import React, { forwardRef } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Clock, Briefcase, Camera, Video, Calendar as CalendarIcon, FileText, Building, Mail, Phone, Hash } from 'lucide-react';
import type { ServiceRecord, Customer, Employee } from '@/lib/types';
import { format, differenceInMinutes, parseISO, isValid, startOfDay } from 'date-fns';
import { ca } from 'date-fns/locale';

interface ReportPreviewProps {
  customer: Customer | undefined;
  projectName: string;
  services: ServiceRecord[];
}

function calculateTotalTime(services: ServiceRecord[]): string {
    if (!services) return '0h 0m';

    const totalMinutes = services.reduce((total, service) => {
        if (service.arrivalDateTime && service.departureDateTime) {
            const startDate = parseISO(service.arrivalDateTime);
            const endDate = parseISO(service.departureDateTime);

            if (!isValid(startDate) || !isValid(endDate) || startDate.getTime() === endDate.getTime()) {
              return total;
            }
            return total + differenceInMinutes(endDate, startDate);
        }
        return total;
    }, 0);

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    return `${hours}h ${minutes}m`;
}


export const ReportPreview = forwardRef<HTMLDivElement, ReportPreviewProps>(({ customer, projectName, services }, ref) => {

    const totalTime = calculateTotalTime(services);
    const allMedia = services?.flatMap(s => s.media || []) || [];
    const sortedServices = services.sort((a,b) => parseISO(a.arrivalDateTime).getTime() - parseISO(b.arrivalDateTime).getTime());

    return (
        <div ref={ref} className="bg-white p-8 font-sans text-gray-800">
            <header className="flex justify-between items-start mb-8">
                <div>
                     <h1 className="text-4xl font-bold text-gray-900">Informe de Serveis</h1>
                     <p className="text-gray-600">Generat el: {format(new Date(), 'dd MMMM yyyy', { locale: ca })}</p>
                </div>
                <div className="text-right">
                    <h2 className="font-bold text-lg">TS Serveis</h2>
                    <p className="text-sm">tino@seixas.com</p>
                </div>
            </header>

            <Separator className="my-8" />
            
            <section className="grid grid-cols-2 gap-8 mb-8">
                <div>
                    <h3 className="font-bold text-lg mb-2 border-b pb-1">Client</h3>
                    {customer ? (
                        <div className="space-y-1 text-sm">
                             <p className="flex items-center gap-2"><Building className="h-4 w-4 text-gray-500" /><strong>{customer.name}</strong></p>
                             <p className="flex items-center gap-2"><Hash className="h-4 w-4 text-gray-500" />{customer.nrt || 'N/A'}</p>
                             <p className="flex items-center gap-2"><Mail className="h-4 w-4 text_gray-500" />{customer.email || 'N/A'}</p>
                             <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-gray-500" />{customer.contact || 'N/A'}</p>
                        </div>
                    ) : <p>N/A</p>}
                </div>
                 <div>
                    <h3 className="font-bold text-lg mb-2 border-b pb-1">Obra</h3>
                    <p className="flex items-center gap-2"><Briefcase className="h-4 w-4 text-gray-500" /><strong>{projectName}</strong></p>
                 </div>
            </section>
            
            <Separator className="my-8" />

            <section className="mb-8">
                 <h3 className="font-bold text-2xl mb-4 text-center">Resum de l'Activitat</h3>
                 <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                        <p className="text-sm text-gray-500">Hores Totals</p>
                        <p className="text-2xl font-bold">{totalTime}</p>
                    </div>
                     <div>
                        <p className="text-sm text-gray-500">Serveis Realitzats</p>
                        <p className="text-2xl font-bold">{services.length}</p>
                    </div>
                     <div>
                        <p className="text-sm text-gray-500">Fotos Adjuntades</p>
                        <p className="text-2xl font-bold">{allMedia.length}</p>
                    </div>
                 </div>
            </section>

            <Separator className="my-8" />

            <section>
                 <h3 className="font-bold text-2xl mb-4 text-center">Detall de Serveis</h3>
                 <div className="space-y-4">
                    {sortedServices.map(service => (
                        <div key={service.id} className="border p-4 rounded-lg break-inside-avoid">
                            <h4 className="font-bold text-base flex items-center justify-between">
                                <span className="flex items-center gap-2">
                                    <CalendarIcon className="h-4 w-4" /> 
                                    {format(parseISO(service.arrivalDateTime), 'EEEE, dd MMMM yyyy', {locale: ca})}
                                </span>
                                <span className="text-sm text-primary font-medium flex items-center gap-2">
                                     <Clock className="h-4 w-4" /> 
                                     {format(parseISO(service.arrivalDateTime), 'HH:mm')} - {format(parseISO(service.departureDateTime), 'HH:mm')}
                                </span>
                            </h4>
                            <p className="my-2 text-sm text-gray-600">{service.description}</p>
                             {service.pendingTasks && (
                                <div className="mt-2 text-sm text-red-700 bg-red-50 border border-red-200 p-2 rounded">
                                    <h5 className="font-bold">Pendents:</h5>
                                    <p>{service.pendingTasks}</p>
                                </div>
                            )}
                        </div>
                    ))}
                 </div>
            </section>
            
             {allMedia.length > 0 && (
                <>
                <Separator className="my-8" />
                <section className="break-before-page">
                    <h3 className="font-bold text-2xl mb-4 text-center">Galeria de Fotos</h3>
                     <div className="grid grid-cols-2 gap-4">
                        {allMedia.map((media, index) => media.type === 'image' && (
                             <div key={index} className="border p-2 rounded-lg break-inside-avoid">
                                <div className="relative w-full" style={{paddingBottom: '75%'}}>
                                     <Image
                                        src={media.dataUrl}
                                        alt={`Media ${index + 1}`}
                                        layout="fill"
                                        objectFit="cover"
                                        className="rounded"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
                </>
            )}

        </div>
    )
})

ReportPreview.displayName = "ReportPreview";
