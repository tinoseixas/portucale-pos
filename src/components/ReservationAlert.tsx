"use client";

import React, { useState, useEffect } from 'react';
import { Bell, Calendar, X, Clock, Users, ChevronRight } from 'lucide-react';
import { useOrders, Reservation } from '@/app/restaurant/store';
import Link from 'next/link';

export function ReservationAlert() {
  const { reservations } = useOrders();
  const [showPanel, setShowPanel] = useState(false);
  const [todayStr, setTodayStr] = useState("");

  useEffect(() => {
    setTodayStr(new Date().toISOString().split('T')[0]);
  }, []);

  const todayReservations = reservations
    .filter(r => r.status === "confirmada" && r.date === todayStr)
    .sort((a, b) => a.time.localeCompare(b.time));

  if (todayReservations.length === 0) return null;

  return (
    <div className="fixed top-4 right-20 z-[999] flex flex-col items-end gap-2">
      {/* Trigger Badge */}
      <button 
        onClick={() => setShowPanel(!showPanel)}
        className={`flex items-center gap-2 px-4 py-2 rounded-full shadow-lg transition-all active:scale-95 ${
          showPanel ? 'bg-slate-900 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'
        }`}
      >
        <div className="relative">
          <Bell className="w-5 h-5" />
          <span className="absolute -top-1 -right-1 bg-rose-500 text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center border-2 border-slate-900 animate-pulse">
            {todayReservations.length}
          </span>
        </div>
        <span className="font-bold text-sm">Reservas Hoje</span>
      </button>

      {/* Floating Panel */}
      {showPanel && (
        <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-80 overflow-hidden animate-in slide-in-from-top-2 duration-200">
          <div className="bg-slate-50 px-5 py-3 border-b border-slate-100 flex justify-between items-center">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" /> Agendamentos
            </h3>
            <button onClick={() => setShowPanel(false)} className="p-1 hover:bg-slate-200 rounded-full">
              <X className="w-4 h-4 text-slate-400" />
            </button>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {todayReservations.map(res => (
              <div key={res.id} className="p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors">
                <div className="flex justify-between items-start mb-1">
                  <span className="font-black text-slate-900">{res.customerName}</span>
                  <span className="text-[10px] font-black bg-blue-100 text-blue-700 px-2 py-0.5 rounded uppercase">
                    {res.tableId}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-slate-500 text-xs font-semibold">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-blue-500" /> {res.time}
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="w-3 h-3" /> {res.guests} Pax
                  </div>
                </div>
              </div>
            ))}
          </div>
          <Link 
            href="/restaurant/reservas" 
            onClick={() => setShowPanel(false)}
            className="block w-full text-center py-3 bg-slate-50 text-blue-600 font-bold text-sm hover:bg-blue-50 transition-colors flex items-center justify-center gap-1"
          >
            Ver Calendário Completo <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      )}
    </div>
  );
}
