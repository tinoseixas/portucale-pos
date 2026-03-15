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
        <div ref={ref} className="bg-white p-12 font-sans text-slate-900 printable-area mx-auto flex flex-col gap-12 shadow-none border-none" style={{ width: '210mm', minHeight: '297mm', backgroundColor: '#ffffff' }}>
            {/* Capçalera professionals */}
            <header className="flex justify-between items-start border-b-8 border-primary pb-10 relative pdf-block">
                <div className="space-y-6">
                    <Logo className="h-24 w-auto" />
                    <div className="text-[11px] leading-relaxed text-slate-500 font-medium tracking-tight">
                        <p className="text-primary font-bold mb-1">NRT: {BRANDING.nrt}</p>
                        <p>{BRANDING.address}</p>
                        <p>{BRANDING.location}</p>
                        <p>Tel: {BRANDING.phone} | {BRANDING.email}</p>
                    </div>
                </div>
                <div className="flex flex-col items-end gap-8 text-right">
                    <h1 className="text-6xl font-black tracking-tighter text-primary leading-none">Pressupost</h1>
                    <div className="bg-accent text-primary px-6 py-2 rounded-lg inline-block text-2xl font-black">
                        #{String(quoteNumber || 0).padStart(4, '0')}
                    </div>
                    <p className="text-slate-400 font-bold text-sm tracking-tight">
                        Vàlid fins: {format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'dd/MM/yyyy', { locale: ca })}
                    </p>
                </div>
                <div className="absolute bottom-[-8px] right-0 w-1/3 h-2 bg-destructive"></div>
            </header>

            {/* Info client i obra */}
            <div className="grid grid-cols-2 gap-12 pdf-block">
                <div className="bg-slate-50 p-8 rounded-3xl border-l-8 border-primary space-y-4 shadow-sm">
                    <h3 className="text-[10px] font-bold text-slate-400 tracking-tight">Destinatari</h3>
                    <div>
                        <p className="font-black text-2xl text-slate-900 leading-none">{customer?.name || '---'}</p>
                        <p className="text-base text-slate-500 mt-2 font-medium">{customer?.street || '---'}</p>
                        <p className="text-sm text-slate-400 font-bold mt-1">NRT: {customer?.nrt || '---'}</p>
                    </div>
                </div>
                <div className="text-right space-y-4 bg-slate-50 p-8 rounded-3xl border-r-8 border-accent shadow-sm">
                    <h3 className="text-[10px] font-bold text-slate-400 tracking-tight">Objecte de la proposta</h3>
                    <div>
                        <p className="font-black text-3xl text-primary leading-tight tracking-tighter">{projectName || 'Proposta tècnica'}</p>
                        <p className="text-xs text-slate-400 font-bold mt-3 tracking-tight italic">Emès: {format(new Date(), 'dd/MM/yyyy')}</p>
                    </div>
                </div>
            </div>

            {/* Detall de conceptes per categories */}
            <div className="flex-grow space-y-12 pdf-block">
                {Array.from(groupedItems.entries()).map(([category, catItems], idx) => {
                    const catTotal = catItems.reduce((acc, item) => acc + (item.quantity * item.unitPrice * (1 - (item.discount || 0)/100)), 0);
                    return (
                        <div key={idx} className="space-y-4">
                            <div className="flex justify-between items-center border-b-4 border-primary pb-2">
                                <h4 className="text-sm font-black tracking-tight text-primary">{category}</h4>
                                <span className="text-[10px] font-bold text-slate-400">Subtotal secció: {catTotal.toFixed(2)} €</span>
                            </div>
                            <table className="w-full border-collapse">
                                <thead className="bg-slate-50 text-[9px] font-bold tracking-tight text-slate-500">
                                    <tr>
                                        <th className="py-2 px-4 text-left">Descripció de l'article</th>
                                        <th className="py-2 px-4 text-right w-24">Unitats</th>
                                        <th className="py-2 px-4 text-right w-28">PVP unit.</th>
                                        <th className="py-2 px-4 text-right w-20">Dte.</th>
                                        <th className="py-2 px-4 text-right w-32">Import</th>
                                    </tr>
                                </thead>
                                <tbody className="text-xs">
                                    {catItems.map((item, i) => {
                                        const finalPrice = item.unitPrice * (1 - (item.discount || 0)/100);
                                        return (
                                            <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
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
                    <div className="p-6 bg-slate-50 rounded-2xl border-2 border-primary/10 flex justify-between items-center border-l-8 border-l-primary">
                        <div className="space-y-1">
                            <p className="font-black text-primary text-sm">{labor.description || "Mà d'obra"}</p>
                            <p className="text-[10px] text-slate-400 tracking-tight font-bold">Instal·lació, transport i muntatge inclosos</p>
                        </div>
                        <span className="text-2xl font-black tabular-nums text-primary">{labor.cost.toFixed(2)} €</span>
                    </div>
                )}
            </div>

            {/* Resum financer */}
            <div className="flex justify-end pb-12 pdf-block">
                <div className="w-96 bg-primary text-white p-8 rounded-[2rem] space-y-4 border-t-8 border-accent">
                    <div className="flex justify-between text-[11px] font-bold tracking-tight text-slate-300">
                        <span>Suma de conceptes</span>
                        <span className="tabular-nums text-white">{subtotal.toFixed(2)} €</span>
                    </div>
                    <div className="flex justify-between text-[11px] font-bold tracking-tight text-slate-300">
                        <span>IGI (4.5%)</span>
                        <span className="tabular-nums text-white">{iva.toFixed(2)} €</span>
                    </div>
                    <div className="pt-6 border-t border-white/20 flex justify-between items-center">
                        <span className="text-xl font-black tracking-tight text-accent">Total pressupost</span>
                        <span className="text-4xl font-black tabular-nums">{totalGeneral.toFixed(2)} €</span>
                    </div>
                </div>
            </div>

            {/* Notes i condicions */}
            {notes && (
                <section className="bg-slate-50 p-8 rounded-3xl border-2 border-slate-100 border-l-8 border-primary pdf-block">
                    <h4 className="text-[10px] font-bold tracking-tight text-primary mb-4 border-b pb-2">Condicions i terminis de l'oferta</h4>
                    <div className="text-xs text-slate-600 leading-relaxed italic whitespace-pre-wrap">{notes}</div>
                </section>
            )}

            {/* Peu de pàgina */}
            <footer className="mt-auto border-t-2 border-slate-100 pt-8 text-center pdf-block">
                <p className="text-[10px] text-slate-300 font-bold tracking-widest mb-2">{BRANDING.companyName} - {BRANDING.slogan}</p>
                <div className="flex gap-1 justify-center opacity-30">
                    <div className="w-12 h-1 bg-primary rounded-full"></div>
                    <div className="w-6 h-1 bg-accent rounded-full"></div>
                    <div className="w-3 h-1 bg-destructive rounded-full"></div>
                </div>
            </footer>
        </div>
    );
});

QuotePreview.displayName = "QuotePreview";
