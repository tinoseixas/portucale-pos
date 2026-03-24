"use client";

import React, { useState } from "react";
import { CalendarDays, Clock, Users, CheckCircle2, ChevronRight, ArrowLeft } from "lucide-react";
import { useOrders, Reservation } from "../restaurant/store";
import { ALL_TABLES } from "../restaurant/constants";
import Link from "next/link";

export default function PublicReservarPage() {
  const { saveReservation, checkReservationConflict, isLoading } = useOrders();
  
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: "",
    date: new Date().toISOString().split('T')[0],
    time: "20:00",
    guests: "2",
    tableId: ""
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleNext = () => {
    if (step === 1) {
      if (!formData.name) { setError("Por favor, indique o seu nome."); return; }
      setError("");
      setStep(2);
    }
  };

  const handleFinalize = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.tableId) { setError("Por favor, selecione uma mesa."); return; }

    // Overlap Check (Centralized)
    const conflict = checkReservationConflict(formData.tableId, formData.date, formData.time);
    if (conflict) {
      setError(`Pedimos desculpa, mas a ${formData.tableId} já não está disponível para este horário (margem de 1h). Por favor, escolha outra mesa ou horário.`);
      return;
    }

    const newRes: Reservation = {
      id: Date.now().toString(),
      customerName: formData.name,
      date: formData.date,
      time: formData.time,
      guests: parseInt(formData.guests),
      tableId: formData.tableId,
      status: "confirmada",
      createdAt: Date.now()
    };

    await saveReservation(newRes);
    setSuccess(true);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
        <div className="bg-white rounded-3xl p-8 shadow-xl max-w-sm w-full text-center space-y-6 border border-slate-100 animate-in zoom-in-95 duration-300">
          <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-12 h-12" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-slate-800">Reserva Confirmada!</h1>
            <p className="text-slate-500">Obrigado, <span className="font-bold text-slate-700">{formData.name}</span>. A sua mesa estará pronta às {formData.time}.</p>
          </div>
          <div className="bg-slate-50 rounded-2xl p-4 text-left border border-slate-100 space-y-2">
            <div className="flex justify-between text-sm"><span className="text-slate-400">Data:</span> <span className="font-bold">{formData.date}</span></div>
            <div className="flex justify-between text-sm"><span className="text-slate-400">Mesa:</span> <span className="font-bold">{formData.tableId}</span></div>
            <div className="flex justify-between text-sm"><span className="text-slate-400">Pessoas:</span> <span className="font-bold">{formData.guests} Pax</span></div>
          </div>
          <button onClick={() => window.location.reload()} className="w-full bg-slate-800 text-white font-bold py-4 rounded-2xl shadow-lg hover:bg-slate-900 transition-all active:scale-95">
            Fazer Outra Reserva
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-8 font-sans text-slate-900">
      <div className="max-w-md mx-auto space-y-8">
        
        {/* Header */}
        <div className="text-center space-y-2 pt-4">
          <img src="/logo.svg" alt="Portucale" className="h-12 mx-auto mb-4" onError={(e) => { e.currentTarget.style.display='none' }} />
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Reservar Mesa</h1>
          <p className="text-slate-500 font-serif italic">Experiência Gastronómica Única no Portucale</p>
        </div>

        {/* Progress Bar */}
        <div className="flex gap-2">
          <div className={`h-1.5 flex-1 rounded-full transition-colors ${step >= 1 ? 'bg-blue-600' : 'bg-slate-200'}`} />
          <div className={`h-1.5 flex-1 rounded-full transition-colors ${step >= 2 ? 'bg-blue-600' : 'bg-slate-200'}`} />
        </div>

        <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden relative">
          {isLoading && (
            <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-10 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent" />
            </div>
          )}

          {step === 1 ? (
            <div className="p-8 space-y-6">
              <div className="space-y-1">
                <h2 className="text-xl font-bold text-slate-800">Os seus dados</h2>
                <p className="text-sm text-slate-400">Faltam apenas alguns segundos.</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Nome Completo</label>
                  <input 
                    type="text" 
                    value={formData.name} 
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    placeholder="Como se chama?"
                    className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 focus:border-blue-500 focus:ring-0 outline-none transition-all bg-slate-50/50 font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Data</label>
                    <div className="relative">
                      <input 
                        type="date" 
                        value={formData.date}
                        min={new Date().toISOString().split('T')[0]}
                        onChange={e => setFormData({...formData, date: e.target.value})}
                        className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 focus:border-blue-500 focus:ring-0 outline-none transition-all bg-slate-50/50 font-bold text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Pessoas</label>
                    <div className="relative">
                      <select 
                        value={formData.guests}
                        onChange={e => setFormData({...formData, guests: e.target.value})}
                        className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 focus:border-blue-500 focus:ring-0 outline-none transition-all bg-slate-50/50 font-bold"
                      >
                        {[1,2,3,4,5,6,7,8,10,12].map(n => <option key={n} value={n}>{n} Pax</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Horário Desejado</label>
                  <input 
                    type="time" 
                    value={formData.time}
                    onChange={e => setFormData({...formData, time: e.target.value})}
                    className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 focus:border-blue-500 focus:ring-0 outline-none transition-all bg-slate-50/50 font-bold text-lg text-center"
                  />
                </div>
              </div>

              {error && <p className="text-rose-500 text-sm font-bold bg-rose-50 p-4 rounded-xl border border-rose-100">{error}</p>}

              <button 
                onClick={handleNext}
                className="w-full bg-blue-600 text-white font-bold py-5 rounded-2xl shadow-lg shadow-blue-200 flex items-center justify-center gap-2 hover:bg-blue-700 transition-all active:scale-[0.98]"
              >
                Escolher Mesa <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <div className="p-8 space-y-6">
              <div className="flex justify-between items-center">
                <div className="space-y-1">
                  <h2 className="text-xl font-bold text-slate-800">Escolha o seu lugar</h2>
                  <p className="text-sm text-slate-400">{formData.date} às {formData.time}</p>
                </div>
                <button onClick={() => setStep(1)} className="p-2 text-slate-400 hover:text-slate-600"><ArrowLeft className="w-5 h-5" /></button>
              </div>

              <div className="grid grid-cols-3 gap-3 max-h-[300px] overflow-y-auto p-1 pr-2 scrollbar-thin scrollbar-thumb-slate-200">
                {ALL_TABLES.map(table => {
                   const isConflict = checkReservationConflict(table, formData.date, formData.time);
                   return (
                     <button
                       key={table}
                       disabled={!!isConflict}
                       onClick={() => setFormData({...formData, tableId: table})}
                       className={`p-3 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-1 group
                         ${formData.tableId === table ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-100' : 'border-slate-100 hover:border-slate-200 bg-slate-50/30'}
                         ${isConflict ? 'opacity-30 grayscale cursor-not-allowed border-none bg-slate-100' : ''}
                       `}
                     >
                       <Users className={`w-4 h-4 ${formData.tableId === table ? 'text-blue-600' : 'text-slate-300'}`} />
                       <span className={`text-[10px] font-black uppercase tracking-tighter ${formData.tableId === table ? 'text-blue-700' : 'text-slate-500'}`}>
                         {table.replace('Mesa ', 'M').replace('Balcão ', 'B')}
                       </span>
                     </button>
                   );
                })}
              </div>

              {error && <p className="text-rose-600 text-[13px] font-bold bg-rose-50 p-4 rounded-xl border border-rose-100 leading-snug">{error}</p>}

              <button 
                onClick={handleFinalize}
                className="w-full bg-emerald-600 text-white font-extrabold py-5 rounded-2xl shadow-lg shadow-emerald-200 flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all active:scale-[0.98]"
              >
                Confirmar Reserva <CheckCircle2 className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-6 text-slate-400">
             <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest"><CalendarDays className="w-3.5 h-3.5" /> Aberto Diariamente</div>
             <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest"><Clock className="w-3.5 h-3.5" /> 12:00 - 23:00</div>
          </div>
          <p className="text-[10px] text-slate-300 font-medium px-8">Ao reservar, concorda com a nossa política de cancelamento. Reservas mantidas por 15 minutos.</p>
        </div>

      </div>
    </div>
  );
}
