"use client";

import React, { useState, useMemo, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, Download, FileText, PieChart, TrendingUp, DollarSign, Calendar, X, Receipt } from "lucide-react";
import { useOrders } from "../store";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export default function VendasPage() {
  const { orders } = useOrders();
  const [filter, setFilter] = useState("hoje");
  const reportRef = useRef<HTMLDivElement>(null);
  const [isMounted, setIsMounted] = useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  // Invoice State
  const [invoiceOrder, setInvoiceOrder] = useState<any>(null);
  const [customerInfo, setCustomerInfo] = useState({ name: "", address: "", nrt: "" });

  // Filter only completed orders
  const completedOrders = useMemo(() => {
    return orders.filter((o) => o.status === "entregue");
  }, [orders]);

  // Apply time filter
  const filteredOrders = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    
    return completedOrders.filter(order => {
      if (filter === "hoje") return order.createdAt >= today;
      if (filter === "semana") return order.createdAt >= today - 7 * 24 * 60 * 60 * 1000;
      if (filter === "mes") return order.createdAt >= today - 30 * 24 * 60 * 60 * 1000;
      return true; // "tudo"
    });
  }, [completedOrders, filter]);

  // Calculate metrics
  const metrics = useMemo(() => {
    let totalRevenue = 0;
    let totalDinheiro = 0;
    let totalMultibanco = 0;

    filteredOrders.forEach((order: any) => {
      totalRevenue += order.total;
      if (order.paymentMethod === "dinheiro") totalDinheiro += order.total;
      else if (order.paymentMethod === "multibanco") totalMultibanco += order.total;
      else totalDinheiro += order.total; // fallback to cash if unknown
    });

    const totalIGI = totalRevenue - (totalRevenue / 1.045);

    return {
      totalRevenue,
      totalDinheiro,
      totalMultibanco,
      totalIGI,
      orderCount: filteredOrders.length
    };
  }, [filteredOrders]);

  // Prepare chart data
  const chartData = useMemo(() => {
    const dataMap = new Map<string, { name: string; Dinheiro: number; Multibanco: number }>();

    filteredOrders.forEach(order => {
      const date = new Date(order.createdAt);
      const key = filter === "hoje" 
        ? `${date.getHours()}h` 
        : `${date.getDate()}/${date.getMonth() + 1}`;
      
      if (!dataMap.has(key)) {
        dataMap.set(key, { name: key, Dinheiro: 0, Multibanco: 0 });
      }

      const entry = dataMap.get(key)!;
      if (order.paymentMethod === "multibanco") {
        entry.Multibanco += order.total;
      } else {
        entry.Dinheiro += order.total;
      }
    });

    return Array.from(dataMap.values());
  }, [filteredOrders, filter]);

  const exportPDF = async () => {
    if (!reportRef.current) return;
    
    try {
      const canvas = await html2canvas(reportRef.current, { scale: 2 });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Relatorio_Vendas_${filter}_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error("Error generating PDF", error);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(value);
  };

  const generateInvoiceDocument = () => {
    if (!invoiceOrder) return;
    
    const pdf = new jsPDF("p", "mm", "a4");
    
    // Header
    pdf.setFontSize(22);
    pdf.setFont("helvetica", "bold");
    pdf.text("FATURA", 105, 20, { align: "center" });

    // Company Info (Mock)
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    pdf.text("Gestão Portucale, Lda.", 20, 40);
    pdf.text("NRT: L-123456-X", 20, 45);
    pdf.text("Av. d'Enclar, Andorra la Vella", 20, 50);

    // Invoice Info
    pdf.text(`Fatura Nº: FT-${new Date().getFullYear()}/${invoiceOrder.id.slice(-6).toUpperCase()}`, 130, 40);
    pdf.text(`Data: ${new Date(invoiceOrder.createdAt).toLocaleString("pt-PT")}`, 130, 45);

    // Customer Info
    pdf.setFont("helvetica", "bold");
    pdf.text("Dados do Cliente:", 20, 65);
    pdf.setFont("helvetica", "normal");
    pdf.text(`Nome: ${customerInfo.name || "Consumidor Final"}`, 20, 70);
    pdf.text(`Morada: ${customerInfo.address || "N/A"}`, 20, 75);
    pdf.text(`NRT/NIF: ${customerInfo.nrt || "N/A"}`, 20, 80);

    // Items Header
    let yPos = 100;
    pdf.setFont("helvetica", "bold");
    pdf.text("Descrição", 20, yPos);
    pdf.text("Qtd", 120, yPos);
    pdf.text("Preço Unit.", 140, yPos);
    pdf.text("Subtotal", 170, yPos);
    
    yPos += 5;
    pdf.line(20, yPos, 190, yPos);
    yPos += 8;

    // Items
    pdf.setFont("helvetica", "normal");
    invoiceOrder.items.forEach((item: any) => {
      pdf.text(item.name, 20, yPos);
      pdf.text(item.quantity.toString(), 120, yPos);
      pdf.text(`${item.price.toFixed(2)} €`, 140, yPos);
      pdf.text(`${(item.price * item.quantity).toFixed(2)} €`, 170, yPos);
      yPos += 8;
    });

    yPos += 5;
    pdf.line(20, yPos, 190, yPos);
    yPos += 10;

    // Totals
    const igi = invoiceOrder.total - (invoiceOrder.total / 1.045);
    const base = invoiceOrder.total - igi;

    pdf.setFont("helvetica", "normal");
    pdf.text("Base Tributável:", 130, yPos);
    pdf.text(`${base.toFixed(2)} €`, 170, yPos);
    yPos += 8;

    pdf.text("IGI (4.5%):", 130, yPos);
    pdf.text(`${igi.toFixed(2)} €`, 170, yPos);
    yPos += 8;
    
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(14);
    pdf.text("TOTAL:", 130, yPos);
    pdf.text(`${invoiceOrder.total.toFixed(2)} €`, 170, yPos);

    // Footer
    pdf.setFontSize(9);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(150);
    pdf.text("Este documento não serve de recibo caso não se encontre pago.", 105, 280, { align: "center" });

    pdf.save(`Fatura_${invoiceOrder.id.slice(-6).toUpperCase()}.pdf`);
    setInvoiceOrder(null);
    setCustomerInfo({ name: "", address: "", nrt: "" });
  };

  return (
    <div className="h-screen overflow-hidden bg-slate-50 font-sans flex flex-col">
      {/* Header */}
      <div className="shrink-0 bg-white px-8 py-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 gap-4">
        <div className="flex items-center gap-6">
          <Link href="/restaurant" className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6 text-slate-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Gestão de Vendas</h1>
            <p className="text-slate-500 text-sm">Análise e exportação para contabilidade</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="bg-slate-100 p-1 rounded-xl flex">
            {[ 
              { id: 'hoje', label: 'Hoje' },
              { id: 'semana', label: '7 Dias' },
              { id: 'mes', label: '30 Dias' },
              { id: 'tudo', label: 'Tudo' }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${filter === f.id ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <button 
            onClick={exportPDF}
            className="bg-slate-900 hover:bg-black text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-transform hover:scale-105 shadow-sm"
          >
            <Download className="w-4 h-4" /> Exportar PDF
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-8 max-w-7xl mx-auto space-y-8 w-full pb-20" ref={reportRef}>
        
        {/* PDF Header (Only visible in PDF or for context context) */}
        <div className="hidden print:block mb-8 border-b pb-4">
          <h1 className="text-3xl font-bold text-slate-800">Relatório de Vendas - Gestão Portucale</h1>
          <p className="text-slate-500">Gerado a {isMounted ? new Date().toLocaleString("pt-PT") : ""}</p>
          <p className="text-slate-500">Período: {filter.toUpperCase()}</p>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                <DollarSign className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Total Faturado</p>
                <div className="text-2xl font-black text-slate-800">{formatCurrency(metrics.totalRevenue)}</div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
             <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">IGI Incluído (4.5%)</p>
                <div className="text-2xl font-black text-slate-800">{formatCurrency(metrics.totalIGI)}</div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
             <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center">
                <PieChart className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Cobrado Multibanco</p>
                <div className="text-2xl font-black text-slate-800">{formatCurrency(metrics.totalMultibanco)}</div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
             <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Cobrado Dinheiro</p>
                <div className="text-2xl font-black text-slate-800">{formatCurrency(metrics.totalDinheiro)}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Charts & Details */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <div className="col-span-2 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-slate-400" /> Evolução de Vendas
            </h3>
            <div className="h-80">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} tickFormatter={(val) => `€${val}`} />
                    <Tooltip cursor={{fill: '#slate-50'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                    <Legend iconType="circle" wrapperStyle={{paddingTop: '20px'}} />
                    <Bar dataKey="Dinheiro" stackId="a" fill="#8b5cf6" radius={[0, 0, 4, 4]} barSize={40} />
                    <Bar dataKey="Multibanco" stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400 font-medium">
                  Sem dados para o período selecionado
                </div>
              )}
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col">
            <h3 className="text-lg font-bold text-slate-800 mb-6">Resumo para Contabilidade</h3>
            
            <div className="bg-slate-50 p-5 rounded-2xl flex-1 space-y-4">
              <div className="flex justify-between items-center pb-4 border-b border-slate-200">
                <span className="text-slate-500 font-medium">Total de Pedidos</span>
                <span className="font-bold text-slate-800 text-lg">{metrics.orderCount}</span>
              </div>
              
              <div className="flex justify-between items-center pb-4 border-b border-slate-200">
                <span className="text-slate-500 font-medium">Base Tributável</span>
                <span className="font-bold text-slate-800">{formatCurrency(metrics.totalRevenue - metrics.totalIGI)}</span>
              </div>

              <div className="flex justify-between items-center pb-4 border-b border-slate-200">
                <span className="text-slate-500 font-medium">IGI (4.5% Andorra)</span>
                <span className="font-bold text-slate-800">{formatCurrency(metrics.totalIGI)}</span>
              </div>

              <div className="flex justify-between items-center pt-2">
                <span className="text-slate-800 font-bold">Total Faturado</span>
                <span className="font-black text-2xl text-blue-600">{formatCurrency(metrics.totalRevenue)}</span>
              </div>
            </div>
            
            <p className="text-xs text-slate-400 mt-6 text-center">
              Este documento serve como base para efeitos contabilísticos e separação de meios de pagamento em Andorra.
            </p>
          </div>

        </div>

        {/* Detailed List */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Histórico de Recibos ({filter})</h3>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 text-sm">
                  <th className="font-semibold py-3 px-4">Recibo ID</th>
                  <th className="font-semibold py-3 px-4">Data e Hora</th>
                  <th className="font-semibold py-3 px-4">Tipo</th>
                  <th className="font-semibold py-3 px-4">Método Cobro</th>
                  <th className="font-semibold py-3 px-4 text-right">Base</th>
                  <th className="font-semibold py-3 px-4 text-right">IGI (4.5%)</th>
                  <th className="font-semibold py-3 px-4 text-right">Total</th>
                  <th className="font-semibold py-3 px-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.length === 0 ? (
                  <tr>
                     <td colSpan={7} className="text-center py-8 text-slate-400 font-medium">Nenhum recibo no período selecionado.</td>
                  </tr>
                ) : filteredOrders.map(order => {
                  const igi = order.total - (order.total / 1.045);
                  const base = order.total - igi;
                  return (
                    <tr key={order.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-mono text-sm text-slate-600">#{order.id.slice(-6).toUpperCase()}</td>
                      <td className="py-3 px-4 text-sm text-slate-600">{new Date(order.createdAt).toLocaleString("pt-PT")}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${order.type === 'mesa' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
                          {order.type === 'mesa' ? `Mesa` : 'Takeaway'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                         <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${order.paymentMethod === 'multibanco' ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-600'}`}>
                          {order.paymentMethod === 'multibanco' ? 'Multibanco' : 'Dinheiro'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-sm font-medium text-slate-600">{formatCurrency(base)}</td>
                      <td className="py-3 px-4 text-right text-sm font-medium text-slate-500">{formatCurrency(igi)}</td>
                      <td className="py-3 px-4 text-right font-bold text-slate-800">{formatCurrency(order.total)}</td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => setInvoiceOrder(order)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors inline-block"
                          title="Emitir Fatura"
                        >
                          <Receipt className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Invoice Modal */}
      {invoiceOrder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-blue-600" />
                  Emitir Fatura
                </h3>
                <p className="text-sm text-slate-500">Recibo #{invoiceOrder.id.slice(-6).toUpperCase()}</p>
              </div>
              <button 
                onClick={() => setInvoiceOrder(null)}
                className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Nome do Cliente</label>
                <input 
                  type="text" 
                  value={customerInfo.name}
                  onChange={(e) => setCustomerInfo({...customerInfo, name: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                  placeholder="Ex: João Silva"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">NRT / NIF</label>
                <input 
                  type="text" 
                  value={customerInfo.nrt}
                  onChange={(e) => setCustomerInfo({...customerInfo, nrt: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                  placeholder="Ex: L-123456-X"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Morada</label>
                <input 
                  type="text" 
                  value={customerInfo.address}
                  onChange={(e) => setCustomerInfo({...customerInfo, address: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                  placeholder="Ex: Av. principal, Andorra"
                />
              </div>
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button
                onClick={() => setInvoiceOrder(null)}
                className="px-6 py-3 font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={generateInvoiceDocument}
                className="px-6 py-3 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors drop-shadow-md flex items-center gap-2"
              >
                <Download className="w-5 h-5" />
                Gerar PDF Fatura
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
