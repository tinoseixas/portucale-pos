'use client'
import React, { forwardRef, useMemo } from 'react';
import Image from 'next/image';
import { Separator } from '@/components/ui/separator';
import { Calendar as CalendarIcon, Clock, User, Video, CheckCircle } from 'lucide-react';
import type { ServiceRecord, Customer, Employee } from '@/lib/types';
import { format, differenceInMinutes, parseISO, isValid } from 'date-fns';
import { ca } from 'date-fns/locale';
import { calculateTotalAmount, IVA_RATE } from '@/lib/calculations';

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
    
    const { subtotal, iva, totalGeneral, totalHours, materialsSubtotal, laborCost } = calculateTotalAmount(sortedServices, employees);
    const totalTimeFormatted = `${Math.floor(totalHours)}h ${Math.round((totalHours % 1) * 60)}m`;

    const allMaterials = useMemo(() => {
        return sortedServices.flatMap(service => service.materials || []).filter(material => 
            !material.description.toLowerCase().includes('traball') && material.description.trim() !== ''
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
        <div ref={ref} className="bg-white p-10 font-sans text-slate-900 printable-area max-w-[210mm] mx-auto min-h-[297mm] shadow-sm">
            {/* Professional Header */}
            <header className="flex justify-between items-start border-b-2 border-slate-900 pb-8 mb-8">
                <div className="flex gap-6">
                     <div className="flex items-center justify-center w-16 h-16 rounded-xl bg-primary text-primary-foreground shadow-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-10 h-10">
                            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                        </svg>
                    </div>
                    <div className="text-sm space-y-0.5">
                        <h2 className="font-bold text-2xl text-slate-900 uppercase tracking-tight">TS Serveis</h2>
                        <p className="font-semibold text-slate-700">NRT: F352231c</p>
                        <p className="text-slate-500 italic">convertim les teves idees en realitat</p>
                        <div className="pt-2 text-slate-600">
                            <p>Av. Francois Mitterrand 64, local 6</p>
                            <p>AD200 Encamp, Andorra</p>
                            <p>Tel: (+376) 396 048 | eg.ad.tecnica@gmail.com</p>
                        </div>
                    </div>
                </div>
                <div className="text-right flex flex-col items-end">
                    <h1 className="text-4xl font-black text-slate-900 mb-1 uppercase tracking-tighter">Albarà</h1>
                    {albaranNumber && albaranNumber > 0 && (
                        <div className="bg-slate-100 px-4 py-1 rounded-full mb-2">
                            <span className="text-lg font-bold text-primary"># {String(albaranNumber).padStart(4, '0')}</span>
                        </div>
                    )}
                    <p className="text-slate-500 font-medium">{format(new Date(), 'eeee, dd MMMM yyyy', { locale: ca })}</p>
                </div>
            </header>

            {/* Document Info Grid */}
            <div className="grid grid-cols-2 gap-12 mb-10">
                <section className="bg-slate-50 p-6 rounded-lg border border-slate-100">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <User className="w-3 h-3" /> Client
                    </h3>
                    {customer ? (
                        <div className="space-y-1">
                             <p className="font-bold text-lg text-slate-900">{customer.name}</p>
                             <p className="text-slate-600 leading-relaxed">{customer.address || 'Sense adreça'}</p>
                             <div className="pt-2 grid grid-cols-1 gap-0.5 text-sm text-slate-500">
                                <p><span className="font-semibold text-slate-700">NIF:</span> {customer.nrt || '-'}</p>
                                <p><span className="font-semibold text-slate-700">Email:</span> {customer.email || '-'}</p>
                                <p><span className="font-semibold text-slate-700">Tel:</span> {customer.contact || '-'}</p>
                             </div>
                        </div>
                    ) : <p className="text-slate-400 italic">Dades del client no disponibles</p>}
                </section>

                <section className="bg-primary/5 p-6 rounded-lg border border-primary/10">
                    <h3 className="text-xs font-bold text-primary uppercase tracking-widest mb-3 flex items-center gap-2">
                        <CalendarIcon className="w-3 h-3" /> Detalls de l'Obra
                    </h3>
                    <p className="font-bold text-xl text-slate-900 mb-4">{projectName || 'Obra no especificada'}</p>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <p className="text-slate-500 font-semibold uppercase text-[10px]">Total Registres</p>
                            <p className="text-lg font-bold">{services.length}</p>
                        </div>
                        <div>
                            <p className="text-slate-500 font-semibold uppercase text-[10px]">Hores Totals</p>
                            <p className="text-lg font-bold text-primary">{totalTimeFormatted}</p>
                        </div>
                    </div>
                </section>
            </div>
            
            {/* Tasks Table */}
            {sortedServices.length > 0 && (
                <section className="mb-10 page-break-inside-avoid">
                    <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <span className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs">01</span>
                        RESUM DE TASQUES REALITZADES
                    </h3>
                    <table className="w-full text-sm border-collapse overflow-hidden rounded-lg shadow-sm border border-slate-200">
                         <thead>
                            <tr className="bg-slate-900 text-white">
                                <th className="text-left py-3 px-4 font-semibold w-28 uppercase text-[10px] tracking-wider">Data</th>
                                <th className="text-left py-3 px-4 font-semibold w-40 uppercase text-[10px] tracking-wider">Tècnic</th>
                                <th className="text-left py-3 px-4 font-semibold uppercase text-[10px] tracking-wider">Descripció del Treball</th>
                                <th className="text-right py-3 px-4 font-semibold w-24 uppercase text-[10px] tracking-wider">Hores</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {sortedServices.map((service, idx) => {
                                const arrival = parseISO(service.arrivalDateTime);
                                const departure = parseISO(service.departureDateTime);
                                const minutes = (isValid(arrival) && isValid(departure) && departure > arrival) ? differenceInMinutes(departure, arrival) : 0;
                                const hours = minutes > 0 ? (minutes / 60).toFixed(2) : '0.00';

                                return (
                                    <tr key={service.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                                        <td className="py-4 px-4 align-top whitespace-nowrap font-medium text-slate-600">{format(arrival, 'dd/MM/yyyy')}</td>
                                        <td className="py-4 px-4 align-top text-slate-700 font-semibold">{service.employeeName || getEmployeeName(service.employeeId)}</td>
                                        <td className="py-4 px-4 align-top">
                                            <p className="text-slate-800 leading-snug mb-1">{service.description}</p>
                                            {service.pendingTasks && (
                                                 <div className="mt-2 text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded p-2 flex gap-2 items-start">
                                                    <span className="font-bold shrink-0">PENDENT:</span>
                                                    <span>{service.pendingTasks}</span>
                                                 </div>
                                            )}
                                        </td>
                                        <td className="py-4 px-4 align-top text-right font-bold tabular-nums text-slate-900">{hours} h</td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </section>
            )}
            
            {/* Pricing Section (Conditional) */}
            {showPricing && (
              <section className="mb-10 page-break-inside-avoid border-t-2 border-slate-100 pt-8">
                    <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <span className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs">02</span>
                        DETALL DE MATERIALS I MÀ D'OBRA
                    </h3>
                    <table className="w-full text-sm border-collapse border border-slate-200 rounded-lg overflow-hidden">
                        <thead className="bg-slate-100">
                            <tr className="text-slate-600">
                                <th className="text-left py-3 px-4 font-bold uppercase text-[10px]">Descripció de l'Article</th>
                                <th className="text-right py-3 px-4 font-bold uppercase text-[10px] w-24">Quantitat</th>
                                <th className="text-right py-3 px-4 font-bold uppercase text-[10px] w-28">Preu Unit.</th>
                                <th className="text-right py-3 px-4 font-bold uppercase text-[10px] w-32">Import Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {allMaterials.map((material, index) => (
                                <tr key={`mat-${index}`} className="hover:bg-slate-50 transition-colors">
                                    <td className="py-3 px-4 text-slate-700">{material.description}</td>
                                    <td className="text-right py-3 px-4 tabular-nums text-slate-600">{material.quantity.toFixed(2)}</td>
                                    <td className="text-right py-3 px-4 tabular-nums text-slate-600">{material.unitPrice.toFixed(2)} €</td>
                                    <td className="text-right py-3 px-4 font-bold tabular-nums text-slate-900">{(material.quantity * material.unitPrice).toFixed(2)} €</td>
                                </tr>
                            ))}
                             {laborCost > 0 && (
                                <tr className="bg-slate-50/50">
                                    <td className="py-3 px-4 font-medium text-slate-700">Mà d'obra (Total hores treballades)</td>
                                    <td className="text-right py-3 px-4 tabular-nums font-semibold">{totalHours.toFixed(2)}</td>
                                    <td className="text-right py-3 px-4 tabular-nums text-slate-500">{(laborCost / totalHours).toFixed(2)} €</td>
                                    <td className="text-right py-3 px-4 font-bold tabular-nums text-slate-900">{laborCost.toFixed(2)} €</td>
                                </tr>
                            )}
                        </tbody>
                    </table>

                  <div className="flex justify-end mt-6">
                    <div className="w-80 space-y-3 bg-slate-900 text-white p-6 rounded-xl shadow-lg">
                        <div className="flex justify-between text-xs text-slate-400 font-bold uppercase">
                            <span>Subtotal Base</span>
                            <span className="tabular-nums">{subtotal.toFixed(2)} €</span>
                        </div>
                        <div className="flex justify-between text-xs text-slate-400 font-bold uppercase">
                            <span>IGI ({(IVA_RATE * 100).toFixed(1)}%)</span>
                            <span className="tabular-nums">{iva.toFixed(2)} €</span>
                        </div>
                        <div className="pt-3 border-t border-slate-700 flex justify-between items-center">
                            <span className="text-sm font-black uppercase tracking-wider">Total Albarà</span>
                            <span className="text-2xl font-black tabular-nums text-primary">{totalGeneral.toFixed(2)} €</span>
                        </div>
                    </div>
                  </div>
              </section>
            )}

            {/* Signature Grid */}
            {services.some(s => s.customerSignatureDataUrl) && (
                <section className="mt-12 page-break-inside-avoid">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6 border-b pb-2">Confirmació de Recepció de Treballs</h3>
                    <div className="grid grid-cols-3 gap-6">
                        {services.filter(s => s.customerSignatureDataUrl).map((s, idx) => (
                            <div key={idx} className="border border-slate-200 rounded-xl p-4 bg-slate-50/30">
                                <div className="flex justify-between items-center mb-3">
                                    <span className="text-[10px] font-bold text-slate-500">{format(parseISO(s.arrivalDateTime), 'dd/MM/yyyy')}</span>
                                    <CheckCircle className="w-3 h-3 text-green-500" />
                                </div>
                                <div className="relative h-20 w-full mb-3 bg-white rounded border border-slate-100">
                                    <Image src={s.customerSignatureDataUrl!} alt="Signature" fill className="object-contain p-2" />
                                </div>
                                <div className="text-center">
                                    <p className="text-xs font-black text-slate-900 uppercase truncate">{s.customerSignatureName}</p>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5">Autoritzat per Client</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Multimedia Grid */}
            {allMedia.length > 0 && (
                <section className="mt-12 pt-8 border-t border-slate-100 page-break-before-always">
                    <h3 className="text-sm font-bold text-slate-900 mb-6 uppercase tracking-wider">Evidències Fotogràfiques de l'Obra</h3>
                    <div className="grid grid-cols-4 gap-4">
                        {allMedia.map((media, index) => (
                            <div key={index} className="aspect-square relative rounded-xl overflow-hidden shadow-sm border border-slate-200 group">
                                <Image
                                    src={media.dataUrl}
                                    alt={`Evidència ${index + 1}`}
                                    fill
                                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                                />
                                <div className="absolute bottom-0 left-0 right-0 bg-black/40 text-white text-[8px] p-1 text-center backdrop-blur-sm">
                                    IMG_{index + 1}.JPG
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Professional Footer */}
            <footer className="mt-20 pt-8 border-t border-slate-200 flex justify-between items-end text-slate-400">
                <div className="text-[10px] space-y-1">
                    <p className="font-bold text-slate-500">TS SERVEIS - Solucions Tècniques i Manteniment</p>
                    <p>Aquest document és un albarà de treball realitzat.</p>
                    <p>Sense validesa fiscal fins a l'emissió de la factura.</p>
                </div>
                <div className="text-right">
                    <p className="text-[10px] font-bold uppercase tracking-widest mb-1">Gràcies per la seva confiança</p>
                    <div className="flex gap-1 justify-end">
                        <span className="w-2 h-2 rounded-full bg-primary"></span>
                        <span className="w-2 h-2 rounded-full bg-slate-200"></span>
                        <span className="w-2 h-2 rounded-full bg-slate-300"></span>
                    </div>
                </div>
            </footer>
        </div>
    )
})

ReportPreview.displayName = "ReportPreview";