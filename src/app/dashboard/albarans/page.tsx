
'use client'

import { useMemo, useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useCollection, useUser, useFirestore, useMemoFirebase, deleteDocumentNonBlocking } from '@/firebase'
import { collection, query, orderBy, doc, getDocs, collectionGroup, writeBatch } from 'firebase/firestore'
import type { Albaran, ServiceRecord, Employee } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Eye, FileArchive, Trash2, RefreshCw, Loader2, CreditCard, ArrowRight, Clock, CheckCircle2, AlertTriangle } from 'lucide-react'
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
import { calculateTotalAmount } from '@/lib/calculations'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from 'next/link'

export default function AlbaransHistoryPage() {
  const router = useRouter()
  const { user, isUserLoading } = useUser()
  const firestore = useFirestore()
  const { toast } = useToast()
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/')
    }
  }, [isUserLoading, user, router])

  const albaransQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null
    return query(collection(firestore, 'albarans'), orderBy('albaranNumber', 'desc'))
  }, [firestore, user])

  const { data: albarans, isLoading: isLoadingAlbarans } = useCollection<Albaran>(albaransQuery)
  
  const employeesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'employees')) : null, [firestore]);
  const { data: employees, isLoading: isLoadingEmployees } = useCollection<Employee>(employeesQuery);

  const pendingAlbarans = useMemo(() => {
    return albarans?.filter(a => a.status === 'pendent') || [];
  }, [albarans]);

  const historyAlbarans = useMemo(() => {
    return albarans?.filter(a => a.status === 'facturat') || [];
  }, [albarans]);

  // Funció per actualitzar els totals dels albarans pendents si els serveis han canviat
  const syncPendingAlbarans = useCallback(async () => {
    if (!firestore || !pendingAlbarans.length || !employees || isUpdating) return;

    setIsUpdating(true);
    try {
      const allServicesSnapshot = await getDocs(collectionGroup(firestore, 'serviceRecords'));
      const allServicesData = allServicesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ServiceRecord));
      
      const batch = writeBatch(firestore);
      let updatedCount = 0;

      for (const albaran of pendingAlbarans) {
        const associatedServices = allServicesData.filter(service => albaran.serviceRecordIds.includes(service.id));
        const { totalGeneral: newTotalAmount } = calculateTotalAmount(associatedServices, employees);

        // Si el total ha canviat (amb marge d'error de decimals), actualitzem el document
        if (Math.abs(newTotalAmount - albaran.totalAmount) > 0.01) {
            const albaranRef = doc(firestore, 'albarans', albaran.id);
            batch.update(albaranRef, { totalAmount: newTotalAmount });
            updatedCount++;
        }
      }

      if (updatedCount > 0) {
        await batch.commit();
        toast({
          title: 'Totals Actualitzats',
          description: `S'han actualitzat ${updatedCount} albarans pendents amb els canvis dels serveis.`,
        });
      }
    } catch (error) {
      console.error("Error sincronitzant albarans:", error);
    } finally {
      setIsUpdating(false);
    }
  }, [firestore, pendingAlbarans, employees, toast, isUpdating]);

  // Sincronització automàtica en carregar
  useEffect(() => {
    if (pendingAlbarans.length > 0 && employees) {
        syncPendingAlbarans();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employees]); 

  const handleDeleteAlbaran = (albaranId: string, albaranNumber: number) => {
    if (!firestore) return;
    const albaranDocRef = doc(firestore, 'albarans', albaranId);
    
    deleteDocumentNonBlocking(albaranDocRef);
    
    toast({
      title: 'Albarà Eliminat',
      description: `L'albarà #${albaranNumber} ha estat eliminat correctament.`,
    });
  };

  if (isUserLoading || isLoadingAlbarans || isLoadingEmployees) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse">Carregant gestió d'albarans...</p>
      </div>
    )
  }

  return (
    <AdminGate pageTitle="Gestió d'Albarans" pageDescription="Consulta els albarans pendents i l'historial complet.">
      <div className="max-w-full mx-auto space-y-6">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h1 className="text-3xl font-black tracking-tighter flex items-center gap-2">
                <FileArchive className="h-8 w-8 text-primary" />
                GESTIÓ D'ALBARANS
            </h1>
            <Button onClick={syncPendingAlbarans} disabled={isUpdating} variant="outline" size="sm" className="bg-white">
              {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Actualitzar Dades
            </Button>
        </div>

        <Tabs defaultValue="pendents" className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-md mb-6">
            <TabsTrigger value="pendents" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Pendents de Facturar
                {pendingAlbarans.length > 0 && (
                    <Badge variant="destructive" className="ml-1 px-1.5 py-0 h-5 min-w-5 flex items-center justify-center rounded-full text-[10px]">
                        {pendingAlbarans.length}
                    </Badge>
                )}
            </TabsTrigger>
            <TabsTrigger value="historial" className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Historial Facturats
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pendents" className="space-y-4">
            <Card className="border-primary/20 bg-primary/5 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-xl flex items-center gap-2 text-primary">
                    <Clock className="h-5 w-5" /> Documents Pendents
                </CardTitle>
                <CardDescription>
                    Si edites un registre de servei, l'albarà s'actualitzarà automàticament aquí.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {pendingAlbarans.length > 0 ? (
                    <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                        <TableRow className="hover:bg-transparent border-primary/10">
                            <TableHead className="font-bold text-primary">Nº Albarà</TableHead>
                            <TableHead className="font-bold text-primary">Data</TableHead>
                            <TableHead className="font-bold text-primary">Client</TableHead>
                            <TableHead className="font-bold text-primary">Obra</TableHead>
                            <TableHead className="font-bold text-primary">Total</TableHead>
                            <TableHead className="text-right font-bold text-primary">Acció</TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {pendingAlbarans.map(albaran => (
                            <TableRow key={albaran.id} className="border-primary/10 hover:bg-primary/10 transition-colors">
                            <TableCell className="font-black">#{String(albaran.albaranNumber).padStart(4, '0')}</TableCell>
                            <TableCell>{format(parseISO(albaran.createdAt), 'dd/MM/yyyy', { locale: ca })}</TableCell>
                            <TableCell className="font-semibold">{albaran.customerName}</TableCell>
                            <TableCell className="max-w-[200px] truncate">{albaran.projectName}</TableCell>
                            <TableCell className="font-black">{albaran.totalAmount.toFixed(2)} €</TableCell>
                            <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                <Button variant="outline" size="sm" asChild className="bg-white">
                                    <Link href={`/dashboard/albarans/${albaran.id}`}>
                                    <Eye className="h-4 w-4 mr-1" /> Veure
                                    </Link>
                                </Button>
                                <Button size="sm" asChild className="bg-primary hover:bg-primary/90 shadow-sm">
                                    <Link href={`/dashboard/invoices?customerId=${albaran.customerId}&albaranId=${albaran.id}`}>
                                    <CreditCard className="mr-2 h-4 w-4" /> Facturar
                                    </Link>
                                </Button>
                                </div>
                            </TableCell>
                            </TableRow>
                        ))}
                        </TableBody>
                    </Table>
                    </div>
                ) : (
                    <div className="py-12 text-center space-y-3">
                        <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                            <CheckCircle2 className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <p className="text-muted-foreground font-medium">No tens cap albarà pendent de facturar.</p>
                        <Button variant="link" asChild>
                            <Link href="/dashboard/reports">Generar nou albarà <ArrowRight className="ml-1 h-4 w-4" /></Link>
                        </Button>
                    </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="historial" className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xl text-slate-700">Historial Complet</CardTitle>
                <CardDescription>Albarans que ja han estat processats i convertits en factures.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                    <Table>
                    <TableHeader>
                        <TableRow>
                        <TableHead>Nº Albarà</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Obra</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Estat</TableHead>
                        <TableHead className="text-right">Accions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {historyAlbarans.length > 0 ? historyAlbarans.map(albaran => (
                        <TableRow key={albaran.id}>
                            <TableCell className="font-bold">#{String(albaran.albaranNumber).padStart(4, '0')}</TableCell>
                            <TableCell>{format(parseISO(albaran.createdAt), 'dd/MM/yyyy', { locale: ca })}</TableCell>
                            <TableCell className="font-medium">{albaran.customerName}</TableCell>
                            <TableCell className="max-w-[200px] truncate">{albaran.projectName}</TableCell>
                            <TableCell className="font-semibold">{albaran.totalAmount.toFixed(2)} €</TableCell>
                            <TableCell>
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                Facturat
                            </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                                <Button variant="outline" size="sm" asChild>
                                <Link href={`/dashboard/albarans/${albaran.id}`}>
                                    <Eye className="h-4 w-4" />
                                </Link>
                                </Button>
                                <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                                    <Trash2 className="h-4 w-4" />
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                    <AlertDialogTitle>Estàs segur?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Aquesta acció no es pot desfer. S'eliminarà l'albarà <strong>#{albaran.albaranNumber}</strong> de l'historial.
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
                        )) : (
                        <TableRow>
                            <TableCell colSpan={7} className="h-32 text-center text-muted-foreground italic">
                            No hi ha cap albarà facturat en el sistema.
                            </TableCell>
                        </TableRow>
                        )}
                    </TableBody>
                    </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminGate>
  )
}
