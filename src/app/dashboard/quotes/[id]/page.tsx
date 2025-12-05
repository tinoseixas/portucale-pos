'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { useDoc, useUser, useFirestore, useMemoFirebase, deleteDocumentNonBlocking, useCollection } from '@/firebase'
import { collection, query, doc } from 'firebase/firestore'
import type { Customer, Quote as QuoteType } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FileDown, Loader2, ArrowLeft, Trash2 } from 'lucide-react'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { QuotePreview } from '@/components/QuotePreview'
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

export default function QuoteDetailPage() {
    const firestore = useFirestore()
    const router = useRouter()
    const params = useParams()
    const searchParams = useSearchParams()
    const { toast } = useToast()
    const quoteId = params.id as string

    const { user, isUserLoading } = useUser()
    const [isGenerating, setIsGenerating] = useState(false)
    const quotePreviewRef = useRef<HTMLDivElement>(null)
    const [customer, setCustomer] = useState<Customer | undefined>()

    const quoteDocRef = useMemoFirebase(() => firestore && quoteId ? doc(firestore, 'quotes', quoteId) : null, [firestore, quoteId])
    const { data: quote, isLoading: isLoadingQuote } = useDoc<QuoteType>(quoteDocRef)

    const customerDocRef = useMemoFirebase(() => {
        if (!firestore || !quote?.customerId) return null;
        return doc(firestore, 'customers', quote.customerId);
    }, [firestore, quote?.customerId]);
    const { data: customerData } = useDoc<Customer>(customerDocRef);
    
    // Auto-export if query param is set
    const shouldExport = searchParams.get('export') === 'true';

    useEffect(() => {
        if (!isUserLoading && !user) {
            router.push('/')
        }
    }, [isUserLoading, user, router])
    
    useEffect(() => {
        if (customerData) {
            setCustomer(customerData);
        }
    }, [customerData]);


    const handleExportPDF = async () => {
        const quoteElement = quotePreviewRef.current;
        if (!quoteElement) return;
    
        setIsGenerating(true);
    
        const originalStyles = {
            width: quoteElement.style.width,
            maxWidth: quoteElement.style.maxWidth,
        };
    
        try {
            quoteElement.style.width = '1024px';
            quoteElement.style.maxWidth = 'none';
    
            const canvas = await html2canvas(quoteElement, {
                scale: 2, 
                useCORS: true,
                logging: false,
                windowWidth: 1440
            });
    
            quoteElement.style.width = originalStyles.width;
            quoteElement.style.maxWidth = originalStyles.maxWidth;
    
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4',
            });
    
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const imgProps = pdf.getImageProperties(imgData);
            const imgWidth = imgProps.width;
            const imgHeight = imgProps.height;
            const ratio = imgWidth / imgHeight;
            let finalWidth = pdfWidth - 20;
            let finalHeight = finalWidth / ratio;
    
            if (finalHeight > pdfHeight - 20) {
                finalHeight = pdfHeight - 20;
                finalWidth = finalHeight * ratio;
            }
    
            const x = (pdfWidth - finalWidth) / 2;
            const y = 10;
    
            pdf.addImage(imgData, 'PNG', x, y, finalWidth, finalHeight);
            
            const fileName = `Pressupost_${quote?.quoteNumber || quoteId}_${quote?.projectName || ''}.pdf`.replace(/ /g, '_');
            pdf.save(fileName);
    
        } catch (error) {
            console.error("Error generating PDF:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'No s\'ha pogut generar el PDF.' });
        } finally {
            quoteElement.style.width = originalStyles.width;
            quoteElement.style.maxWidth = originalStyles.maxWidth;
            setIsGenerating(false);
        }
    };
    
    const isLoading = isUserLoading || isLoadingQuote;
    
    useEffect(() => {
        if (shouldExport && !isLoading && !isGenerating && quote) {
            handleExportPDF();
            router.replace(`/dashboard/quotes/${quoteId}`, { scroll: false });
        }
    }, [shouldExport, isLoading, isGenerating, quote, quoteId, router]);


    const handleDeleteQuote = () => {
        if (!quoteDocRef) return;
        
        deleteDocumentNonBlocking(quoteDocRef);

        toast({
            title: 'Pressupost Eliminat',
            description: `El pressupost #${quote?.quoteNumber} ha estat eliminat de l'historial.`,
        });

        router.push('/dashboard/quotes/history');
    }
    
    if (isLoading) {
        return <div className="text-center p-8"><Loader2 className="h-8 w-8 animate-spin mx-auto" /> Carregant dades del pressupost...</div>
    }
    
    if (!quote) {
        return <p>No s'ha trobat el pressupost.</p>
    }

    return (
        <AdminGate pageTitle="Detall del Pressupost" pageDescription="Aquesta secció està protegida.">
            <div className="space-y-8 max-w-5xl mx-auto">
                <div className="flex justify-between items-center flex-wrap gap-4">
                    <Button variant="ghost" onClick={() => router.push('/dashboard/quotes/history')}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Tornar a l'historial
                    </Button>
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive">
                                    <Trash2 className="mr-2 h-4 w-4" /> Eliminar Pressupost
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>Estàs segur que vols eliminar el pressupost?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Aquesta acció no es pot desfer. S'eliminarà el pressupost <strong>#{quote.quoteNumber}</strong> de l'historial.
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>Cancel·lar</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDeleteQuote} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>

                        <Button
                            onClick={handleExportPDF}
                            disabled={isGenerating}
                        >
                            {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
                            Exportar PDF
                        </Button>
                    </div>
                </div>
                
                <Card>
                    <CardHeader>
                        <CardTitle>Pressupost #{String(quote.quoteNumber).padStart(4, '0')}</CardTitle>
                        <CardDescription>Generat per a l'obra "{quote.projectName}" per al client "{quote.customerName}".</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <QuotePreview
                            ref={quotePreviewRef}
                            customer={customer}
                            projectName={quote.projectName}
                            items={quote.items}
                            labor={quote.labor}
                            quoteNumber={quote.quoteNumber}
                        />
                    </CardContent>
                </Card>
            </div>
        </AdminGate>
    )
}
