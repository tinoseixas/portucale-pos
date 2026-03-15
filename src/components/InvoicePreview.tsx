
'use client'
import React, { forwardRef, useMemo } from 'react';
import type { Customer, ServiceRecord, Employee } from '@/lib/types';
import { format } from 'date-fns';
import { ca } from 'date-fns/locale';
import { calculateTotalAmount } from '@/lib/calculations';
import { Logo } from '@/components/Logo';
import { BRANDING } from '@/lib/branding';
import { ReceiptText } from 'lucide-react';

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
    
    const { subtotal, iva, totalGeneral, totalHours, laborCost, extraCostsTotal } = totals;
    
    const allMaterials = useMemo(() => {
        return (services || []).flatMap(s => s.materials || []).filter(m => m.description.trim() !== '');
    }, [services]);

    const allAdditionalCosts = useMemo(() => {
        return (services || []).flatMap(service => {
            const list = service.additionalCosts ? [...service.additionalCosts] : [];
            if (service.extraCosts) {
                list.push({ description: 'Altres costos (llegat)', quantity: 1, unitPrice: service.extraCosts });
            }
            return list;
        }).filter(c => c.description.trim() !== '');
    }, [services]);

    return (
        <div ref={ref} className="bg-white p-12 font-sans text-slate-900 printable-area mx-auto flex flex-col gap-12" style={{ width: '210mm', minHeight: '297mm' }}>
            <header className="flex justify-between items-start border-b-8 border-primary pb-10 break-inside-avoid relative">
                <div className="space-y-6">
                    <Logo className="h-24 w-auto" />
                    <div className="text-[11px] leading-relaxed text-slate-500 font-medium tracking-tight">
                        <p className="text-primary font-bold mb-1">NRT: {BRANDING.nrt}</p>
                        <p>{BRANDING.address}</p>
                        <p>{BRANDING.location}</p>
                        <p>Tel: {BRANDING.phone} | {BRANDING.email}</p>
                    </div>
                </div>
                <div className="text-right flex flex-col items-end gap-2">
                    <h1 className="text-6xl font-black tracking-tighter text-primary leading-[1.1]">Factura</h1>
                    <div className="bg-accent text-primary px-6 py-2 rounded-lg inline-block text-2xl font-black">
                        #{String(invoiceNumber || 0).padStart(4, '0')}
                    </div>
                    <p className="text-slate-400 font-bold text-sm tracking-tight">
                        Data: {format(new Date(), 'dd MMMM yyyy', { locale: ca })}
                    </p>
                </div>
                {/* Línia d'accent vermell corporatiu */}
                <div className="absolute bottom-[-8px] right-0 w-1/4 h-2 bg-destructive"></div>
            </header>

            <div className="grid grid-cols-2 gap-12 break-inside-avoid">
                <div className="space-y-4 bg-slate-50 p-6 rounded-3xl border-l-8 border-primary">
                    <h3 className="text-[10px] font-bold text-slate-400 tracking-tight">Client</h3>
                    <div className="px-2">
                        <p className="font-black text-2xl text-slate-900">{customer?.name || '---'}</p>
                        <p className="text-base text-slate-500 mt-2 font-medium">{customer?.street || customer?.city || '---'}</p>
                        <p className="text-sm text-slate-400 font-bold mt-1">NIF/NRT: {customer?.nrt || '---'}</p>
                    </div>
                </div>
                <div className="text-right space-y-4 bg-slate-50 p-6 rounded-3xl border-r-8 border-accent">
                    <h3 className="text-[10px] font-bold text-slate-400 tracking-tight">Projecte de referència</h3>
                    <div className="px-2">
                        <p className="font-black text-2xl text-primary leading-tight">{projectName || 'Obra sense nom'}</p>
                        <p className="text-xs text-slate-400 font-bold mt-2 tracking-tight">Treballs i materials detallats</p>
                    </div>
                </div>
            </div>

            <div className="flex-grow">
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="bg-primary text-white text-[10px] font-bold tracking-tight">
                            <th className="py-4 px-6 text-left rounded-tl-xl">Concepte / descripció</th>
                            <th className="py-4 px-6 text-right w-24">Qt.</th>
                            <th className="py-4 px-6 text-right w-32">Preu unit.</th>
                            <th className="py-4 px-6 text-right w-32 rounded-tr-xl">Import</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm">
                        <tr className="border-b-2 border-slate-100 font-bold bg-slate-50/50 break-inside-avoid">
                            <td className="py-6 px-6">
                                <p className="font-black text-slate-900">Mà d'obra i treball tècnic</p>
                                <p className="text-[10px] text-slate-400 tracking-tight mt-1 font-medium italic">Execució especialitzada i desplaçament</p>
                            </td>
                            <td className="py-6 px-6 text-right tabular-nums text-slate-500">{totalHours.toFixed(2)} h</td>
                            <td className="py-6 px-6 text-right tabular-nums text-slate-500">{(laborCost / (totalHours || 1)).toFixed(2)} €</td>
                            <td className="py-6 px-6 text-right font-black tabular-nums">{laborCost.toFixed(2)} €</td>
                        </tr>
                        {allMaterials.map((m, i) => (
                            <tr key={i} className="border-b border-slate-100 hover:bg-slate-50/30 transition-colors break-inside-avoid">
                                <td className="py-4 px-6 text-slate-700 font-medium">{m.description}</td>
                                <td className="py-4 px-6 text-right tabular-nums text-slate-400">{m.quantity.toFixed(2)}</td>
                                <td className="py-4 px-6 text-right tabular-nums text-slate-400">{m.unitPrice.toFixed(2)} €</td>
                                <td className="py-4 px-6 text-right font-bold tabular-nums text-slate-900">{(m.quantity * m.unitPrice).toFixed(2)} €</td>
                            </tr>
                        ))}
                        {allAdditionalCosts.map((c, i) => (
                            <tr key={`extra-${i}`} className="border-b-2 border-slate-100 bg-slate-100/30 break-inside-avoid">
                                <td className="py-4 px-6 font-black text-slate-900 flex items-center gap-2">
                                    <ReceiptText className="h-4 w-4 text-destructive" /> {c.description}
                                </td>
                                <td className="py-4 px-6 text-right tabular-nums">{c.quantity.toFixed(2)}</td>
                                <td className="py-4 px-6 text-right tabular-nums">{c.unitPrice.toFixed(2)} €</td>
                                <td className="py-4 px-6 text-right font-black tabular-nums">{(c.quantity * c.unitPrice).toFixed(2)} €</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="flex justify-end pb-12 break-inside-avoid">
                <div className="w-96 bg-primary text-white p-8 rounded-[2rem] space-y-4 border-t-8 border-accent">
                    <div className="flex justify-between text-[11px] font-bold tracking-tight text-slate-300">
                        <span>Base imposable</span>
                        <span className="tabular-nums text-white">{subtotal.toFixed(2)} €</span>
                    </div>
                    {applyIva && (
                        <div className="flex justify-between text-[11px] font-bold tracking-tight text-slate-300">
                            <span>IGI (4.5%)</span>
                            <span className="tabular-nums text-white">{iva.toFixed(2)} €</span>
                        </div>
                    )}
                    <div className="pt-6 border-t border-white/20 flex justify-between items-center">
                        <span className="text-xl font-black tracking-tight text-accent">Total factura</span>
                        <span className="text-4xl font-black tabular-nums">{totalGeneral.toFixed(2)} €</span>
                    </div>
                </div>
            </div>

            <footer className="mt-auto border-t-2 border-slate-100 pt-8 flex justify-between items-end break-inside-avoid">
                <div className="text-[10px] text-slate-400 font-bold tracking-tight leading-relaxed">
                    <p>{BRANDING.companyName} - {BRANDING.slogan}</p>
                    <p className="mt-1">Pagament segons condicions acordades</p>
                </div>
                <div className="text-right">
                    <p className="text-[10px] font-black text-primary tracking-tight">Gràcies per la seva confiança</p>
                    <div className="flex gap-1 justify-end mt-2">
                        <div className="w-12 h-1.5 bg-primary rounded-full"></div>
                        <div className="w-6 h-1.5 bg-accent rounded-full"></div>
                        <div className="w-3 h-1.5 bg-destructive rounded-full"></div>
                    </div>
                </div>
            </footer>
        </div>
    );
});

InvoicePreview.displayName = "InvoicePreview";
