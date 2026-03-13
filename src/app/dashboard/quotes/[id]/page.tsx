
'use client'

import { useState, useMemo, useRef, useEffect, Suspense } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { useDoc, useUser, useFirestore, useMemoFirebase, deleteDocumentNonBlocking, useCollection } from '@/firebase'
import { collection, query, doc, runTransaction, setDoc, updateDoc } from 'firebase/firestore'
import type { Customer, Quote as QuoteType } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FileDown, Loader2, ArrowLeft, Trash2, Copy, Mail, Send, AlertCircle } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
    const [isDuplicating, setIsDuplicating] = useState(false)
    const quotePreviewRef = useRef<HTMLDivElement>(null)
    const [customer, setCustomer] = useState<Customer | undefined>()

    // Email states
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
    
    const shouldExport = searchParams.get('export') === 'true';

    useEffect(() => {
        if (!isUserLoading && !user) {
            router.push('/')
        }
    }, [isUserLoading, user, router])
    
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
            scale: 1.5,
            useCORS: true,
            logging: false,
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.7);
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

        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;

        while (heightLeft > 0) {
            position = heightLeft - imgHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
            heightLeft -= pdfHeight;
        }

        return pdf;
    }

    const handleExportPDF = async () => {
        setIsGenerating(true);
        toast({ title: 'Generant PDF...', description: 'Això pot trigar un moment.' });

        try {
            const pdf = await generatePDF();
            if (pdf) {
                pdf.save(`Pressupost-${String(quote?.quoteNumber).padStart(4, '0')}.pdf`);
                toast({ title: 'PDF Generat!', description: "L'exportació s'ha completat correctament." });
            }
        } catch (error) {
            console.error("Error en generar el PDF:", error);
            toast({ variant: 'destructive', title: 'Error', description: "No s'ha pogut generar el PDF." });
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSendEmail = async () => {
        if (!recipientEmail.trim() || !recipientEmail.includes('@')) {
            toast({ variant: 'destructive', title: 'E-mail invàlid', description: 'Si us plau, introdueix una adreça de correu vàlida.' });
            return;
        }

        setIsSendingEmail(true);
        toast({ title: 'Enviant correu...', description: 'Generant adjunt i processant enviament.' });

        try {
            const pdf = await generatePDF();
            if (!pdf) throw new Error("No s'ha pogut generar el PDF");

            const pdfBase64 = pdf.output('datauristring');
            
            const result = await sendDocumentEmail({
                to: recipientEmail.trim(),
                subject: `Pressupost TS Serveis: ${quote?.projectName}`,
                html: `
                    <div style="font-family: sans-serif; color: #333;">
                        <h2>Bon dia,</h2>
                        <p>Adjuntem el pressupost corresponent a l'obra: <strong>${quote?.projectName}</strong>.</p>
                        <p>Restem a la vostra disposició per a qualsevol dubte.</p>
                        <br/>
                        <p><strong>TS Serveis</strong><br/>Solucions Tècniques i Manteniment</p>
                    </div>
                `,
                attachments: [{
                    filename: `Pressupost-${String(quote?.quoteNumber).padStart(4, '0')}.pdf`,
                    content: pdfBase64
                }]
            });

            if (result.success) {
                if (customer && !customer.email && firestore) {
                    const customerRef = doc(firestore, 'customers', customer.id);
                    await updateDoc(customerRef, { email: recipientEmail.trim() });
                    setCustomer({ ...customer, email: recipientEmail.trim() });
                    toast({ title: 'E-mail guardat', description: 'El correu s\'ha actualitzat a la fitxa del client.' });
                }

                toast({ title: 'E-mail enviat!', description: `El pressupost s'ha enviat a ${recipientEmail}.` });
                setIsEmailDialogOpen(false);
            } else {
                toast({ variant: 'destructive', title: 'Error en l\'enviament', description: result.error });
            }
        } catch (error) {
            console.error("Error enviant email:", error);
            toast({ variant: 'destructive', title: 'Error', description: "No s'ha pogut enviar el correu electrònic." });
        } finally {
            setIsSendingEmail(false);
        }
    };
    
    const handleDuplicateQuote = async () => {
        if (!firestore || !quote) return;
        setIsDuplicating(true);
        
        try {
            const counterRef = doc(firestore, "counters", "quotes");
            const newQuoteNumber = await runTransaction(firestore, async (transaction) => {
                const counterDoc = await transaction.get(counterRef);
                if (!counterDoc.exists()) {
                    transaction.set(counterRef, { lastNumber: 1 });
                    return 1;
                }
                const newNumber = (counterDoc.data().lastNumber || 0) + 1;
                transaction.update(counterRef, { lastNumber: newNumber });
                return newNumber;
            });

            const newQuoteRef = doc(collection(firestore, "quotes"));
            const newQuoteData: QuoteType = {
                ...quote,
                id: newQuoteRef.id,
                quoteNumber: newQuoteNumber,
                createdAt: new Date().toISOString(),
                projectName: quote.projectName + " (Còpia)"
            };

            await setDoc(newQuoteRef, newQuoteData);

            toast({
                title: "Pressupost Duplicat",
                description: `Creat nou pressupost #${newQuoteNumber} a partir del #${quote.quoteNumber}.`,
            });
            
            router.push(`/dashboard/quotes/edit/${newQuoteRef.id}`);

        } catch (error) {
            console.error("Error duplicant pressupost:", error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: "No s'ha pogut duplicar el pressupost.",
            });
        } finally {
            setIsDuplicating(false);
        }
    };

    const isLoading = isUserLoading || isLoadingQuote;
    
    useEffect(() => {
        if (shouldExport && !isLoading && !isGenerating && quote) {
            handleExportPDF();
            router.replace(`/dashboard/quotes/${quoteId}`, { scroll: false });
        }
         // eslint-disable-next-line react-hooks/exhaustive-deps
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
        return <div className="text-center p-8"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /> <p className="mt-4 font-black uppercase text-slate-400">Carregant Pressupost...</p></div>
    }
    
    if (!quote) {
        return <p className="p-12 text-center font-bold">No s'ha trobat el pressupost.</p>
    }

    return (
        <AdminGate pageTitle="Detall del Pressupost" pageDescription="Aquesta secció està protegida.">
            <div className="space-y-8 max-w-5xl mx-auto pb-20">
                <div className="flex justify-between items-center flex-wrap gap-4">
                    <Button variant="ghost" onClick={() => router.push('/dashboard/quotes/history')} className="font-bold uppercase text-xs">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Historial
                    </Button>
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                        <Button
                            variant="outline"
                            onClick={handleDuplicateQuote}
                            disabled={isDuplicating}
                            className="font-bold rounded-xl h-12"
                        >
                            {isDuplicating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Copy className="mr-2 h-4 w-4" />}
                            Duplicar
                        </Button>

                        {/* Email Dialog */}
                        <Dialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
                            <DialogTrigger asChild>
                                <Button variant="outline" className="font-bold h-12 rounded-xl border-2 text-primary border-primary/20">
                                    <Mail className="mr-2 h-4 w-4" /> Correu
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="rounded-3xl">
                                <DialogHeader>
                                    <DialogTitle>Enviar Pressupost per Correu</DialogTitle>
                                    <DialogDescription>El PDF s'enviarà com a adjunt per al client.</DialogDescription>
                                </DialogHeader>
                                <div className="py-4 space-y-4">
                                    <div className="space-y-2">
                                        <Label>E-mail del destinatari</Label>
                                        <Input 
                                            type="email" 
                                            placeholder="client@exemple.com" 
                                            value={recipientEmail} 
                                            onChange={(e) => setRecipientEmail(e.target.value)} 
                                            className="h-12 rounded-xl font-bold"
                                        />
                                        {!customer?.email && (
                                            <p className="text-[10px] text-amber-600 font-bold uppercase">Nota: Aquest client no té e-mail a la fitxa. El correu s'actualitzarà automàticament.</p>
                                        )}
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button onClick={handleSendEmail} disabled={isSendingEmail} className="bg-primary font-bold h-12 w-full">
                                        {isSendingEmail ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                                        Enviar Pressupost
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>

                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="ghost" className="text-red-500 font-bold h-12 rounded-xl">
                                    <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="rounded-[2.5rem] p-10">
                                <AlertDialogHeader>
                                <AlertDialogTitle className="text-2xl font-black uppercase">Eliminar Pressupost?</AlertDialogTitle>
                                <AlertDialogDescription className="text-base font-medium">
                                    Aquesta acció no es pot desfer. S'eliminarà el pressupost <strong>#{quote.quoteNumber}</strong> de l'historial.
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter className="pt-6">
                                <AlertDialogCancel className="h-14 rounded-2xl font-bold border-2">Enrere</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDeleteQuote} className="bg-red-600 h-14 rounded-2xl font-black uppercase tracking-widest px-8">Confirmar</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>

                        <Button
                            onClick={handleExportPDF}
                            disabled={isGenerating}
                            className="bg-slate-900 h-12 px-8 rounded-xl font-black uppercase text-xs text-white shadow-xl"
                        >
                            {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
                            EXPORTAR PDF
                        </Button>
                    </div>
                </div>
                
                <Card className="shadow-2xl border-none rounded-[2.5rem] overflow-hidden">
                    <CardHeader className="bg-slate-900 text-white p-8">
                        <CardTitle className="text-3xl font-black uppercase tracking-tight">Pressupost #{String(quote.quoteNumber).padStart(4, '0')}</CardTitle>
                        <CardDescription className="text-slate-400 font-medium">Projecte: {quote.projectName}</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0 bg-slate-100">
                        <QuotePreview
                            ref={quotePreviewRef}
                            customer={customer}
                            projectName={quote.projectName}
                            items={quote.items}
                            labor={quote.labor}
                            quoteNumber={quote.quoteNumber}
                            notes={quote.notes}
                        />
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
