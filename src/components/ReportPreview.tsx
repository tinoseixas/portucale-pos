
'use client'
import React, { forwardRef, useMemo } from 'react';
import Image from 'next/image';
import { Calendar as CalendarIcon, Clock, User, CheckCircle, Package, MapPin, Phone } from 'lucide-react';
import type { ServiceRecord, Customer, Employee } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { ca } from 'date-fns/locale';
import { calculateTotalAmount, calculateServiceEffectiveMinutes, getMealBreakOverlapMinutes, IVA_RATE } from '@/lib/calculations';
import { Logo } from '@/components/Logo';
import { BRANDING } from '@/lib/branding';

interface ReportPreviewProps {
  customer: Customer | undefined;
  projectName: string;
  services: ServiceRecord[];
  showPricing: boolean;
  albaranNumber: number | undefined;
  employees: Employee[];
}

export const ReportPreview = forwardRef<HTMLDivElement, ReportPreviewProps>(({ customer, projectName, services, showPricing, albaranNumber, employees }, ref) => {

    const sortedServices = useMemo(() => {
        if (!services) return [];
        return [...services].sort((a,b) => parseISO(a.arrivalDateTime).getTime() - parseISO(b.arrivalDateTime).getTime());
    }, [services]);
    
    const { subtotal, iva, totalGeneral, totalHours, laborCost } = calculateTotalAmount(sortedServices, employees);
    const totalTimeFormatted = `${Math.floor(totalHours)}h ${Math.round((totalHours % 1) * 60)}m`;
    const hourlyRateDisplay = totalHours > 0 ? (laborCost / totalHours).toFixed(2) : "0.00";

    const allMaterials = useMemo(() => {
        return sortedServices.flatMap(service => service.materials || []).filter(material => 
            material.description.trim() !== ''
        );
    }, [sortedServices]);

    const allImages = useMemo(() => {
        return sortedServices.flatMap(service => service.media || []).filter(m => m.type === 'image');
    }, [sortedServices]);

    return (
        <div 
            ref={ref} 
            className="bg-white p-12 font-sans text-slate-900 printable-area mx-auto flex flex-col gap-10"
            style={{ width: '210mm', minHeight: '297mm' }}
        >
            {/* CAPÇALERA PROFESSIONAL */}
            <header className="flex justify-between items-start border-b-4 border-slate-900 pb-8 break-inside-avoid">
                <div className="space-y-4">
                    <Logo className="h-20 w-auto" />
                    <div className="text-[11px] leading-tight text-slate-500 font-medium uppercase tracking-wider">
                        <p className="font-black text-slate-900 mb-1">NRT: {BRANDING.nrt}</p>
                        <p>{BRANDING.address}</p>
                        <p>{BRANDING.location}</p>
                        <p>TEL: {BRANDING.phone} | {BRANDING.email}</p>
                    </div>
                </div>
                <div className="text-right flex flex-col items-end">
                    <h1 className="text-5xl font-black uppercase tracking-tighter text-slate-900">Albarà</h1>
                    {albaranNumber && (
                        <div className="mt-2 bg-slate-900 text-white px-4 py-1.5 rounded text-xl font-bold">
                            #{String(albaranNumber).padStart(4, '0')}
                        </div>
                    )}
                    <p className="mt-2 text-slate-400 font-bold uppercase text-xs tracking-[0.2em]">
                        {format(new Date(), 'dd MMMM yyyy', { locale: ca })}
                    </p>
                </div>
            </header>

            {/* BLOC INFO CLIENT I OBRA */}
            <div className="grid grid-cols-2 gap-8 break-inside-avoid">
                <div className="bg-slate-50 p-6 rounded-2xl border-2 border-slate-100 space-y-3">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <User className="w-3 h-3" /> Dades del Client
                    </h3>
                    <div>
                        <p className="font-black text-xl text-slate-900 uppercase leading-none">{customer?.name || '---'}</p>
                        <p className="text-sm text-slate-500 mt-2 font-medium">{customer?.street || customer?.city || '---'}</p>
                        <p className="text-xs text-slate-400 font-bold mt-1">NIF: {customer?.nrt || '---'}</p>
                    </div>
                </div>
                <div className="bg-primary/5 p-6 rounded-2xl border-2 border-primary/10 space-y-3">
                    <h3 className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-2">
                        <MapPin className="w-3 h-3" /> Projecte / Obra
                    </h3>
                    <div>
                        <p className="font-black text-xl text-primary uppercase leading-tight">{projectName || 'Obra General'}</p>
                        <div className="flex gap-4 mt-3">
                            <div>
                                <p className="text-[9px] font-black text-slate-400 uppercase">Hores Totals</p>
                                <p className="text-lg font-black text-slate-900">{totalTimeFormatted}</p>
                            </div>
                            <div>
                                <p className="text-[9px] font-black text-slate-400 uppercase">Intervencions</p>
                                <p className="text-lg font-black text-slate-900">{services.length}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* TAULA DE TASQUES */}
            <section className="space-y-4">
                <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-900 border-l-4 border-slate-900 pl-3">01. Tasques realitzades</h3>
                <table className="w-full border-collapse">
                    <thead className="bg-slate-900 text-white text-[10px] uppercase tracking-widest">
                        <tr>
                            <th className="py-3 px-4 text-left font-black">Data</th>
                            <th className="py-3 px-4 text-left font-black">Tècnic</th>
                            <th className="py-3 px-4 text-left font-black">Descripció del treball</th>
                            <th className="py-3 px-4 text-right font-black">Hores</th>
                        </tr>
                    </thead>
                    <tbody className="text-xs">
                        {sortedServices.map((s, i) => {
                            const effectiveMin = calculateServiceEffectiveMinutes(s);
                            return (
                                <tr key={s.id} className={`${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} border-b border-slate-100`}>
                                    <td className="py-4 px-4 align-top font-bold text-slate-400">{format(parseISO(s.arrivalDateTime), 'dd/MM/yy')}</td>
                                    <td className="py-4 px-4 align-top font-black text-slate-900 whitespace-nowrap">{s.employeeName?.split(' ')[0]}</td>
                                    <td className="py-4 px-4 align-top space-y-2">
                                        <p className="text-slate-700 font-medium leading-relaxed">{s.description}</p>
                                        {s.pendingTasks && (
                                            <div className="bg-amber-50 text-amber-700 p-2 rounded border-l-2 border-amber-400 text-[10px] font-bold">
                                                PENDENT: {s.pendingTasks}
                                            </div>
                                        )}
                                    </td>
                                    <td className="py-4 px-4 align-top text-right font-black tabular-nums">{(effectiveMin / 60).toFixed(2)}h</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </section>

            {/* TAULA DE MATERIALS (SI N'HI HA) */}
            {allMaterials.length > 0 && (
                <section className="space-y-4 break-inside-avoid">
                    <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-900 border-l-4 border-slate-900 pl-3">02. Materials utilitzats</h3>
                    <table className="w-full border-collapse border-2 border-slate-100">
                        <thead className="bg-slate-100 text-[10px] uppercase tracking-widest text-slate-500 font-black">
                            <tr>
                                <th className="py-2 px-4 text-left">Descripció Article</th>
                                <th className="py-2 px-4 text-right w-24">Quantitat</th>
                                {showPricing && <th className="py-2 px-4 text-right w-32">Preu Unit.</th>}
                                {showPricing && <th className="py-2 px-4 text-right w-32">Total</th>}
                            </tr>
                        </thead>
                        <tbody className="text-xs">
                            {allMaterials.map((m, i) => (
                                <tr key={i} className="border-b border-slate-100">
                                    <td className="py-2 px-4 font-medium text-slate-700">{m.description}</td>
                                    <td className="py-2 px-4 text-right font-bold text-slate-400 tabular-nums">{m.quantity.toFixed(2)}</td>
                                    {showPricing && <td className="py-2 px-4 text-right tabular-nums">{m.unitPrice.toFixed(2)} €</td>}
                                    {showPricing && <td className="py-2 px-4 text-right font-black tabular-nums">{(m.quantity * m.unitPrice).toFixed(2)} €</td>}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </section>
            )}

            {/* TOTALS SI SHOWPRICING */}
            {showPricing && (
                <div className="flex justify-end break-inside-avoid">
                    <div className="w-80 bg-slate-900 text-white p-6 rounded-2xl space-y-3 shadow-xl">
                        <div className="flex justify-between text-[10px] font-black uppercase text-slate-400 tracking-widest">
                            <span>Subtotal Base</span>
                            <span className="tabular-nums">{subtotal.toFixed(2)} €</span>
                        </div>
                        <div className="flex justify-between text-[10px] font-black uppercase text-slate-400 tracking-widest">
                            <span>IGI ({(IVA_RATE * 100).toFixed(1)}%)</span>
                            <span className="tabular-nums">{iva.toFixed(2)} €</span>
                        </div>
                        <div className="pt-3 border-t border-slate-700 flex justify-between items-center">
                            <span className="text-sm font-black uppercase tracking-tighter text-primary">Total Albarà</span>
                            <span className="text-2xl font-black tabular-nums">{totalGeneral.toFixed(2)} €</span>
                        </div>
                    </div>
                </div>
            )}

            {/* SIGNATURES */}
            <section className="grid grid-cols-2 gap-12 mt-10 break-inside-avoid">
                <div className="space-y-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b pb-2">Signatura Tècnic</p>
                    <div className="h-24 flex items-center justify-center italic text-slate-300 text-xs uppercase font-bold">TS SERVEIS</div>
                </div>
                <div className="space-y-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b pb-2">Conformitat del Client</p>
                    {services.find(s => s.customerSignatureDataUrl) ? (
                        <div className="flex flex-col items-center">
                            <div className="relative h-20 w-40">
                                <Image src={services.find(s => s.customerSignatureDataUrl)!.customerSignatureDataUrl!} alt="Signatura" fill className="object-contain" />
                            </div>
                            <p className="text-[10px] font-black text-slate-900 uppercase mt-2">{services.find(s => s.customerSignatureDataUrl)!.customerSignatureName}</p>
                        </div>
                    ) : (
                        <div className="h-20 border-2 border-dashed border-slate-100 rounded-xl"></div>
                    )}
                </div>
            </section>

            {/* ANNEX IMATGES */}
            {allImages.length > 0 && (
                <section className="mt-10 pt-10 border-t-2 border-slate-100">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-6">Annex Fotogràfic</h3>
                    <div className="grid grid-cols-3 gap-4">
                        {allImages.slice(0, 6).map((img, i) => (
                            <div key={i} className="relative aspect-square rounded-xl overflow-hidden border-2 border-slate-100 break-inside-avoid">
                                <Image src={img.dataUrl} alt={`Foto ${i}`} fill className="object-cover" />
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* PEU DE PÀGINA */}
            <footer className="mt-auto pt-8 text-center text-[9px] text-slate-300 font-black uppercase tracking-[0.4em] break-inside-avoid">
                <p>TS SERVEIS - Solucions Tècniques i Manteniment</p>
                <p className="mt-1">Document sense valor comptable | Arredoniment hores cada 30 minuts</p>
            </footer>
        </div>
    );
});

ReportPreview.displayName = "ReportPreview";
