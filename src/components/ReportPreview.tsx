
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
            {/* CAPÇALERA CORPORATIVA */}
            <header className="flex justify-between items-start border-b-8 border-primary pb-8 break-inside-avoid">
                <div className="space-y-4">
                    <Logo className="h-20 w-auto" />
                    <div className="text-[11px] leading-tight text-slate-500 font-medium uppercase tracking-wider">
                        <p className="font-black text-primary mb-1">NRT: {BRANDING.nrt}</p>
                        <p>{BRANDING.address}</p>
                        <p>{BRANDING.location}</p>
                        <p>TEL: {BRANDING.phone} | {BRANDING.email}</p>
                    </div>
                </div>
                <div className="text-right flex flex-col items-end">
                    <h1 className="text-5xl font-black uppercase tracking-tighter text-primary">Albarà</h1>
                    {albaranNumber && (
                        <div className="mt-2 bg-accent text-primary px-4 py-1.5 rounded-lg text-xl font-bold shadow-sm">
                            #{String(albaranNumber).padStart(4, '0')}
                        </div>
                    )}
                    <p className="mt-3 text-slate-400 font-bold uppercase text-xs tracking-[0.2em]">
                        {format(new Date(), 'dd MMMM yyyy', { locale: ca })}
                    </p>
                </div>
            </header>

            {/* INFO CLIENT I PROJECTE */}
            <div className="grid grid-cols-2 gap-8 break-inside-avoid">
                <div className="bg-slate-50 p-6 rounded-3xl border-l-8 border-primary space-y-3">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <User className="w-3 h-3" /> Client
                    </h3>
                    <div>
                        <p className="font-black text-xl text-slate-900 uppercase leading-none">{customer?.name || '---'}</p>
                        <p className="text-sm text-slate-500 mt-2 font-medium">{customer?.street || customer?.city || '---'}</p>
                        <p className="text-xs text-slate-400 font-bold mt-1">NIF: {customer?.nrt || '---'}</p>
                    </div>
                </div>
                <div className="bg-slate-50 p-6 rounded-3xl border-r-8 border-accent space-y-3">
                    <h3 className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-2">
                        <MapPin className="w-3 h-3" /> Obra / Projecte
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

            {/* TAULA DE TREBALLS */}
            <section className="space-y-4">
                <h3 className="text-sm font-black uppercase tracking-[0.2em] text-primary border-l-4 border-primary pl-3">01. Detall dels treballs</h3>
                <table className="w-full border-collapse rounded-xl overflow-hidden shadow-sm border border-slate-100">
                    <thead className="bg-primary text-white text-[10px] uppercase tracking-widest">
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
                                    <td className="py-4 px-4 align-top font-black text-primary whitespace-nowrap">{s.employeeName?.split(' ')[0]}</td>
                                    <td className="py-4 px-4 align-top space-y-2">
                                        <p className="text-slate-700 font-medium leading-relaxed">{s.description}</p>
                                        {s.pendingTasks && (
                                            <div className="bg-destructive/5 text-destructive p-2 rounded border-l-2 border-destructive text-[10px] font-bold uppercase">
                                                Pendent: {s.pendingTasks}
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

            {/* TOTALS SI SHOWPRICING */}
            {showPricing && (
                <div className="flex justify-end break-inside-avoid">
                    <div className="w-80 bg-primary text-white p-6 rounded-2xl space-y-3 shadow-xl border-t-4 border-accent">
                        <div className="flex justify-between text-[10px] font-black uppercase text-slate-300 tracking-widest">
                            <span>Suma Treballs</span>
                            <span className="tabular-nums">{subtotal.toFixed(2)} €</span>
                        </div>
                        <div className="flex justify-between text-[10px] font-black uppercase text-slate-300 tracking-widest">
                            <span>IGI (4.5%)</span>
                            <span className="tabular-nums">{iva.toFixed(2)} €</span>
                        </div>
                        <div className="pt-3 border-t border-white/20 flex justify-between items-center">
                            <span className="text-sm font-black uppercase tracking-tighter text-accent">Total Albarà</span>
                            <span className="text-2xl font-black tabular-nums">{totalGeneral.toFixed(2)} €</span>
                        </div>
                    </div>
                </div>
            )}

            {/* SIGNATURES AMB ESPAI NET */}
            <section className="grid grid-cols-2 gap-12 mt-auto break-inside-avoid">
                <div className="space-y-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b pb-2">Signatura Tècnic</p>
                    <div className="h-24 flex items-center justify-center italic text-slate-300 text-xs uppercase font-bold border-2 border-dashed border-slate-50 rounded-2xl">TS SERVEIS</div>
                </div>
                <div className="space-y-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b pb-2">Conformitat del Client</p>
                    {services.find(s => s.customerSignatureDataUrl) ? (
                        <div className="flex flex-col items-center bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                            <div className="relative h-20 w-40">
                                <Image src={services.find(s => s.customerSignatureDataUrl)!.customerSignatureDataUrl!} alt="Signatura" fill className="object-contain" />
                            </div>
                            <p className="text-[10px] font-black text-primary uppercase mt-2">{services.find(s => s.customerSignatureDataUrl)!.customerSignatureName}</p>
                        </div>
                    ) : (
                        <div className="h-24 border-2 border-dashed border-slate-100 rounded-2xl"></div>
                    )}
                </div>
            </section>

            {/* ANNEX FOTOGRÀFIC ORGANITZAT */}
            {allImages.length > 0 && (
                <section className="mt-10 pt-10 border-t-2 border-slate-100 break-inside-avoid">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-6">Evidència Fotogràfica</h3>
                    <div className="grid grid-cols-3 gap-4">
                        {allImages.slice(0, 6).map((img, i) => (
                            <div key={i} className="relative aspect-square rounded-2xl overflow-hidden border-4 border-white shadow-md">
                                <Image src={img.dataUrl} alt={`Foto ${i}`} fill className="object-cover" />
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* PEU DE PÀGINA */}
            <footer className="pt-8 text-center text-[9px] text-slate-300 font-black uppercase tracking-[0.4em] break-inside-avoid mt-auto">
                <p>TS SERVEIS - Solucions Tècniques i Manteniment</p>
                <div className="flex gap-1 justify-center mt-2 opacity-30">
                    <div className="w-10 h-1 bg-primary rounded-full"></div>
                    <div className="w-5 h-1 bg-accent rounded-full"></div>
                </div>
            </footer>
        </div>
    );
});

ReportPreview.displayName = "ReportPreview";
