'use client'
import React, { forwardRef, useMemo } from 'react';
import type { Customer, ServiceRecord, Employee } from '@/lib/types';
import { format, parseISO, isValid } from 'date-fns';
import { ca } from 'date-fns/locale';
import { calculateTotalAmount, calculateServiceEffectiveMinutes, getMealBreakOverlapMinutes } from '@/lib/calculations';
import { Logo } from '@/components/Logo';

interface InvoicePreviewProps {
  customer: Customer | undefined;
  projectName: string;
  invoiceNumber?: number;
  services: ServiceRecord[];
  employees: Employee[];
  applyIva?: boolean;
}

export const InvoicePreview = forwardRef<HTMLDivElement, InvoicePreviewProps>((props, ref) => {
    const { customer, projectName, invoiceNumber, services, employees, applyIva = true } = props;
    
    const totals = useMemo(() => {
        return calculateTotalAmount(services, employees, applyIva);
    }, [services, employees, applyIva]);
    
    const { subtotal, iva, totalGeneral, totalHours, laborCost } = totals;
    
    const getEmployeeName = (service: ServiceRecord) => {
        const employee = employees.find(e => e.id === service.employeeId);
        return employee ? `${employee.firstName} ${employee.lastName}` : (service.employeeName || 'Tècnic');
    };

    const groupedByAlbaran = useMemo(() => {
        const grouped: { [key: number]: { services: ServiceRecord[], items: any[] } } = {};
        const safeServices = services || [];
        
        safeServices.forEach(service => {
            const albaranNum = service.albaranNumber || 0;
            if (!grouped[albaranNum]) {
                grouped[albaranNum] = { services: [], items: [] };
            }
            grouped[albaranNum].services.push(service);
            if (service.materials) {
                grouped[albaranNum].items.push(...service.materials);
            }
        });

        return Object.entries(grouped)
            .sort(([numA], [numB]) => Number(numA) - Number(numB));

    }, [services]);

    const hourlyRateDisplay = totalHours > 0 ? (laborCost / totalHours).toFixed(2) : "0.00";

    return (
        <div ref={ref} className="bg-white p-12 font-sans text-gray-900 printable-area mx-auto flex flex-col" style={{ width: '210mm', minHeight: '297mm' }}>
            <header className="flex justify-between items-center border-b-2 border-slate-900 pb-8 mb-8 break-inside-avoid">
                <div className="flex flex-col gap-4">
                    <Logo className="h-24 w-auto" />
                    <div className="text-sm text-gray-600">
                        <p className="font-bold text-gray-900">NRT: F352231c</p>
                        <p>Av. Francois Mitterrand 64, local 6</p>
                        <p>AD200 Encamp, Andorra</p>
                        <p>Tel: 376 396 048 | eg.ad.tecnica@gmail.com</p>
                    </div>
                </div>
                <div className="text-right">
                    <h1 className="text-4xl font-black text-gray-900 uppercase tracking-tighter">Factura</h1>
                     {invoiceNumber && invoiceNumber > 0 && <p className="text-xl text-primary font-black mt-2">Nº: {String(invoiceNumber).padStart(4, '0')}</p>}
                    <p className="text-sm text-gray-500 mt-1">Data: {format(new Date(), 'dd MMMM yyyy', { locale: ca })}</p>
                </div>
            </header>

            <section className="flex justify-between gap-8 my-8 break-inside-avoid">
                <div className="flex-1">
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">DADES DEL CLIENT</h3>
                    {customer ? (
                        <div className="space-y-1 text-base">
                             <p className="font-black text-xl">{customer.name}</p>
                             <p className="text-gray-600">{customer.address || ''}</p>
                             <p className="text-gray-600">NIF: {customer.nrt || '-'}</p>
                        </div>
                    ) : <p className="text-gray-600 italic">No especificat</p>}
                </div>
                 <div className="flex-1 text-right">
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">PROJECTE / OBRA</h3>
                    <p className="font-black text-xl text-primary uppercase">{projectName || 'No especificada'}</p>
                 </div>
            </section>
            
            <section className="space-y-8 flex-grow">
                <h3 className="font-black text-lg mb-4 border-b-2 pb-2 uppercase tracking-tight">Detall de Treballs i Materials</h3>
                
                {groupedByAlbaran.map(([albaranNum, { services: albaranServices, items: albaranItems }]) => (
                    <div key={albaranNum} className="mb-8 break-inside-avoid">
                        {Number(albaranNum) > 0 && (
                            <h4 className="font-bold text-sm mb-3 bg-slate-100 p-2 rounded border-l-4 border-primary">Albarà de Referència #{String(albaranNum).padStart(4, '0')}</h4>
                        )}
                        
                        {albaranServices.length > 0 && (
                             <table className="w-full text-xs mb-4 border-collapse">
                                <thead className="bg-slate-50">
                                    <tr className="border-b-2 border-gray-300">
                                        <th className="text-left py-2 px-3 font-bold text-gray-600 uppercase">Data</th>
                                        <th className="text-left py-2 px-3 font-bold text-gray-600 uppercase">Tècnic</th>
                                        <th className="text-left py-2 px-3 font-bold text-gray-600 uppercase">Descripció</th>
                                        <th className="text-right py-2 px-3 font-bold text-gray-600 uppercase">Hores</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {albaranServices.map(service => {
                                        const arrival = parseISO(service.arrivalDateTime);
                                        const departure = parseISO(service.departureDateTime);
                                        const effectiveMinutes = calculateServiceEffectiveMinutes(service);
                                        const mealMinutes = service.isLunchSubtracted !== false ? getMealBreakOverlapMinutes(arrival, departure) : 0;
                                        const hours = (effectiveMinutes / 60).toFixed(2);
                                        return (
                                            <tr key={service.id} className="border-b border-gray-100 break-inside-avoid">
                                                <td className="py-2 px-3 align-top whitespace-nowrap font-medium text-gray-500">{format(arrival, 'dd/MM/yy')}</td>
                                                <td className="py-2 px-3 align-top font-bold">{getEmployeeName(service)}</td>
                                                <td className="py-2 px-3 align-top text-gray-700">{service.description}</td>
                                                <td className="py-2 px-3 align-top text-right font-bold tabular-nums">
                                                    {hours} h
                                                    {mealMinutes > 0 && <span className="block text-[8px] text-gray-400 font-bold mt-0.5">-(refecció)</span>}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                        
                        {albaranItems.length > 0 && (
                        <table className="w-full text-xs border-collapse">
                            <thead className="bg-slate-50">
                                <tr className="border-b-2 border-gray-300">
                                    <th className="text-left py-2 px-3 font-bold text-gray-600 uppercase">Material</th>
                                    <th className="text-right py-2 px-3 font-bold text-gray-600 w-20 uppercase">Qt.</th>
                                    <th className="text-right py-2 px-3 font-bold text-gray-600 w-24 uppercase">PVP</th>
                                    <th className="text-right py-2 px-3 font-bold text-gray-600 w-24 uppercase">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {albaranItems.map((item, index) => {
                                    const itemTotal = item.quantity * item.unitPrice;
                                    return (
                                        <tr key={`item-${index}`} className="border-b border-gray-100 break-inside-avoid">
                                            <td className="py-2 px-3 font-medium">{item.description}</td>
                                            <td className="text-right py-2 px-3 tabular-nums">{item.quantity.toFixed(2)}</td>
                                            <td className="text-right py-2 px-3 tabular-nums">{item.unitPrice.toFixed(2)} €</td>
                                            <td className="text-right py-2 px-3 font-bold tabular-nums text-gray-900">{itemTotal.toFixed(2)} €</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        )}
                    </div>
                ))}
                
                <div className="mt-12 pt-6 border-t-2 border-slate-100 break-inside-avoid">
                    <div className="flex justify-between items-center bg-slate-50 p-6 rounded-xl border border-slate-200">
                        <div>
                            <p className="text-sm font-black text-slate-900 uppercase tracking-tight">Mà d'obra i Treball Tècnic</p>
                            <p className="text-xs text-slate-500 mt-1 italic">Hores facturables: <strong>{totalHours.toFixed(2)} h</strong> | Valor hora: <strong>{hourlyRateDisplay} €/h</strong></p>
                        </div>
                        <div className="text-right">
                            <p className="text-xl font-black text-slate-900">{laborCost.toFixed(2)} €</p>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end mt-12 pb-12 break-inside-avoid">
                    <div className="w-80 space-y-3 bg-slate-900 text-white p-8 rounded-2xl shadow-xl border-4 border-primary/20">
                        <div className="flex justify-between text-sm font-bold uppercase tracking-wider text-slate-400">
                            <span>Subtotal:</span>
                            <span className="tabular-nums">{subtotal.toFixed(2)} €</span>
                        </div>
                        {applyIva && (
                            <div className="flex justify-between text-sm font-bold uppercase tracking-wider text-slate-400">
                                <span>IGI (4.5%):</span>
                                <span className="tabular-nums">{iva.toFixed(2)} €</span>
                            </div>
                        )}
                        <div className="pt-4 border-t border-slate-700 flex justify-between items-center">
                            <span className="text-lg font-black uppercase tracking-tighter text-primary">Total Factura</span>
                            <span className="text-3xl font-black tabular-nums">{totalGeneral.toFixed(2)} €</span>
                        </div>
                    </div>
                </div>
            </section>

             <footer className="mt-auto pt-8 border-t text-center text-[10px] text-gray-400 uppercase tracking-widest font-bold break-inside-avoid">
                <p>TS SERVEIS - Solucions Tècniques i Manteniment</p>
                <p className="mt-2 text-slate-300 font-bold">HORARI DE DINAR (13H-14H) EXCLÒS QUAN S'APLICA | ARREDONIMENT CADA 30 MIN</p>
                <p className="mt-1">CONVERTIM LES TEVES IDEES EN REALITAT</p>
            </footer>
        </div>
    );
});

InvoicePreview.displayName = "InvoicePreview";
