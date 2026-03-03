
'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
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

export default function QuoteDetailPage() {
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
        toast({ title: 'Gerando PDF...', description: 'Isso pode demorar um momento.' });

        try {
            const pdf = await generatePDF();
            if (pdf) {
                pdf.save(`Pressupost-${String(quote?.quoteNumber).padStart(4, '0')}.pdf`);
                toast({ title: 'PDF Gerado!', description: "A exportação foi concluída com sucesso." });
            }
        } catch (error) {
            console.error("Error en generar el PDF:", error);
            toast({ variant: 'destructive', title: 'Erro', description: "Não foi possível gerar o PDF." });
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSendEmail = async () => {
        if (!recipientEmail.trim() || !recipientEmail.includes('@')) {
            toast({ variant: 'destructive', title: 'E-mail inválido', description: 'Por favor, insira um endereço de e-mail válido.' });
            return;
        }

        setIsSendingEmail(true);
        toast({ title: 'Enviando e-mail...', description: 'Gerando anexo e processando envio.' });

        try {
            const pdf = await generatePDF();
            if (!pdf) throw new Error("Não foi possível gerar o PDF");

            const pdfBase64 = pdf.output('datauristring');
            
            const result = await sendDocumentEmail({
                to: recipientEmail.trim(),
                subject: `Orçamento TS Serveis: ${quote?.projectName}`,
                html: `
                    <div style="font-family: sans-serif; color: #333;">
                        <h2>Bom dia,</h2>
                        <p>Anexamos o orçamento correspondente à obra: <strong>${quote?.projectName}</strong>.</p>
                        <p>Ficamos à disposição para qualquer dúvida.</p>
                        <br/>
                        <p><strong>TS Serveis</strong><br/>Solucions Tècniques i Manteniment</p>
                    </div>
                `,
                attachments: [{
                    filename: `Orcament-${String(quote?.quoteNumber).padStart(4, '0')}.pdf`,
                    content: pdfBase64
                }]
            });

            if (result.success) {
                // Actualitzar e-mail a la fitxa de client si era buit
                if (customer && !customer.email && firestore) {
                    const customerRef = doc(firestore, 'customers', customer.id);
                    await updateDoc(customerRef, { email: recipientEmail.trim() });
                    setCustomer({ ...customer, email: recipientEmail.trim() });
                    toast({ title: 'E-mail guardado', description: 'O e-mail foi atualizado na ficha do cliente.' });
                }

                toast({ title: 'E-mail enviado!', description: `O orçamento foi enviado para ${recipientEmail}.` });
                setIsEmailDialogOpen(false);
            } else {
                toast({ variant: 'destructive', title: 'Erro no envio', description: result.error });
            }
        } catch (error) {
            console.error("Error enviant email:", error);
            toast({ variant: 'destructive', title: 'Erro', description: "Não foi possível enviar o e-mail." });
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
                        <Button
                            variant="outline"
                            onClick={handleDuplicateQuote}
                            disabled={isDuplicating}
                        >
                            {isDuplicating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Copy className="mr-2 h-4 w-4" />}
                            Duplicar
                        </Button>

                        {/* Email Dialog */}
                        <Dialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
                            <DialogTrigger asChild>
                                <Button variant="outline" className="font-bold border-primary text-primary hover:bg-primary/5">
                                    <Mail className="mr-2 h-4 w-4" /> Correu
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Enviar Orçamento por E-mail</DialogTitle>
                                    <DialogDescription>O PDF será enviado como anexo para o cliente.</DialogDescription>
                                </DialogHeader>
                                <div className="py-4 space-y-4">
                                    <div className="space-y-2">
                                        <Label>E-mail do destinatário</Label>
                                        <Input 
                                            type="email" 
                                            placeholder="cliente@exemplo.com" 
                                            value={recipientEmail} 
                                            onChange={(e) => setRecipientEmail(e.target.value)} 
                                        />
                                        {!customer?.email && (
                                            <p className="text-[10px] text-amber-600 font-bold">Nota: Este cliente não possui e-mail cadastrado. O endereço inserido será salvo na ficha do cliente.</p>
                                        )}
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setIsEmailDialogOpen(false)}>Cancelar</Button>
                                    <Button 
                                        onClick={handleSendEmail} 
                                        disabled={isSendingEmail} 
                                        className="bg-primary font-bold"
                                    >
                                        {isSendingEmail ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                                        Enviar Orçamento
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>

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
