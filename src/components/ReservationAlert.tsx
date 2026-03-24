"use client";

import React, { useState, useEffect } from 'react';
import { Bell, Calendar, X, Clock, Users, ChevronRight } from 'lucide-react';
import { useOrders, Reservation } from '@/app/restaurant/store';
import Link from 'next/link';

export function ReservationAlert() {
  const { reservations, orders } = useOrders();
  const [showPanel, setShowPanel] = useState(false);
  const [todayStr, setTodayStr] = useState("");

  useEffect(() => {
    setTodayStr(new Date().toISOString().split('T')[0]);
  }, []);

  const todayReservations = reservations
    .filter(r => r.status === "confirmada" && r.date === todayStr)
    .sort((a, b) => a.time.localeCompare(b.time));

  const pendingTakeaway = orders
    .filter(o => o.type === "takeaway" && o.status === "pendente");

  const totalAlerts = todayReservations.length + pendingTakeaway.length;

  if (totalAlerts === 0) return null;

  return (
    <div className="fixed top-4 left-4 z-[999] flex flex-col items-start gap-2 max-w-[90vw]">
      {/* Trigger Badge */}
      <button 
        onClick={() => setShowPanel(!showPanel)}
        className={`flex items-center gap-3 px-4 py-2 rounded-full shadow-lg transition-all active:scale-95 animate-pulse border-2 ${
          showPanel 
            ? 'bg-slate-900 text-white border-slate-700' 
            : 'bg-rose-600 text-white hover:bg-rose-700 border-rose-400'
        }`}
      >
        <div className="flex -space-x-2">
          {todayReservations.length > 0 && (
            <div className="relative z-10">
              <Calendar className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 bg-blue-500 text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center border-2 border-slate-900">
                {todayReservations.length}
              </span>
            </div>
          )}
          {pendingTakeaway.length > 0 && (
            <div className="relative z-0">
              <div className="bg-orange-500 rounded-full p-0.5">
                <Bell className="w-4 h-4" />
              </div>
              <span className="absolute -top-1 -right-1 bg-orange-600 text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center border-2 border-slate-900">
                {pendingTakeaway.length}
              </span>
            </div>
          )}
        </div>
        <span className="font-bold text-sm">
          {todayReservations.length > 0 && pendingTakeaway.length > 0 
            ? "Alertas Ativos" 
            : todayReservations.length > 0 ? "Reservas Hoje" : "Takeaway Pendente"}
        </span>
      </button>

      {/* Floating Panel */}
      {showPanel && (
        <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-80 overflow-hidden animate-in slide-in-from-top-2 duration-200">
          <div className="bg-slate-50 px-5 py-3 border-b border-slate-100 flex justify-between items-center">
            <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm uppercase tracking-wider">
              Notificações do Sistema
            </h3>
            <button onClick={() => setShowPanel(false)} className="p-1 hover:bg-slate-200 rounded-full">
              <X className="w-4 h-4 text-slate-400" />
            </button>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {/* Takeaways first as they are more "immediate" */}
            {pendingTakeaway.map(order => (
              <Link 
                key={order.id} 
                href="/restaurant/takeaway"
                onClick={() => setShowPanel(false)}
                className="block p-4 border-b border-orange-50 bg-orange-50/30 hover:bg-orange-100 transition-colors"
              >
                <div className="flex justify-between items-start mb-1">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                    <span className="font-black text-slate-900">TAKEAWAY #{order.id.slice(-4)}</span>
                  </div>
                  <span className="text-[10px] font-black bg-orange-100 text-orange-700 px-2 py-0.5 rounded uppercase">
                    Pendente
                  </span>
                </div>
                <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold">
                  <Clock className="w-3 h-3" /> {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  <span className="mx-1">•</span>
                  {order.items.length} itens
                </div>
              </Link>
            ))}

            {/* Reservations */}
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
          
          <div className="grid grid-cols-2 bg-slate-50 border-t border-slate-100 font-bold text-xs uppercase text-slate-500 tracking-tighter">
            <Link 
              href="/restaurant/reservas" 
              onClick={() => setShowPanel(false)}
              className="py-3 hover:bg-white text-center border-r border-slate-100"
            >
              Reservas
            </Link>
            <Link 
              href="/restaurant/takeaway" 
              onClick={() => setShowPanel(false)}
              className="py-3 hover:bg-white text-center"
            >
              Takeaway
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
