'use client'

import { useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useCollection, useUser, useFirestore, useMemoFirebase, deleteDocumentNonBlocking } from '@/firebase'
import { collection, query, orderBy, doc } from 'firebase/firestore'
import type { Invoice } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Eye, Receipt, Trash2, PlusCircle, Edit } from 'lucide-react'
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


export default function InvoicesHistoryPage() {
  const router = useRouter()
  const { user, isUserLoading } = useUser()
  const firestore = useFirestore()
  const { toast } = useToast()

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/')
    }
  }, [isUserLoading, user, router])

  const invoicesQuery = useMemoFirebase(() => {
    if (!firestore) return null
    return query(collection(firestore, 'invoices'), orderBy('invoiceNumber', 'desc'))
  }, [firestore])

  const { data: invoices, isLoading: isLoadingInvoices } = useCollection<Invoice>(invoicesQuery)

  const handleDeleteInvoice = (invoiceId: string, invoiceNumber: number) => {
    if (!firestore) return;
    const invoiceDocRef = doc(firestore, 'invoices', invoiceId);
    
    deleteDocumentNonBlocking(invoiceDocRef);
    
    toast({
      title: 'Factura Eliminada',
      description: `La factura #${invoiceNumber} ha estat eliminada de l'historial.`,
    });
  };

  if (isUserLoading || isLoadingInvoices) {
    return <p>Carregant historial de factures...</p>
  }

  if (!user) {
    return null
  }

  return (
    <AdminGate pageTitle="Historial de Factures" pageDescription="Aquesta secció està protegida.">
        <div className="max-w-6xl mx-auto">
        <Card>
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
                <Receipt className="h-8 w-8" />
                <div>
                    <CardTitle>Historial de Factures</CardTitle>
                    <CardDescription>Consulta totes les factures que s'han generat.</CardDescription>
                </div>
            </div>
             <Button onClick={() => router.push('/dashboard/invoices')}>
                <PlusCircle className="mr-2 h-4 w-4" /> Nova Factura
            </Button>
            </CardHeader>
            <CardContent>
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead>Nº Factura</TableHead>
                        <TableHead>Data Creació</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Obra</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead className="text-right">Accions</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {invoices && invoices.length > 0 ? invoices.map(invoice => (
                        <TableRow key={invoice.id}>
                        <TableCell className="font-bold">#{String(invoice.invoiceNumber).padStart(4, '0')}</TableCell>
                        <TableCell>{format(parseISO(invoice.createdAt), 'dd/MM/yyyy HH:mm', { locale: ca })}</TableCell>
                        <TableCell>{invoice.customerName}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{invoice.projectName}</TableCell>
                        <TableCell>{invoice.totalAmount.toFixed(2)} €</TableCell>
                        <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                                {/* The detail page is not implemented yet, so this button is commented out.
                                <Button variant="outline" size="sm" onClick={() => router.push(`/dashboard/invoices/${invoice.id}`)}>
                                    <Eye className="mr-2 h-4 w-4" />
                                    Veure
                                </Button>
                                */}
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
                                        Aquesta acció no es pot desfer. Això eliminarà la factura <strong>#{invoice.invoiceNumber}</strong> de l'historial.
                                    </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel·lar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteInvoice(invoice.id, invoice.invoiceNumber)} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        </TableCell>
                        </TableRow>
                    )) : (
                        <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center">
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
