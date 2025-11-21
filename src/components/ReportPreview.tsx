'use client'
import React, { forwardRef, useMemo } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Clock, Briefcase, Camera, Video, Calendar as CalendarIcon, FileText, Building, Mail, Phone, Hash, User } from 'lucide-react';
import type { ServiceRecord, Customer, Employee } from '@/lib/types';
import { format, differenceInMinutes, parseISO, isValid, startOfDay } from 'date-fns';
import { ca } from 'date-fns/locale';

interface ReportPreviewProps {
  customer: Customer | undefined;
  projectName: string;
  services: ServiceRecord[];
  showPricing: boolean;
  albaranNumber: number | undefined;
}

type MaterialLine = {
    description: string;
    quantity: number;
    unitPrice: number;
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


export const ReportPreview = forwardRef<HTMLDivElement, ReportPreviewProps>(({ customer, projectName, services, showPricing, albaranNumber }, ref) => {

    const sortedServices = services.sort((a,b) => parseISO(a.arrivalDateTime).getTime() - parseISO(b.arrivalDateTime).getTime());
    
    const allMaterials = useMemo(() => {
        return services.flatMap(service => service.materials || []);
    }, [services]);
    
    const totalTime = useMemo(() => calculateTotalTime(services), [services]);

    const subtotal = allMaterials.reduce((acc, material) => acc + (material.quantity * material.unitPrice), 0);
    const ivaRate = 0.045; // 4.5% IGI for Andorra
    const iva = subtotal * ivaRate;
    const totalGeneral = subtotal + iva;

    return (
        <div ref={ref} className="bg-white p-8 font-sans text-gray-900 printable-area">
            {/* Header */}
            <header className="flex justify-between items-start pb-6 border-b-2 border-gray-900">
                <div className="flex items-center gap-4">
                     <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary text-primary-foreground">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
                            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                        </svg>
                    </div>
                    <div className="text-sm text-gray-600">
                        <h2 className="font-bold text-xl text-gray-900">TS Serveis</h2>
                        <p>NRT: F352231c</p>
                        <p>Avinguda Francois Mitterrand 64, local 6</p>
                        <p>AD200 Encamp, Andorra</p>
                        <p>Tel: 376 396 048</p>
                        <p>Email: eg.ad.tecnica@gmail.com</p>
                    </div>
                </div>
                <div className="text-right">
                    <h1 className="text-3xl font-bold text-gray-900">Albarà</h1>
                     {albaranNumber && albaranNumber > 0 && <p className="text-md text-gray-700 font-semibold">Nº: {String(albaranNumber).padStart(4, '0')}</p>}
                    <p className="text-sm text-gray-600">Data: {format(new Date(), 'dd MMMM yyyy', { locale: ca })}</p>
                </div>
            </header>

            {/* Client and Project Info */}
            <section className="grid grid-cols-2 gap-8 mt-8 mb-8">
                <div>
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">CLIENT</h3>
                    {customer ? (
                        <div className="space-y-1 text-base">
                             <p className="font-bold">{customer.name}</p>
                             <p className="text-gray-600">{customer.address || ''}</p>
                             <p className="text-gray-600">{customer.nrt || 'NRT no especificat'}</p>
                             <p className="text-gray-600">{customer.email || ''}</p>
                             <p className="text-gray-600">{customer.contact || ''}</p>
                        </div>
                    ) : <p className="text-gray-600">No especificat</p>}
                </div>
                 <div className="text-right">
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">OBRA</h3>
                    <p className="font-bold text-base">{projectName}</p>
                 </div>
            </section>
            
            {sortedServices.length > 0 && (
                <div className="page-break-before-auto">
                    <Separator className="my-8" />
                    <section>
                        <h3 className="font-bold text-lg mb-4">Resum d'Hores i Tasques</h3>
                        <div className="space-y-6">
                            {sortedServices.map(service => (
                                <div key={service.id} className="border border-gray-200 p-4 rounded-lg break-inside-avoid">
                                    <div className="flex justify-between items-baseline mb-3 flex-wrap border-b pb-3">
                                        <h4 className="font-bold text-base flex items-center gap-2">
                                            <CalendarIcon className="h-4 w-4 text-gray-500" /> 
                                            {format(parseISO(service.arrivalDateTime), 'EEEE, dd MMMM yyyy', {locale: ca})}
                                        </h4>
                                        <span className="text-sm font-medium text-gray-600 flex items-center gap-2">
                                            <Clock className="h-4 w-4" /> 
                                            {format(parseISO(service.arrivalDateTime), 'HH:mm')} - {format(parseISO(service.departureDateTime), 'HH:mm')}
                                        </span>
                                    </div>
                                    <div className="pl-1 space-y-3">
                                        {service.employeeName && (
                                            <p className="text-sm text-gray-600 flex items-center gap-2">
                                                <User className="h-4 w-4" />
                                                <span>{service.employeeName}</span>
                                            </p>
                                        )}
                                        <div>
                                            <h5 className="font-semibold text-sm mb-1">Descripció de Tasques:</h5>
                                            <p className="text-gray-700 text-sm">{service.description}</p>
                                        </div>
                                        
                                        {service.pendingTasks && (
                                            <div className="mt-2 text-sm text-amber-800 bg-amber-50 border border-amber-200 p-2 rounded-md">
                                                <h5 className="font-bold">Tasques Pendents:</h5>
                                                <p className="text-amber-700">{service.pendingTasks}</p>
                                            </div>
                                        )}
                                    </div>
                                    
                                     {showPricing && service.materials && service.materials.length > 0 && (
                                        <div className="mt-4">
                                            <h5 className="font-semibold text-sm mb-2">Materials i Mà d'Obra:</h5>
                                            <table className="w-full text-xs">
                                                <thead className="bg-gray-50">
                                                    <tr className="border-b border-gray-200">
                                                        <th className="text-left py-1 px-2 font-semibold text-gray-600">DESCRIPCIÓ</th>
                                                        <th className="text-right py-1 px-2 font-semibold text-gray-600 w-20">QUANT.</th>
                                                        <th className="text-right py-1 px-2 font-semibold text-gray-600 w-20">PREU/UNIT.</th>
                                                        <th className="text-right py-1 px-2 font-semibold text-gray-600 w-20">TOTAL</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {service.materials.map((material, index) => (
                                                        <tr key={index} className="border-b border-gray-100">
                                                            <td className="py-2 px-2">{material.description}</td>
                                                            <td className="text-right py-2 px-2 tabular-nums">{material.quantity.toFixed(2)}</td>
                                                            <td className="text-right py-2 px-2 tabular-nums">{material.unitPrice.toFixed(2)} €</td>
                                                            <td className="text-right py-2 px-2 font-medium tabular-nums">{(material.quantity * material.unitPrice).toFixed(2)} €</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}

                                </div>
                            ))}
                        </div>
                    </section>
                </div>
            )}
            
             {/* Total Pricing Section */}
            {showPricing && (
              <section className="mt-8 pt-6 border-t-2 border-gray-900">
                  <div className="flex justify-between items-start">
                    <div>
                        <h3 className="font-bold text-lg">Resum Total</h3>
                         <div className="text-right font-bold text-base mt-2">
                            Hores Totals Treballades: {totalTime}
                        </div>
                    </div>
                    <div className="w-full max-w-sm space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="font-semibold text-gray-700">Subtotal:</span>
                            <span className="font-medium tabular-nums">{subtotal.toFixed(2)} €</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="font-semibold text-gray-700">IGI ({(ivaRate * 100).toFixed(1)}%):</span>
                            <span className="font-medium tabular-nums">{iva.toFixed(2)} €</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between font-bold text-base items-center">
                            <span>Total General:</span>
                            <span className="text-xl">{totalGeneral.toFixed(2)} €</span>
                        </div>
                    </div>
                  </div>
              </section>
            )}


            <footer className="mt-16 pt-6 border-t text-center text-xs text-gray-500">
                <p>Gràcies per la seva confiança.</p>
                <p>Aquest document és un albarà i no té validesa fiscal completa fins a l'emissió de la factura corresponent.</p>
            </footer>

        </div>
    )
})

ReportPreview.displayName = "ReportPreview";
