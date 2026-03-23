"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { LayoutGrid, Users, Clock, ArrowLeft, CheckCircle2, AlertCircle, ChefHat, Coffee, ShoppingBag, Plus } from "lucide-react";
import { useOrders } from "../store";
import { FullscreenToggle } from "@/components/FullscreenToggle";

const MESAS = Array.from({ length: 10 }, (_, i) => `Mesa ${i + 1}`);
const BALCAO = Array.from({ length: 4 }, (_, i) => `Balcão ${i + 1}`);

export default function MesasPage() {
  const { orders, reservations, isLoading } = useOrders();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const activeOrders = orders.filter(
    (o) => o.type === "mesa" && (o.status === "pendente" || o.status === "preparacao" || o.status === "pronto")
  );

  const getTableCard = (tableName: string, icon: React.ReactNode) => {
    const orderForTable = activeOrders.find((o) => o.tableId === tableName);
    const isOccupied = !!orderForTable;
    
    const today = new Date().toISOString().split('T')[0];
    const tableReservations = reservations.filter(r => r.tableId === tableName && r.status === "confirmada" && r.date === today);
    const isReservedToday = tableReservations.length > 0;

    return (
      <Link  
        key={tableName}
        href={`/restaurant/pos?table=${encodeURIComponent(tableName)}`}
        className={`relative bg-white rounded-2xl p-3 shadow-sm hover:shadow-md transition-all duration-200 border flex flex-col items-center text-center h-24 justify-center group ${
          isOccupied ? "border-emerald-500 ring-1 ring-emerald-500" : "border-slate-200 hover:border-slate-300"
        }`}
      >
        <div className={`w-8 h-8 rounded-full mb-1 flex items-center justify-center transition-transform group-hover:scale-105 ${
          isOccupied ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400"
        }`}>
          {icon}
        </div>
        
        <div className="font-bold text-sm text-slate-800 leading-tight">{tableName}</div>
        
        <div className="font-semibold text-[10px] mt-0.5">
          {isOccupied ? (
            <span className="text-emerald-600 font-black uppercase">Ocupada</span>
          ) : isReservedToday ? (
             <span className="text-sky-600 font-bold uppercase">Reservada</span>
          ) : (
             <span className="text-slate-400 uppercase">Livre</span>
          )}
        </div>
        
        {isReservedToday && !isOccupied && (
           <div className="absolute top-0 left-0 w-full p-1 flex flex-col gap-0.5 pointer-events-none items-center">
             {tableReservations.slice(0, 2).map(res => (
               <div key={res.id} className="bg-sky-100 text-sky-700 text-[7px] font-black px-1 py-0.5 rounded-sm shadow-sm w-max max-w-[90%] truncate text-center border border-sky-200 uppercase">
                 {res.time}
               </div>
             ))}
           </div>
        )}

        {isOccupied && (
          <div className="absolute -top-2 -right-2 text-[9px] font-black text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-md shadow-sm border border-emerald-200">
            {new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(orderForTable.total)}
          </div>
        )}
      </Link>
    );
  };

  if (isLoading && !isMounted) {
    return <div className="h-screen flex items-center justify-center bg-slate-900 text-white font-black animate-pulse">CARREGANDO MESAS...</div>;
  }

  return (
    <div className="h-screen overflow-hidden bg-slate-50 flex flex-col font-sans text-slate-900">
      
      {/* Header */}
      <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between shadow-lg sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <Link href="/restaurant" className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-xl">
              <LayoutGrid className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black uppercase tracking-tight">Gestão de Mesas</h1>
              <p className="text-blue-400 text-[10px] font-bold uppercase tracking-widest">{MESAS.length + BALCAO.length} Postos de Venda</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-6 bg-slate-800/50 px-4 py-2 rounded-xl border border-slate-700">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
              <span className="text-xs font-bold text-slate-300">Livre</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-rose-500 rounded-full animate-pulse"></div>
              <span className="text-xs font-bold text-slate-300">Ocupada</span>
            </div>
          </div>
          <FullscreenToggle />
        </div>
      </div>

      <div className="flex-1 p-4 max-w-6xl mx-auto w-full flex flex-col gap-4 overflow-y-auto">
        
        {/* Sala Principal - 5x2 Compact Grid */}
        <section className="flex-shrink-0 flex flex-col bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-widest">Sala Principal</h2>
          </div>
          
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
            <div className="grid grid-cols-5 gap-3 relative">
              {/* Row 1 (Mesas 1-5, in order) */}
              {getTableCard(MESAS[0], <span className="text-xs font-bold">1</span>)}
              {getTableCard(MESAS[1], <span className="text-xs font-bold">2</span>)}
              {getTableCard(MESAS[2], <span className="text-xs font-bold">3</span>)}
              {getTableCard(MESAS[3], <span className="text-xs font-bold">4</span>)}
              {getTableCard(MESAS[4], <span className="text-xs font-bold">5</span>)}
              
              {/* Row 2 (Mesas 6-10, in order) */}
              {getTableCard(MESAS[5], <span className="text-xs font-bold">6</span>)}
              {getTableCard(MESAS[6], <span className="text-xs font-bold">7</span>)}
              {getTableCard(MESAS[7], <span className="text-xs font-bold">8</span>)}
              {getTableCard(MESAS[8], <span className="text-xs font-bold">9</span>)}
              {getTableCard(MESAS[9], <span className="text-xs font-bold">10</span>)}
            </div>
          </div>
        </section>

        {/* Lower Row: Balcão & Takeaway Side-by-Side if screen is wide enough, or stacked */}
        <div className="flex flex-col md:flex-row gap-4 flex-shrink-0">
          
          {/* Balcão */}
          <section className="flex-1 flex flex-col bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
            <div className="flex items-center gap-2 mb-3">
              <Coffee className="w-4 h-4 text-orange-600" />
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-widest">Balcão</h2>
            </div>
            
            <div className="bg-orange-50/50 p-4 rounded-xl border border-orange-100/50 flex-1">
              <div className="grid grid-cols-4 gap-3">
                  {BALCAO.map((seat, i) => (
                    <div key={seat} className="col-span-1">
                        {getTableCard(seat, <span className="text-xs font-bold">B{i+1}</span>)}
                    </div>
                  ))}
              </div>
            </div>
          </section>

          {/* Takeaway Section Compact */}
          <section className="flex-1 flex flex-col bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
            <div className="flex items-center gap-2 mb-3">
              <ShoppingBag className="w-4 h-4 text-purple-600" />
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-widest">Takeaway</h2>
            </div>
            
            <div className="bg-purple-50/50 p-4 rounded-xl border border-purple-100 flex-1 flex gap-3">
                <Link href="/restaurant/pos?takeaway=true" className="flex-1 bg-white rounded-xl p-3 shadow-sm hover:shadow-md transition-all duration-200 border border-purple-200 border-dashed flex flex-col items-center text-center justify-center group hover:bg-purple-50">
                  <div className="w-8 h-8 rounded-full mb-1 flex items-center justify-center bg-purple-100 text-purple-600 group-hover:scale-110 transition-transform">
                    <Plus className="w-4 h-4" />
                  </div>
                  <div className="font-bold text-sm text-slate-700">Novo</div>
                </Link>

                <Link href="/restaurant/takeaway" className="flex-1 bg-white rounded-xl p-3 shadow-sm hover:shadow-md transition-all duration-200 border flex flex-col items-center text-center justify-center group border-slate-200 hover:border-slate-300">
                    <div className="w-8 h-8 rounded-full mb-1 flex items-center justify-center bg-slate-100 text-slate-500 transition-transform group-hover:scale-110">
                      <ShoppingBag className="w-4 h-4" />
                    </div>
                    <div className="font-bold text-sm text-slate-700">Gerir Entregas</div>
                </Link>
            </div>
          </section>
          
        </div>

      </div>
    </div>
  );
}
