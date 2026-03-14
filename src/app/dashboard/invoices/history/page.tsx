
'use client'

import { useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useCollection, useUser, useFirestore, useMemoFirebase, deleteDocumentNonBlocking, useDoc } from '@/firebase'
import { collection, query, orderBy, doc, where } from 'firebase/firestore'
import type { Invoice } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Eye, Receipt, Trash2, PlusCircle, CreditCard } from 'lucide-react'
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
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export default function InvoicesHistoryPage() {
  const router = useRouter()
  const { user, isUserLoading } = useUser()
  const firestore = useFirestore()
  const { toast } = useToast()

  const invoicesQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null
    return query(collection(firestore, 'invoices'), orderBy('invoiceNumber', 'desc'))
  }, [firestore, user])

  const { data: invoices, isLoading: isLoadingInvoices } = useCollection<Invoice>(invoicesQuery)

  const handleDeleteInvoice = (invoiceId: string, invoiceNumber: number) => {
    if (!firestore) return;
    const invoiceDocRef = doc(firestore, 'invoices', invoiceId);
    
    deleteDocumentNonBlocking(invoiceDocRef);
    
    toast({
      title: 'Factura eliminada',
      description: `La factura #${invoiceNumber} ha estat eliminada de l'historial.`,
    });
  };
  
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

  if (isUserLoading || isLoadingInvoices) {
    return <p className="p-12 text-center font-bold">Carregant historial de factures...</p>
  }

  if (!user) {
    return null
  }

  return (
    <AdminGate pageTitle="Historial de factures" pageDescription="Consulta totes les factures que s'han generat.">
        <div className="max-w-6xl mx-auto">
        <Card>
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
                <Receipt className="h-8 w-8 text-primary" />
                <div>
                    <CardTitle>Historial de factures</CardTitle>
                    <CardDescription>Gestió i control de cobraments.</CardDescription>
                </div>
            </div>
             <Button onClick={() => router.push('/dashboard/invoices')} className="font-bold">
                <PlusCircle className="mr-2 h-4 w-4" /> Nova factura
            </Button>
            </CardHeader>
            <CardContent>
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                    <TableRow className="bg-slate-50/50">
                        <TableHead className="font-bold text-xs">Nº Factura</TableHead>
                        <TableHead className="font-bold text-xs">Data creació</TableHead>
                        <TableHead className="font-bold text-xs">Client</TableHead>
                        <TableHead className="font-bold text-xs">Obra</TableHead>
                        <TableHead className="font-bold text-xs">Total</TableHead>
                        <TableHead className="font-bold text-xs">Estat</TableHead>
                        <TableHead className="text-right font-bold text-xs">Accions</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {invoices && invoices.length > 0 ? invoices.map(invoice => (
                        <TableRow key={invoice.id} className="hover:bg-slate-50">
                        <TableCell className="font-bold text-slate-900">#{String(invoice.invoiceNumber).padStart(4, '0')}</TableCell>
                        <TableCell className="text-slate-500">{format(parseISO(invoice.createdAt), 'dd/MM/yyyy', { locale: ca })}</TableCell>
                        <TableCell className="font-medium">{invoice.customerName}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{invoice.projectName}</TableCell>
                        <TableCell className="font-bold">{invoice.totalAmount.toFixed(2)} €</TableCell>
                        <TableCell>
                          <Badge variant={getStatusVariant(invoice.status)} className="font-bold">
                            {invoice.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                                <Button variant="outline" size="sm" onClick={() => router.push(`/dashboard/invoices/${invoice.id}`)} className="h-9 px-4 font-bold border-2 rounded-xl">
                                    <Eye className="mr-2 h-4 w-4" />
                                    Veure
                                </Button>
                                {invoice.status !== 'pagada' && (
                                    <Button variant="outline" size="sm" onClick={() => router.push(`/dashboard/receipts/new?invoiceId=${invoice.id}`)} className="h-9 px-4 font-bold border-2 rounded-xl border-primary/20 text-primary hover:bg-primary/5">
                                        <CreditCard className="mr-2 h-4 w-4" />
                                        Pagament
                                    </Button>
                                )}
                                <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-9 w-9 text-red-300 hover:text-red-600 rounded-xl">
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="rounded-3xl">
                                    <AlertDialogHeader>
                                    <AlertDialogTitle>Estàs segur?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Aquesta acció no es pot desfer. S'eliminarà la factura <strong>#{invoice.invoiceNumber}</strong> de l'historial.
                                    </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                    <AlertDialogCancel className="rounded-xl">Cancel·lar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteInvoice(invoice.id, invoice.invoiceNumber)} className="bg-red-600 rounded-xl font-bold">Eliminar</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        </TableCell>
                        </TableRow>
                    )) : (
                        <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center text-slate-400 italic">
                            No s'ha generat cap factura encara.
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
