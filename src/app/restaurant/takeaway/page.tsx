"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, ShoppingBag, Plus, MapPin, Check, Maximize2 } from "lucide-react";
import { useOrders } from "../store";
import { FullscreenToggle } from "@/components/FullscreenToggle";

export default function TakeawayPage() {
  const { orders, updateOrderStatus } = useOrders();

  const takeawayOrders = orders
    .filter((o) => o.type === "takeaway" && o.status !== "entregue")
    .map(order => ({ ...order, items: order.items.filter(i => i.categoryId !== 'begudes') }))
    .filter(order => order.items.length > 0)
    .sort((a,b) => {
      if (a.takeawayTime && b.takeawayTime) return a.takeawayTime.localeCompare(b.takeawayTime);
      if (a.takeawayTime) return -1;
      if (b.takeawayTime) return 1;
      return a.createdAt - b.createdAt;
    });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pendente": return <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-bold uppercase">Pendente</span>;
      case "preparacao": return <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold uppercase animate-pulse">Na Cozinha</span>;
      case "pronto": return <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold uppercase ring-2 ring-emerald-400 ring-offset-1">Pronto p/ Levantar</span>;
      default: return null;
    }
  };

  return (
    <div className="h-screen overflow-hidden bg-slate-50 flex flex-col font-sans">
      <div className="bg-white px-8 py-6 shadow-sm flex items-center justify-between border-b border-slate-200">
        <div className="flex items-center gap-6">
          <Link href="/restaurant" className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6 text-slate-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Takeaway</h1>
            <p className="text-slate-500 text-sm">Gerir pedidos para fora</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <FullscreenToggle />
          <Link 
            href="/restaurant/pos?takeaway=true" 
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-blue-200 flex items-center gap-2 transition-transform hover:scale-105"
          >
            <Plus className="w-5 h-5" /> Novo Pedido Takeaway
          </Link>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-8 max-w-5xl mx-auto w-full">
        {takeawayOrders.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-16 flex flex-col items-center justify-center text-center mt-12">
            <div className="bg-slate-50 rounded-full p-6 mb-6">
              <ShoppingBag className="w-16 h-16 text-slate-300" />
            </div>
            <h2 className="text-2xl font-bold text-slate-700 mb-2">Sem Pedidos Takeaway</h2>
            <p className="text-slate-500 max-w-md">Não há pedidos ativos no momento. Clique no botão acima para iniciar um novo pedido de takeaway.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {takeawayOrders.map((order) => (
              <div key={order.id} className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col hover:shadow-md transition-shadow relative overflow-hidden">
                {order.status === "pronto" && <div className="absolute top-0 left-0 w-full h-1.5 bg-emerald-500"></div>}
                
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <div className="font-bold text-2xl text-slate-800 mb-1">{order.takeawayName || "Cliente Direto"}</div>
                    <div className="text-slate-400 text-xs font-mono">
                      ID: #{order.id.slice(-4)} • Criado: {new Date(order.createdAt).toLocaleTimeString("pt-PT", {hour:"2-digit", minute:"2-digit"})}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 text-right">
                    {getStatusBadge(order.status)}
                    {order.takeawayTime && (
                       <span className="bg-purple-100/50 text-purple-700 font-bold px-3 py-1.5 rounded-lg text-sm border border-purple-200 flex items-center shadow-sm">
                          <span className="mr-2 text-lg leading-none">⌚</span> {order.takeawayTime}
                       </span>
                    )}
                  </div>
                </div>

                <div className="flex-1 space-y-3 mb-6 bg-slate-50 p-4 rounded-xl">
                  {order.items.slice(0, 3).map((item, idx) => (
                    <div key={idx} className="flex flex-col text-sm border-b border-slate-100/50 pb-2 mb-2 last:border-0 last:pb-0 last:mb-0">
                      <div className="font-semibold text-slate-700 flex justify-between">
                         <span><span className="text-slate-400 mr-2">{item.quantity}x</span> {item.name}</span>
                      </div>
                      {item.note && <div className="text-[11px] font-bold text-rose-500 italic ml-6 mt-0.5">Obs: {item.note}</div>}
                    </div>
                  ))}
                  {order.items.length > 3 && (
                     <div className="text-xs font-bold text-slate-400 pt-2 border-t border-slate-200">
                       + {order.items.length - 3} itens adicionais
                     </div>
                  )}
                </div>

                <div className="mt-auto">
                  <div className="flex justify-between items-center font-bold text-lg mb-4">
                    <span className="text-slate-500">Total</span>
                    <span className="text-slate-900">{new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(order.total)}</span>
                  </div>

                  {order.status === "pronto" ? (
                    <button 
                      onClick={() => updateOrderStatus(order.id, "entregue")}
                     className="w-full bg-slate-900 hover:bg-black text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-transform active:scale-95"
                    >
                      <Check className="w-5 h-5" /> Marcar como Entregue
                    </button>
                  ) : order.status === "pendente" ? (
                     <p className="text-sm font-medium text-slate-400 text-center py-2 shrink-0 border border-slate-100 rounded-xl bg-slate-50 flex items-center justify-center gap-2">A aguardar cozinha...</p>
                  ) : (
                     <p className="text-sm font-medium text-blue-600 text-center py-2 shrink-0 border border-blue-50 bg-blue-50/50 rounded-xl flex items-center justify-center gap-2">Na cozinha a preparar...</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
