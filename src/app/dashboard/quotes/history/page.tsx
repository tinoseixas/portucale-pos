'use client'

import { useMemo, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCollection, useUser, useFirestore, useMemoFirebase, deleteDocumentNonBlocking } from '@/firebase'
import { collection, query, orderBy, doc, runTransaction, setDoc } from 'firebase/firestore'
import type { Quote } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Eye, FileSignature, Trash2, PlusCircle, Edit, Copy, Loader2 } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ca } from 'date-fns/locale'
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


export default function QuotesHistoryPage() {
  const router = useRouter()
  const { user, isUserLoading } = useUser()
  const firestore = useFirestore()
  const { toast } = useToast()
  const [isDuplicating, setIsDuplicating] = useState<string | null>(null);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/')
    }
  }, [isUserLoading, user, router])

  const quotesQuery = useMemoFirebase(() => {
    if (!firestore) return null
    return query(collection(firestore, 'quotes'), orderBy('quoteNumber', 'desc'))
  }, [firestore])

  const { data: quotes, isLoading: isLoadingQuotes } = useCollection<Quote>(quotesQuery)

  const handleDeleteQuote = (quoteId: string, quoteNumber: number) => {
    if (!firestore) return;
    const quoteDocRef = doc(firestore, 'quotes', quoteId);
    
    deleteDocumentNonBlocking(quoteDocRef);
    
    toast({
      title: 'Pressupost Eliminat',
      description: `El pressupost #${quoteNumber} ha estat eliminat de l'historial.`,
    });
  };

  const handleDuplicateQuote = async (quote: Quote) => {
    if (!firestore) return;
    setIsDuplicating(quote.id);
    
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
        const newQuoteData: Quote = {
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
            description: "No s'ha pogut duplicar o pressupost.",
        });
    } finally {
        setIsDuplicating(null);
    }
  };

  if (isUserLoading || isLoadingQuotes) {
    return <p>Carregant historial de pressupostos...</p>
  }

  if (!user) {
    return null
  }

  return (
    <AdminGate pageTitle="Historial de Pressupostos" pageDescription="Aquesta secció està protegida.">
        <div className="max-w-6xl mx-auto">
        <Card>
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
                <FileSignature className="h-8 w-8" />
                <div>
                    <CardTitle>Historial de Pressupostos</CardTitle>
                    <CardDescription>Consulta tots els pressupostos que s'han generat.</CardDescription>
                </div>
            </div>
             <Button onClick={() => router.push('/dashboard/quotes')}>
                <PlusCircle className="mr-2 h-4 w-4" /> Nou Pressupost
            </Button>
            </CardHeader>
            <CardContent>
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead>Nº Pressupost</TableHead>
                        <TableHead>Data Creació</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Obra</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead className="text-right">Accions</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {quotes && quotes.length > 0 ? quotes.map(quote => (
                        <TableRow key={quote.id}>
                        <TableCell className="font-bold">#{String(quote.quoteNumber).padStart(4, '0')}</TableCell>
                        <TableCell>{format(parseISO(quote.createdAt), 'dd/MM/yyyy HH:mm', { locale: ca })}</TableCell>
                        <TableCell>{quote.customerName}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{quote.projectName}</TableCell>
                        <TableCell>{quote.totalAmount.toFixed(2)} €</TableCell>
                        <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                                <Button variant="outline" size="sm" onClick={() => router.push(`/dashboard/quotes/${quote.id}`)}>
                                    <Eye className="mr-2 h-4 w-4" />
                                    Veure
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => router.push(`/dashboard/quotes/edit/${quote.id}`)}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Editar
                                </Button>
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={() => handleDuplicateQuote(quote)}
                                    disabled={isDuplicating === quote.id}
                                >
                                    {isDuplicating === quote.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
                                    Duplicar
                                </Button>
                                <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="destructive" size="icon">
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                    <AlertDialogTitle>Estàs segur?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Aquesta acció no es pot desfer. Això eliminarà el pressupost <strong>#{quote.quoteNumber}</strong> de l'historial.
                                    </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel·lar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteQuote(quote.id, quote.quoteNumber)} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        </TableCell>
                        </TableRow>
                    )) : (
                        <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center">
                            No s'ha generat cap pressupost encara.
                        </TableCell>
                        </TableRow>
                    )}
                    </TableBody>
                </Table>
            </div>
            </CardContent>
        </Card>
        </div>
    </AdminGate>
  )
}
