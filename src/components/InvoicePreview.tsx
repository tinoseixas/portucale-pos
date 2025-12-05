'use client'
import React, { forwardRef, useMemo } from 'react';
import Image from 'next/image';
import { Separator } from '@/components/ui/separator';
import type { Customer, InvoiceItem, ServiceRecord, Employee } from '@/lib/types';
import { format, differenceInMinutes, parseISO, isValid } from 'date-fns';
import { ca } from 'date-fns/locale';
import { calculateTotalAmount } from '@/lib/calculations';

interface InvoicePreviewProps {
  customer: Customer | undefined;
  projectName: string;
  items: InvoiceItem[];
  invoiceNumber?: number;
  services: ServiceRecord[];
  employees: Employee[];
}

// --- Component ---
export const InvoicePreview = forwardRef<HTMLDivElement, InvoicePreviewProps>(({ customer, projectName, items, invoiceNumber, services, employees }, ref) => {
    
    const { subtotal, iva, totalGeneral } = useMemo(() => calculateTotalAmount(services, employees), [services, employees]);
    
    const getEmployeeName = (employeeId?: string) => {
        if (!employeeId || !employees) return 'Tècnic no assignat';
        const employee = employees.find(e => e.id === employeeId);
        return employee ? `${employee.firstName} ${employee.lastName}` : 'Tècnic desconegut';
    };

     const groupedByAlbaran = useMemo(() => {
        const grouped: { [key: number]: { services: ServiceRecord[], items: InvoiceItem[] } } = {};
        
        services.forEach(service => {
            const albaranNum = service.albaranNumber || 0;
            if (!grouped[albaranNum]) {
                grouped[albaranNum] = { services: [], items: [] };
            }
            grouped[albaranNum].services.push(service);
        });

        items.forEach(item => {
             const albaranNum = item.albaranNumber || 0;
             if (!grouped[albaranNum]) {
                grouped[albaranNum] = { services: [], items: [] };
            }
            grouped[albaranNum].items.push(item);
        });

        return Object.entries(grouped)
            .sort(([numA], [numB]) => Number(numA) - Number(numB));

    }, [services, items]);

    return (
        <div ref={ref} className="bg-white p-8 font-sans text-gray-900 printable-area">
            {/* Header */}
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #111827', paddingBottom: '1.5rem' }}>
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
                    <h1 className="text-3xl font-bold text-gray-900">Factura</h1>
                     {invoiceNumber && invoiceNumber > 0 && <p className="text-md text-gray-700 font-semibold">Nº: {String(invoiceNumber).padStart(4, '0')}</p>}
                    <p className="text-sm text-gray-600">Data: {format(new Date(), 'dd MMMM yyyy', { locale: ca })}</p>
                </div>
            </header>

            {/* Client and Project Info */}
            <section style={{ display: 'flex', justifyContent: 'space-between', gap: '2rem', marginTop: '2rem', marginBottom: '2rem' }}>
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
                    <p className="font-bold text-base">{projectName || 'No especificada'}</p>
                 </div>
            </section>
            
            <section className="page-break-before-auto">
                <h3 className="font-bold text-lg mb-4">Detall de la Factura</h3>
                
                {groupedByAlbaran.map(([albaranNum, { services: albaranServices, items: albaranItems }]) => (
                    <div key={albaranNum} className="mb-6 page-break-inside-avoid">
                        {Number(albaranNum) > 0 && (
                            <h4 className="font-bold text-md mb-2 bg-gray-100 p-2 rounded-md">Detalls de l'Albarà #{String(albaranNum).padStart(4, '0')}</h4>
                        )}
                        
                        {albaranServices.length > 0 && (
                             <table className="w-full text-sm mb-4">
                                <thead className="bg-gray-50">
                                    <tr className="border-b-2 border-gray-300">
                                        <th className="text-left py-2 px-3 font-semibold text-gray-600">DATA</th>
                                        <th className="text-left py-2 px-3 font-semibold text-gray-600">TÈCNIC</th>
                                        <th className="text-left py-2 px-3 font-semibold text-gray-600">DESCRIPCIÓ TASCA</th>
                                        <th className="text-right py-2 px-3 font-semibold text-gray-600">HORES</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {albaranServices.map(service => {
                                        const arrival = parseISO(service.arrivalDateTime);
                                        const departure = parseISO(service.departureDateTime);
                                        const minutes = (isValid(arrival) && isValid(departure) && departure > arrival) ? differenceInMinutes(departure, arrival) : 0;
                                        const hours = minutes > 0 ? (minutes / 60).toFixed(2) : '0.00';
                                        return (
                                            <tr key={service.id} className="border-b border-gray-200">
                                                <td className="py-2 px-3 align-top whitespace-nowrap">{format(arrival, 'dd/MM/yy')}</td>
                                                <td className="py-2 px-3 align-top">{service.employeeName || getEmployeeName(service.employeeId)}</td>
                                                <td className="py-2 px-3 align-top">{service.description}</td>
                                                <td className="py-2 px-3 align-top text-right tabular-nums">{hours}</td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        )}
                        
                        {albaranItems.length > 0 && (
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50">
                                <tr className="border-b-2 border-gray-300">
                                    <th className="text-left py-2 px-3 font-semibold text-gray-600">DESCRIPCIÓ MATERIAL</th>
                                    <th className="text-right py-2 px-3 font-semibold text-gray-600 w-24">QUANT.</th>
                                    <th className="text-right py-2 px-3 font-semibold text-gray-600 w-24">PREU/UNIT.</th>
                                    <th className="text-right py-2 px-3 font-semibold text-gray-600 w-24">TOTAL</th>
                                </tr>
                            </thead>
                            <tbody>
                                {albaranItems.map((item, index) => {
                                    const itemTotal = item.quantity * item.unitPrice;
                                    const discountAmount = itemTotal * ((item.discount || 0) / 100);
                                    const finalTotal = itemTotal - discountAmount;
                                    return (
                                    <React.Fragment key={`item-frag-${index}`}>
                                        <tr className="border-b border-gray-200">
                                            <td className="py-2 px-3">
                                                {item.description}
                                                {(item.discount || 0) > 0 && (
                                                    <span className="text-xs text-red-600 ml-2">(-{item.discount}%)</span>
                                                )}
                                            </td>
                                            <td className="text-right py-2 px-3 tabular-nums">{item.quantity.toFixed(2)}</td>
                                            <td className="text-right py-2 px-3 tabular-nums">{item.unitPrice.toFixed(2)} €</td>
                                            <td className="text-right py-2 px-3 font-medium tabular-nums">{finalTotal.toFixed(2)} €</td>
                                        </tr>
                                        {item.imageDataUrl && (
                                            <tr className="border-b border-gray-200 bg-gray-50">
                                                <td colSpan={4} className="py-3 px-3 text-center">
                                                    <Image src={item.imageDataUrl} alt={`Imatge per ${item.description}`} width={200} height={200} className="rounded-md object-contain mx-auto" />
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                )})}
                            </tbody>
                        </table>
                        )}
                    </div>
                ))}
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', alignItems: 'flex-start', marginTop: '1.5rem' }}>
                    <div style={{ flex: 1 }}>
                        {/* Placeholder for notes if needed */}
                    </div>
                    <div style={{ marginLeft: 'auto', width: '250px' }} className="space-y-2 text-sm">
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span className="font-semibold text-gray-700">Subtotal:</span>
                            <span className="font-medium tabular-nums">{subtotal.toFixed(2)} €</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span className="font-semibold text-gray-700">IGI ({String(calculateTotalAmount([], []).iva).slice(2, 4)}%):</span>
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

             <footer className="mt-16 pt-6 border-t text-center text-xs text-gray-500">
                <p>Gràcies per la seva confiança.</p>
                <p>Aquest document és una factura simplificada.</p>
            </footer>

        </div>
    )
})

InvoicePreview.displayName = "InvoicePreview";
