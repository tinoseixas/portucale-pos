'use client'

import { useMemo, useRef, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCollection, useUser, useFirestore, useMemoFirebase, useDoc } from '@/firebase'
import { collection, query, orderBy, doc, runTransaction, setDoc, writeBatch } from 'firebase/firestore'
import type { Customer, Receipt, Invoice } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Save, ArrowLeft, Euro, Calendar as CalendarIcon, CreditCard, Receipt as ReceiptIcon } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { AdminGate } from '@/components/AdminGate'
import { format, parseISO } from 'date-fns'
import { ca } from 'date-fns/locale'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { cn } from '@/lib/utils'

export default function NewReceiptPage() {
    const firestore = useFirestore()
    const router = useRouter()
    const searchParams = useSearchParams()
    const { toast } = useToast();

    const invoiceId = searchParams.get('invoiceId');

    const [isSaving, setIsSaving] = useState(false);
    const [amountPaid, setAmountPaid] = useState<number | ''>('');
    const [paymentMethod, setPaymentMethod] = useState<string>('Transferència');
    const [paymentDate, setPaymentDate] = useState<Date>(new Date());
    
    // Fetch the specific invoice
    const invoiceDocRef = useMemoFirebase(() => (firestore && invoiceId ? doc(firestore, 'invoices', invoiceId) : null), [firestore, invoiceId]);
    const { data: invoice, isLoading: isLoadingInvoice } = useDoc<Invoice>(invoiceDocRef);
    
    // Fetch all receipts to calculate total paid for this invoice
    const receiptsQuery = useMemoFirebase(() => (firestore && invoiceId ? query(collection(firestore, 'receipts'), orderBy('createdAt', 'desc')) : null), [firestore, invoiceId]);
    const { data: receipts, isLoading: isLoadingReceipts } = useCollection<Receipt>(receiptsQuery);

    const relatedReceipts = useMemo(() => {
        if (!receipts) return [];
        return receipts.filter(r => r.invoiceId === invoiceId);
    }, [receipts, invoiceId]);

    const totalPaid = useMemo(() => {
        return relatedReceipts.reduce((sum, receipt) => sum + receipt.amountPaid, 0);
    }, [relatedReceipts]);
    
    const amountDue = useMemo(() => {
        if (!invoice) return 0;
        return invoice.totalAmount - totalPaid;
    }, [invoice, totalPaid]);

    // Set the default payment amount when data loads
    useEffect(() => {
        if (amountDue > 0) {
            setAmountPaid(amountDue);
        }
    }, [amountDue]);
    
    const handleSaveReceipt = async () => {
        if (!firestore || !invoice || !invoiceDocRef || !amountPaid) {
            toast({ variant: 'destructive', title: 'Error', description: 'Dades invàlides per desar el rebut.' });
            return;
        }
        setIsSaving(true);
        
        try {
            const counterRef = doc(firestore, "counters", "receipts");
            const newReceiptNumber = await runTransaction(firestore, async (transaction) => {
                const counterDoc = await transaction.get(counterRef);
                if (!counterDoc.exists()) {
                    transaction.set(counterRef, { lastNumber: 1 });
                    return 1;
                }
                const newNumber = (counterDoc.data().lastNumber || 0) + 1;
                transaction.update(counterRef, { lastNumber: newNumber });
                return newNumber;
            });

            const batch = writeBatch(firestore);

            // Create new receipt
            const receiptRef = doc(collection(firestore, "receipts"));
            const receiptData: Omit<Receipt, 'id'> = {
                receiptNumber: newReceiptNumber,
                invoiceId: invoice.id,
                invoiceNumber: invoice.invoiceNumber,
                customerId: invoice.customerId,
                customerName: invoice.customerName,
                paymentDate: paymentDate.toISOString(),
                amountPaid: Number(amountPaid),
                paymentMethod: paymentMethod,
                createdAt: new Date().toISOString(),
            };
            batch.set(receiptRef, receiptData);

            // Update invoice status
            const newTotalPaid = totalPaid + Number(amountPaid);
            const newStatus = newTotalPaid >= invoice.totalAmount ? 'pagada' : 'parcialment pagada';
            batch.update(invoiceDocRef, { status: newStatus, paymentDate: paymentDate.toISOString() });
            
            await batch.commit();

            toast({
                title: "Rebut Guardat",
                description: `El pagament per a la factura #${invoice.invoiceNumber} ha estat registrat.`,
            });
            
            router.push(`/dashboard/invoices/history`);

        } catch (error) {
            console.error("Error generating receipt:", error)
            toast({
                variant: 'destructive',
                title: 'Error',
                description: "No s'ha pogut desar el rebut.",
            });
        } finally {
            setIsSaving(false);
        }
    };
    
    const isLoading = isLoadingInvoice || isLoadingReceipts;
    
    if (isLoading) {
        return <p>Carregant dades de la factura...</p>
    }
    
    if (!invoice) {
        return (
             <AdminGate pageTitle="Registrar Pagament" pageDescription="Error">
                <Card>
                    <CardHeader>
                        <CardTitle>Error</CardTitle>
                        <CardDescription>No s'ha trobat la factura especificada. Si us plau, torna a l'historial i intenta-ho de nou.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button onClick={() => router.push('/dashboard/invoices/history')}>
                            <ArrowLeft className="mr-2 h-4 w-4" /> Tornar a l'historial
                        </Button>
                    </CardContent>
                </Card>
             </AdminGate>
        )
    }

    return (
         <AdminGate pageTitle="Registrar Pagament" pageDescription="Aquesta secció està protegida.">
            <div className="space-y-8 max-w-2xl mx-auto">
                 <Button variant="ghost" onClick={() => router.push('/dashboard/invoices/history')}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Tornar a l'historial
                </Button>
                <Card>
                    <CardHeader>
                        <CardTitle>Registrar Pagament per a la Factura #{String(invoice.invoiceNumber).padStart(4, '0')}</CardTitle>
                        <CardDescription>
                            Client: {invoice.customerName} | Total Factura: {invoice.totalAmount.toFixed(2)}€ | Pendent: <span className="font-bold text-destructive">{amountDue.toFixed(2)}€</span>
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="amountPaid" className="flex items-center gap-2"><Euro className="h-4 w-4 text-muted-foreground" /> Import a Pagar</Label>
                                <Input 
                                    id="amountPaid"
                                    type="number"
                                    value={amountPaid}
                                    onChange={(e) => setAmountPaid(e.target.value === '' ? '' : Number(e.target.value))}
                                    placeholder="0.00"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="paymentMethod" className="flex items-center gap-2"><CreditCard className="h-4 w-4 text-muted-foreground" /> Mètode de Pagament</Label>
                                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                                    <SelectTrigger id="paymentMethod">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Transferència">Transferència</SelectItem>
                                        <SelectItem value="Efectiu">Efectiu</SelectItem>
                                        <SelectItem value="Targeta de crèdit">Targeta de crèdit</SelectItem>
                                        <SelectItem value="Altre">Altre</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="date">Data del Pagament</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                    "w-full justify-start text-left font-normal",
                                    !paymentDate && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {paymentDate ? format(paymentDate, "PPP", { locale: ca }) : <span>Tria una data</span>}
                                </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                <Calendar
                                    mode="single"
                                    selected={paymentDate}
                                    onSelect={(d) => d && setPaymentDate(d)}
                                    initialFocus
                                    locale={ca}
                                />
                                </PopoverContent>
                            </Popover>
                        </div>

                         <div className="flex justify-end pt-4">
                             <Button onClick={handleSaveReceipt} disabled={isSaving || !amountPaid || amountPaid <= 0}>
                                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                Guardar Rebut
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {relatedReceipts.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Pagaments Anteriors</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ul className="space-y-2 text-sm">
                                {relatedReceipts.map(r => (
                                    <li key={r.id} className="flex justify-between items-center p-2 rounded-md bg-muted">
                                        <div className="flex items-center gap-2">
                                            <ReceiptIcon className="h-4 w-4 text-muted-foreground" />
                                            <span>Rebut #{r.receiptNumber} - {format(parseISO(r.paymentDate), "dd/MM/yyyy")}</span>
                                        </div>
                                        <span className="font-bold">{r.amountPaid.toFixed(2)}€</span>
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                    </Card>
                )}
            </div>
         </AdminGate>
    )
}
