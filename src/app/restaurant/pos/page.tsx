"use client";
// Build trigger comment

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Search, ShoppingCart, Plus, Minus, ChefHat, ArrowLeft, Scale, X, Usb, Printer, CheckCircle2, AlertCircle, LayoutGrid, CreditCard, Coins, Trash2, Edit, FileText, Delete, Maximize2, MessageSquare, ArrowRightLeft } from "lucide-react";
import { useOrders, Order, OrderItem } from "../store";
// Fullscreen Semi-Automático (Ao primeiro clique)
import { FullscreenToggle } from "@/components/FullscreenToggle";

type MenuItemDefs = {
  id: string;
  categoryId: string;
  name: string;
  price: number;
  image: string;
  byWeight?: boolean;
};

const CATEGORIES = [
  { id: "entrants", name: "Entrants", icon: "🥗" },
  { id: "principals", name: "Principals", icon: "🥩" },
  { id: "begudes", name: "Begudes", icon: "🍹" },
  { id: "postres", name: "Postres", icon: "🍰" },
  { id: "takeaway_menu", name: "Takeaway", icon: "🛍️" },
];

const MENU_ITEMS: MenuItemDefs[] = [
  { id: "e1", categoryId: "entrants", name: "Amanida Cèsar", price: 8.5, image: "https://images.unsplash.com/photo-1550304943-4f24f54ddde9?auto=format&fit=crop&q=80&w=400" },
  { id: "e2", categoryId: "entrants", name: "Patates Braves", price: 6.0, image: "https://images.unsplash.com/photo-1625937712144-8c650117dcf4?auto=format&fit=crop&q=80&w=400" },
  { id: "p1", categoryId: "principals", name: "Entrecot a la Brasa", price: 22.0, image: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&q=80&w=400" },
  { id: "p2", categoryId: "principals", name: "Paella de Marisc", price: 18.5, image: "https://images.unsplash.com/photo-1534080564583-6be75777b70a?auto=format&fit=crop&q=80&w=400" },
  { id: "b1", categoryId: "begudes", name: "Cervesa Artesana", price: 4.5, image: "https://images.unsplash.com/photo-1585553616435-2dc0a54e271d?auto=format&fit=crop&q=80&w=400" },
  { id: "po1", categoryId: "postres", name: "Pastís de Formatge", price: 6.5, image: "https://images.unsplash.com/photo-1533134242443-d4fd215305ad?auto=format&fit=crop&q=80&w=400" },
  { id: "tkw1", categoryId: "takeaway_menu", name: "Costelles de Porc", price: 20.0, byWeight: true, image: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&q=80&w=400" },
  { id: "tkw2", categoryId: "takeaway_menu", name: "Arròs", price: 8.0, byWeight: true, image: "https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&q=80&w=400" },
  { id: "tkw3", categoryId: "takeaway_menu", name: "Mitjana de Vedella", price: 20.0, byWeight: true, image: "https://images.unsplash.com/photo-1558030006-450675393462?auto=format&fit=crop&q=80&w=400" },
  { id: "tkw4", categoryId: "takeaway_menu", name: "Patates Fregides", price: 11.0, byWeight: true, image: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&q=80&w=400" },
  { id: "tkw5", categoryId: "takeaway_menu", name: "Pollastre Sencer (~900g)", price: 13.50, byWeight: false, image: "https://images.unsplash.com/photo-1598514982205-f36b96d1e8d4?auto=format&fit=crop&q=80&w=400" },
];

const TABLE_OPTIONS = Array.from({ length: 10 }, (_, i) => `Mesa ${i + 1}`);
const BALCAO_OPTIONS = Array.from({ length: 4 }, (_, i) => `Balcão ${i + 1}`);

function POSInterface() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { orders, saveOrder, deleteOrder, transferOrder, reservations, updateReservationStatus } = useOrders();

  const tableParam = searchParams.get("table");
  const takeawayParam = searchParams.get("takeaway");
  const isTakeawayMode = takeawayParam === "true";
  
  const [selectedTable, setSelectedTable] = useState<string | undefined>(tableParam || undefined);
  const [isTakeaway, setIsTakeaway] = useState(isTakeawayMode);
  const [showTableSelect, setShowTableSelect] = useState(!tableParam && !takeawayParam);
  const [showTakeawayModal, setShowTakeawayModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const [activeCategory, setActiveCategory] = useState<string>(CATEGORIES[0].id);
  const [searchQuery, setSearchQuery] = useState("");
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [existingOrder, setExistingOrder] = useState<Order | null>(null);
  const [initialItemsStr, setInitialItemsStr] = useState<string>("[]");
  const [takeawayName, setTakeawayName] = useState<string>("");
  const [takeawayTime, setTakeawayTime] = useState<string>("");
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [currentNote, setCurrentNote] = useState("");

  const [scaleItemPending, setScaleItemPending] = useState<MenuItemDefs | null>(null);
  const [liveWeight, setLiveWeight] = useState<number | null>(null);
  
  const [numpadValue, setNumpadValue] = useState<string>("");

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => { setIsMounted(true); }, []);

  // NEW: Table Management State
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);

  useEffect(() => {
    if (showTakeawayModal && !takeawayTime) {
      const now = new Date();
      now.setMinutes(now.getMinutes() + 30);
      setTakeawayTime(now.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" }));
    }
  }, [showTakeawayModal, takeawayTime]);

  useEffect(() => {
    if (selectedTable) {
      setIsTakeaway(false);
      const existing = orders.find(o => o.type === "mesa" && o.tableId === selectedTable && (o.status === "pendente" || o.status === "preparacao" || o.status === "pronto"));
      if (existing) {
        setExistingOrder(existing);
        setOrderItems(existing.items);
        setInitialItemsStr(JSON.stringify(existing.items));
      } else {
        setExistingOrder(null);
        setOrderItems([]);
        setInitialItemsStr("[]");
      }
    } else if (isTakeaway) {
       setSelectedTable(undefined);
       setExistingOrder(null);
       setOrderItems([]);
       setInitialItemsStr("[]");
    }
  }, [selectedTable, orders, isTakeaway]);

  const filteredItems = MENU_ITEMS.filter((item) => item.categoryId === activeCategory && item.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const totalAmount = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  
  // Tax calculations (Andorra IGI 4.5%)
  const igiAmount = totalAmount - (totalAmount / 1.045);
  const subtotalAmount = totalAmount - igiAmount;

  const isChanged = JSON.stringify(orderItems) !== initialItemsStr;
  const isSendDisabled = orderItems.length === 0 || (!!existingOrder && !isChanged);

  const handleNumpadInput = (val: string) => {
    if (val === "CLR") {
      setNumpadValue("");
    } else {
      setNumpadValue(prev => prev.length < 5 ? prev + val : prev);
    }
  };

  const handleItemClick = (menuItem: MenuItemDefs) => {
    if (menuItem.byWeight) {
      setScaleItemPending(menuItem);
      setLiveWeight(null);
    } else {
      const qty = numpadValue ? parseFloat(numpadValue) : 1;
      if (qty > 0) addToOrder(menuItem, qty);
      setNumpadValue(""); // Reset numpad after use
    }
  };

  const addToOrder = (menuItem: MenuItemDefs, quantity: number) => {
    // Check-in Inteligente de Reservas (Auto "Chegou")
    if (selectedTable && orderItems.length === 0) {
       const now = new Date();
       const today = now.toISOString().split('T')[0];
       const tableRes = reservations.filter(r => r.tableId === selectedTable && r.date === today && r.status === "confirmada");
       
       if (tableRes.length > 0) {
          const currentMins = now.getHours() * 60 + now.getMinutes();
          const timed = tableRes.map(r => {
             const [h, m] = r.time.split(':').map(Number);
             return { ...r, diff: Math.abs((h * 60 + m) - currentMins) };
          }).sort((a,b) => a.diff - b.diff);

          if (timed[0].diff <= 90) { // Janela de 1h30m
             updateReservationStatus(timed[0].id, 'chegou');
          }
       }
    }

    setOrderItems((prev) => {
      const existing = prev.find((o) => o.id === menuItem.id && !menuItem.byWeight);
      if (existing && !menuItem.byWeight) {
        return prev.map((o) => (o.id === menuItem.id ? { ...o, quantity: o.quantity + quantity } : o));
      }
      if (menuItem.byWeight) {
        return [...prev, { ...menuItem, id: `${menuItem.id}_${Date.now()}`, quantity }];
      }
      return [...prev, { ...menuItem, quantity }];
    });
  };

  const updateQuantity = (itemId: string, newQty: number) => {
    setOrderItems((prev) => prev.map((item) => (item.id === itemId ? { ...item, quantity: newQty } : item)));
  };

  const updateItemNote = (itemId: string, note: string) => {
    setOrderItems((prev) => prev.map((item) => (item.id === itemId ? { ...item, note } : item)));
  };

  const removeSelectedLine = () => {
    if (selectedLineId) {
      setOrderItems((prev) => prev.filter((item) => item.id !== selectedLineId));
      setSelectedLineId(null);
    }
  };

  const clearCart = () => {
    setOrderItems(existingOrder?.items ? [...existingOrder.items] : []);
    setSelectedLineId(null);
    setNumpadValue("");
  };

  const connectScale = async () => {
    try {
      if (!("serial" in navigator)) {
        alert("Web Serial API não suportada neste browser.");
        return;
      }
      const port = await (navigator as any).serial.requestPort();
      await port.open({ baudRate: 9600 });
      const textDecoder = new TextDecoderStream();
      port.readable.pipeTo(textDecoder.writable);
      const reader = textDecoder.readable.getReader();

      while (scaleItemPending) {
        const { value, done } = await reader.read();
        if (done) break;
        const weightStr = value.replace(/[^\d.]/g, ''); 
        const parsedWeight = parseFloat(weightStr);
        if (!isNaN(parsedWeight)) setLiveWeight(parsedWeight);
      }
      reader.releaseLock();
    } catch (err) {
      console.warn("Scale connection error:", err);
      alert("Falha ao ligar à porta COM.");
    }
  };

  const simulateScaleRead = () => {
    setLiveWeight(parseFloat(((Math.random() * 1.3) + 0.2).toFixed(3)));
  };

  const confirmWeightAdd = () => {
    if (scaleItemPending && liveWeight! > 0) {
      addToOrder(scaleItemPending, liveWeight!);
      setScaleItemPending(null);
      setNumpadValue("");
    }
  };

  const formatPrice = (price: number) => new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(price);

  const handleClearTable = async () => {
    if (existingOrder) {
      await deleteOrder(existingOrder.id);
    }
    setOrderItems([]);
    setExistingOrder(null);
    setInitialItemsStr("[]");
    setShowConfirmClear(false);
  };

  const handleTransferTable = async (newTable: string) => {
    if (existingOrder) {
      await transferOrder(existingOrder.id, newTable);
      setSelectedTable(newTable);
    }
    setShowTransferModal(false);
  };

  const confirmOrder = () => {
    if (!selectedTable && !isTakeaway) {
      setShowTableSelect(true);
      return;
    }
    if (isTakeaway && !takeawayName) {
      setShowTakeawayModal(true);
      return;
    }

    const order: Order = {
      id: existingOrder?.id || Date.now().toString(),
      type: isTakeaway ? "takeaway" : "mesa",
      ...(isTakeaway ? { takeawayName, takeawayTime } : { tableId: selectedTable }),
      items: orderItems,
      total: totalAmount,
      status: "pendente", // Resets to 'pendente' automatically when sending to kitchen again
      createdAt: existingOrder?.createdAt || Date.now(),
      updatedAt: Date.now(),
    };

    saveOrder(order);
    setExistingOrder(order);
    setInitialItemsStr(JSON.stringify(order.items));
  };

  const payAndCloseOrder = (method: 'dinheiro' | 'multibanco') => {
    if (!selectedTable && !isTakeaway) {
       alert("Selecione a origem da venda para faturar.");
       return;
    }

    if (existingOrder) {
      const finishedOrder: Order = {
        ...existingOrder,
        items: orderItems, 
        total: totalAmount,
        status: "entregue",
        paymentMethod: method,
        updatedAt: Date.now(),
      };
      saveOrder(finishedOrder);
      setShowPaymentModal(false);
      router.push("/restaurant/mesas");
    } else {
       // Paid directly without kitchen
       const directOrder: Order = {
          id: Date.now().toString(),
          type: isTakeaway ? "takeaway" : "mesa",
          ...(isTakeaway ? { takeawayName: takeawayName || "Cliente Direto", takeawayTime } : { tableId: selectedTable }),
          items: orderItems,
          total: totalAmount,
          status: "entregue",
          paymentMethod: method,
          createdAt: Date.now(),
          updatedAt: Date.now(),
       };
       saveOrder(directOrder);
       setShowPaymentModal(false);
       if(isTakeaway) router.push("/restaurant/takeaway");
       else router.push("/restaurant/mesas");
    }
  };

  // Numpad Keys
  const NumpadBtn = ({ val, colSpan = 1, bg = "bg-slate-700", text = "text-white" }: { val: string, colSpan?: number, bg?: string, text?: string }) => (
    <button 
      onClick={() => handleNumpadInput(val)}
      className={`${bg} ${text} ${colSpan > 1 ? `col-span-${colSpan}` : ''} font-bold text-xl md:text-2xl rounded-xl shadow-inner active:scale-95 transition-transform flex items-center justify-center p-4`}
    >
      {val === "CLR" ? <Delete className="w-6 h-6" /> : val}
    </button>
  );

  return (
    <>
      <div 
        className="hidden print:block absolute top-0 left-0 bg-white text-black font-mono text-sm z-[9999] p-4 w-[80mm] h-max" 
        style={{ width: '80mm', margin: 0 }}
      >
        <div className="text-center mb-4">
          <h1 className="text-2xl font-bold uppercase tracking-widest mb-1">Portucale</h1>
          <p className="text-[11px] uppercase tracking-wider font-bold border-b border-black pb-2 mb-2 inline-block">Sabors de Portugal</p>
          <p className="text-[12px] font-bold">NIF: <span className="font-normal">999 999 990</span></p>
          <p className="text-[11px] mt-2 mb-2">Hora: {isMounted ? new Date().toLocaleString('pt-PT') : ''}</p>
        </div>
        
        <div className="border-y border-black border-dashed py-2 mb-4 text-center text-xl font-bold uppercase mx-2 shadow-sm">
           {isTakeaway ? `TAKEAWAY: ${takeawayName || "CLIENTE"}` : selectedTable ? `${selectedTable}` : "VENDA DIRETA"}
        </div>

        <table className="w-full text-[13px] mb-4 text-left">
          <thead>
            <tr className="border-b border-black text-[12px] uppercase">
              <th className="font-bold py-1 w-6">Qtd</th>
              <th className="font-bold py-1 px-1">Artigo</th>
              <th className="text-right font-bold py-1">Euros</th>
            </tr>
          </thead>
          <tbody>
            {orderItems.map((item, idx) => {
               const isScale = item.quantity % 1 !== 0; 
               return (
                <tr key={idx} className="border-b border-dotted border-black/30 pb-1 align-top">
                  <td className="py-2 pr-1 whitespace-nowrap font-bold">{isScale ? item.quantity.toFixed(3) : item.quantity}</td>
                  <td className="py-2 px-1 leading-tight">
                     <div>{item.name}</div>
                     {item.note && <div className="text-[10px] font-bold mt-0.5 uppercase">*** {item.note} ***</div>}
                  </td>
                  <td className="text-right py-2 whitespace-nowrap font-semibold">{(item.price * item.quantity).toFixed(2)}</td>
                </tr>
            )})}
          </tbody>
        </table>

        <div className="border-t border-black mb-1 pt-2 flex justify-between text-[11px]">
          <span>Subtotal:</span>
          <span>{subtotalAmount.toFixed(2)}€</span>
        </div>
        <div className="flex justify-between text-[11px]">
          <span>IGI (4.5% incl):</span>
          <span>{igiAmount.toFixed(2)}€</span>
        </div>
        <div className="border-t-[3px] border-black pt-3 flex justify-between items-center text-2xl font-black mt-2 bg-slate-100 p-2 text-center">
          <span>TOTAL:</span>
          <span>{totalAmount.toFixed(2)}€</span>
        </div>
        
        <div className="text-center mt-12 text-xs font-bold text-black border-t border-black pt-4">
          <p>Obrigado pela sua visita!</p>
          <p className="mt-2 text-[10px] font-normal tracking-wide">SOFTWARE: Antigravity P.O.S.</p>
        </div>
      </div>

      <div className="print:hidden flex h-screen w-full bg-slate-200 overflow-hidden text-slate-900 font-sans select-none">
        
      {/* TABLE SELECT MODAL */}
      {showTableSelect && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
           <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col">
              <div className="bg-slate-50 px-8 py-5 border-b border-slate-100 flex justify-between items-center shrink-0">
                 <div>
                    <h3 className="font-black text-2xl text-slate-800 flex items-center gap-2">
                       <LayoutGrid className="w-6 h-6 text-blue-600" /> Selecionar Destino
                    </h3>
                    <p className="text-slate-500 text-sm mt-1">Selecione uma mesa ou inicie um Takeaway</p>
                 </div>
                 <button onClick={() => setShowTableSelect(false)} className="p-3 bg-slate-200 hover:bg-slate-300 rounded-full">
                    <X className="w-6 h-6 text-slate-600" />
                 </button>
              </div>
              <div className="p-8 flex-1 overflow-y-auto">
                 <div className="mb-6">
                    <button 
                       onClick={() => { setShowTableSelect(false); setShowTakeawayModal(true); }}
                       className="w-full bg-slate-900 border-2 border-slate-900 text-white p-6 rounded-2xl flex items-center justify-center gap-4 transition-transform active:scale-95 shadow-md hover:shadow-lg"
                    >
                       <ShoppingBagIcon className="w-8 h-8 text-purple-400" />
                       <span className="font-black text-2xl uppercase tracking-widest">Novo Takeaway</span>
                    </button>
                 </div>
                 <h4 className="font-black text-slate-800 mb-4 uppercase tracking-widest text-sm flex items-center gap-2">
                    <LayoutGrid className="w-4 h-4 text-blue-600" /> Mesas do Restaurante
                 </h4>
                 <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-4 mb-8">
                    {TABLE_OPTIONS.map(mesa => (
                        <button 
                           key={mesa} 
                           onClick={() => { setSelectedTable(mesa); setIsTakeaway(false); setShowTableSelect(false); }}
                           className={`border-2 p-6 rounded-2xl flex flex-col items-center justify-center transition-all shadow-sm ${selectedTable === mesa ? 'bg-blue-600 border-blue-700 text-white shadow-lg' : 'bg-white border-slate-200 hover:border-slate-400 text-slate-700'}`}
                        >
                           <h4 className="font-bold text-xl">{mesa}</h4>
                        </button>
                    ))}
                 </div>
                 <h4 className="font-black text-slate-800 mb-4 uppercase tracking-widest text-sm flex items-center gap-2">
                    <span className="text-xl">🍸</span> Lugares ao Balcão
                 </h4>
                 <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-4">
                    {BALCAO_OPTIONS.map(mesa => (
                        <button 
                           key={mesa} 
                           onClick={() => { setSelectedTable(mesa); setIsTakeaway(false); setShowTableSelect(false); }}
                           className={`border-2 p-6 rounded-2xl flex flex-col items-center justify-center transition-all shadow-sm ${selectedTable === mesa ? 'bg-blue-600 border-blue-700 text-white shadow-lg' : 'bg-white border-slate-200 hover:border-slate-400 text-slate-700'}`}
                        >
                           <h4 className="font-bold text-xl">{mesa}</h4>
                        </button>
                    ))}
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* TAKEAWAY MODAL */}
      {showTakeawayModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
           <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
              <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center shrink-0">
                 <h3 className="font-bold text-xl text-slate-800">Novo Takeaway</h3>
                 <button onClick={() => setShowTakeawayModal(false)} className="p-2 hover:bg-slate-200 rounded-full"><X className="w-5 h-5 text-slate-500" /></button>
              </div>
              <div className="p-6">
                 <label className="text-sm font-bold text-slate-600 mb-2 block">Nome do Cliente:</label>
                 <input 
                   type="text" autoFocus 
                   value={takeawayName} 
                   onChange={(e) => setTakeawayName(e.target.value)}
                   className="w-full p-4 border-2 border-slate-200 rounded-xl text-lg font-bold focus:border-blue-500 focus:outline-none mb-4"
                   placeholder="Ex: Sr. Manuel"
                 />
                 <label className="text-sm font-bold text-slate-600 mb-2 block">Hora de Entrega / Pick-up:</label>
                 <input 
                   type="time"
                   value={takeawayTime} 
                   onChange={(e) => setTakeawayTime(e.target.value)}
                   className="w-full p-4 border-2 border-slate-200 rounded-xl text-lg font-bold focus:border-blue-500 focus:outline-none mb-4"
                 />
                 <button 
                   onClick={() => {
                     setIsTakeaway(true);
                     setSelectedTable(undefined);
                     setShowTakeawayModal(false);
                   }}
                   className="w-full mt-2 bg-blue-600 text-white font-bold p-4 rounded-xl active:scale-95 transition-transform"
                 >
                   Confirmar
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* PAYMENT MODAL */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
           <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
              <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center shrink-0">
                 <h3 className="font-bold text-xl text-slate-800 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" /> Finalizar Conta
                 </h3>
                 <button onClick={() => setShowPaymentModal(false)} className="p-2 hover:bg-slate-200 rounded-full">
                    <X className="w-5 h-5 text-slate-500" />
                 </button>
              </div>
              <div className="p-8 flex flex-col gap-6">
                 <div className="text-center space-y-2 mb-4">
                    <span className="text-slate-500 font-bold uppercase tracking-widest text-sm">Valor a Cobrar</span>
                    <h2 className="text-6xl font-black text-slate-900 tabular-nums">{formatPrice(totalAmount)}</h2>
                 </div>
                 <button 
                    onClick={() => payAndCloseOrder('dinheiro')}
                    className="w-full bg-emerald-50 text-emerald-700 border-2 border-emerald-200 hover:bg-emerald-100 p-6 rounded-2xl flex items-center justify-center gap-4 transition-transform active:scale-95 shadow-sm hover:shadow-md"
                 >
                    <Coins className="w-8 h-8" />
                    <span className="font-black text-2xl uppercase tracking-wider">Dinheiro</span>
                 </button>
                 <button 
                    onClick={() => payAndCloseOrder('multibanco')}
                    className="w-full bg-blue-50 text-blue-700 border-2 border-blue-200 hover:bg-blue-100 p-6 rounded-2xl flex items-center justify-center gap-4 transition-transform active:scale-95 shadow-sm hover:shadow-md"
                 >
                    <CreditCard className="w-8 h-8" />
                    <span className="font-black text-2xl uppercase tracking-wider">Multibanco</span>
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* NOTE MODAL */}
      {showNoteModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
           <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
              <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center shrink-0">
                 <h3 className="font-bold text-xl text-slate-800 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600" /> Nota de Preparação
                 </h3>
                 <button onClick={() => setShowNoteModal(false)} className="p-2 hover:bg-slate-200 rounded-full">
                    <X className="w-5 h-5 text-slate-500" />
                 </button>
              </div>
              <div className="p-6">
                 <textarea 
                   autoFocus 
                   value={currentNote} 
                   onChange={(e) => setCurrentNote(e.target.value)}
                   className="w-full p-4 border-2 border-slate-200 rounded-xl text-lg font-bold text-slate-700 focus:border-blue-500 focus:outline-none min-h-[120px] resize-none"
                   placeholder="Ex: Sem cebola, bem passado..."
                 />
                 <button 
                   onClick={() => {
                     if (selectedLineId) {
                       setOrderItems(prev => prev.map(i => i.id === selectedLineId ? { ...i, note: currentNote.trim() } : i));
                     }
                     setShowNoteModal(false);
                   }}
                   className="w-full mt-6 bg-blue-600 text-white font-bold p-4 rounded-xl active:scale-95 transition-transform uppercase tracking-widest"
                 >
                   Guardar Nota
                 </button>
              </div>
           </div>
        </div>
      )}

      {scaleItemPending && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                <Scale className="w-5 h-5 text-blue-600" /> Leitura de Balança
              </h3>
              <button onClick={() => setScaleItemPending(null)} className="p-2 hover:bg-slate-200 rounded-full">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            
            <div className="p-6 flex-1 flex flex-col items-center justify-center space-y-6">
              <div className="text-center space-y-1">
                <div className="text-slate-500 font-medium">{scaleItemPending.name}</div>
                <div className="font-bold text-indigo-600">{formatPrice(scaleItemPending.price)} / kg</div>
              </div>

              <div className="w-full bg-slate-900 rounded-2xl p-8 flex flex-col items-center justify-center text-emerald-400 font-mono relative overflow-hidden shadow-inner">
                 <div className="text-sm uppercase tracking-widest text-slate-500 mb-2 font-sans font-bold">Peso Recebido</div>
                 <div className="text-5xl font-black tabular-nums">
                   {liveWeight !== null ? liveWeight.toFixed(3) : "0.000"} <span className="text-xl text-emerald-600">kg</span>
                 </div>
              </div>

              <div className="flex w-full gap-3">
                <button onClick={simulateScaleRead} className="flex-1 border-2 border-slate-200 text-slate-600 font-bold py-3 rounded-xl hover:bg-slate-50">Simular</button>
                <button onClick={connectScale} className="flex-[2] bg-blue-50 text-blue-700 border-2 border-blue-200 font-bold py-3 rounded-xl hover:bg-blue-100 flex items-center justify-center gap-2">
                  <Usb className="w-5 h-5" /> Porta COM
                </button>
              </div>
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
              <button disabled={!liveWeight} onClick={confirmWeightAdd} className="w-full bg-slate-900 text-white font-black uppercase py-4 rounded-xl disabled:opacity-50">
                Confirmar {liveWeight && `(${formatPrice(liveWeight * scaleItemPending.price)})`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM CLEAR MODAL */}
      {showConfirmClear && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl p-8 text-center animate-in zoom-in-95 duration-200">
                <div className="w-20 h-20 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <AlertCircle className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-black text-slate-900 mb-2">Limpar Mesa?</h3>
                <p className="text-slate-500 font-medium mb-8">Esta ação irá apagar permanentemente todos os itens da {selectedTable || "mesa"}.</p>
                <div className="flex gap-3">
                    <button onClick={() => setShowConfirmClear(false)} className="flex-1 bg-slate-100 text-slate-600 font-bold py-4 rounded-xl">Cancelar</button>
                    <button onClick={handleClearTable} className="flex-1 bg-rose-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-rose-200">Sim, Limpar</button>
                </div>
            </div>
        </div>
      )}

      {/* TRANSFER MODAL */}
      {showTransferModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="font-bold text-xl text-slate-800 flex items-center gap-2">
                        <ArrowRightLeft className="w-5 h-5 text-indigo-600" /> Transferir Mesa
                    </h3>
                    <button onClick={() => setShowTransferModal(false)} className="p-2 hover:bg-slate-200 rounded-full"><X className="w-5 h-5 text-slate-500" /></button>
                </div>
                <div className="p-6">
                    <p className="text-slate-500 font-medium mb-4">Selecione a mesa de destino:</p>
                    <div className="grid grid-cols-3 gap-3 max-h-60 overflow-y-auto p-1">
                        {[...TABLE_OPTIONS, ...BALCAO_OPTIONS]
                          .filter(t => t !== selectedTable)
                          .map(tableId => (
                            <button 
                                key={tableId}
                                onClick={() => handleTransferTable(tableId)}
                                className="bg-slate-50 border-2 border-slate-100 hover:border-indigo-300 hover:bg-indigo-50 p-3 rounded-xl font-bold text-slate-700 transition-all text-sm"
                            >
                                {tableId}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* --- CLASSIC POS LAYOUT --- */}

        {/* LEFT PANE: TICKET + NUMPAD (Width ~35-40%) */}
        <div className="w-[35%] min-w-[380px] bg-slate-50 border-r border-slate-300 flex flex-col shadow-xl z-20">
            {/* Header / Ticket Summary */}
            <div className="bg-white p-4 shrink-0 border-b-2 border-slate-200 shadow-sm z-10 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 tracking-tight leading-none">
                            {isTakeaway ? `🛒 TAK: ${takeawayName || "Novo"}` : selectedTable ? `🍽️ ${selectedTable}` : "📋 SELECIONE MESA"}
                        </h2>
                        <p className="text-sm font-semibold text-slate-400 mt-1 uppercase tracking-widest">{isMounted ? new Date().toLocaleDateString('pt-PT') : ''}</p>
                    </div>
                    <div className="text-right flex flex-col items-end gap-2">
                        <div className="flex items-center gap-3">
                            <FullscreenToggle />
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">TOTAL</p>
                                <h2 className="text-3xl font-black text-blue-600 leading-none">{formatPrice(totalAmount)}</h2>
                            </div>
                        </div>
                    </div>
                </div>
                
                {/* Actions Row - More Prominent Style */}
                {(selectedTable || isTakeaway) && (
                    <div className="flex gap-2">
                        <button 
                            onClick={() => setShowConfirmClear(true)}
                            className="flex-1 bg-white text-rose-600 border-2 border-rose-200 py-3 rounded-xl font-black text-xs flex items-center justify-center gap-2 hover:bg-rose-50 hover:border-rose-400 transition-all shadow-sm active:scale-95"
                        >
                            <Trash2 className="w-4 h-4" /> LIMPAR CONTA
                        </button>
                        {!isTakeaway && (
                            <button 
                                onClick={() => setShowTransferModal(true)}
                                className="flex-1 bg-white text-indigo-700 border-2 border-indigo-200 py-3 rounded-xl font-black text-xs flex items-center justify-center gap-2 hover:bg-indigo-50 hover:border-indigo-400 transition-all shadow-sm active:scale-95"
                            >
                                <ArrowRightLeft className="w-4 h-4" /> MUDAR MESA
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Cart Items List (Scrollable) */}
            <div className="flex-1 overflow-y-auto bg-white p-3">
                <div className="grid gap-2">
                    {orderItems.map((item) => (
                        <div 
                          key={item.id} 
                          onClick={() => setSelectedLineId(item.id)}
                          className={`p-3 rounded-xl border flex flex-col gap-2 transition-all cursor-pointer ${
                            selectedLineId === item.id 
                              ? "bg-blue-50 border-blue-200 ring-2 ring-blue-600/10" 
                              : "bg-white border-slate-100 hover:border-slate-200"
                          }`}
                        >
                          <div className="flex items-start justify-between">
                              <div className="flex-1">
                                  <div className="font-bold text-slate-800 leading-tight">{item.name}</div>
                                  <div className="text-[10px] text-slate-500 font-medium">
                                    {formatPrice(item.price)} x {item.byWeight ? item.quantity.toFixed(3) : item.quantity}
                                  </div>
                              </div>
                              <div className="text-right">
                                  <div className="font-black text-slate-900">
                                    {formatPrice(item.price * item.quantity)}
                                  </div>
                              </div>
                          </div>

                          {selectedLineId === item.id && (
                             <div className="flex items-center gap-2 mt-1 animate-in slide-in-from-top-1">
                                <div className="relative flex-1">
                                  <MessageSquare className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                  <input 
                                    type="text"
                                    placeholder="Nota de preparação..."
                                    autoFocus
                                    value={item.note || ""}
                                    onChange={(e) => updateItemNote(item.id, e.target.value)}
                                    className="w-full pl-8 pr-2 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                                  />
                                </div>
                             </div>
                          )}

                          {item.note && selectedLineId !== item.id && (
                             <div className="text-[10px] font-bold text-rose-600 flex items-center gap-1 bg-rose-50 px-2 py-0.5 rounded-md w-fit">
                                <MessageSquare className="w-3 h-3" /> {item.note}
                             </div>
                          )}
                        </div>
                    ))}
                    {orderItems.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-12 text-slate-300">
                         <ShoppingCart className="w-12 h-12 mb-2 opacity-20" />
                         <p className="font-black uppercase tracking-widest text-xs">Carrinho Vazio</p>
                      </div>
                    )}
                </div>
            </div>

            {/* Middle Action Buttons & Info */}
            <div className="shrink-0 p-3 bg-slate-100 border-y-2 border-slate-200">
                <div className="grid grid-cols-3 gap-2">
                    <button onClick={clearCart} className="bg-white text-slate-600 border border-slate-300 font-bold py-3 rounded-lg flex flex-col items-center justify-center hover:bg-slate-200 active:scale-95 shadow-sm text-xs uppercase"><Trash2 className="w-5 h-5 mb-1" />Limpar</button>
                    <button onClick={removeSelectedLine} disabled={!selectedLineId} className="bg-white text-rose-600 disabled:opacity-50 border border-slate-300 font-bold py-3 rounded-lg flex flex-col items-center justify-center hover:bg-rose-50 active:scale-95 shadow-sm text-xs uppercase"><Minus className="w-5 h-5 mb-1" />Apagar Linha</button>
                    <button onClick={() => setShowPaymentModal(true)} disabled={orderItems.length === 0} className="bg-emerald-500 text-white font-bold py-3 rounded-lg flex flex-col items-center justify-center disabled:opacity-50 hover:bg-emerald-600 active:scale-95 shadow-sm text-xs uppercase"><CreditCard className="w-5 h-5 mb-1" />Cobrar (F12)</button>
                </div>
            </div>

            {/* Numpad Area */}
            <div className="shrink-0 bg-slate-800 p-4 border-t border-slate-900">
               {/* Numpad display */}
               <div className="bg-slate-900 rounded-xl mb-4 p-3 flex justify-end shadow-inner h-16 items-center">
                  <span className="text-emerald-400 font-mono text-3xl font-black tracking-widest">{numpadValue || "0"}</span>
               </div>
               
               <div className="grid grid-cols-4 gap-2 h-[220px]">
                  <NumpadBtn val="7" />
                  <NumpadBtn val="8" />
                  <NumpadBtn val="9" />
                  <button className="bg-slate-600 hover:bg-slate-500 text-white font-bold rounded-xl shadow-inner active:scale-95 text-xs flex flex-col items-center justify-center p-2 uppercase"><span className="text-xl mb-1">%</span>Desc</button>
                  
                  <NumpadBtn val="4" />
                  <NumpadBtn val="5" />
                  <NumpadBtn val="6" />
                  <button onClick={() => { if(numpadValue) { updateQuantity(selectedLineId||'', parseFloat(numpadValue)); setNumpadValue(""); } }} className="bg-slate-600 hover:bg-slate-500 text-white font-bold rounded-xl shadow-inner active:scale-95 text-xs flex flex-col items-center justify-center p-2 uppercase"><Edit className="w-5 h-5 mb-1" />Qtd</button>
                  
                  <NumpadBtn val="1" />
                  <NumpadBtn val="2" />
                  <NumpadBtn val="3" />
                  <button onClick={() => {
                     if (selectedLineId) {
                        setCurrentNote(orderItems.find(i=>i.id===selectedLineId)?.note || "");
                        setShowNoteModal(true);
                     } else {
                        alert("Selecione um artigo na lista primeiro");
                     }
                  }} className="bg-slate-600 hover:bg-slate-500 text-white font-bold rounded-xl shadow-inner active:scale-95 text-xs flex flex-col items-center justify-center p-2 uppercase"><FileText className="w-5 h-5 mb-1" />Nota</button>

                  <NumpadBtn val="0" colSpan={2} />
                  <NumpadBtn val="." />
                  <NumpadBtn val="CLR" bg="bg-rose-600 hover:bg-rose-500" />
               </div>
            </div>
        </div>


        {/* RIGHT PANE: CATEGORIES + ITEMS + ACTIONS (Width ~60-65%) */}
        <div className="flex-1 flex flex-col min-w-[500px]">
           
           {/* Vertical Right Action Bar AND Top Header */}
           <div className="flex-1 flex w-full">
               
               {/* Main Middle Area (Menu) */}
               <div className="flex-1 flex flex-col overflow-hidden">
                   
                   {/* Top Info Bar */}
                   <div className="h-14 bg-white border-b-2 border-slate-200 flex items-center justify-between px-6 shrink-0 shadow-sm z-10">
                       <span className="font-bold text-slate-500 uppercase tracking-widest text-sm flex items-center gap-2">
                         {existingOrder ? <span className="flex items-center gap-2"><ChefHat className="w-4 h-4 text-blue-600"/> Editando Mesa Ocupada</span> : "Software POS de Venda Rápida"}
                       </span>
                        <div className="flex items-center gap-3">
                            {existingOrder?.status === "pronto" && (
                              <span className="bg-emerald-100 text-emerald-700 text-xs font-black uppercase px-2 py-1 rounded-sm animate-pulse border border-emerald-300">
                                  Pronto na Cozinha
                              </span>
                           )}
                        </div>
                   </div>

                   {/* Categories Grid (Top half of menu) */}
                   <div className="shrink-0 p-4 bg-slate-100 border-b border-slate-300 h-[140px] flex gap-3 overflow-x-auto items-center items-start pt-2">
                       {CATEGORIES.map((cat) => (
                           <button
                             key={cat.id}
                             onClick={() => setActiveCategory(cat.id)}
                             className={`min-w-[110px] h-[100px] rounded-xl flex flex-col items-center justify-center shadow-md transition-transform active:scale-95 border-b-4 ${activeCategory === cat.id ? 'bg-blue-600 border-blue-800 text-white' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'}`}
                           >
                              <span className="text-3xl mb-1">{cat.icon}</span>
                              <span className="font-bold text-sm tracking-wide">{cat.name}</span>
                           </button>
                       ))}
                   </div>

                   {/* Items Grid (Bottom half of menu) */}
                   <div className="flex-1 bg-slate-200 p-4 overflow-y-auto">
                       <div className="grid grid-cols-3 xl:grid-cols-4 gap-4">
                           {filteredItems.map(item => (
                               <button 
                                 key={item.id} 
                                 onClick={() => handleItemClick(item)}
                                 className="bg-white hover:bg-slate-50 border-b-4 border-slate-300 rounded-xl h-[120px] flex flex-col items-center justify-center shadow-sm hover:shadow-md transition-all active:scale-95 overflow-hidden relative group"
                               >
                                  {item.image && (
                                     <div className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity">
                                       <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                     </div>
                                  )}
                                  <div className="z-10 text-center px-2">
                                     <h3 className="font-bold text-slate-800 text-[15px] leading-snug mb-1">{item.name}</h3>
                                     <span className="font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md text-sm">
                                       {formatPrice(item.price)}
                                     </span>
                                     {item.byWeight && <span className="block mt-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100 px-1 rounded">A Peso (Balança)</span>}
                                  </div>
                               </button>
                           ))}
                       </div>
                   </div>
               </div>

               {/* Right Action Sidebar (Width ~100px) */}
               <div className="w-[100px] shrink-0 bg-slate-900 border-l border-slate-800 flex flex-col z-20 shadow-[-10px_0_20px_rgba(0,0,0,0.2)] pb-4 pt-2 px-2 gap-2 overflow-y-auto">
                   
                   <Link href="/restaurant" className="w-full aspect-square bg-slate-800 hover:bg-slate-700 rounded-xl flex flex-col items-center justify-center text-slate-400 hover:text-white transition-colors mb-2">
                      <ArrowLeft className="w-6 h-6 mb-1" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Sair</span>
                   </Link>

                   <button onClick={() => setShowTableSelect(true)} className="w-full aspect-[4/3] bg-blue-600 hover:bg-blue-500 border-b-4 border-blue-800 rounded-xl flex flex-col items-center justify-center text-white transition-transform active:scale-95">
                      <LayoutGrid className="w-6 h-6 mb-1" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Mesas</span>
                   </button>

                   <button onClick={() => setShowTakeawayModal(true)} className="w-full aspect-[4/3] bg-purple-600 hover:bg-purple-500 border-b-4 border-purple-800 rounded-xl flex flex-col items-center justify-center text-white transition-transform active:scale-95">
                      <ShoppingBagIcon className="w-6 h-6 mb-1" />
                      <span className="text-[10px] font-black uppercase tracking-widest">TKW</span>
                   </button>
                   
                   <div className="flex-1"></div>

                   <button onClick={() => alert("Imprimir Consulta de Mesa")} disabled={!selectedTable && !isTakeaway} className="w-full aspect-square bg-slate-700 hover:bg-slate-600 disabled:opacity-30 rounded-xl flex flex-col items-center justify-center text-white transition-transform active:scale-95">
                      <Printer className="w-6 h-6 mb-1" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Conta</span>
                   </button>

                   <button 
                     onClick={confirmOrder}
                     disabled={isSendDisabled}
                     className={`w-full aspect-[4/5] ${existingOrder ? 'bg-indigo-600 hover:bg-indigo-500 border-indigo-800' : 'bg-amber-500 hover:bg-amber-400 border-amber-700'} disabled:opacity-30 border-b-4 rounded-xl flex flex-col items-center justify-center text-white transition-transform active:scale-95 mt-4 group`}
                   >
                      <ChefHat className="w-8 h-8 mb-2 group-disabled:opacity-50" />
                      <span className="text-[12px] font-black uppercase tracking-widest leading-tight text-center px-1">
                         {existingOrder ? (
                            <>Modificar<br/>Pedido</>
                         ) : isTakeaway ? (
                            <>Enviar<br/>Takeaway</>
                         ) : (
                            <>Enviar<br/>Cozinha</>
                         )}
                      </span>
                   </button>
               </div>
           </div>
        </div>

      </div>
    </>
  );
}

// Ensure ShoppingBag is imported
import { ShoppingBag as ShoppingBagIcon } from 'lucide-react';

export default function POSPage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center bg-slate-100 font-bold text-slate-500 uppercase tracking-widest animate-pulse">A iniciar POS Terminal...</div>}>
      <POSInterface />
    </Suspense>
  );
}
