'use client'
import React, { forwardRef, useMemo } from 'react';
import type { Customer } from '@/lib/types';
import { format } from 'date-fns';
import { ca } from 'date-fns/locale';
import { Logo } from '@/components/Logo';

const IVA_RATE = 0.045; // 4.5% IGI for Andorra

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
        
        items.forEach(item => {
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
        <div ref={ref} className="bg-white p-12 font-sans text-gray-900 printable-area mx-auto flex flex-col" style={{ width: '210mm', minHeight: '297mm' }}>
            <header className="flex justify-between items-center border-b-4 border-slate-900 pb-10 mb-10" style={{ pageBreakInside: 'avoid' }}>
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
                    <h1 className="text-5xl font-black text-gray-900 mb-2 uppercase tracking-tighter">Pressupost</h1>
                     {quoteNumber && quoteNumber > 0 && <p className="text-2xl text-primary font-black mt-2">Nº: {String(quoteNumber).padStart(4, '0')}</p>}
                    <p className="text-lg text-gray-500 font-bold">{format(new Date(), 'dd MMMM yyyy', { locale: ca })}</p>
                </div>
            </header>

            <section className="grid grid-cols-2 gap-16 mb-12" style={{ pageBreakInside: 'avoid' }}>
                <div className="bg-slate-50 p-8 rounded-2xl border-2 border-slate-100">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">CLIENT</h3>
                    {customer ? (
                        <div className="space-y-2">
                             <p className="font-black text-2xl">{customer.name}</p>
                             <p className="text-slate-600 text-lg">{customer.address || ''}</p>
                             <p className="text-slate-600">NIF: {customer.nrt || '-'}</p>
                        </div>
                    ) : <p className="text-gray-600 italic">No especificat</p>}
                </div>
                 <div className="text-right">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">PROJECTE / OBRA</h3>
                    <p className="font-black text-3xl text-primary uppercase tracking-tight leading-tight">{projectName || 'No especificada'}</p>
                 </div>
            </section>
            
            <section className="flex-grow">
                <h3 className="font-black text-xl mb-8 border-b-4 border-slate-900 pb-2 uppercase tracking-tight">Detall del Pressupost</h3>
                
                {Array.from(groupedItems.entries()).map(([category, catItems], groupIdx) => {
                    const catSubtotal = catItems.reduce((acc, item) => {
                        const itemTotal = item.quantity * item.unitPrice;
                        const discountAmount = itemTotal * ((item.discount || 0) / 100);
                        return acc + (itemTotal - discountAmount);
                    }, 0);

                    return (
                        <div key={groupIdx} className="mb-10" style={{ pageBreakInside: 'avoid' }}>
                            <h4 className="font-black text-sm text-white bg-slate-900 px-4 py-2 rounded-t-lg uppercase tracking-widest">{category}</h4>
                            <table className="w-full text-sm border-collapse border-2 border-slate-900 mb-2">
                                <thead className="bg-slate-50">
                                    <tr className="text-xs text-slate-600 uppercase font-black border-b-2 border-slate-900">
                                        <th className="text-left py-3 px-4">Descripció</th>
                                        <th className="text-right py-3 px-4 w-24">Quantitat</th>
                                        <th className="text-right py-3 px-4 w-32">Preu Unit.</th>
                                        <th className="text-right py-3 px-4 w-32">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {catItems.map((item, index) => {
                                        const itemTotal = item.quantity * item.unitPrice;
                                        const discountAmount = itemTotal * ((item.discount || 0) / 100);
                                        const finalTotal = itemTotal - discountAmount;
                                        return (
                                            <tr key={index} className="border-b border-slate-200">
                                                <td className="py-3 px-4 font-medium">{item.description}</td>
                                                <td className="text-right py-3 px-4 font-bold text-slate-500">{item.quantity.toFixed(2)}</td>
                                                <td className="text-right py-3 px-4 font-bold text-slate-500">{item.unitPrice.toFixed(2)} €</td>
                                                <td className="text-right py-3 px-4 font-black tabular-nums">{finalTotal.toFixed(2)} €</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            <div className="flex justify-end pr-4">
                                <p className="text-xs font-black text-slate-400 uppercase tracking-tighter">Subtotal {category}: <span className="ml-2 text-lg text-slate-900">{catSubtotal.toFixed(2)} €</span></p>
                            </div>
                        </div>
                    );
                })}

                {labor.cost > 0 && (
                    <div className="mb-10 p-6 bg-slate-900 text-white rounded-2xl flex justify-between items-center shadow-lg" style={{ pageBreakInside: 'avoid' }}>
                        <div>
                            <h4 className="font-black text-lg uppercase tracking-tight">{labor.description}</h4>
                            <p className="text-sm text-slate-400 italic">Inclou muntatge, transport i posta en marxa.</p>
                        </div>
                        <span className="text-3xl font-black tabular-nums text-primary">{labor.cost.toFixed(2)} €</span>
                    </div>
                )}

                <div className="flex justify-end mt-12 pb-12" style={{ pageBreakInside: 'avoid' }}>
                    <div className="w-96 space-y-4 bg-slate-900 text-white p-8 rounded-3xl shadow-2xl border-4 border-primary/20">
                        <div className="flex justify-between text-sm text-slate-400 font-bold uppercase tracking-widest">
                            <span>Base Imposable</span>
                            <span className="tabular-nums">{subtotal.toFixed(2)} €</span>
                        </div>
                        <div className="flex justify-between text-sm text-slate-400 font-bold uppercase tracking-widest">
                            <span>IGI (4.5%)</span>
                            <span className="tabular-nums">{iva.toFixed(2)} €</span>
                        </div>
                        <div className="pt-6 border-t border-slate-700 flex justify-between items-center">
                            <span className="text-xl font-black uppercase tracking-tighter text-primary">Total Pressupost</span>
                            <span className="text-4xl font-black tabular-nums">{totalGeneral.toFixed(2)} €</span>
                        </div>
                    </div>
                </div>
            </section>

            <footer className="mt-auto pt-10 border-t-2 border-slate-200" style={{ pageBreakInside: 'avoid' }}>
                <div className="bg-slate-50 p-8 rounded-2xl border-2 border-slate-100">
                    <p className="font-black text-xs text-slate-900 uppercase tracking-[0.2em] mb-4">Condicions de Pagament i Execució</p>
                    <p className="text-sm text-slate-600 leading-relaxed italic whitespace-pre-wrap">{notes}</p>
                </div>
                <div className="text-center text-[10px] text-slate-400 mt-12 font-black uppercase tracking-[0.3em]">
                    <p>TS SERVEIS - Solucions Tècniques i Manteniment</p>
                    <p className="mt-1 text-slate-300">CONVERTIM LES TEVES IDEES EN REALITAT</p>
                </div>
            </footer>
        </div>
    )
})

QuotePreview.displayName = "QuotePreview";
