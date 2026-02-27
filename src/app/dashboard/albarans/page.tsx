
'use client'

import { useMemo, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCollection, useUser, useFirestore, useMemoFirebase, deleteDocumentNonBlocking } from '@/firebase'
import { collection, query, orderBy, doc } from 'firebase/firestore'
import type { Albaran } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Eye, FileArchive, CreditCard, Clock, CheckCircle2, Loader2, Trash2, User } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ca } from 'date-fns/locale'
import { AdminGate } from '@/components/AdminGate'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
import Link from 'next/link'

export default function AlbaransHistoryPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { user, isUserLoading } = useUser()
  const firestore = useFirestore()

  const albaransQuery = useMemoFirebase(() => {
    if (!firestore) return null
    return query(collection(firestore, 'albarans'), orderBy('albaranNumber', 'desc'))
  }, [firestore])

  const { data: albarans, isLoading: isLoadingAlbarans } = useCollection<Albaran>(albaransQuery)

  const pendingAlbarans = useMemo(() => albarans?.filter(a => a.status === 'pendent') || [], [albarans]);
  const historyAlbarans = useMemo(() => albarans?.filter(a => a.status === 'facturat') || [], [albarans]);

  const handleDeleteAlbaran = (albaranId: string, albaranNumber: number) => {
    if (!firestore) return;
    const albaranRef = doc(firestore, 'albarans', albaranId);
    deleteDocumentNonBlocking(albaranRef);
    toast({ 
        title: 'Albarà Eliminat', 
        description: `L'albarà #${albaranNumber} ha estat esborrat. El registre de servei no s'ha vist afectat.` 
    });
  }

  if (isUserLoading || isLoadingAlbarans) return <div className="p-12 text-center"><Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" /><p className="mt-4">Carregant albarans...</p></div>

  return (
    <AdminGate pageTitle="Gestió d'Albarans" pageDescription="Llista d'albarans generats automàticament per cada servei.">
      <div className="max-w-full mx-auto space-y-6">
        <h1 className="text-3xl font-black tracking-tighter flex items-center gap-2 uppercase">
            <FileArchive className="h-8 w-8 text-primary" /> Historial d'Albarans
        </h1>

        <Tabs defaultValue="pendents" className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-md mb-6">
            <TabsTrigger value="pendents" className="font-bold gap-2">
                <Clock className="h-4 w-4" /> Pendents {pendingAlbarans.length > 0 && <Badge variant="destructive" className="ml-1">{pendingAlbarans.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="historial" className="font-bold gap-2">
                <CheckCircle2 className="h-4 w-4" /> Facturats
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pendents">
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="text-primary flex items-center gap-2">Albarans Pendents de Facturar</CardTitle>
                <CardDescription>Supervisió de serveis realitzats per tots els tècnics.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nº Albarà</TableHead>
                                <TableHead>Data</TableHead>
                                <TableHead>Tècnic</TableHead>
                                <TableHead>Client</TableHead>
                                <TableHead>Obra</TableHead>
                                <TableHead>Total</TableHead>
                                <TableHead className="text-right">Accions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                        {pendingAlbarans.map(albaran => (
                            <TableRow key={albaran.id}>
                                <TableCell className="font-black">#{String(albaran.albaranNumber).padStart(4, '0')}</TableCell>
                                <TableCell className="text-xs">{format(parseISO(albaran.createdAt), 'dd/MM/yyyy', { locale: ca })}</TableCell>
                                <TableCell className="text-xs flex items-center gap-1"><User className="h-3 w-3" /> {albaran.employeeName || 'N/A'}</TableCell>
                                <TableCell className="font-bold">{albaran.customerName}</TableCell>
                                <TableCell className="italic">{albaran.projectName}</TableCell>
                                <TableCell className="font-black text-primary">{albaran.totalAmount.toFixed(2)} €</TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end gap-2">
                                        <Button variant="outline" size="sm" asChild><Link href={`/dashboard/albarans/${albaran.id}`}><Eye className="h-4 w-4 mr-1" /> Veure</Link></Button>
                                        <Button size="sm" asChild className="bg-primary"><Link href={`/dashboard/invoices?customerId=${albaran.customerId}&albaranId=${albaran.id}`}><CreditCard className="mr-2 h-4 w-4" /> Facturar</Link></Button>
                                        
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Eliminar Albarà?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        Aquesta acció eliminarà l'albarà <strong>#{albaran.albaranNumber}</strong>. 
                                                        El registre de treball original es mantindrà intacte.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel·lar</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleDeleteAlbaran(albaran.id, albaran.albaranNumber)} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                        </TableBody>
                    </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="historial">
            <Card>
              <CardHeader><CardTitle>Historial de Documents Facturats</CardTitle></CardHeader>
              <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nº Albarà</TableHead>
                            <TableHead>Data</TableHead>
                            <TableHead>Tècnic</TableHead>
                            <TableHead>Client</TableHead>
                            <TableHead>Total</TableHead>
                            <TableHead className="text-right">Accions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {historyAlbarans.map(albaran => (
                            <TableRow key={albaran.id}>
                                <TableCell className="font-bold">#{String(albaran.albaranNumber).padStart(4, '0')}</TableCell>
                                <TableCell>{format(parseISO(albaran.createdAt), 'dd/MM/yyyy')}</TableCell>
                                <TableCell className="text-xs">{albaran.employeeName || 'N/A'}</TableCell>
                                <TableCell>{albaran.customerName}</TableCell>
                                <TableCell>{albaran.totalAmount.toFixed(2)} €</TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end gap-2">
                                        <Button variant="outline" size="sm" asChild><Link href={`/dashboard/albarans/${albaran.id}`}><Eye className="h-4 w-4" /></Link></Button>
                                        
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Eliminar Albarà Facturat?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        Estàs segur que vols eliminar l'albarà <strong>#{albaran.albaranNumber}</strong>? 
                                                        Això no eliminarà la factura ni el servei, només aquest registre documental.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel·lar</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleDeleteAlbaran(albaran.id, albaran.albaranNumber)} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminGate>
  )
}
