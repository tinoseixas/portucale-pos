"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, ShoppingCart, Plus, Minus, ChefHat, X, Search, Users, Coffee } from "lucide-react";
import { useOrders, Order, OrderItem } from "../store";

const CATEGORIES = [
  { id: "entrants", name: "Entrants", icon: "🥗" },
  { id: "principals", name: "Principals", icon: "🥩" },
  { id: "begudes", name: "Begudes", icon: "🍹" },
  { id: "postres", name: "Postres", icon: "🍰" },
  { id: "takeaway_menu", name: "Takeaway", icon: "🛍️" },
];

const MENU_ITEMS = [
  { id: "e1", categoryId: "entrants", name: "Amanida Cèsar", price: 8.5, image: "https://images.unsplash.com/photo-1550304943-4f24f54ddde9?auto=format&fit=crop&q=80&w=400" },
  { id: "e2", categoryId: "entrants", name: "Patates Braves", price: 6.0, image: "https://images.unsplash.com/photo-1625937712144-8c650117dcf4?auto=format&fit=crop&q=80&w=400" },
  { id: "p1", categoryId: "principals", name: "Entrecot a la Brasa", price: 22.0, image: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&q=80&w=400" },
  { id: "p2", categoryId: "principals", name: "Paella de Marisc", price: 18.5, image: "https://images.unsplash.com/photo-1534080564583-6be75777b70a?auto=format&fit=crop&q=80&w=400" },
  { id: "p3", categoryId: "principals", name: "Hamburguesa Trufada", price: 14.5, image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&q=80&w=400" },
  { id: "b1", categoryId: "begudes", name: "Cervesa Artesana", price: 4.5, image: "https://images.unsplash.com/photo-1585553616435-2dc0a54e271d?auto=format&fit=crop&q=80&w=400" },
  { id: "b2", categoryId: "begudes", name: "Vi Negre", price: 3.5, image: "https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?auto=format&fit=crop&q=80&w=400" },
  { id: "b3", categoryId: "begudes", name: "Refresc de Llimona", price: 2.5, image: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&q=80&w=400" },
  { id: "po1", categoryId: "postres", name: "Pastís de Formatge", price: 6.5, image: "https://images.unsplash.com/photo-1533134242443-d4fd215305ad?auto=format&fit=crop&q=80&w=400" },
  { id: "po2", categoryId: "postres", name: "Coulant de Xocolata", price: 7.0, image: "https://images.unsplash.com/photo-1624353365286-3f8d62daad51?auto=format&fit=crop&q=80&w=400" },
  { id: "tkw1", categoryId: "takeaway_menu", name: "Costelles de Porc", price: 20.0, byWeight: true, image: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&q=80&w=400" },
  { id: "tkw2", categoryId: "takeaway_menu", name: "Arròs", price: 8.0, byWeight: true, image: "https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&q=80&w=400" },
  { id: "tkw3", categoryId: "takeaway_menu", name: "Mitjana de Vedella", price: 20.0, byWeight: true, image: "https://images.unsplash.com/photo-1558030006-450675393462?auto=format&fit=crop&q=80&w=400" },
  { id: "tkw4", categoryId: "takeaway_menu", name: "Patates Fregides", price: 11.0, byWeight: true, image: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&q=80&w=400" },
  { id: "tkw5", categoryId: "takeaway_menu", name: "Pollastre Sencer (~900g)", price: 13.50, byWeight: false, image: "https://images.unsplash.com/photo-1598514982205-f36b96d1e8d4?auto=format&fit=crop&q=80&w=400" },
];

const MESAS = Array.from({ length: 10 }, (_, i) => `Mesa ${i + 1}`);
const BALCAO = Array.from({ length: 4 }, (_, i) => `Balcão ${i + 1}`);

export default function MobileWaiterPage() {
  const { orders, saveOrder } = useOrders();
  
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  
  const [activeCategory, setActiveCategory] = useState<string>(CATEGORIES[0].id);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [existingOrderId, setExistingOrderId] = useState<string | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    if (selectedTable) {
      const existing = orders.find(o => o.type === "mesa" && o.tableId === selectedTable && (o.status === "pendente" || o.status === "preparacao" || o.status === "pronto"));
      if (existing) {
        setOrderItems(existing.items);
        setExistingOrderId(existing.id);
      } else {
        setOrderItems([]);
        setExistingOrderId(null);
      }
      setStep(2);
    }
  }, [selectedTable, orders]);

  const filteredItems = MENU_ITEMS.filter((item) => item.categoryId === activeCategory);
  const totalAmount = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalItemsCount = orderItems.reduce((sum, item) => sum + item.quantity, 0);

  const formatPrice = (price: number) => new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(price);

  const addToOrder = (item: typeof MENU_ITEMS[0]) => {
    setOrderItems((prev) => {
      const existing = prev.find((o) => o.id === item.id);
      if (existing) return prev.map((o) => (o.id === item.id ? { ...o, quantity: o.quantity + 1 } : o));
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setOrderItems((prev) => prev.map((item) => {
      if (item.id === id) return { ...item, quantity: Math.max(0, item.quantity + delta) };
      return item;
    }).filter((item) => item.quantity > 0));
  };

  const confirmOrder = () => {
    if (!selectedTable) return;
    
    const order: Order = {
      id: existingOrderId || Date.now().toString(),
      type: "mesa",
      tableId: selectedTable,
      items: orderItems,
      total: totalAmount,
      status: "pendente",
      createdAt: existingOrderId ? (orders.find(o => o.id === existingOrderId)?.createdAt || Date.now()) : Date.now(),
      updatedAt: Date.now(),
    };

    saveOrder(order);
    
    setIsCartOpen(false);
    setSelectedTable(null);
    setStep(1);
    
    alert("Pedido enviado para a cozinha!");
  };

  if (step === 1) {
    const activeTableIds = orders
      .filter(o => o.type === "mesa" && ["pendente", "preparacao", "pronto"].includes(o.status))
      .map(o => o.tableId);

    const getMiniCard = (name: string, isBalcao: boolean) => {
      const isOccupied = activeTableIds.includes(name);
      return (
        <button
          key={name}
          onClick={() => setSelectedTable(name)}
          className={`relative p-3 rounded-xl flex flex-col items-center justify-center border-2 active:scale-95 transition-transform h-20 shadow-sm ${
            isOccupied ? "bg-emerald-50 border-emerald-500 text-emerald-800" : "bg-white border-slate-200 text-slate-800"
          }`}
        >
          {isBalcao ? <Coffee className="w-5 h-5 mb-1" /> : <Users className="w-5 h-5 mb-1 opacity-50" />}
          <span className="text-sm font-bold whitespace-nowrap">{name.replace("Mesa ", "M").replace("Balcão ", "B")}</span>
          {isOccupied && <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-500" />}
        </button>
      );
    }

    return (
      <div className="h-[100dvh] overflow-hidden bg-slate-50 flex flex-col font-sans">
        <div className="bg-indigo-600 text-white px-4 py-4 flex items-center gap-4 shadow-md z-10 shrink-0">
          <Link href="/restaurant" className="p-2 hover:bg-white/20 rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div className="flex items-center gap-3">
             <div className="bg-white rounded p-1 flex items-center justify-center">
               <img src="/logo.svg" alt="Logo" className="h-6 object-contain" onError={(e) => { e.currentTarget.style.display='none' }} />
             </div>
             <div className="font-bold text-lg">App Garçom</div>
          </div>
        </div>
        
        <div className="p-4 flex-1 space-y-8 overflow-y-auto pb-10">
          
          <section>
            <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <span className="w-2 h-6 bg-blue-500 rounded-full inline-block"></span> Sala Principal
            </h2>
            <div className="bg-slate-200/50 p-4 rounded-3xl border border-slate-200">
              <div className="grid grid-cols-5 gap-2 gap-y-8 relative">
                {getMiniCard(MESAS[0], false)}
                {getMiniCard(MESAS[1], false)}
                {getMiniCard(MESAS[2], false)}
                {getMiniCard(MESAS[3], false)}
                {getMiniCard(MESAS[4], false)}
                
                <div className="absolute top-1/2 left-0 w-full h-4 bg-slate-300/30 -translate-y-1/2 rounded-full" />

                {getMiniCard(MESAS[5], false)}
                {getMiniCard(MESAS[6], false)}
                {getMiniCard(MESAS[7], false)}
                {getMiniCard(MESAS[8], false)}
                {getMiniCard(MESAS[9], false)}
              </div>
            </div>
          </section>

          <section>
            <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <span className="w-2 h-6 bg-orange-500 rounded-full inline-block"></span> Balcão
            </h2>
            <div className="bg-orange-50/50 p-4 rounded-3xl border border-orange-100">
               <div className="w-full h-4 bg-amber-800/80 rounded-t-lg mb-3 shadow-inner" />
               <div className="grid grid-cols-4 gap-2">
                  {getMiniCard(BALCAO[0], true)}
                  {getMiniCard(BALCAO[1], true)}
                  {getMiniCard(BALCAO[2], true)}
                  {getMiniCard(BALCAO[3], true)}
               </div>
            </div>
          </section>

        </div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] bg-slate-50 flex flex-col font-sans relative overflow-hidden">
      
      <div className="bg-indigo-600 text-white px-4 py-3 flex items-center justify-between shadow-md shrink-0 z-20">
        <button onClick={() => setStep(1)} className="p-2 -ml-2 hover:bg-white/20 rounded-full">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="font-bold text-center">
          <div className="text-lg leading-tight">{selectedTable}</div>
          <div className="text-[10px] text-indigo-200 uppercase tracking-widest leading-none mt-0.5">
            {existingOrderId ? "Comanda Aberta" : "Nova Comanda"}
          </div>
        </div>
        <div className="w-10"></div>
      </div>

      <div className="bg-white border-b border-slate-200 shrink-0 z-10 shadow-sm relative">
        <div className="flex overflow-x-auto no-scrollbar items-center py-2 px-3 gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex-shrink-0 px-4 py-2 rounded-full font-bold text-sm transition-colors border ${
                activeCategory === cat.id 
                  ? "bg-slate-900 border-slate-900 text-white" 
                  : "bg-white border-slate-200 text-slate-600"
              }`}
            >
              {cat.icon} {cat.name}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 content-start pb-28">
        <div className="flex flex-col gap-3">
          {filteredItems.map((item) => (
            <div key={item.id} className="bg-white rounded-2xl p-3 shadow-sm border border-slate-100 flex gap-3 items-center">
               <div className="w-20 h-20 rounded-xl bg-slate-100 shrink-0 overflow-hidden relative">
                  <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
               </div>
               <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-slate-800 text-sm mb-1">{item.name}</h3>
                  <div className="text-indigo-600 font-bold text-sm">{formatPrice(item.price)}</div>
               </div>
               <button 
                onClick={() => addToOrder(item)}
                className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-200 active:scale-90 transition-transform shrink-0"
               >
                 <Plus className="w-5 h-5" />
               </button>
            </div>
          ))}
        </div>
      </div>

      {totalItemsCount > 0 && (
        <div className="absolute bottom-4 left-4 right-4 z-30 flex gap-3">
          <button 
            onClick={() => setIsCartOpen(true)}
            className="bg-slate-900 text-white rounded-2xl p-4 shadow-2xl active:scale-[0.95] transition-transform"
          >
            <ShoppingCart className="w-6 h-6" />
          </button>
          
          <button 
            onClick={confirmOrder}
            className="flex-1 bg-emerald-600 text-white rounded-2xl p-4 shadow-2xl flex items-center justify-between active:scale-[0.98] transition-all hover:bg-emerald-700"
          >
            <div className="flex items-center gap-3">
              <div className="bg-emerald-700 w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border border-emerald-500 shadow-inner">
                {totalItemsCount}
              </div>
              <span className="font-black uppercase tracking-widest text-sm">Enviar para Cozinha</span>
            </div>
            <span className="font-black text-base opacity-90">{formatPrice(totalAmount)}</span>
          </button>
        </div>
      )}

      {isCartOpen && (
        <div className="absolute inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsCartOpen(false)}></div>
          
          <div className="bg-white rounded-t-3xl h-[85dvh] flex flex-col relative animate-in slide-in-from-bottom-full duration-300">
            <div className="w-full flex justify-center pt-3 pb-2 shrink-0">
              <div className="w-12 h-1.5 bg-slate-200 rounded-full"></div>
            </div>
            
            <div className="px-5 py-2 flex items-center justify-between border-b border-slate-100 shrink-0">
              <h2 className="text-xl font-bold text-slate-800">{selectedTable}</h2>
              <button onClick={() => setIsCartOpen(false)} className="p-2 bg-slate-100 rounded-full text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {orderItems.map((item) => (
                <div key={item.id} className="flex flex-col gap-2">
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-slate-800 text-sm">{item.name}</span>
                    <span className="font-bold text-slate-900 text-sm">{formatPrice(item.price * item.quantity)}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-0 bg-slate-100 rounded-full">
                      <button onClick={() => updateQuantity(item.id, -1)} className="p-2 text-slate-500 active:bg-slate-200 rounded-l-full">
                        <Minus className="w-5 h-5" />
                      </button>
                      <span className="w-8 text-center font-bold text-sm">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, 1)} className="p-2 text-indigo-600 active:bg-slate-200 rounded-r-full">
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-5 bg-white border-t border-slate-200 shrink-0 pb-8">
              <div className="flex justify-between items-center mb-6">
                <span className="text-lg font-bold text-slate-500">Total a pagar</span>
                <span className="text-3xl font-black text-slate-900">{formatPrice(totalAmount)}</span>
              </div>
              <button
                onClick={confirmOrder}
                className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold text-lg shadow-xl shadow-indigo-600/30 flex justify-center items-center gap-2 active:scale-95 transition-transform"
              >
                <ChefHat className="w-6 h-6" />
                Enviar para Cozinha
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
