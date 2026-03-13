
'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { useDoc, useUser, useFirestore, useMemoFirebase, deleteDocumentNonBlocking, useCollection } from '@/firebase'
import { doc, collection, query, getDocs, collectionGroup, getDoc, updateDoc } from 'firebase/firestore'
import type { Customer, Invoice, ServiceRecord, Employee } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FileDown, Loader2, ArrowLeft, Trash2, CreditCard, Mail, Send, AlertCircle } from 'lucide-react'
import { InvoicePreview } from '@/components/InvoicePreview'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useToast } from '@/hooks/use-toast'
import { AdminGate } from '@/components/AdminGate'
import { Badge } from '@/components/ui/badge'
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { sendDocumentEmail } from '@/ai/flows/send-email'

export default function InvoiceDetailPage() {
    const firestore = useFirestore()
    const router = useRouter()
    const params = useParams()
    const searchParams = useSearchParams()
    const { toast } = useToast()
    const invoiceId = params.id as string

    const { user, isUserLoading } = useUser()
    const [isGenerating, setIsGenerating] = useState(false)
    const invoiceRef = useRef<HTMLDivElement>(null)
    const [services, setServices] = useState<ServiceRecord[]>([])
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [customer, setCustomer] = useState<Customer | undefined>();
    const [isLoadingData, setIsLoadingData] = useState(false);
    const [hasLoaded, setHasLoaded] = useState(false);

    const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false)
    const [recipientEmail, setRecipientEmail] = useState('')
    const [isSendingEmail, setIsSendingEmail] = useState(false)

    const invoiceDocRef = useMemoFirebase(() => firestore && invoiceId ? doc(firestore, 'invoices', invoiceId) : null, [firestore, invoiceId])
    const { data: invoice, isLoading: isLoadingInvoice } = useDoc<Invoice>(invoiceDocRef)
    
    const fetchData = useCallback(async () => {
        if (!firestore || !invoice || hasLoaded) return;
        setIsLoadingData(true);
        try {
            const employeesSnap = await getDocs(query(collection(firestore, 'employees')));
            const allEmployees = employeesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Employee));
            setEmployees(allEmployees);

            if (invoice.customerId) {
                const customerSnap = await getDoc(doc(firestore, 'customers', invoice.customerId));
                if (customerSnap.exists()) {
                    const cData = { id: customerSnap.id, ...customerSnap.data() } as Customer;
                    setCustomer(cData);
                    if (cData.email) setRecipientEmail(cData.email);
                }
            }

            const servicesSnapshot = await getDocs(collectionGroup(firestore, 'serviceRecords'));
            const allServicesData = servicesSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as ServiceRecord));
            
            if (invoice.sourceId) {
                const sourceIds = invoice.sourceId.split(',');
                const albaransSnapshot = await getDocs(query(collection(firestore, 'albarans')));
                const filteredAlbarans = albaransSnapshot.docs.filter(doc => sourceIds.includes(doc.id)).map(doc => doc.data());
                const recordIds = filteredAlbarans.flatMap(a => (a as any).serviceRecordIds || []);
                setServices(allServicesData.filter(s => recordIds.includes(s.id)));
            } else {
                setServices(allServicesData.filter(s => s.customerId === invoice.customerId && s.projectName === invoice.projectName));
            }
            setHasLoaded(true);
        } catch (e) {
            toast({ variant: 'destructive', title: 'Error càrrega' });
        } finally {
            setIsLoadingData(false);
        }
    }, [invoice, firestore, toast, hasLoaded]);

    useEffect(() => {
        if (invoice && !hasLoaded) fetchData();
    }, [invoice, fetchData, hasLoaded]);

    const generatePDF = async () => {
        const element = invoiceRef.current;
        if (!element) return null;
        const canvas = await html2canvas(element, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
        const imgData = canvas.toDataURL('image/jpeg', 0.85);
        const pdf = new jsPDF('p', 'mm', 'a4', true);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const imgHeight = (canvas.height * pdfWidth) / canvas.width;
        let heightLeft = imgHeight;
        let position = 0;
        pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight, undefined, 'FAST');
        heightLeft -= pdfHeight;
        while (heightLeft > 0) {
            position = heightLeft - imgHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight, undefined, 'FAST');
            heightLeft -= pdfHeight;
        }
        return pdf;
    };

    const handleExportPDF = async () => {
        setIsGenerating(true);
        toast({ title: 'Preparant Factura...' });
        try {
            const pdf = await generatePDF();
            if (pdf) {
                pdf.save(`Factura-${invoice?.invoiceNumber}-${invoice?.customerName.replace(/\s+/g, '-')}.pdf`);
                toast({ title: 'Factura generada correctament' });
            }
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error PDF' });
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSendEmail = async () => {
        if (!recipientEmail.trim() || !recipientEmail.includes('@')) {
            toast({ variant: 'destructive', title: 'E-mail invàlid' });
            return;
        }
        setIsSendingEmail(true);
        try {
            const pdf = await generatePDF();
            if (!pdf) throw new Error("No s'ha pogut generar");
            const pdfBase64 = pdf.output('datauristring');
            const result = await sendDocumentEmail({
                to: recipientEmail.trim(),
                subject: `Factura TS Serveis: #${invoice?.invoiceNumber}`,
                html: `<div style="font-family: sans-serif;"><h2>Factura TS Serveis</h2><p>Adjuntem la factura corresponent als serveis de: <strong>${invoice?.projectName}</strong>.</p><p>Total: <strong>${invoice?.totalAmount.toFixed(2)} €</strong></p><p>Gràcies!</p></div>`,
                attachments: [{ filename: `Factura-${invoice?.invoiceNumber}.pdf`, content: pdfBase64 }]
            });
            if (result.success) {
                toast({ title: 'Factura enviada!' });
                setIsEmailDialogOpen(false);
            } else {
                toast({ variant: 'destructive', title: 'Error', description: result.error });
            }
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error enviament' });
        } finally {
            setIsSendingEmail(false);
        }
    };

    if (isUserLoading || isLoadingInvoice || (isLoadingData && !hasLoaded)) {
        return <div className="text-center p-12 h-[60vh] flex flex-col items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /><p className="mt-4 font-black uppercase text-slate-400">Carregant Factura...</p></div>
    }

    return (
        <AdminGate pageTitle="Detall de la Factura" pageDescription="Gestió oficial de facturació.">
            <div className="space-y-8 max-w-5xl mx-auto pb-20">
                <div className="flex justify-between items-center flex-wrap gap-4">
                    <Button variant="ghost" onClick={() => router.push('/dashboard/invoices/history')} className="font-bold uppercase text-xs">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Historial
                    </Button>
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                        <Dialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
                            <DialogTrigger asChild><Button variant="outline" className="h-12 rounded-xl border-2 font-bold text-primary border-primary/20"><Mail className="mr-2 h-4 w-4" /> Enviar PDF</Button></DialogTrigger>
                            <DialogContent className="rounded-3xl">
                                <DialogHeader><DialogTitle>Enviar Factura</DialogTitle></DialogHeader>
                                <div className="py-4 space-y-4">
                                    <Label>E-mail del destinatari</Label>
                                    <Input type="email" value={recipientEmail} onChange={(e) => setRecipientEmail(e.target.value)} className="h-12 rounded-xl font-bold" />
                                </div>
                                <DialogFooter><Button onClick={handleSendEmail} disabled={isSendingEmail} className="bg-primary font-bold h-12 w-full">{isSendingEmail ? <Loader2 className="animate-spin mr-2" /> : <Send className="mr-2 h-4 w-4" />} Enviar</Button></DialogFooter>
                            </DialogContent>
                        </Dialog>

                        <Button onClick={handleExportPDF} disabled={isGenerating} className="bg-slate-900 h-12 px-8 rounded-xl font-black uppercase text-xs text-white shadow-xl">
                            {isGenerating ? <Loader2 className="animate-spin mr-2" /> : <FileDown className="mr-2 h-4 w-4" />} EXPORTAR PDF
                        </Button>
                    </div>
                </div>
                
                <Card className="shadow-2xl border-none rounded-[2.5rem] overflow-hidden">
                    <CardHeader className="bg-slate-900 text-white p-8">
                        <div className="flex justify-between items-center">
                            <CardTitle className="text-3xl font-black uppercase tracking-tight">Factura #{String(invoice?.invoiceNumber).padStart(4, '0')}</CardTitle>
                            <Badge className="bg-green-600 uppercase font-black px-4">{invoice?.status}</Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0 bg-slate-100">
                        <InvoicePreview
                            ref={invoiceRef}
                            customer={customer}
                            projectName={invoice?.projectName || ''}
                            invoiceNumber={invoice?.invoiceNumber}
                            services={services}
                            employees={employees}
                            applyIva={invoice?.applyIva}
                        />
                    </CardContent>
                </Card>
            </div>
        </AdminGate>
    )
}
