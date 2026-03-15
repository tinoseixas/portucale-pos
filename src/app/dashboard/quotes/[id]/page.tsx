
'use client'

import { useState, useMemo, useRef, useEffect, Suspense } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { useDoc, useUser, useFirestore, useMemoFirebase, deleteDocumentNonBlocking } from '@/firebase'
import { collection, query, doc, runTransaction, setDoc, updateDoc } from 'firebase/firestore'
import type { Customer, Quote as QuoteType } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FileDown, Loader2, ArrowLeft, Mail, Send } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { QuotePreview } from '@/components/QuotePreview'
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
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { sendDocumentEmail } from '@/ai/flows/send-email'

function QuoteDetailContent() {
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

    const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false)
    const [recipientEmail, setRecipientEmail] = useState('')
    const [isSendingEmail, setIsSendingEmail] = useState(false)

    const quoteDocRef = useMemoFirebase(() => firestore && quoteId ? doc(firestore, 'quotes', quoteId) : null, [firestore, quoteId])
    const { data: quote, isLoading: isLoadingQuote } = useDoc<QuoteType>(quoteDocRef)

    const customerDocRef = useMemoFirebase(() => {
        if (!firestore || !quote?.customerId) return null;
        return doc(firestore, 'customers', quote.customerId);
    }, [firestore, quote?.customerId]);
    const { data: customerData } = useDoc<Customer>(customerDocRef);
    
    useEffect(() => {
        if (customerData) {
            setCustomer(customerData);
            if (customerData.email) setRecipientEmail(customerData.email);
        }
    }, [customerData]);

    const generatePDF = async () => {
        const quoteElement = quotePreviewRef.current;
        if (!quoteElement) return null;

        const canvas = await html2canvas(quoteElement, {
            scale: 2,
            useCORS: true,
            logging: false,
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
    }

    const handleExportPDF = async () => {
        setIsGenerating(true);
        toast({ title: 'Generant PDF...', description: 'Evitant talls de línia i superposicions.' });
        try {
            const pdf = await generatePDF();
            if (pdf) {
                pdf.save(`Pressupost-${String(quote?.quoteNumber).padStart(4, '0')}.pdf`);
                toast({ title: 'PDF Generat!' });
            }
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error PDF' });
        } finally {
            setIsGenerating(false);
        }
    };

    if (isUserLoading || isLoadingQuote) {
        return <div className="text-center p-8"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /> <p className="mt-4 font-black uppercase text-slate-400">Carregant Pressupost...</p></div>
    }

    return (
        <AdminGate pageTitle="Detall del Pressupost" pageDescription="Aquesta secció està protegida.">
            <div className="space-y-8 max-w-5xl mx-auto pb-20">
                <div className="flex justify-between items-center flex-wrap gap-4">
                    <Button variant="ghost" onClick={() => router.push('/dashboard/quotes/history')} className="font-bold uppercase text-xs">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Historial
                    </Button>
                    <Button
                        onClick={handleExportPDF}
                        disabled={isGenerating}
                        className="bg-slate-900 h-12 px-8 rounded-xl font-black uppercase text-xs text-white shadow-xl"
                    >
                        {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
                        EXPORTAR PDF
                    </Button>
                </div>
                
                <Card className="shadow-2xl border-none rounded-[2.5rem] overflow-hidden">
                    <CardHeader className="bg-slate-900 text-white p-8">
                        <CardTitle className="text-3xl font-black uppercase tracking-tight">Pressupost #{String(quote?.quoteNumber).padStart(4, '0')}</CardTitle>
                        <CardDescription className="text-slate-400 font-medium">Projecte: {quote?.projectName}</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0 bg-slate-100 flex justify-center py-10">
                        <div className="shadow-2xl bg-white">
                            <QuotePreview
                                ref={quotePreviewRef}
                                customer={customer}
                                projectName={quote?.projectName || ''}
                                items={quote?.items || []}
                                labor={quote?.labor || { description: "Mà d'obra", cost: 0 }}
                                quoteNumber={quote?.quoteNumber}
                                notes={quote?.notes}
                            />
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AdminGate>
    )
}

export default function QuoteDetailPage() {
    return (
        <Suspense fallback={<div className="text-center p-12 h-[60vh] flex flex-col items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /><p className="mt-4 font-black uppercase tracking-widest text-slate-400">Carregant...</p></div>}>
            <QuoteDetailContent />
        </Suspense>
    )
}
