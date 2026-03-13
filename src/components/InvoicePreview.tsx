
'use client'
import React, { forwardRef, useMemo } from 'react';
import type { Customer, ServiceRecord, Employee } from '@/lib/types';
import { format } from 'date-fns';
import { ca } from 'date-fns/locale';
import { calculateTotalAmount } from '@/lib/calculations';
import { Logo } from '@/components/Logo';
import { BRANDING } from '@/lib/branding';

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
    
    const allMaterials = useMemo(() => {
        return (services || []).flatMap(s => s.materials || []).filter(m => m.description.trim() !== '');
    }, [services]);

    return (
        <div ref={ref} className="bg-white p-12 font-sans text-slate-900 printable-area mx-auto flex flex-col gap-12" style={{ width: '210mm', minHeight: '297mm' }}>
            {/* CAPÇALERA AMB COLORS CORPORATIUS */}
            <header className="flex justify-between items-start border-b-8 border-primary pb-10 break-inside-avoid">
                <div className="space-y-6">
                    <Logo className="h-24 w-auto" />
                    <div className="text-[11px] leading-relaxed text-slate-500 font-bold uppercase tracking-widest">
                        <p className="text-primary font-black mb-1">NRT: {BRANDING.nrt}</p>
                        <p>{BRANDING.address}</p>
                        <p>{BRANDING.location}</p>
                        <p>TEL: {BRANDING.phone} | {BRANDING.email}</p>
                    </div>
                </div>
                <div className="text-right space-y-3">
                    <h1 className="text-6xl font-black uppercase tracking-tighter text-primary leading-none">Factura</h1>
                    <div className="bg-accent text-primary px-6 py-2 rounded-lg inline-block text-2xl font-black shadow-sm">
                        #{String(invoiceNumber || 0).padStart(4, '0')}
                    </div>
                    <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">
                        Data: {format(new Date(), 'dd MMMM yyyy', { locale: ca })}
                    </p>
                </div>
            </header>

            {/* BLOC INFO CLIENT I OBRA */}
            <div className="grid grid-cols-2 gap-12 break-inside-avoid">
                <div className="space-y-4 bg-slate-50 p-6 rounded-3xl border-l-8 border-primary">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Client</h3>
                    <div className="px-2">
                        <p className="font-black text-2xl text-slate-900 uppercase">{customer?.name || '---'}</p>
                        <p className="text-base text-slate-500 mt-2 font-medium">{customer?.street || customer?.city || '---'}</p>
                        <p className="text-sm text-slate-400 font-bold mt-1">NIF/NRT: {customer?.nrt || '---'}</p>
                    </div>
                </div>
                <div className="text-right space-y-4 bg-slate-50 p-6 rounded-3xl border-r-8 border-accent">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Projecte de Referència</h3>
                    <div className="px-2">
                        <p className="font-black text-2xl text-primary uppercase leading-tight">{projectName || 'Obra sense nom'}</p>
                        <p className="text-xs text-slate-400 font-bold mt-2 uppercase tracking-widest">Treballs i Materials detallats</p>
                    </div>
                </div>
            </div>

            {/* TAULA DE CONCEPTES PROFESSIONALS */}
            <div className="flex-grow">
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="bg-primary text-white text-[10px] font-black uppercase tracking-widest">
                            <th className="py-4 px-6 text-left rounded-tl-xl">Concepte / Descripció</th>
                            <th className="py-4 px-6 text-right w-24">Qt.</th>
                            <th className="py-4 px-6 text-right w-32">Preu Unit.</th>
                            <th className="py-4 px-6 text-right w-32 rounded-tr-xl">Import</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm">
                        {/* MÀ D'OBRA UNITÀRIA */}
                        <tr className="border-b-2 border-slate-100 font-bold bg-slate-50/50">
                            <td className="py-6 px-6">
                                <p className="font-black text-slate-900 uppercase">Mà d'obra i Treball Tècnic</p>
                                <p className="text-[10px] text-slate-400 uppercase tracking-tight mt-1 font-medium italic">Execució especialitzada i desplaçament</p>
                            </td>
                            <td className="py-6 px-6 text-right tabular-nums text-slate-500">{totalHours.toFixed(2)} h</td>
                            <td className="py-6 px-6 text-right tabular-nums text-slate-500">{(laborCost / (totalHours || 1)).toFixed(2)} €</td>
                            <td className="py-6 px-6 text-right font-black tabular-nums">{laborCost.toFixed(2)} €</td>
                        </tr>

                        {/* MATERIALS */}
                        {allMaterials.map((m, i) => (
                            <tr key={i} className="border-b border-slate-100 hover:bg-slate-50/30 transition-colors">
                                <td className="py-4 px-6 text-slate-700 font-medium">{m.description}</td>
                                <td className="py-4 px-6 text-right tabular-nums text-slate-400">{m.quantity.toFixed(2)}</td>
                                <td className="py-4 px-6 text-right tabular-nums text-slate-400">{m.unitPrice.toFixed(2)} €</td>
                                <td className="py-4 px-6 text-right font-bold tabular-nums text-slate-900">{(m.quantity * m.unitPrice).toFixed(2)} €</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* RESUM FINANCER D'ALTA VISIBILITAT */}
            <div className="flex justify-end pb-12 break-inside-avoid">
                <div className="w-96 bg-primary text-white p-8 rounded-[2rem] shadow-2xl space-y-4 border-t-8 border-accent">
                    <div className="flex justify-between text-[11px] font-black uppercase text-slate-300 tracking-[0.2em]">
                        <span>Base Imposable</span>
                        <span className="tabular-nums text-white">{subtotal.toFixed(2)} €</span>
                    </div>
                    {applyIva && (
                        <div className="flex justify-between text-[11px] font-black uppercase text-slate-300 tracking-[0.2em]">
                            <span>IGI (4.5%)</span>
                            <span className="tabular-nums text-white">{iva.toFixed(2)} €</span>
                        </div>
                    )}
                    <div className="pt-6 border-t border-white/20 flex justify-between items-center">
                        <span className="text-xl font-black uppercase tracking-tighter text-accent">Total Factura</span>
                        <span className="text-4xl font-black tabular-nums">{totalGeneral.toFixed(2)} €</span>
                    </div>
                </div>
            </div>

            {/* PEU DE PÀGINA AMB COLORS DE MARCA */}
            <footer className="mt-auto border-t-2 border-slate-100 pt-8 flex justify-between items-end break-inside-avoid">
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
                    <p>{BRANDING.companyName} - {BRANDING.slogan}</p>
                    <p className="mt-1">Pagament segons condicions acordades</p>
                </div>
                <div className="text-right">
                    <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Gràcies per la seva confiança</p>
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
