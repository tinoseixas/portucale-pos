
'use client'
import React, { forwardRef, useMemo } from 'react';
import Image from 'next/image';
import { Separator } from '@/components/ui/separator';
import type { Customer } from '@/lib/types';
import { format } from 'date-fns';
import { ca } from 'date-fns/locale';

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

// --- Component ---
export const QuotePreview = forwardRef<HTMLDivElement, QuotePreviewProps>(({ customer, projectName, items, labor, quoteNumber, notes }, ref) => {

    const { groupedItems, materialsSubtotal, totalDiscountAmount } = useMemo(() => {
        let subtotalAccumulator = 0;
        let discountAccumulator = 0;
        
        // Grouping items by category
        const groups = new Map<string, QuoteItem[]>();
        
        items.forEach(item => {
            const itemTotal = item.quantity * item.unitPrice;
            const discountAmount = itemTotal * ((item.discount || 0) / 100);
            subtotalAccumulator += (itemTotal - discountAmount);
            discountAccumulator += discountAmount;

            const cat = item.category || 'General';
            if (!groups.has(cat)) groups.set(cat, []);
            groups.get(cat)!.push(item);
        });
        
        return { 
            groupedItems: groups,
            materialsSubtotal: subtotalAccumulator, 
            totalDiscountAmount: discountAccumulator 
        };
    }, [items]);

    const subtotal = materialsSubtotal + labor.cost;
    const iva = subtotal * IVA_RATE;
    const totalGeneral = subtotal + iva;

    const defaultNotes = "40% per iniciar el treball i la resta es pagarà mensualment a combinar.";

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
                    <h1 className="text-3xl font-bold text-gray-900">Pressupost</h1>
                     {quoteNumber && quoteNumber > 0 && <p className="text-md text-gray-700 font-semibold">Nº: {String(quoteNumber).padStart(4, '0')}</p>}
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
                <h3 className="font-bold text-lg mb-4">Detall del Pressupost</h3>
                
                {Array.from(groupedItems.entries()).map(([category, catItems], groupIdx) => {
                    const catSubtotal = catItems.reduce((acc, item) => {
                        const itemTotal = item.quantity * item.unitPrice;
                        const discountAmount = itemTotal * ((item.discount || 0) / 100);
                        return acc + (itemTotal - discountAmount);
                    }, 0);

                    return (
                        <div key={groupIdx} className="mb-8 page-break-inside-avoid">
                            <h4 className="font-black text-sm text-slate-900 bg-slate-100 px-3 py-2 rounded-t-md border-b-2 border-slate-900 uppercase tracking-widest">{category}</h4>
                            <table className="w-full text-sm border-collapse mb-2">
                                <thead className="bg-slate-50/50">
                                    <tr className="text-xs text-slate-500 uppercase font-bold">
                                        <th className="text-left py-2 px-3">Descripció</th>
                                        <th className="text-right py-2 px-3 w-20">Quant.</th>
                                        <th className="text-right py-2 px-3 w-24">PVP Unit.</th>
                                        <th className="text-right py-2 px-3 w-16">Dte %</th>
                                        <th className="text-right py-2 px-3 w-24">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {catItems.map((item, index) => {
                                        const itemTotal = item.quantity * item.unitPrice;
                                        const discountAmount = itemTotal * ((item.discount || 0) / 100);
                                        const finalTotal = itemTotal - discountAmount;
                                        
                                        return (
                                            <React.Fragment key={`item-frag-${index}`}>
                                                <tr className="border-b border-gray-100 hover:bg-gray-50/30 transition-colors">
                                                    <td className="py-2.5 px-3 text-slate-700">{item.description}</td>
                                                    <td className="text-right py-2.5 px-3 tabular-nums">{item.quantity.toFixed(2)}</td>
                                                    <td className="text-right py-2.5 px-3 tabular-nums">{item.unitPrice.toFixed(2)} €</td>
                                                    <td className="text-right py-2.5 px-3 tabular-nums text-slate-400">{(item.discount || 0)}%</td>
                                                    <td className="text-right py-2.5 px-3 font-medium tabular-nums">{finalTotal.toFixed(2)} €</td>
                                                </tr>
                                                {item.imageDataUrl && (
                                                    <tr className="border-b border-gray-100 bg-gray-50/20">
                                                        <td colSpan={5} className="py-3 px-3 text-center">
                                                            <div className="relative h-32 w-48 mx-auto border rounded overflow-hidden">
                                                                <Image src={item.imageDataUrl} alt={`Imatge per ${item.description}`} fill className="object-contain" />
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        );
                                    })}
                                </tbody>
                            </table>
                            <div className="flex justify-end pr-3">
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-tighter">
                                    Subtotal {category}: <span className="ml-2 text-sm text-slate-900 font-black">{catSubtotal.toFixed(2)} €</span>
                                </p>
                            </div>
                        </div>
                    );
                })}

                {labor.cost > 0 && (
                    <div className="mb-8 p-4 bg-slate-50 rounded-lg border border-slate-200">
                        <div className="flex justify-between items-center">
                            <div>
                                <h4 className="font-bold text-sm uppercase text-slate-600">{labor.description}</h4>
                                <p className="text-xs text-slate-400 italic">Treball tècnic especialitzat</p>
                            </div>
                            <span className="text-lg font-black">{labor.cost.toFixed(2)} €</span>
                        </div>
                    </div>
                )}

                <div className="flex justify-end mt-10">
                    <div className="w-80 space-y-3 bg-slate-900 text-white p-6 rounded-2xl shadow-xl">
                        {totalDiscountAmount > 0 && (
                            <div className="flex justify-between text-xs text-slate-400 font-bold uppercase">
                                <span>Total Estalvi</span>
                                <span className="tabular-nums text-emerald-400">-{totalDiscountAmount.toFixed(2)} €</span>
                            </div>
                        )}
                        <div className="flex justify-between text-xs text-slate-400 font-bold uppercase">
                            <span>Base Imposable</span>
                            <span className="tabular-nums">{subtotal.toFixed(2)} €</span>
                        </div>
                        <div className="flex justify-between text-xs text-slate-400 font-bold uppercase">
                            <span>IGI ({(IVA_RATE * 100).toFixed(1)}%)</span>
                            <span className="tabular-nums">{iva.toFixed(2)} €</span>
                        </div>
                        <div className="pt-4 border-t border-slate-700 flex justify-between items-center">
                            <span className="text-md font-black uppercase tracking-tighter text-primary">Total Pressupost</span>
                            <span className="text-3xl font-black tabular-nums">{totalGeneral.toFixed(2)} €</span>
                        </div>
                    </div>
                </div>
            </section>

            <footer className="mt-16 pt-8 border-t text-sm text-gray-600">
                <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 shadow-inner">
                    <p className="font-black text-xs text-slate-900 uppercase tracking-widest mb-4">Condicions i Validesa</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs leading-relaxed">
                        <div className="space-y-2">
                            <p><span className="font-bold text-slate-900 uppercase">Pagament:</span> {notes || defaultNotes}</p>
                            <p><span className="font-bold text-slate-900 uppercase">Validesa:</span> 15 dies naturals des de la data d'emissió.</p>
                        </div>
                        <div className="space-y-2">
                            <p><span className="font-bold text-slate-900 uppercase">Execució:</span> El termini depèn de la disponibilitat de materials i climatologia.</p>
                            <p className="italic text-slate-400">Els preus indicats no inclouen possibles imprevistos no descrits en el detall.</p>
                        </div>
                    </div>
                </div>
                <div className="text-center text-[10px] text-gray-400 mt-8 font-medium uppercase tracking-widest">
                    <p>TS SERVEIS - Solucions Tècniques i Manteniment</p>
                </div>
            </footer>

        </div>
    )
})

QuotePreview.displayName = "QuotePreview";
