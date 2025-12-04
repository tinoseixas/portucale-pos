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
}

interface QuotePreviewProps {
  customer: Customer | undefined;
  projectName: string;
  items: QuoteItem[];
  labor: { description: string; cost: number };
  quoteNumber?: number;
}

// --- Component ---
export const QuotePreview = forwardRef<HTMLDivElement, QuotePreviewProps>(({ customer, projectName, items, labor, quoteNumber }, ref) => {

    const materialsSubtotal = useMemo(() => {
        return items.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
    }, [items]);

    const subtotal = materialsSubtotal + labor.cost;
    const iva = subtotal * IVA_RATE;
    const totalGeneral = subtotal + iva;

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
                <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                        <tr className="border-b-2 border-gray-300">
                            <th className="text-left py-2 px-3 font-semibold text-gray-600">DESCRIPCIÓ</th>
                            <th className="text-right py-2 px-3 font-semibold text-gray-600 w-24">QUANT.</th>
                            <th className="text-right py-2 px-3 font-semibold text-gray-600 w-24">PREU/UNIT.</th>
                            <th className="text-right py-2 px-3 font-semibold text-gray-600 w-24">TOTAL</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.filter(item => item.description).map((item, index) => (
                            <React.Fragment key={`item-frag-${index}`}>
                                <tr className="border-b border-gray-200">
                                    <td className="py-2 px-3">{item.description}</td>
                                    <td className="text-right py-2 px-3 tabular-nums">{item.quantity.toFixed(2)}</td>
                                    <td className="text-right py-2 px-3 tabular-nums">{item.unitPrice.toFixed(2)} €</td>
                                    <td className="text-right py-2 px-3 font-medium tabular-nums">{(item.quantity * item.unitPrice).toFixed(2)} €</td>
                                </tr>
                                {item.imageDataUrl && (
                                    <tr className="border-b border-gray-200 bg-gray-50">
                                        <td colSpan={4} className="py-3 px-3 text-center">
                                            <Image src={item.imageDataUrl} alt={`Imatge per ${item.description}`} width={200} height={200} className="rounded-md object-contain mx-auto" />
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
                        ))}
                         {labor.cost > 0 && (
                            <tr className="border-b border-gray-200 font-medium">
                                <td className="py-2 px-3">{labor.description}</td>
                                <td className="text-right py-2 px-3 tabular-nums">1.00</td>
                                <td className="text-right py-2 px-3 tabular-nums">{labor.cost.toFixed(2)} €</td>
                                <td className="text-right py-2 px-3 tabular-nums">{labor.cost.toFixed(2)} €</td>
                            </tr>
                        )}
                    </tbody>
                </table>

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

            <footer className="mt-16 pt-6 border-t text-sm text-gray-600">
                <div className="bg-gray-100 p-4 rounded-lg border border-gray-300 text-center">
                    <p className="font-bold text-base text-gray-800 mb-2">Condicions de Pagament i Validesa</p>
                    <p><span className="font-semibold">Pagament:</span> 50% per formalitzar el pressupost i la resta al finalitzar.</p>
                    <p><span className="font-semibold">Validesa:</span> Aquest pressupost és vàlid durant 15 dies.</p>
                </div>
                <div className="text-center text-xs text-gray-500 mt-4">
                    <p>Gràcies per l'oportunitat de presentar aquest pressupost.</p>
                    <p>Els preus no inclouen imprevistos.</p>
                </div>
            </footer>

        </div>
    )
})

QuotePreview.displayName = "QuotePreview";
