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
  showPricing: boolean;
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


export const ReportPreview = forwardRef<HTMLDivElement, ReportPreviewProps>(({ customer, projectName, services, showPricing }, ref) => {

    const totalTime = calculateTotalTime(services);
    const allMedia = services?.flatMap(s => s.media || []) || [];
    const allMaterials = services?.flatMap(s => s.materials || []) || [];
    const sortedServices = services.sort((a,b) => parseISO(a.arrivalDateTime).getTime() - parseISO(b.arrivalDateTime).getTime());
    
    const subtotal = allMaterials.reduce((acc, material) => acc + (material.quantity * material.unitPrice), 0);
    const ivaRate = 0.21; // 21%
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
                    <div>
                        <h2 className="font-bold text-xl text-gray-900">TS Serveis</h2>
                        <p className="text-sm text-gray-600">tino@seixas.com</p>
                    </div>
                </div>
                <div className="text-right">
                    <h1 className="text-3xl font-bold text-gray-900">Albarà</h1>
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
            
            {/* Materials & Labor Table */}
            {showPricing && (
              <section className="mb-8">
                  <h3 className="font-bold text-lg mb-2">Detall de Materials i Mà d'Obra</h3>
                  <table className="w-full text-sm">
                      <thead className="bg-gray-100">
                          <tr className="border-b border-gray-300">
                              <th className="text-left py-2 px-3 font-semibold text-gray-700">DESCRIPCIÓ</th>
                              <th className="text-right py-2 px-3 font-semibold text-gray-700 w-24">QUANT.</th>
                              <th className="text-right py-2 px-3 font-semibold text-gray-700 w-24">PREU/UNIT.</th>
                              <th className="text-right py-2 px-3 font-semibold text-gray-700 w-24">TOTAL</th>
                          </tr>
                      </thead>
                      <tbody>
                          {allMaterials.map((material, index) => (
                              <tr key={index} className="border-b border-gray-200">
                                  <td className="py-3 px-3">{material.description}</td>
                                  <td className="text-right py-3 px-3 tabular-nums">{material.quantity.toFixed(2)}</td>
                                  <td className="text-right py-3 px-3 tabular-nums">{material.unitPrice.toFixed(2)} €</td>
                                  <td className="text-right py-3 px-3 font-medium tabular-nums">{(material.quantity * material.unitPrice).toFixed(2)} €</td>
                              </tr>
                          ))}
                          {allMaterials.length === 0 && (
                              <tr>
                                  <td colSpan={4} className="text-center py-8 text-gray-500">No s'han registrat materials.</td>
                              </tr>
                          )}
                      </tbody>
                  </table>
                  <div className="flex justify-end mt-4">
                      <div className="w-full max-w-sm space-y-2 text-sm">
                          <div className="flex justify-between">
                              <span className="font-semibold text-gray-700">Subtotal:</span>
                              <span className="font-medium tabular-nums">{subtotal.toFixed(2)} €</span>
                          </div>
                          <div className="flex justify-between">
                              <span className="font-semibold text-gray-700">IVA ({(ivaRate * 100).toFixed(0)}%):</span>
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
            
             {sortedServices.length > 0 && (
                <>
                <div className="page-break-before-auto">
                    <Separator className="my-8" />
                    <section>
                        <h3 className="font-bold text-lg mb-4">Resum d'Hores i Tasques</h3>
                        <div className="space-y-4">
                            {sortedServices.map(service => (
                                <div key={service.id} className="border border-gray-200 p-4 rounded-lg break-inside-avoid">
                                    <div className="flex justify-between items-baseline mb-2">
                                        <h4 className="font-bold text-base flex items-center gap-2">
                                            <CalendarIcon className="h-4 w-4 text-gray-500" /> 
                                            {format(parseISO(service.arrivalDateTime), 'EEEE, dd MMMM yyyy', {locale: ca})}
                                        </h4>
                                        <span className="text-sm font-medium text-gray-600 flex items-center gap-2">
                                            <Clock className="h-4 w-4" /> 
                                            {format(parseISO(service.arrivalDateTime), 'HH:mm')} - {format(parseISO(service.departureDateTime), 'HH:mm')}
                                        </span>
                                    </div>
                                    <p className="pl-6 text-gray-700">{service.description}</p>
                                    {service.pendingTasks && (
                                        <div className="mt-2 text-sm text-amber-800 bg-amber-50 border border-amber-200 p-2 rounded-md ml-6">
                                            <h5 className="font-bold">Tasques Pendents:</h5>
                                            <p className="text-amber-700">{service.pendingTasks}</p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                         <div className="text-right font-bold text-lg mt-6 border-t pt-4">
                            Hores Totals Treballades: {totalTime}
                        </div>
                    </section>
                </div>
                </>
            )}

            <footer className="mt-16 pt-6 border-t text-center text-xs text-gray-500">
                <p>Gràcies per la seva confiança.</p>
                <p>Aquest document és un albarà i no té validesa fiscal completa fins a l'emissió de la factura corresponent.</p>
            </footer>

        </div>
    )
})

ReportPreview.displayName = "ReportPreview";
