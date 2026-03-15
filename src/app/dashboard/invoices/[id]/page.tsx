
'use client'

import { useState, useRef, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { useDoc, useUser, useFirestore, useMemoFirebase, deleteDocumentNonBlocking, useCollection } from '@/firebase'
import { collection, query, getDocs, doc, collectionGroup, getDoc, updateDoc, where } from 'firebase/firestore'
import type { Customer, Invoice, ServiceRecord, Employee } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FileDown, Loader2, ArrowLeft, Mail, Send } from 'lucide-react'
import { InvoicePreview } from '@/components/InvoicePreview'
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

function InvoiceDetailContent() {
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

    const employeeDocRef = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return doc(firestore, 'employees', user.uid);
    }, [firestore, user]);
    const { data: currentEmployee } = useDoc<Employee>(employeeDocRef);
    const isAdmin = currentEmployee?.role === 'admin';
    
    const fetchData = useCallback(async () => {
        if (!firestore || !invoice || currentEmployee === undefined || hasLoaded) return;
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

            let fetchedServices: ServiceRecord[] = [];
            
            if (invoice.sourceId) {
                const sourceIds = invoice.sourceId.split(',');
                const albaranPromises = sourceIds.map(id => getDoc(doc(firestore, 'albarans', id)));
                const albaranSnaps = await Promise.all(albaranPromises);
                const recordIds = albaranSnaps
                    .filter(snap => snap.exists())
                    .flatMap(snap => (snap.data() as any).serviceRecordIds || []);

                if (recordIds.length > 0) {
                    const servicesSnapshot = await getDocs(collectionGroup(firestore, 'serviceRecords'));
                    fetchedServices = servicesSnapshot.docs
                        .map(d => ({ id: d.id, ...d.data() } as ServiceRecord))
                        .filter(s => recordIds.includes(s.id));
                }
            }
            
            setServices(fetchedServices);
            setHasLoaded(true);
        } catch (e) {
            console.error(e);
            toast({ variant: 'destructive', title: 'Error càrrega' });
        } finally {
            setIsLoadingData(false);
        }
    }, [invoice, firestore, user, currentEmployee, toast, hasLoaded]);

    useEffect(() => {
        if (invoice && currentEmployee !== undefined && !hasLoaded) fetchData();
    }, [invoice, currentEmployee, fetchData, hasLoaded]);

    const generatePDF = async () => {
        const element = invoiceRef.current;
        if (!element) return null;
        const canvas = await html2canvas(element, { 
            scale: 2, 
            useCORS: true, 
            backgroundColor: '#ffffff',
            windowWidth: 1200
        });
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
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
        toast({ title: 'Preparant Factura...', description: 'Ajustant títols i talls de pàgina.' });
        try {
            const pdf = await generatePDF();
            if (pdf) {
                pdf.save(`Factura-${invoice?.invoiceNumber}-${invoice?.customerName.replace(/\s+/g, '-')}.pdf`);
                toast({ title: 'Factura generada' });
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
                html: `<div><h2>Factura TS Serveis</h2><p>Adjuntem la factura corresponent.</p></div>`,
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

    if (isUserLoading || isLoadingInvoice || currentEmployee === undefined || (isLoadingData && !hasLoaded)) {
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
                    <CardContent className="p-0 bg-slate-100 flex justify-center py-10">
                        <div className="shadow-2xl bg-white">
                            <InvoicePreview
                                ref={invoiceRef}
                                customer={customer}
                                projectName={invoice?.projectName || ''}
                                invoiceNumber={invoice?.invoiceNumber}
                                services={services}
                                employees={employees}
                                applyIva={invoice?.applyIva}
                            />
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AdminGate>
    )
}

export default function InvoiceDetailPage() {
    return (
        <Suspense fallback={<div className="text-center p-12 h-[60vh] flex flex-col items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /><p className="mt-4 font-black uppercase text-slate-400">Carregant...</p></div>}>
            <InvoiceDetailContent />
        </Suspense>
    )
}
