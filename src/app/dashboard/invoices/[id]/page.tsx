'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { useDoc, useUser, useFirestore, useMemoFirebase, deleteDocumentNonBlocking, useCollection } from '@/firebase'
import { doc, collection, query, getDocs, collectionGroup, where } from 'firebase/firestore'
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
    const [isLoadingData, setIsLoadingData] = useState(true);


    const invoiceDocRef = useMemoFirebase(() => firestore && invoiceId ? doc(firestore, 'invoices', invoiceId) : null, [firestore, invoiceId])
    const { data: invoice, isLoading: isLoadingInvoice } = useDoc<Invoice>(invoiceDocRef)
    
    const customerDocRef = useMemoFirebase(() => (firestore && invoice?.customerId) ? doc(firestore, 'customers', invoice.customerId) : null, [firestore, invoice]);
    const { data: customer, isLoading: isLoadingCustomer } = useDoc<Customer>(customerDocRef);

    const shouldExport = searchParams.get('export') === 'true';

    useEffect(() => {
        if (!isUserLoading && !user) {
            router.push('/')
        }
    }, [isUserLoading, user, router])
    
     useEffect(() => {
        if (!firestore || !invoice?.sourceId) {
            setIsLoadingData(false);
            return;
        }

        const fetchData = async () => {
            setIsLoadingData(true);
            try {
                // Fetch all employees first
                const employeesSnap = await getDocs(query(collection(firestore, 'employees')));
                const allEmployees = employeesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Employee));
                setEmployees(allEmployees);

                // Fetch all services
                const allServicesSnapshot = await getDocs(collectionGroup(firestore, 'serviceRecords'));
                const allServicesData = allServicesSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as ServiceRecord));
                
                // Get the service record IDs from the albarans linked in the invoice
                if (invoice.sourceType === 'albaran' && invoice.sourceId) {
                    const sourceAlbaranIds = invoice.sourceId.split(',');
                    const albaransSnapshot = await getDocs(query(collection(firestore, 'albarans'), where('__name__', 'in', sourceAlbaranIds)));
                    
                    const serviceRecordIdsFromAlbarans = albaransSnapshot.docs.flatMap(doc => doc.data().serviceRecordIds);
                    
                    const invoiceServices = allServicesData.filter(s => serviceRecordIdsFromAlbarans.includes(s.id));
                    setServices(invoiceServices);
                } else {
                    // Handle quotes or direct invoices if needed
                    setServices([]);
                }
            } catch (e) {
                console.error("Error fetching invoice details:", e);
                toast({ variant: 'destructive', title: 'Error', description: 'No s\'han pogut carregar els detalls dels serveis.' });
            } finally {
                setIsLoadingData(false);
            }
        };

        fetchData();
    }, [invoice, firestore, toast]);


    const handleExportPDF = async () => {
        const reportElement = reportRef.current;
        if (!reportElement) return;

        setIsGenerating(true);
        toast({ title: 'Generant PDF...', description: 'Això pot trigar un moment.' });

        try {
            const canvas = await html2canvas(reportElement, {
                scale: 2,
                useCORS: true,
                logging: false,
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const canvasWidth = canvas.width;
            const canvasHeight = canvas.height;
            const ratio = canvasWidth / canvasHeight;
            const imgWidth = pdfWidth;
            const imgHeight = imgWidth / ratio;

            let heightLeft = imgHeight;
            let position = 0;

            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pdfHeight;

            while (heightLeft > 0) {
                position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                heightLeft -= pdfHeight;
            }

            pdf.save(`Factura-${String(invoice?.invoiceNumber).padStart(4, '0')}.pdf`);

            toast({ title: 'PDF Generat!', description: 'L\'exportació s\'ha completat correctament.' });

        } catch (error) {
            console.error("Error en generar el PDF:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'No s\'ha pogut generar el PDF.' });
        } finally {
            setIsGenerating(false);
        }
    };
    
    const isLoading = isUserLoading || isLoadingInvoice || isLoadingCustomer || isLoadingData;
    
    useEffect(() => {
        if (shouldExport && !isLoading && !isGenerating && invoice) {
            handleExportPDF();
            router.replace(`/dashboard/invoices/${invoiceId}`, { scroll: false });
        }
         // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [shouldExport, isLoading, isGenerating, invoice, invoiceId, router]);


    const handleDeleteInvoice = () => {
        if (!invoiceDocRef) return;
        deleteDocumentNonBlocking(invoiceDocRef);
        toast({
            title: 'Factura Eliminada',
            description: `La factura #${invoice?.invoiceNumber} ha estat eliminada del historial.`,
        });
        router.push('/dashboard/invoices/history');
    }

    const getStatusVariant = (status: Invoice['status']) => {
        switch (status) {
          case 'pagada':
            return 'default'
          case 'pendent':
            return 'destructive'
          case 'parcialment pagada':
            return 'secondary'
          default:
            return 'outline'
        }
    }
    

    if (isLoading) {
        return <div className="text-center p-8"><Loader2 className="h-8 w-8 animate-spin mx-auto" /> Carregant dades de la factura...</div>
    }
    
    if (!invoice) {
        return <p>No s'ha trobat la factura.</p>
    }

    return (
        <AdminGate pageTitle="Detall de la Factura" pageDescription="Aquesta secció està protegida.">
            <div className="space-y-8 max-w-5xl mx-auto">
                <div className="flex justify-between items-center flex-wrap gap-4">
                    <Button variant="ghost" onClick={() => router.push('/dashboard/invoices/history')}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Tornar a l'historial
                    </Button>
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive">
                                    <Trash2 className="mr-2 h-4 w-4" /> Eliminar Factura
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>Estàs segur que vols eliminar la factura?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Aquesta acció no es pot desfer. S'eliminarà la factura <strong>#{invoice.invoiceNumber}</strong> del historial.
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>Cancel·lar</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDeleteInvoice} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                        
                         {invoice.status !== 'pagada' && (
                            <Button variant="outline" onClick={() => router.push(`/dashboard/receipts/new?invoiceId=${invoice.id}`)}>
                                <CreditCard className="mr-2 h-4 w-4" />
                                Registar Pagament
                            </Button>
                        )}

                        <Button
                            onClick={handleExportPDF}
                            disabled={isGenerating || isLoading}
                        >
                            {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
                            Exportar PDF
                        </Button>
                    </div>
                </div>
                
                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-start">
                            <div>
                                <CardTitle>Factura #{String(invoice.invoiceNumber).padStart(4, '0')}</CardTitle>
                                <CardDescription>Generada per a l'obra "{invoice.projectName}" per al client "{invoice.customerName}".</CardDescription>
                            </div>
                            <Badge variant={getStatusVariant(invoice.status)} className="capitalize text-base">{invoice.status}</Badge>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <InvoicePreview
                            ref={reportRef}
                            customer={customer || undefined}
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
