
'use client'
import React, { forwardRef, useMemo } from 'react';
import type { Customer } from '@/lib/types';
import { format } from 'date-fns';
import { ca } from 'date-fns/locale';
import { Logo } from '@/components/Logo';
import { BRANDING } from '@/lib/branding';

const IVA_RATE = 0.045;

interface QuoteItem {
    description: string;
    quantity: number;
    unitPrice: number;
    imageDataUrl?: string;
    discount?: number;
    category?: string;
}

interface QuotePreviewProps {
  customer: Customer | undefined;
  projectName: string;
  items: QuoteItem[];
  labor: { description: string; cost: number };
  quoteNumber?: number;
  notes?: string;
}

export const QuotePreview = forwardRef<HTMLDivElement, QuotePreviewProps>(({ customer, projectName, items, labor, quoteNumber, notes }, ref) => {

    const { groupedItems, materialsSubtotal } = useMemo(() => {
        let subtotalAccumulator = 0;
        const groups = new Map<string, QuoteItem[]>();
        
        (items || []).forEach(item => {
            const itemTotal = item.quantity * item.unitPrice;
            const discountAmount = itemTotal * ((item.discount || 0) / 100);
            subtotalAccumulator += (itemTotal - discountAmount);

            const cat = item.category || 'General';
            if (!groups.has(cat)) groups.set(cat, []);
            groups.get(cat)!.push(item);
        });
        
        return { 
            groupedItems: groups,
            materialsSubtotal: subtotalAccumulator
        };
    }, [items]);

    const subtotal = materialsSubtotal + labor.cost;
    const iva = subtotal * IVA_RATE;
    const totalGeneral = subtotal + iva;

    return (
        <div ref={ref} className="bg-white p-12 font-sans text-slate-900 printable-area mx-auto flex flex-col gap-12" style={{ width: '210mm', minHeight: '297mm' }}>
            {/* HEADER PROFESSIONAL */}
            <header className="flex justify-between items-start border-b-4 border-slate-900 pb-10 break-inside-avoid">
                <div className="space-y-6">
                    <Logo className="h-24 w-auto" />
                    <div className="text-[11px] leading-relaxed text-slate-500 font-bold uppercase tracking-widest">
                        <p className="text-slate-900 font-black mb-1">NRT: {BRANDING.nrt}</p>
                        <p>{BRANDING.address}</p>
                        <p>{BRANDING.location}</p>
                        <p>TEL: {BRANDING.phone} | {BRANDING.email}</p>
                    </div>
                </div>
                <div className="text-right space-y-2">
                    <h1 className="text-6xl font-black uppercase tracking-tighter text-slate-900 leading-none">Pressupost</h1>
                    <div className="bg-primary text-white px-6 py-2 rounded inline-block text-2xl font-black">
                        #{String(quoteNumber || 0).padStart(4, '0')}
                    </div>
                    <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">
                        Vàlid fins: {format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'dd/MM/yyyy', { locale: ca })}
                    </p>
                </div>
            </header>

            {/* INFO CLIENT I OBRA */}
            <div className="grid grid-cols-2 gap-16 break-inside-avoid">
                <div className="bg-slate-50 p-8 rounded-3xl border-2 border-slate-100 space-y-4">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] border-b pb-2">Destinatari</h3>
                    <div>
                        <p className="font-black text-2xl text-slate-900 uppercase leading-none">{customer?.name || '---'}</p>
                        <p className="text-base text-slate-500 mt-2 font-medium">{customer?.street || '---'}</p>
                        <p className="text-sm text-slate-400 font-bold mt-1">NRT: {customer?.nrt || '---'}</p>
                    </div>
                </div>
                <div className="text-right space-y-4">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] border-b pb-2">Objecte de la Proposta</h3>
                    <div>
                        <p className="font-black text-3xl text-primary uppercase leading-tight tracking-tighter">{projectName || 'Proposta Tècnica'}</p>
                        <p className="text-xs text-slate-400 font-bold mt-3 uppercase tracking-widest italic">Data emissió: {format(new Date(), 'dd/MM/yyyy')}</p>
                    </div>
                </div>
            </div>

            {/* DETALL DE CATEGORIES */}
            <div className="flex-grow space-y-10">
                {Array.from(groupedItems.entries()).map(([category, catItems], idx) => {
                    const catTotal = catItems.reduce((acc, item) => acc + (item.quantity * item.unitPrice * (1 - (item.discount || 0)/100)), 0);
                    return (
                        <div key={idx} className="space-y-4 break-inside-avoid">
                            <div className="flex justify-between items-center border-b-2 border-slate-900 pb-2">
                                <h4 className="text-sm font-black uppercase tracking-[0.2em] text-slate-900">{category}</h4>
                                <span className="text-[10px] font-black text-slate-400 uppercase">Resum Secció: {catTotal.toFixed(2)} €</span>
                            </div>
                            <table className="w-full border-collapse">
                                <thead className="bg-slate-50 text-[9px] font-black uppercase tracking-widest text-slate-500">
                                    <tr>
                                        <th className="py-2 px-4 text-left">Descripció Article</th>
                                        <th className="py-2 px-4 text-right w-24">Quantitat</th>
                                        <th className="py-2 px-4 text-right w-28">PVP</th>
                                        <th className="py-2 px-4 text-right w-20">Dte.</th>
                                        <th className="py-2 px-4 text-right w-32">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="text-xs">
                                    {catItems.map((item, i) => {
                                        const finalPrice = item.unitPrice * (1 - (item.discount || 0)/100);
                                        return (
                                            <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50">
                                                <td className="py-3 px-4 font-medium text-slate-700">{item.description}</td>
                                                <td className="py-3 px-4 text-right tabular-nums text-slate-400">{item.quantity.toFixed(2)}</td>
                                                <td className="py-3 px-4 text-right tabular-nums text-slate-400">{item.unitPrice.toFixed(2)} €</td>
                                                <td className="py-3 px-4 text-right tabular-nums text-primary font-bold">{item.discount || 0}%</td>
                                                <td className="py-3 px-4 text-right font-black tabular-nums text-slate-900">{(item.quantity * finalPrice).toFixed(2)} €</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    );
                })}

                {labor.cost > 0 && (
                    <div className="p-6 bg-slate-50 rounded-2xl border-2 border-slate-100 flex justify-between items-center break-inside-avoid shadow-sm">
                        <div className="space-y-1">
                            <p className="font-black text-slate-900 uppercase text-sm">{labor.description || "Mà d'obra"}</p>
                            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Instal·lació, transport i muntatge inclòs</p>
                        </div>
                        <span className="text-2xl font-black tabular-nums text-slate-900">{labor.cost.toFixed(2)} €</span>
                    </div>
                )}
            </div>

            {/* RESUM FINANCER */}
            <div className="flex justify-end pb-12 break-inside-avoid">
                <div className="w-96 bg-slate-900 text-white p-8 rounded-[2rem] shadow-2xl space-y-4 border-4 border-primary/20">
                    <div className="flex justify-between text-[11px] font-black uppercase text-slate-400 tracking-[0.2em]">
                        <span>Suma Conceptes</span>
                        <span className="tabular-nums">{subtotal.toFixed(2)} €</span>
                    </div>
                    <div className="flex justify-between text-[11px] font-black uppercase text-slate-400 tracking-[0.2em]">
                        <span>IGI (4.5%)</span>
                        <span className="tabular-nums">{iva.toFixed(2)} €</span>
                    </div>
                    <div className="pt-6 border-t border-slate-700 flex justify-between items-center">
                        <span className="text-xl font-black uppercase tracking-tighter text-primary">Total Pressupost</span>
                        <span className="text-4xl font-black tabular-nums">{totalGeneral.toFixed(2)} €</span>
                    </div>
                </div>
            </div>

            {/* NOTES I CONDICIONS */}
            {notes && (
                <section className="bg-slate-50 p-8 rounded-3xl border-2 border-slate-100 break-inside-avoid">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-900 mb-4 border-b pb-2">Condicions i Terminis</h4>
                    <div className="text-xs text-slate-600 leading-relaxed italic whitespace-pre-wrap">{notes}</div>
                </section>
            )}

            {/* PEU DE PÀGINA */}
            <footer className="mt-auto border-t-2 border-slate-100 pt-8 text-center break-inside-avoid">
                <p className="text-[10px] text-slate-300 font-black uppercase tracking-[0.5em]">TS SERVEIS - Solucions Tècniques i Manteniment</p>
                <p className="text-[9px] text-slate-400 mt-2 font-bold uppercase tracking-widest">CONVERTIM LES TEVES IDEES EN REALITAT</p>
            </footer>
        </div>
    );
});

QuotePreview.displayName = "QuotePreview";
