'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { useDoc, useUser, useFirestore, useMemoFirebase, deleteDocumentNonBlocking, useCollection } from '@/firebase'
import { doc, collection, query, getDocs, collectionGroup, where, getDoc } from 'firebase/firestore'
import type { Customer, Invoice, ServiceRecord, Employee } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FileDown, Loader2, ArrowLeft, Trash2, CreditCard } from 'lucide-react'
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
import { useToast } from '@/hooks/use-toast'
import { AdminGate } from '@/components/AdminGate'
import { Badge } from '@/components/ui/badge'
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function InvoiceDetailPage() {
    const firestore = useFirestore()
    const router = useRouter()
    const params = useParams()
    const searchParams = useSearchParams()
    const { toast } = useToast()
    const invoiceId = params.id as string

    const { user, isUserLoading } = useUser()
    const [isGenerating, setIsGenerating] = useState(false)
    const reportRef = useRef<HTMLDivElement>(null)
    const [services, setServices] = useState<ServiceRecord[]>([])
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [isLoadingData, setIsLoadingData] = useState(false);
    const [hasLoaded, setHasLoaded] = useState(false);

    const invoiceDocRef = useMemoFirebase(() => firestore && invoiceId ? doc(firestore, 'invoices', invoiceId) : null, [firestore, invoiceId])
    const { data: invoice, isLoading: isLoadingInvoice } = useDoc<Invoice>(invoiceDocRef)
    
    const [customer, setCustomer] = useState<Customer | undefined>();

    const shouldExport = searchParams.get('export') === 'true';

    const fetchData = useCallback(async () => {
        if (!firestore || !invoice || hasLoaded) return;

        setIsLoadingData(true);
        
        try {
            // 1. Carregar Empleats
            const employeesSnap = await getDocs(query(collection(firestore, 'employees')));
            const allEmployees = employeesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Employee));
            setEmployees(allEmployees);

            // 2. Carregar Client
            if (invoice.customerId) {
                const customerSnap = await getDoc(doc(firestore, 'customers', invoice.customerId));
                if (customerSnap.exists()) {
                    setCustomer({ id: customerSnap.id, ...customerSnap.data() } as Customer);
                }
            }

            // 3. Carregar Serveis optimitzats
            const optimizedQuery = query(
                collectionGroup(firestore, 'serviceRecords'),
                where('customerId', '==', invoice.customerId),
                where('projectName', '==', invoice.projectName)
            );
            
            const servicesSnapshot = await getDocs(optimizedQuery);
            const allServicesData = servicesSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as ServiceRecord));
            
            if (invoice.sourceId) {
                const sourceAlbaranIds = invoice.sourceId.split(',');
                const albaransSnapshot = await getDocs(query(collection(firestore, 'albarans'), where('__name__', 'in', sourceAlbaranIds)));
                const serviceRecordIdsFromAlbarans = albaransSnapshot.docs.flatMap(doc => doc.data().serviceRecordIds);
                
                setServices(allServicesData.filter(s => serviceRecordIdsFromAlbarans.includes(s.id)));
            } else {
                setServices(allServicesData);
            }
            setHasLoaded(true);
        } catch (e) {
            console.error("Error fetching details:", e);
            toast({ variant: 'destructive', title: 'Error', description: 'No s\'han pogut carregar les dades de la factura.' });
        } finally {
            setIsLoadingData(false);
        }
    }, [invoice, firestore, toast, hasLoaded]);

    useEffect(() => {
        if (invoice) {
            fetchData();
        }
    }, [invoice, fetchData]);


    const handleExportPDF = async () => {
        const reportElement = reportRef.current;
        if (!reportElement) return;

        setIsGenerating(true);
        toast({ title: 'Generant PDF...', description: 'Processant document lleuger per a enviament ràpid.' });

        try {
            const canvas = await html2canvas(reportElement, {
                scale: 1.0,
                useCORS: true,
                logging: false,
            });

            const imgData = canvas.toDataURL('image/jpeg', 0.5);
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const imgWidth = pdfWidth;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            let heightLeft = imgHeight;
            let position = 0;

            pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
            heightLeft -= pdfHeight;

            while (heightLeft > 0) {
                position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
                heightLeft -= pdfHeight;
            }

            pdf.save(`Factura-${String(invoice?.invoiceNumber).padStart(4, '0')}.pdf`);
            toast({ title: 'PDF Generat!', description: 'L\'exportació s\'ha completat.' });

        } catch (error) {
            console.error("Error PDF:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'No s\'ha pogut crear el fitxer PDF.' });
        } finally {
            setIsGenerating(false);
        }
    };
    
    useEffect(() => {
        if (shouldExport && hasLoaded && !isLoadingData && !isGenerating && invoice) {
            handleExportPDF();
            router.replace(`/dashboard/invoices/${invoiceId}`, { scroll: false });
        }
         // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [shouldExport, hasLoaded, isLoadingData, isGenerating, invoice?.id, invoiceId, router]);


    const handleDeleteInvoice = () => {
        if (!invoiceDocRef) return;
        deleteDocumentNonBlocking(invoiceDocRef);
        toast({ title: 'Factura eliminada', description: 'S\'ha esborrat correctament.' });
        router.push('/dashboard/invoices/history');
    }

    const getStatusVariant = (status: Invoice['status']) => {
        switch (status) {
          case 'pagada': return 'default'
          case 'pendent': return 'destructive'
          case 'parcialment pagada': return 'secondary'
          default: return 'outline'
        }
    }
    
    const isLoading = isUserLoading || isLoadingInvoice || (isLoadingData && !hasLoaded);

    if (isLoading) {
        return <div className="text-center p-12 flex flex-col items-center justify-center h-[60vh]"><Loader2 className="h-12 w-12 animate-spin text-primary" /><p className="mt-4 text-muted-foreground">Carregant factura...</p></div>
    }
    
    if (!invoice) {
        return <p className="p-8 text-center">No s'ha trobat la factura demanada.</p>
    }

    return (
        <AdminGate pageTitle="Detall de la Factura" pageDescription="Document oficial de facturació.">
            <div className="space-y-8 max-w-5xl mx-auto pb-10">
                <div className="flex justify-between items-center flex-wrap gap-4">
                    <Button variant="ghost" onClick={() => router.push('/dashboard/invoices/history')} className="font-bold">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Tornar a l'historial
                    </Button>
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" className="font-bold">
                                    <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>Vols eliminar la factura?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Aquesta acció esborrarà la factura #{invoice.invoiceNumber} de forma permanent.
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>Cancel·lar</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDeleteInvoice} className="bg-destructive">Eliminar definitivament</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                        
                         {invoice.status !== 'pagada' && (
                            <Button variant="outline" onClick={() => router.push(`/dashboard/receipts/new?invoiceId=${invoice.id}`)} className="font-bold">
                                <CreditCard className="mr-2 h-4 w-4" />
                                Registrar Pagament
                            </Button>
                        )}

                        <Button
                            onClick={handleExportPDF}
                            disabled={isGenerating || isLoading}
                            className="bg-primary font-bold"
                        >
                            {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
                            Exportar PDF Lleuger
                        </Button>
                    </div>
                </div>
                
                <Card className="shadow-xl border-none">
                    <CardHeader className="bg-slate-900 text-white rounded-t-lg">
                        <div className="flex justify-between items-start">
                            <div>
                                <CardTitle className="text-2xl">Factura #{String(invoice.invoiceNumber).padStart(4, '0')}</CardTitle>
                                <CardDescription className="text-slate-400">Obra: {invoice.projectName}</CardDescription>
                            </div>
                            <Badge variant={getStatusVariant(invoice.status)} className="capitalize text-sm px-4">
                                {invoice.status}
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <InvoicePreview
                            ref={reportRef}
                            customer={customer}
                            projectName={invoice.projectName}
                            invoiceNumber={invoice.invoiceNumber}
                            services={services}
                            employees={employees}
                            applyIva={invoice.applyIva}
                        />
                    </CardContent>
                </Card>
            </div>
        </AdminGate>
    )
}
