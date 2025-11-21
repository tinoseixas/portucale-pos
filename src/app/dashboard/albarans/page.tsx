'use client'

import { useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useCollection, useUser, useFirestore, useMemoFirebase } from '@/firebase'
import { collection, query, orderBy } from 'firebase/firestore'
import type { Albaran } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Eye, FileArchive } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ca } from 'date-fns/locale'

export default function AlbaransHistoryPage() {
  const router = useRouter()
  const { user, isUserLoading } = useUser()
  const firestore = useFirestore()

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/')
    }
  }, [isUserLoading, user, router])

  const albaransQuery = useMemoFirebase(() => {
    if (!firestore) return null
    return query(collection(firestore, 'albarans'), orderBy('albaranNumber', 'desc'))
  }, [firestore])

  const { data: albarans, isLoading: isLoadingAlbarans } = useCollection<Albaran>(albaransQuery)

  if (isUserLoading || isLoadingAlbarans) {
    return <p>Carregant historial...</p>
  }

  if (!user) {
    return null
  }

  return (
    <div className="max-w-6xl mx-auto">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
             <FileArchive className="h-8 w-8" />
             <div>
                <CardTitle>Historial d'Albarans</CardTitle>
                <CardDescription>Consulta tots els albarans que s'han generat.</CardDescription>
             </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nº Albarà</TableHead>
                <TableHead>Data Creació</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Obra</TableHead>
                <TableHead>Total</TableHead>
                <TableHead className="text-right">Accions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {albarans && albarans.length > 0 ? albarans.map(albaran => (
                <TableRow key={albaran.id}>
                  <TableCell className="font-bold">#{String(albaran.albaranNumber).padStart(4, '0')}</TableCell>
                  <TableCell>{format(parseISO(albaran.createdAt), 'dd/MM/yyyy HH:mm', { locale: ca })}</TableCell>
                  <TableCell>{albaran.customerName}</TableCell>
                  <TableCell>{albaran.projectName}</TableCell>
                  <TableCell>{albaran.totalAmount.toFixed(2)} €</TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" onClick={() => router.push(`/dashboard/albarans/${albaran.id}`)}>
                      <Eye className="mr-2 h-4 w-4" />
                      Veure
                    </Button>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    No s'ha generat cap albarà encara.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
