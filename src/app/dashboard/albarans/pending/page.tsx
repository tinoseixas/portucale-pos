
'use client'

import { useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useCollection, useUser, useFirestore, useMemoFirebase, useDoc } from '@/firebase'
import { collection, query, orderBy, where, doc } from 'firebase/firestore'
import type { Albaran } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Receipt, ArrowLeft, Loader2, CreditCard } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ca } from 'date-fns/locale'
import { AdminGate } from '@/components/AdminGate'
import Link from 'next/link'

export default function PendingAlbaransPage() {
  const router = useRouter()
  const { user, isUserLoading } = useUser()
  const firestore = useFirestore()

  const albaransQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null
    return query(
        collection(firestore, 'albarans'), 
        where('status', '==', 'pendent'),
        orderBy('albaranNumber', 'desc')
    )
  }, [firestore, user])

  const { data: albarans, isLoading: isLoadingAlbarans } = useCollection<Albaran>(albaransQuery)

  if (isUserLoading || isLoadingAlbarans) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-3">Carregant albarans pendents...</span>
      </div>
    )
  }

  return (
    <AdminGate pageTitle="Albarans Pendents" pageDescription="Llista de documents pendents de facturar.">
      <div className="space-y-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => router.push('/dashboard')} className="-ml-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Tornar al Dashboard
          </Button>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center gap-4">
            <div className="bg-primary/10 p-3 rounded-full">
              <Receipt className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle>Albarans Pendents de Facturar</CardTitle>
              <CardDescription>Aquests albarans han estat generats però encara no tenen una factura associada.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nº Albarà</TableHead>
                    <TableHead>Data Creació</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Obra</TableHead>
                    <TableHead>Import</TableHead>
                    <TableHead className="text-right">Acció</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {albarans && albarans.length > 0 ? albarans.map(albaran => (
                    <TableRow key={albaran.id}>
                      <TableCell className="font-bold">#{String(albaran.albaranNumber).padStart(4, '0')}</TableCell>
                      <TableCell>{format(parseISO(albaran.createdAt), 'dd/MM/yyyy', { locale: ca })}</TableCell>
                      <TableCell className="font-medium">{albaran.customerName}</TableCell>
                      <TableCell>{albaran.projectName}</TableCell>
                      <TableCell className="font-semibold">{albaran.totalAmount.toFixed(2)} €</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" asChild className="bg-primary hover:bg-primary/90">
                          <Link href={`/dashboard/invoices?customerId=${albaran.customerId}&albaranId=${albaran.id}`}>
                            <CreditCard className="mr-2 h-4 w-4" /> Facturar
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                        No hi ha albarans pendents de facturar. Bona feina!
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
