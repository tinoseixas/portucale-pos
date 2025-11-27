'use client'
import React, { forwardRef, useMemo } from 'react';
import Image from 'next/image';
import { Separator } from '@/components/ui/separator';
import { Calendar as CalendarIcon, Clock, User } from 'lucide-react';
import type { ServiceRecord, Customer, Employee } from '@/lib/types';
import { format, differenceInMinutes, parseISO, isValid } from 'date-fns';
import { ca } from 'date-fns/locale';
import { calculateTotalAmount, IVA_RATE } from '@/lib/calculations';


interface ReportPreviewProps {
  customer: Customer | undefined;
  projectName: string;
  services: ServiceRecord[];
  showPricing: boolean;
  albaranNumber: number | undefined;
  employees: Employee[];
}

type MaterialLine = {
    description: string;
    quantity: number;
    unitPrice: number;
}

// --- Component ---

export const ReportPreview = forwardRef<HTMLDivElement, ReportPreviewProps>(({ customer, projectName, services, showPricing, albaranNumber, employees }, ref) => {

    const sortedServices = useMemo(() => {
        if (!services) return [];
        return [...services].sort((a,b) => parseISO(a.arrivalDateTime).getTime() - parseISO(b.arrivalDateTime).getTime());
    }, [services]);
    
    // Use the centralized calculation functions from lib
    const { subtotal, iva, totalGeneral, totalHours, materialsSubtotal, laborCost } = calculateTotalAmount(sortedServices, employees);
    const totalTimeFormatted = `${Math.floor(totalHours)}h ${Math.round((totalHours % 1) * 60)}m`;

    const allMaterials = useMemo(() => {
        return sortedServices.flatMap(service => service.materials || []).filter(material => 
            !material.description.toLowerCase().includes('traball') && material.description.trim() !== ''
        );
    }, [sortedServices]);

    const getEmployeeName = (employeeId?: string) => {
        if (!employeeId || !employees) return 'Tècnic no assignat';
        const employee = employees.find(e => e.id === employeeId);
        return employee ? `${employee.firstName} ${employee.lastName}` : 'Tècnic desconegut';
    };

    return (
        <div ref={ref} className="bg-white p-8 font-sans text-gray-900 printable-area">
            {/* Header - Forced Flex Layout */}
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }} className="pb-6 border-b-2 border-gray-900">
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
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
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <h1 className="text-3xl font-bold text-gray-900">Albarà</h1>
                     {albaranNumber && albaranNumber > 0 && <p className="text-md text-gray-700 font-semibold">Nº: {String(albaranNumber).padStart(4, '0')}</p>}
                    <p className="text-sm text-gray-600">Data: {format(new Date(), 'dd MMMM yyyy', { locale: ca })}</p>
                </div>
            </header>

            {/* Client and Project Info - Forced Flex Layout */}
            <section style={{ display: 'flex', justifyContent: 'space-between', gap: '2rem' }} className="mt-8 mb-8">
                <div style={{ flex: 1 }}>
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
                 <div style={{ flex: 1, textAlign: 'right' }}>
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">OBRA</h3>
                    <p className="font-bold text-base">{projectName}</p>
                 </div>
            </section>
            
            {sortedServices.length > 0 && (
                <div className="page-break-before-auto">
                    <section>
                        <h3 className="font-bold text-lg mb-4">Resum de Tasques</h3>
                        <table className="w-full text-sm border-collapse">
                             <thead>
                                <tr className="border-b-2 border-gray-300 bg-gray-50">
                                    <th className="text-left py-2 px-3 font-semibold text-gray-600">DATA</th>
                                    <th className="text-left py-2 px-3 font-semibold text-gray-600">TÈCNIC</th>
                                    <th className="text-left py-2 px-3 font-semibold text-gray-600">DESCRIPCIÓ</th>
                                    <th className="text-right py-2 px-3 font-semibold text-gray-600">HORES</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedServices.map(service => {
                                    const arrival = parseISO(service.arrivalDateTime);
                                    const departure = parseISO(service.departureDateTime);
                                    const minutes = (isValid(arrival) && isValid(departure) && departure > arrival) ? differenceInMinutes(departure, arrival) : 0;
                                    const hours = minutes > 0 ? (minutes / 60).toFixed(2) : '0.00';

                                    return (
                                        <tr key={service.id} className="border-b border-gray-200">
                                            <td className="py-3 px-3 align-top whitespace-nowrap">{format(arrival, 'dd/MM/yy')}</td>
                                            <td className="py-3 px-3 align-top">{service.employeeName || getEmployeeName(service.employeeId)}</td>
                                            <td className="py-3 px-3 align-top">
                                                <p>{service.description}</p>
                                                {service.pendingTasks && (
                                                     <div className="mt-2 text-xs text-amber-800 bg-amber-50 border-l-4 border-amber-300 p-2">
                                                        <span className="font-bold">Pendents:</span> {service.pendingTasks}
                                                     </div>
                                                )}
                                            </td>
                                            <td className="py-3 px-3 align-top text-right tabular-nums">{hours}</td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </section>
                </div>
            )}
            
             {/* Total Pricing Section - Forced Layout */}
            {showPricing && (
              <section className="mt-8 pt-6 border-t-2 border-gray-900">
                    <h3 className="font-bold text-lg mb-4">Resum de Preços</h3>
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                            <tr className="border-b border-gray-200">
                                <th className="text-left py-2 px-3 font-semibold text-gray-600">DESCRIPCIÓ</th>
                                <th className="text-right py-2 px-3 font-semibold text-gray-600 w-24">QUANT.</th>
                                <th className="text-right py-2 px-3 font-semibold text-gray-600 w-24">PREU/UNIT.</th>
                                <th className="text-right py-2 px-3 font-semibold text-gray-600 w-24">TOTAL</th>
                            </tr>
                        </thead>
                        <tbody>
                            {allMaterials.map((material, index) => (
                                <tr key={`mat-${index}`} className="border-b border-gray-100">
                                    <td className="py-2 px-3">{material.description}</td>
                                    <td className="text-right py-2 px-3 tabular-nums">{material.quantity.toFixed(2)}</td>
                                    <td className="text-right py-2 px-3 tabular-nums">{material.unitPrice.toFixed(2)} €</td>
                                    <td className="text-right py-2 px-3 font-medium tabular-nums">{(material.quantity * material.unitPrice).toFixed(2)} €</td>
                                </tr>
                            ))}
                             {laborCost > 0 && (
                                <tr className="border-b border-gray-100">
                                    <td className="py-2 px-3">Mà d'obra (Hores totals)</td>
                                    <td className="text-right py-2 px-3 tabular-nums">{totalHours.toFixed(2)}</td>
                                    <td className="text-right py-2 px-3 tabular-nums">{laborCost > 0 ? (laborCost / totalHours).toFixed(2) : '0.00'} €</td>
                                    <td className="text-right py-2 px-3 font-medium tabular-nums">{laborCost.toFixed(2)} €</td>
                                </tr>
                            )}
                        </tbody>
                    </table>

                  <div style={{ display: 'flex', alignItems: 'flex-start' }} className="mt-6">
                    <div style={{ flex: 1 }}>
                        <div className="font-bold text-base mt-2">
                            Hores Totals Treballades: {totalTimeFormatted}
                        </div>
                    </div>
                    <div style={{ flex: 'none', width: '250px' }} className="space-y-2 text-sm">
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span className="font-semibold text-gray-700">Subtotal:</span>
                            <span className="font-medium tabular-nums">{subtotal.toFixed(2)} €</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span className="font-semibold text-gray-700">IGI ({(IVA_RATE * 100).toFixed(1)}%):</span>
                            <span className="font-medium tabular-nums">{iva.toFixed(2)} €</span>
                        </div>
                        <Separator />
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} className="font-bold text-base">
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
