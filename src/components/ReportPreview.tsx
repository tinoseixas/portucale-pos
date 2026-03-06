
'use client'
import React, { forwardRef, useMemo } from 'react';
import Image from 'next/image';
import { Calendar as CalendarIcon, Clock, User, CheckCircle, Package } from 'lucide-react';
import type { ServiceRecord, Customer, Employee } from '@/lib/types';
import { format, differenceInMinutes, parseISO, isValid } from 'date-fns';
import { ca } from 'date-fns/locale';
import { calculateTotalAmount, IVA_RATE } from '@/lib/calculations';
import { Logo } from '@/components/Logo';

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

    const allMedia = useMemo(() => {
        return sortedServices.flatMap(service => service.media || []).filter(m => m.type === 'image');
    }, [sortedServices]);

    const getEmployeeName = (employeeId?: string) => {
        if (!employeeId || !employees) return 'Tècnic no assignat';
        const employee = employees.find(e => e.id === employeeId);
        return employee ? `${employee.firstName} ${employee.lastName}` : 'Tècnic desconegut';
    };

    return (
        <div className="w-full overflow-x-auto bg-slate-100 p-4 sm:p-8">
            <div 
                ref={ref} 
                className="bg-white p-12 font-sans text-slate-900 printable-area mx-auto shadow-2xl flex flex-col"
                style={{ width: '210mm', minHeight: '297mm' }}
            >
                {/* Capçalera amb Logo TS Serveis */}
                <header className="flex justify-between items-center border-b-4 border-slate-900 pb-10 mb-10" style={{ breakInside: 'avoid' }}>
                    <div className="flex flex-col gap-4">
                        <Logo className="h-24 w-auto" />
                        <div className="space-y-1">
                            <p className="font-bold text-slate-600 text-lg">NRT: F352231c</p>
                            <div className="text-slate-500 text-sm leading-relaxed">
                                <p>Av. Francois Mitterrand 64, local 6</p>
                                <p>AD200 Encamp, Andorra</p>
                                <p className="font-semibold text-slate-700">Tel: (+376) 396 048 | eg.ad.tecnica@gmail.com</p>
                            </div>
                        </div>
                    </div>
                    <div className="text-right">
                        <h1 className="text-5xl font-black text-slate-900 mb-2 uppercase tracking-tighter">Albarà</h1>
                        {albaranNumber && albaranNumber > 0 && (
                            <div className="bg-slate-900 text-white px-6 py-2 rounded-lg inline-block mb-3">
                                <span className="text-2xl font-bold"># {String(albaranNumber).padStart(4, '0')}</span>
                            </div>
                        )}
                        <p className="text-slate-500 font-bold text-lg">{format(new Date(), 'eeee, dd MMMM yyyy', { locale: ca })}</p>
                    </div>
                </header>

                <div className="grid grid-cols-2 gap-16 mb-12" style={{ breakInside: 'avoid' }}>
                    <section className="bg-slate-50 p-8 rounded-2xl border-2 border-slate-100">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                            <User className="w-4 h-4" /> DADES DEL CLIENT
                        </h3>
                        {customer ? (
                            <div className="space-y-2">
                                <p className="font-black text-2xl text-slate-900">{customer.name}</p>
                                <p className="text-slate-600 text-lg leading-relaxed">{customer.address || 'Sense adreça'}</p>
                                <div className="pt-4 grid grid-cols-1 gap-1 text-base text-slate-500">
                                    <p><span className="font-bold text-slate-800">NIF:</span> {customer.nrt || '-'}</p>
                                    <p><span className="font-bold text-slate-800">Email:</span> {customer.email || '-'}</p>
                                    <p><span className="font-bold text-slate-800">Tel:</span> {customer.contact || '-'}</p>
                                </div>
                            </div>
                        ) : <p className="text-slate-400 italic">Dades no disponibles</p>}
                    </section>

                    <section className="bg-primary/5 p-8 rounded-2xl border-2 border-primary/10">
                        <h3 className="text-xs font-black text-primary uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                            <CalendarIcon className="w-4 h-4" /> DETALLS DE L'OBRA
                        </h3>
                        <p className="font-black text-2xl text-slate-900 mb-6">{projectName || 'Obra no especificada'}</p>
                        <div className="grid grid-cols-2 gap-8">
                            <div className="bg-white p-4 rounded-xl shadow-sm">
                                <p className="text-slate-400 font-bold uppercase text-[10px] mb-1">Total Registres</p>
                                <p className="text-2xl font-black text-slate-900">{services.length}</p>
                            </div>
                            <div className="bg-white p-4 rounded-xl shadow-sm">
                                <p className="text-slate-400 font-bold uppercase text-[10px] mb-1">Hores Totals</p>
                                <p className="text-2xl font-black text-primary">{totalTimeFormatted}</p>
                            </div>
                        </div>
                    </section>
                </div>
                
                <div className="flex-grow">
                    {sortedServices.length > 0 && (
                        <section className="mb-12">
                            <h3 className="text-base font-black text-slate-900 mb-6 flex items-center gap-3">
                                <span className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center text-sm">01</span>
                                RESUM DE TASQUES REALITZADES
                            </h3>
                            <table className="w-full text-base border-collapse border-2 border-slate-200 rounded-xl overflow-hidden shadow-sm">
                                <thead>
                                    <tr className="bg-slate-900 text-white">
                                        <th className="text-left py-5 px-6 font-bold w-36 uppercase text-xs tracking-widest">Data</th>
                                        <th className="text-left py-5 px-6 font-bold w-48 uppercase text-xs tracking-widest">Tècnic</th>
                                        <th className="text-left py-5 px-6 font-bold uppercase text-xs tracking-widest">Descripció del Treball</th>
                                        <th className="text-right py-5 px-6 font-bold w-28 uppercase text-xs tracking-widest">Hores</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y-2 divide-slate-100">
                                    {sortedServices.map((service, idx) => {
                                        const arrival = parseISO(service.arrivalDateTime);
                                        const departure = parseISO(service.departureDateTime);
                                        const minutes = (isValid(arrival) && isValid(departure) && departure > arrival) ? differenceInMinutes(departure, arrival) : 0;
                                        const hours = minutes > 0 ? (minutes / 60).toFixed(2) : '0.00';

                                        return (
                                            <tr key={service.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'} style={{ breakInside: 'avoid' }}>
                                                <td className="py-6 px-6 align-top font-bold text-slate-500">{format(arrival, 'dd/MM/yyyy')}</td>
                                                <td className="py-6 px-6 align-top text-slate-900 font-bold italic">{service.employeeName || getEmployeeName(service.employeeId)}</td>
                                                <td className="py-6 px-6 align-top">
                                                    <p className="text-slate-800 leading-relaxed font-medium mb-3">{service.description}</p>
                                                    {service.pendingTasks && (
                                                        <div className="text-sm text-amber-800 bg-amber-50 border-l-4 border-amber-400 p-4 rounded flex gap-3 items-start">
                                                            <span className="font-black shrink-0">PENDENT:</span>
                                                            <span>{service.pendingTasks}</span>
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="py-6 px-6 align-top text-right font-black tabular-nums text-slate-900 text-lg">{hours} h</td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </section>
                    )}
                    
                    {showPricing && allMaterials.length > 0 && (
                        <section className="mb-12 pt-10 border-t-4 border-slate-100">
                            <h3 className="text-base font-black text-slate-900 mb-6 flex items-center gap-3">
                                <span className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center text-sm">02</span>
                                DETALL DE MATERIALS I MÀ D'OBRA
                            </h3>
                            <table className="w-full text-base border-collapse border-2 border-slate-200 rounded-xl overflow-hidden shadow-sm">
                                <thead className="bg-slate-100">
                                    <tr className="text-slate-600">
                                        <th className="text-left py-5 px-6 font-black uppercase text-xs tracking-widest">Descripció de l'Article</th>
                                        <th className="text-right py-5 px-6 font-black uppercase text-xs tracking-widest w-32">Quantitat</th>
                                        <th className="text-right py-5 px-6 font-black uppercase text-xs tracking-widest w-36">Preu Unit.</th>
                                        <th className="text-right py-5 px-6 font-black uppercase text-xs tracking-widest w-40">Import Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {allMaterials.map((material, index) => (
                                        <tr key={`mat-${index}`} className="hover:bg-slate-50 transition-colors" style={{ breakInside: 'avoid' }}>
                                            <td className="py-5 px-6 text-slate-700 font-medium">
                                                {material.description}
                                                {material.imageDataUrl && <div className="mt-2 text-[10px] text-primary font-bold flex items-center gap-1"><Package className="h-3 w-3" /> EVIDÈNCIA DOCUMENTAL ADJUNTA</div>}
                                            </td>
                                            <td className="text-right py-5 px-6 tabular-nums font-bold text-slate-500">{material.quantity.toFixed(2)}</td>
                                            <td className="text-right py-5 px-6 tabular-nums font-bold text-slate-500">{material.unitPrice.toFixed(2)} €</td>
                                            <td className="text-right py-5 px-6 font-black tabular-nums text-slate-900">{(material.quantity * material.unitPrice).toFixed(2)} €</td>
                                        </tr>
                                    ))}
                                    {laborCost > 0 && (
                                        <tr className="bg-slate-50 font-bold border-t-2 border-slate-200" style={{ breakInside: 'avoid' }}>
                                            <td className="py-6 px-6 text-slate-900">Mà d'obra i Treball Tècnic</td>
                                            <td className="text-right py-6 px-6 tabular-nums">{totalHours.toFixed(2)}</td>
                                            <td className="text-right py-6 px-6 tabular-nums text-slate-400">{hourlyRateDisplay} €/h</td>
                                            <td className="text-right py-6 px-6 font-black tabular-nums text-slate-900 text-lg">{laborCost.toFixed(2)} €</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>

                            <div className="flex justify-end mt-10 pb-12" style={{ breakInside: 'avoid' }}>
                                <div className="w-96 space-y-4 bg-slate-900 text-white p-8 rounded-2xl shadow-xl border-4 border-primary/20">
                                    <div className="flex justify-between text-sm text-slate-400 font-bold uppercase tracking-widest">
                                        <span>Subtotal Base</span>
                                        <span className="tabular-nums">{subtotal.toFixed(2)} €</span>
                                    </div>
                                    <div className="flex justify-between text-sm text-slate-400 font-bold uppercase tracking-widest">
                                        <span>IGI ({(IVA_RATE * 100).toFixed(1)}%)</span>
                                        <span className="tabular-nums">{iva.toFixed(2)} €</span>
                                    </div>
                                    <div className="pt-6 border-t border-slate-700 flex justify-between items-center">
                                        <span className="text-lg font-black uppercase tracking-tighter text-primary">Total Albarà</span>
                                        <span className="text-4xl font-black tabular-nums">{totalGeneral.toFixed(2)} €</span>
                                    </div>
                                </div>
                            </div>
                        </section>
                    )}

                    {services.some(s => s.customerSignatureDataUrl) && (
                        <section className="mt-16 pt-10 border-t-4 border-slate-100" style={{ breakInside: 'avoid' }}>
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] mb-10 border-b-2 pb-4">Confirmació de Recepció de Treballs</h3>
                            <div className="grid grid-cols-3 gap-10">
                                {services.filter(s => s.customerSignatureDataUrl).map((s, idx) => (
                                    <div key={idx} className="border-2 border-slate-100 rounded-2xl p-6 bg-slate-50/50 flex flex-col items-center">
                                        <div className="w-full flex justify-between items-center mb-4">
                                            <span className="text-[11px] font-black text-slate-400">{format(parseISO(s.arrivalDateTime), 'dd/MM/yyyy')}</span>
                                            <CheckCircle className="w-5 h-5 text-green-500" />
                                        </div>
                                        <div className="relative h-28 w-full mb-6 bg-white rounded-xl border-2 border-slate-100 shadow-inner">
                                            <Image src={s.customerSignatureDataUrl!} alt="Signature" fill className="object-contain p-4" />
                                        </div>
                                        <div className="text-center">
                                            <p className="text-sm font-black text-slate-900 uppercase truncate mb-1">{s.customerSignatureName}</p>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Autoritzat per Client</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {allMedia.length > 0 && (
                        <section className="mt-16 pt-12 border-t-4 border-slate-100">
                            <h3 className="text-lg font-black text-slate-900 mb-10 uppercase tracking-widest flex items-center gap-3">
                                <span className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm italic">i</span>
                                Evidències Fotogràfiques de l'Obra
                            </h3>
                            <div className="grid grid-cols-4 gap-6">
                                {allMedia.map((media, index) => (
                                    <div key={index} className="aspect-square relative rounded-2xl overflow-hidden shadow-md border-4 border-white group" style={{ breakInside: 'avoid' }}>
                                        <Image
                                            src={media.dataUrl}
                                            alt={`Evidència ${index + 1}`}
                                            fill
                                            className="object-cover transition-transform duration-700 group-hover:scale-110"
                                        />
                                        <div className="absolute bottom-0 left-0 right-0 bg-slate-900/60 text-white text-[9px] font-bold p-2 text-center backdrop-blur-md">
                                            IMG_{index + 1}.JPG
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}
                </div>

                <footer className="mt-auto pt-10 border-t-2 border-slate-200 flex justify-between items-end text-slate-400" style={{ breakInside: 'avoid' }}>
                    <div className="text-[11px] space-y-2 font-medium">
                        <p className="font-black text-slate-500 text-xs uppercase tracking-tighter">TS SERVEIS - Solucions Tècniques i Manteniment</p>
                        <p>Aquest document certifica la realització dels treballs descrits.</p>
                        <p className="italic text-slate-300">Sense validesa fiscal fins a l'emissió de la factura corresponent.</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs font-black text-slate-900 uppercase tracking-widest mb-3">Gràcies per la seva confiança</p>
                        <div className="flex gap-2 justify-end">
                            <span className="w-3 h-3 rounded-full bg-primary"></span>
                            <span className="w-3 h-3 rounded-full bg-accent"></span>
                            <span className="w-3 h-3 rounded-full bg-slate-300"></span>
                        </div>
                    </div>
                </footer>
            </div>
        </div>
    )
})

ReportPreview.displayName = "ReportPreview";
