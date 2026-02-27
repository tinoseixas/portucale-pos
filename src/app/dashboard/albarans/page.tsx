
'use client'

import { useMemo, useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useCollection, useUser, useFirestore, useMemoFirebase, deleteDocumentNonBlocking } from '@/firebase'
import { collection, query, orderBy, doc, getDocs, collectionGroup, writeBatch, deleteDoc } from 'firebase/firestore'
import type { Albaran, ServiceRecord, Employee } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Eye, FileArchive, Trash2, RefreshCw, Loader2, CreditCard, ArrowRight, Clock, CheckCircle2, AlertTriangle, Eraser } from 'lucide-react'
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
  const [isCleaning, setIsCleaning] = useState(false)

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

  // Funció per netejar duplicats (deixa només el més recent per cada obra/client)
  const handleCleanupDuplicates = async () => {
    if (!firestore || !pendingAlbarans.length) return;
    setIsCleaning(true);
    
    try {
        const seen = new Set<string>();
        const toDelete: string[] = [];
        
        // Com que el query ja està ordenat per número descendent, els primers que veiem són els més recents
        pendingAlbarans.forEach(alb => {
            const key = `${alb.customerId}-${alb.projectName.toLowerCase().trim()}`;
            if (seen.has(key)) {
                toDelete.push(alb.id);
            } else {
                seen.add(key);
            }
        });

        if (toDelete.length > 0) {
            const batch = writeBatch(firestore);
            toDelete.forEach(id => {
                batch.delete(doc(firestore, 'albarans', id));
            });
            await batch.commit();
            toast({
                title: "Neteja Completada",
                description: `S'han eliminat ${toDelete.length} albarans duplicats de l'historial.`,
            });
        } else {
            toast({ title: "Historial net", description: "No s'han trobat albarans duplicats." });
        }
    } catch (error) {
        console.error("Error netejant albarans:", error);
        toast({ variant: 'destructive', title: "Error", description: "No s'ha pogut completar la neteja." });
    } finally {
        setIsCleaning(false);
    }
  };

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
          description: `S'han actualitzat ${updatedCount} albarans amb els nous preus.`,
        });
      }
    } catch (error) {
      console.error("Error sincronitzant albarans:", error);
    } finally {
      setIsUpdating(false);
    }
  }, [firestore, pendingAlbarans, employees, toast, isUpdating]);

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
    toast({ title: 'Albarà Eliminat', description: `L'albarà #${albaranNumber} ha estat eliminat.` });
  };

  if (isUserLoading || isLoadingAlbarans || isLoadingEmployees) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse font-bold uppercase tracking-tighter">Preparant gestió d'albarans...</p>
      </div>
    )
  }

  return (
    <AdminGate pageTitle="Gestió d'Albarans" pageDescription="Controla els duplicats i gestiona la facturació.">
      <div className="max-w-full mx-auto space-y-6">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h1 className="text-3xl font-black tracking-tighter flex items-center gap-2">
                <FileArchive className="h-8 w-8 text-primary" />
                GESTIÓ D'ALBARANS
            </h1>
            <div className="flex items-center gap-2">
                <Button onClick={handleCleanupDuplicates} disabled={isCleaning || !pendingAlbarans.length} variant="outline" size="sm" className="bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200">
                    {isCleaning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Eraser className="mr-2 h-4 w-4" />}
                    Netejar Duplicats
                </Button>
                <Button onClick={syncPendingAlbarans} disabled={isUpdating} variant="outline" size="sm" className="bg-white">
                    {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                    Actualitzar Dades
                </Button>
            </div>
        </div>

        <Tabs defaultValue="pendents" className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-md mb-6">
            <TabsTrigger value="pendents" className="flex items-center gap-2 font-bold">
                <Clock className="h-4 w-4" />
                Pendents
                {pendingAlbarans.length > 0 && (
                    <Badge variant="destructive" className="ml-1 px-1.5 py-0 h-5 min-w-5 flex items-center justify-center rounded-full text-[10px]">
                        {pendingAlbarans.length}
                    </Badge>
                )}
            </TabsTrigger>
            <TabsTrigger value="historial" className="flex items-center gap-2 font-bold">
                <CheckCircle2 className="h-4 w-4" />
                Historial
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pendents" className="space-y-4">
            <Card className="border-primary/20 bg-primary/5 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-xl flex items-center gap-2 text-primary">
                    <Clock className="h-5 w-5" /> Albarans Pendents de Facturar
                </CardTitle>
                <CardDescription>
                    Si l'obra ja apareix aquí, utilitza el botó "Veure" per comprovar-ne els canvis.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {pendingAlbarans.length > 0 ? (
                    <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                        <TableRow className="hover:bg-transparent border-primary/10">
                            <TableHead className="font-bold text-primary uppercase text-xs">Nº Albarà</TableHead>
                            <TableHead className="font-bold text-primary uppercase text-xs">Data</TableHead>
                            <TableHead className="font-bold text-primary uppercase text-xs">Client</TableHead>
                            <TableHead className="font-bold text-primary uppercase text-xs">Obra</TableHead>
                            <TableHead className="font-bold text-primary uppercase text-xs">Total</TableHead>
                            <TableHead className="text-right font-bold text-primary uppercase text-xs">Acció</TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {pendingAlbarans.map(albaran => (
                            <TableRow key={albaran.id} className="border-primary/10 hover:bg-primary/10 transition-colors">
                            <TableCell className="font-black">#{String(albaran.albaranNumber).padStart(4, '0')}</TableCell>
                            <TableCell className="text-xs">{format(parseISO(albaran.createdAt), 'dd/MM/yyyy', { locale: ca })}</TableCell>
                            <TableCell className="font-bold text-slate-700">{albaran.customerName}</TableCell>
                            <TableCell className="max-w-[200px] truncate italic">{albaran.projectName}</TableCell>
                            <TableCell className="font-black text-primary">{albaran.totalAmount.toFixed(2)} €</TableCell>
                            <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                <Button variant="outline" size="sm" asChild className="bg-white">
                                    <Link href={`/dashboard/albarans/${albaran.id}`}>
                                    <Eye className="h-4 w-4 mr-1" /> Veure
                                    </Link>
                                </Button>
                                <Button size="sm" asChild className="bg-primary hover:bg-primary/90 shadow-md">
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
                        <p className="text-muted-foreground font-medium">Tot al dia! No tens cap albarà pendent.</p>
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
                <CardTitle className="text-xl text-slate-700">Documents Processats</CardTitle>
                <CardDescription>Albarans que ja han estat convertits en factures finals.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                    <Table>
                    <TableHeader>
                        <TableRow>
                        <TableHead className="uppercase text-xs font-bold">Nº Albarà</TableHead>
                        <TableHead className="uppercase text-xs font-bold">Data</TableHead>
                        <TableHead className="uppercase text-xs font-bold">Client</TableHead>
                        <TableHead className="uppercase text-xs font-bold">Obra</TableHead>
                        <TableHead className="uppercase text-xs font-bold">Total</TableHead>
                        <TableHead className="uppercase text-xs font-bold">Estat</TableHead>
                        <TableHead className="text-right uppercase text-xs font-bold">Accions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {historyAlbarans.length > 0 ? historyAlbarans.map(albaran => (
                        <TableRow key={albaran.id}>
                            <TableCell className="font-bold">#{String(albaran.albaranNumber).padStart(4, '0')}</TableCell>
                            <TableCell className="text-xs">{format(parseISO(albaran.createdAt), 'dd/MM/yyyy', { locale: ca })}</TableCell>
                            <TableCell className="font-medium">{albaran.customerName}</TableCell>
                            <TableCell className="max-w-[200px] truncate italic">{albaran.projectName}</TableCell>
                            <TableCell className="font-semibold">{albaran.totalAmount.toFixed(2)} €</TableCell>
                            <TableCell>
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 uppercase text-[10px] font-black">
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
                                    <AlertDialogTitle>Confirmar eliminació</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Vols eliminar l'albarà <strong>#{albaran.albaranNumber}</strong>? Aquesta acció no es pot desfer.
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
                            No hi ha cap document facturat encara.
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
