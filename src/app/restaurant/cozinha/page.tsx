"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Clock, CheckCircle2, Play, LayoutList, Flame, ChefHat } from "lucide-react";
import { useOrders, Order } from "../store";
import { FullscreenToggle } from "@/components/FullscreenToggle";

export default function CozinhaPage() {
  const { orders, updateOrderStatus, isLoading } = useOrders();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Sort orders: oldest pending first, filtered by food items only (exclude begudes)
  const activeOrders = orders
    .filter((o) => o.status === "pendente" || o.status === "preparacao")
    .map(order => ({ ...order, items: order.items.filter(i => i.categoryId !== 'begudes') }))
    .filter(order => order.items.length > 0)
    .sort((a, b) => a.createdAt - b.createdAt);

  const getUrgencyColor = (createdAt: number) => {
    if (!isMounted) return "bg-slate-50 text-slate-800 border-slate-200";
    const minElapsed = (Date.now() - createdAt) / 60000;
    if (minElapsed > 15) return "bg-rose-100 text-rose-800 border-rose-200";
    if (minElapsed > 10) return "bg-amber-100 text-amber-800 border-amber-200";
    return "bg-slate-50 text-slate-800 border-slate-200";
  };

  const getTimeElapsed = (ms: number) => {
    if (!isMounted) return "";
    const mins = Math.floor((Date.now() - ms) / 60000);
    return `${mins} min`;
  };

  if (isLoading && !isMounted) {
    return <div className="h-screen flex items-center justify-center bg-slate-900 text-white font-black animate-pulse">CARREGANDO COZINHA...</div>;
  }

  return (
    <div className="h-screen bg-slate-100 flex flex-col font-sans overflow-hidden">
      
      {/* Header - More Compact */}
      <div className="bg-slate-900 text-white px-4 py-2 flex items-center justify-between shadow-md relative z-10 shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/restaurant" className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <ChefHat className="w-6 h-6 text-blue-400" />
            <h1 className="text-lg font-black tracking-tight uppercase">Monitor de Cozinha</h1>
            <span className="hidden sm:inline bg-blue-600 px-2 py-0.5 rounded-full text-[10px] font-bold ml-2">
              {activeOrders.length} PEDIDOS
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-xl font-black font-mono tracking-tighter text-slate-300">
            {isMounted ? new Date().toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" }) : "--:--"}
          </div>
          <FullscreenToggle />
        </div>
      </div>

      {/* Unified Grid Display - No Scrolling */}
      <div className="flex-1 p-3 overflow-hidden">
          {activeOrders.length === 0 ? (
            <div className="h-full w-full flex flex-col items-center justify-center text-slate-400 bg-white/50 rounded-3xl border-2 border-dashed border-slate-300">
              <CheckCircle2 className="w-16 h-16 text-slate-300 mb-4" />
              <p className="font-black text-2xl uppercase tracking-widest text-slate-400">Tudo Pronto!</p>
              <p className="text-sm mt-2">Sem pedidos pendentes na cozinha.</p>
            </div>
          ) : (
            <div className="h-full grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 auto-rows-fr">
              {activeOrders.map((order) => (
                <OrderCard 
                  key={order.id} 
                  order={order} 
                  getUrgencyColor={getUrgencyColor} 
                  getTimeElapsed={getTimeElapsed} 
                  updateOrderStatus={updateOrderStatus} 
                />
              ))}
            </div>
          )}
      </div>
    </div>
  );
}

// Subcomponent for Order Cards - Compact for Single-Screen
function OrderCard({ order, getUrgencyColor, getTimeElapsed, updateOrderStatus }: { order: Order, getUrgencyColor: any, getTimeElapsed: any, updateOrderStatus: any }) {
  const isPrep = order.status === "preparacao";
  const isTakeaway = order.type === "takeaway";
  
  return (
    <div className={`rounded-xl border-2 flex flex-col overflow-hidden transition-all duration-300 h-full ${
      isPrep 
        ? "border-blue-600 ring-2 ring-blue-600/20 shadow-lg bg-white z-10" 
        : "border-slate-200 shadow-sm bg-white"
    }`}>
      <div className={`p-2 border-b flex justify-between items-start shrink-0 ${
        isPrep ? "bg-blue-600 text-white border-blue-600" : getUrgencyColor(order.createdAt)
      }`}>
        <div className="min-w-0 flex-1">
          <div className="font-black text-lg tracking-tight leading-none mb-0.5 truncate flex items-center gap-1">
             {isTakeaway && <Flame className="w-4 h-4 text-orange-400 shrink-0" />}
             {order.type === "mesa" ? order.tableId : `TAK: ${order.takeawayName}`}
          </div>
          <div className={`font-bold text-[9px] px-1 rounded-sm inline-block uppercase truncate max-w-full ${
            isPrep ? "bg-white/20 text-white" : "bg-black/5 text-slate-600"
          }`}>
             {isTakeaway ? (order.takeawayTime || 'ASAP') : ' Serviço Mesa'}
          </div>
        </div>
        <div className="flex flex-col items-end shrink-0 ml-1">
          <div className={`flex items-center gap-0.5 font-bold font-mono px-1 rounded text-[10px] border ${
            isPrep ? "bg-blue-500/50 border-blue-400 text-white" : "bg-white/60 border-black/5 text-slate-800"
          }`}>
            <Clock className="w-2.5 h-2.5 opacity-70" />
            {getTimeElapsed(order.createdAt)}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 bg-white scrollbar-thin scrollbar-thumb-slate-200">
        <ul className="space-y-1.5">
          {order.items.map((item, idx) => (
            <li key={idx} className="flex gap-1.5 items-start border-b border-slate-50 pb-1 last:border-0 last:pb-0">
              <div className="bg-slate-100 text-slate-800 font-black w-5 h-5 rounded flex items-center justify-center shrink-0 text-[10px] shadow-inner mt-0.5">
                {item.quantity % 1 === 0 ? item.quantity : item.quantity.toFixed(3)}
              </div>
              <div className="font-bold text-slate-700 text-[12px] leading-tight uppercase pt-0.5 flex-1">
                <div className="line-clamp-2">{item.name}</div>
                {item.note && (
                   <span className="block mt-0.5 text-rose-600 text-[10px] font-black leading-tight animate-pulse">
                     ⚠️ {item.note}
                   </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="p-1.5 bg-slate-50 border-t border-slate-100 shrink-0">
        {order.status === "pendente" ? (
          <button
            onClick={() => updateOrderStatus(order.id, "preparacao")}
            className="w-full bg-blue-600 text-white font-black uppercase tracking-wider py-1.5 rounded-lg hover:bg-blue-700 shadow-sm flex items-center justify-center gap-1.5 transition-transform active:scale-95 text-[10px]"
          >
            <Play className="w-3 h-3 fill-current" /> Preparar
          </button>
        ) : (
          <button
            onClick={() => updateOrderStatus(order.id, "pronto")}
            className="w-full bg-emerald-500 text-white font-black uppercase tracking-wider py-1.5 rounded-lg hover:bg-emerald-600 shadow-sm flex items-center justify-center gap-1.5 transition-transform active:scale-95 text-[10px]"
          >
            <CheckCircle2 className="w-3 h-3" /> Concluir
          </button>
        )}
      </div>
    </div>
  );
}
