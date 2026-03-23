"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, CalendarDays, Plus, Clock, Users, Check, Ban, Coffee } from "lucide-react";
import { useOrders, Reservation } from "../store";

const MESAS = Array.from({ length: 10 }, (_, i) => `Mesa ${i + 1}`);
const BALCAO = Array.from({ length: 4 }, (_, i) => `Balcão ${i + 1}`);
const ALL_TABLES = [...MESAS, ...BALCAO];

export default function ReservasPage() {
  const { reservations, saveReservation, updateReservationStatus } = useOrders();
  
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    date: filterDate,
    time: "20:00",
    guests: "2",
    tableId: MESAS[0]
  });

  const activeReservations = reservations
    .filter(r => r.status === "confirmada" && r.date === filterDate)
    .sort((a, b) => new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime());

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) { alert("Indique o nome."); return; }
    
    // NEW: Overlap Check (1 hour margin)
    const newDateTime = new Date(`${formData.date}T${formData.time}`).getTime();
    const hasOverlap = reservations.some(r => {
      if (r.status !== "confirmada" || r.tableId !== formData.tableId || r.date !== formData.date) return false;
      const existingTime = new Date(`${r.date}T${r.time}`).getTime();
      const diff = Math.abs(newDateTime - existingTime);
      return diff < (60 * 60 * 1000); // 1 hour margin
    });

    if (hasOverlap) {
      const conflictRes = reservations.find(r => {
        if (r.status !== "confirmada" || r.tableId !== formData.tableId || r.date !== formData.date) return false;
        return Math.abs(newDateTime - new Date(`${r.date}T${r.time}`).getTime()) < (60 * 60 * 1000);
      });
      
      if (!confirm(`AVISO: A ${formData.tableId} já tem uma reserva para as ${conflictRes?.time} (${conflictRes?.customerName}).\n\n Pretende continuar?`)) {
        return;
      }
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
    
    saveReservation(newRes);
    setShowModal(false);
    setFormData({ ...formData, name: "", time: "20:00" }); 
  };

  const openModalForTable = (table: string) => {
    setFormData(prev => ({ ...prev, tableId: table, date: filterDate }));
    setShowModal(true);
  };

  const getTableCard = (tableName: string, icon: React.ReactNode) => {
    const tableReservations = activeReservations.filter(r => r.tableId === tableName);

    return (
      <button 
        key={tableName}
        onClick={() => openModalForTable(tableName)}
        className="relative bg-white rounded-2xl p-2 shadow-sm hover:shadow-md transition-all duration-200 border flex flex-col items-center text-center h-28 justify-center group border-slate-200 hover:border-blue-300 w-full"
      >
        <div className="w-8 h-8 rounded-full mb-1 flex items-center justify-center bg-slate-100 text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
          {icon}
        </div>
        <div className="font-bold text-[13px] text-slate-800 leading-tight">{tableName}</div>
        
        {/* Badges para reservas no topo (hora e nome do cliente) */}
        {tableReservations.length > 0 ? (
           <div className="absolute top-0 left-0 w-full p-1 flex flex-col gap-0.5 items-center pointer-events-none">
             {tableReservations.slice(0, 2).map(res => (
                <div key={res.id} className="bg-blue-100 text-blue-700 text-[9px] font-bold px-1.5 py-0.5 rounded-sm shadow-sm w-max max-w-[90%] truncate border border-blue-200 uppercase">
                  {res.time} - {res.customerName}
                </div>
             ))}
           </div>
        ) : (
           <div className="text-[10px] text-slate-400 mt-1">Livre (Clique para Marcar)</div>
        )}
      </button>
    );
  };

  return (
    <div className="h-screen bg-slate-50 flex flex-col font-sans text-slate-900 overflow-hidden">
      
      {/* Header */}
      <div className="bg-white px-6 py-4 shadow-sm flex items-center justify-between border-b border-slate-200 shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/restaurant" className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6 text-slate-600" />
          </Link>
          <img src="/logo.svg" alt="Portucale" className="h-10 object-contain mx-2 hidden sm:block" onError={(e) => { e.currentTarget.style.display='none' }} />
          <div>
            <h1 className="text-xl font-bold text-slate-800">Reservas de Mesas</h1>
            <p className="text-slate-500 text-xs font-serif italic">Plano Interativo com Gestão de Agendamentos</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <input 
            type="date" 
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="px-4 py-2 bg-slate-100 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button 
            onClick={() => { setFormData(prev => ({...prev, date: filterDate})); setShowModal(true); }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-md shadow-blue-200 flex items-center gap-2 transition-transform active:scale-95"
          >
            <Plus className="w-5 h-5" /> Reserva Manual
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Pane: Visual Table Plan */}
        <div className="flex-[2] p-6 overflow-y-auto bg-slate-100/50 border-r border-slate-200">
           <div className="max-w-4xl mx-auto space-y-6 pb-20">
              
              {/* Sala Principal */}
              <section className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200">
                <div className="flex items-center gap-2 mb-4">
                  <Users className="w-5 h-5 text-blue-600" />
                  <h2 className="text-sm font-bold text-slate-800 uppercase tracking-widest">Sala Principal</h2>
                </div>
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex flex-col gap-4">
                  {/* Fila 1 */}
                  <div className="grid grid-cols-5 gap-4">
                    {MESAS.slice(0, 5).map(t => getTableCard(t, <span className="text-sm font-bold">{t.replace('Mesa ', '')}</span>))}
                  </div>
                  {/* Corredor */}
                  <div className="h-4 w-full" />
                  {/* Fila 2 */}
                  <div className="grid grid-cols-5 gap-4">
                    {MESAS.slice(5, 10).map(t => getTableCard(t, <span className="text-sm font-bold">{t.replace('Mesa ', '')}</span>))}
                  </div>
                </div>
              </section>

              {/* Balcão */}
              <section className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200">
                <div className="flex items-center gap-2 mb-4">
                  <Coffee className="w-5 h-5 text-orange-600" />
                  <h2 className="text-sm font-bold text-slate-800 uppercase tracking-widest">Balcão</h2>
                </div>
                <div className="bg-orange-50/50 p-5 rounded-2xl border border-orange-100/50">
                  <div className="w-full h-4 bg-amber-800/80 rounded-t-lg mb-4 shadow-inner" />
                  <div className="grid grid-cols-4 gap-4">
                      {BALCAO.map(t => getTableCard(t, <Coffee className="w-4 h-4" />))}
                  </div>
                </div>
              </section>

           </div>
        </div>

        {/* Right Pane: List of reservations for the day */}
        <div className="flex-1 min-w-[350px] max-w-sm bg-white p-6 overflow-y-auto shadow-[-10px_0_30px_-15px_rgba(0,0,0,0.05)]">
           <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2 border-b border-slate-100 pb-4">
             <CalendarDays className="text-blue-600 w-5 h-5" /> Reservas para {new Date(filterDate).toLocaleDateString('pt-PT')}
           </h2>
          
           {activeReservations.length === 0 ? (
             <div className="text-center py-12 px-4">
               <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                 <CalendarDays className="w-8 h-8 text-slate-400" />
               </div>
               <p className="text-slate-500 font-medium">Nenhuma reserva para este dia.</p>
               <p className="text-sm text-slate-400 mt-2">Clique numa mesa ao lado para criar.</p>
             </div>
           ) : (
             <div className="space-y-4">
               {activeReservations.map(res => (
                 <div key={res.id} className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
                   <div className="flex justify-between items-start mb-3">
                     <h3 className="font-bold text-lg text-slate-800 leading-none">{res.customerName}</h3>
                     <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded uppercase">{res.tableId}</span>
                   </div>
                   
                   <div className="flex items-center gap-4 text-slate-500 text-sm mb-4 bg-white px-3 py-2 rounded-lg border border-slate-100">
                     <div className="flex items-center gap-1 font-bold text-slate-700">
                       <Clock className="w-4 h-4 text-blue-500" /> {res.time}
                     </div>
                     <div className="flex items-center gap-1 font-medium">
                       <Users className="w-4 h-4" /> {res.guests} Pax
                     </div>
                   </div>

                   <div className="flex gap-2">
                     <button 
                       onClick={() => updateReservationStatus(res.id, 'chegou')}
                       className="flex-1 bg-emerald-50 text-emerald-700 font-bold py-2 rounded flex justify-center items-center gap-1 hover:bg-emerald-100 transition-colors text-xs"
                     >
                       <Check className="w-4 h-4" /> Chegaram
                     </button>
                     <button 
                       onClick={() => { if(confirm("Deseja mesmo cancelar?")) updateReservationStatus(res.id, 'cancelada') }}
                       className="px-3 bg-rose-50 text-rose-600 font-bold py-2 rounded hover:bg-rose-100 transition-colors text-xs"
                       title="Cancelar Reserva"
                     >
                       <Ban className="w-4 h-4" />
                     </button>
                   </div>
                 </div>
               ))}
             </div>
           )}
        </div>
      </div>

      {/* Modal Nova Reserva */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
           <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                 <h2 className="font-bold text-lg text-slate-800">Nova Reserva</h2>
                 <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-200 rounded-full text-slate-500"><Ban className="w-5 h-5"/></button>
              </div>
              <form onSubmit={handleSave} className="p-6 space-y-4">
                 
                 <div>
                   <label className="block text-sm font-semibold text-slate-600 mb-1.5">Nome do Cliente</label>
                   <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50" placeholder="Ex: Sr. Silva" />
                 </div>

                 <div className="flex gap-3">
                   <div className="flex-1">
                     <label className="block text-sm font-semibold text-slate-600 mb-1.5">Data</label>
                     <input required type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none bg-slate-50 text-sm" />
                   </div>
                   <div className="w-24">
                     <label className="block text-sm font-semibold text-slate-600 mb-1.5">Hora</label>
                     <input required type="time" value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} className="w-full px-2 py-2.5 rounded-xl border border-slate-200 outline-none bg-slate-50 text-sm text-center font-bold text-slate-700" />
                   </div>
                 </div>

                 <div className="flex gap-3">
                   <div className="w-24">
                     <label className="block text-sm font-semibold text-slate-600 mb-1.5">Pax</label>
                     <input required type="number" min="1" max="20" value={formData.guests} onChange={e => setFormData({...formData, guests: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none bg-slate-50 text-center font-bold" />
                   </div>
                   <div className="flex-1">
                     <label className="block text-sm font-semibold text-slate-600 mb-1.5">Mesa</label>
                     <select required value={formData.tableId} onChange={e => setFormData({...formData, tableId: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none bg-slate-50 font-bold text-slate-700">
                       {ALL_TABLES.map(t => <option key={t} value={t}>{t}</option>)}
                     </select>
                   </div>
                 </div>

                 <div className="pt-4 flex gap-3">
                   <button type="button" onClick={() => setShowModal(false)} className="w-1/3 font-bold text-slate-500 border-2 border-slate-200 rounded-xl py-3 hover:bg-slate-50">Cancelar</button>
                   <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl py-3 shadow-md shadow-blue-200 transition-transform active:scale-95">Reservar Mesa</button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
}
