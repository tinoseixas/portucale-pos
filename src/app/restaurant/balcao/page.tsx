"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Clock, Check, BellRing } from "lucide-react";
import { useOrders, Order } from "../store";

export default function BalcaoPage() {
  const { orders, updateOrderStatus } = useOrders();

  const preparingOrders = orders
    .filter((o) => o.status === "preparacao")
    .sort((a, b) => a.updatedAt - b.updatedAt);

  const readyOrders = orders
    .filter((o) => o.status === "pronto")
    .sort((a, b) => a.updatedAt - b.updatedAt);

  const renderOrderCard = (order: Order, isReady: boolean) => (
    <div key={order.id} className={`bg-white rounded-3xl p-6 shadow-sm border-2 ${isReady ? 'border-emerald-500' : 'border-slate-100'} hover:shadow-md transition-shadow relative overflow-hidden flex flex-col`}>
      {isReady && <div className="absolute top-0 left-0 w-full h-2 bg-emerald-500" />}
      
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className={`font-black tracking-tight ${isReady ? 'text-3xl text-emerald-700' : 'text-2xl text-slate-800'}`}>
            {order.type === "mesa" ? order.tableId : order.takeawayName || "Takeaway"}
          </h3>
          <p className="text-slate-500 text-sm font-bold uppercase tracking-widest mt-1">
            {order.type === "takeaway" ? "Takeaway (Recolha)" : "Servir à Mesa"}
          </p>
        </div>
        {isReady && (
          <div className="bg-emerald-100 text-emerald-600 p-2 rounded-full">
             <BellRing className="w-8 h-8 animate-pulse" />
          </div>
        )}
      </div>

      <div className="space-y-4 mb-6 flex-1">
        <ul className="space-y-2">
          {order.items.map((item) => {
            const isScale = item.quantity % 1 !== 0; // rough check for weight
            return (
              <li key={item.id} className="flex gap-3 text-slate-700 font-medium items-start">
                <span className="bg-slate-100 text-slate-600 font-black px-2 py-0.5 rounded text-sm min-w-[2rem] text-center">
                  {isScale ? `${item.quantity.toFixed(3)}kg` : item.quantity}
                </span>
                <span className="leading-snug">{item.name}</span>
              </li>
            )
          })}
        </ul>
      </div>

      {isReady && (
        <button
          onClick={() => updateOrderStatus(order.id, "entregue")}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xl py-4 rounded-2xl shadow-lg shadow-emerald-200 flex justify-center items-center gap-2 transition-transform active:scale-95"
        >
          <CheckCircle2 className="w-6 h-6" /> Entregue
        </button>
      )}
    </div>
  );

  return (
    <div className="h-screen bg-slate-50 flex flex-col font-sans text-slate-900 overflow-hidden">
      {/* Header */}
      <div className="bg-white px-8 py-5 shadow-sm flex items-center justify-between border-b border-slate-200 shrink-0">
        <div className="flex items-center gap-6">
          <Link href="/restaurant" className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6 text-slate-600" />
          </Link>
          <img src="/logo.svg" alt="Portucale" className="h-10 object-contain mx-2 hidden sm:block" onError={(e) => { e.currentTarget.style.display='none' }} />
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Ecrã de Balcão (Entregas)</h1>
            <p className="text-slate-500 text-sm">Monitorização de pratos prontos pela cozinha</p>
          </div>
        </div>
      </div>

      {/* Columns */}
      <div className="flex-1 flex overflow-hidden p-6 gap-6">
        
        {/* Em Preparação */}
        <div className="flex-1 flex flex-col bg-slate-100/50 rounded-[2rem] border border-slate-200 overflow-hidden">
          <div className="bg-white px-6 py-4 border-b border-slate-200 flex justify-between items-center shrink-0">
             <div className="flex items-center gap-3">
               <Clock className="w-6 h-6 text-slate-400" />
               <h2 className="text-2xl font-bold text-slate-700">A Preparar</h2>
             </div>
             <span className="bg-slate-200 text-slate-600 font-bold px-3 py-1 rounded-full">{preparingOrders.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto p-6">
             <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {preparingOrders.length === 0 ? (
                  <div className="col-span-full text-center py-20 text-slate-400 font-medium">
                    Nenhum pedido em preparação na cozinha neste momento.
                  </div>
                ) : (
                  preparingOrders.map(o => renderOrderCard(o, false))
                )}
             </div>
          </div>
        </div>

        {/* Prontos */}
        <div className="flex-1 flex flex-col bg-emerald-50/50 rounded-[2rem] border border-emerald-100 overflow-hidden shadow-inner">
          <div className="bg-white px-6 py-4 border-b border-emerald-100 flex justify-between items-center shrink-0">
             <div className="flex items-center gap-3">
               <CheckCircle2 className="w-6 h-6 text-emerald-500" />
               <h2 className="text-2xl font-bold text-slate-800">Prontos a Entregar</h2>
             </div>
             <span className="bg-emerald-500 text-white font-bold px-3 py-1 rounded-full shadow-sm">{readyOrders.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto p-6">
             <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {readyOrders.length === 0 ? (
                  <div className="col-span-full text-center py-20 text-emerald-400 font-medium">
                    Aguardando que a cozinha finalize os pedidos...
                  </div>
                ) : (
                  readyOrders.map(o => renderOrderCard(o, true))
                )}
             </div>
          </div>
        </div>

      </div>
    </div>
  );
}
