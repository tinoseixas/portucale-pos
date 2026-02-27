'use client'

import { useMemo, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCollection, useUser, useFirestore, useMemoFirebase, deleteDocumentNonBlocking } from '@/firebase'
import { collection, query, orderBy, doc, getDocs, collectionGroup, setDoc, runTransaction, where, writeBatch } from 'firebase/firestore'
import type { Albaran, ServiceRecord, Employee } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Eye, FileArchive, CreditCard, Clock, CheckCircle2, Loader2, Trash2, Users, RefreshCw, Briefcase, AlertCircle } from 'lucide-react'
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
import { calculateTotalAmount } from '@/lib/calculations'

export default function AlbaransHistoryPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { user, isUserLoading } = useUser()
  const firestore = useFirestore()
  const [isSyncing, setIsSyncing] = useState(false)

  // Consulta tots els albarans
  const albaransQuery = useMemoFirebase(() => {
    if (!firestore) return null
    return query(collection(firestore, 'albarans'), orderBy('albaranNumber', 'desc'))
  }, [firestore])

  const { data: albarans, isLoading: isLoadingAlbarans } = useCollection<Albaran>(albaransQuery)

  // Filtres per pestanyes
  const pendingAlbarans = useMemo(() => albarans?.filter(a => a.status === 'pendent') || [], [albarans]);
  const historyAlbarans = useMemo(() => albarans?.filter(a => a.status === 'facturat') || [], [albarans]);

  const handleDeleteAlbaran = (albaranId: string, albaranNumber: number) => {
    if (!firestore) return;
    const albaranRef = doc(firestore, 'albarans', albaranId);
    deleteDocumentNonBlocking(albaranRef);
    toast({ 
        title: 'Albarà Eliminat', 
        description: `L'albarà #${albaranNumber} ha estat esborrat de la llista.` 
    });
  }

  const handleSyncAlbarans = async () => {
    if (!firestore) return;
    setIsSyncing(true);
    toast({ title: 'Consolidant dades...', description: 'Agrupant serveis de tota l\'equip per obra.' });

    try {
        const employeesSnap = await getDocs(collection(firestore, 'employees'));
        const employees = employeesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Employee));
        
        const servicesSnap = await getDocs(collectionGroup(firestore, 'serviceRecords'));
        const allServices = servicesSnap.docs.map(d => ({ id: d.id, ...d.data() } as ServiceRecord));
        
        // Identificar serveis que ja estan en albarans FACTURATS
        const invoicedServiceIds = new Set(historyAlbarans.flatMap(a => a.serviceRecordIds));
        
        // Serveis realment pendents (no facturats, no buits, amb client i obra)
        const pendingServices = allServices.filter(s => 
            !invoicedServiceIds.has(s.id) && 
            s.description !== "Servei en curs..." &&
            s.customerId && s.projectName
        );

        if (pendingServices.length === 0 && pendingAlbarans.length === 0) {
            toast({ title: 'Tot al dia', description: 'No hi ha serveis nous per consolidar.' });
            setIsSyncing(false);
            return;
        }

        // Agrupar serveis per Client + Obra
        const groupedByProject: Record<string, ServiceRecord[]> = {};
        pendingServices.forEach(s => {
            const key = `${s.customerId}_${s.projectName.trim().toLowerCase()}`;
            if (!groupedByProject[key]) groupedByProject[key] = [];
            groupedByProject[key].push(s);
        });

        const batch = writeBatch(firestore);
        
        // Obtenir últim número d'albarà
        const counterRef = doc(firestore, "counters", "albarans");
        const counterSnap = await getDocs(query(collection(firestore, "counters"), where("__name__", "==", "albarans")));
        let nextNum = !counterSnap.empty ? counterSnap.docs[0].data().lastNumber : 0;

        // Esborrar albarans PENDENTS actuals per regenerar-los sense duplicats
        pendingAlbarans.forEach(a => {
            batch.delete(doc(firestore, 'albarans', a.id));
        });

        let createdCount = 0;
        for (const key in groupedByProject) {
            const projectServices = groupedByProject[key];
            const firstService = projectServices[0];
            nextNum++;
            
            const { totalGeneral } = calculateTotalAmount(projectServices, employees);
            const technicianNames = Array.from(new Set(projectServices.map(s => s.employeeName || 'N/A'))).join(', ');

            const albaranId = `alb_sync_${key}`; 
            const albaranData: Albaran = {
                id: albaranId,
                albaranNumber: nextNum,
                createdAt: new Date().toISOString(),
                customerId: firstService.customerId || '',
                customerName: firstService.customerName || 'N/A',
                projectName: firstService.projectName,
                serviceRecordIds: projectServices.map(s => s.id),
                totalAmount: totalGeneral,
                status: 'pendent',
                employeeName: technicianNames
            };

            batch.set(doc(firestore, 'albarans', albaranId), albaranData);
            createdCount++;
        }

        batch.set(counterRef, { lastNumber: nextNum }, { merge: true });
        await batch.commit();

        toast({ 
            title: 'Sincronització completada', 
            description: `S'han consolidat ${createdCount} albarans d'obra pendents.` 
        });
    } catch (error) {
        console.error(error);
        toast({ variant: 'destructive', title: 'Error', description: 'No s\'ha pogut realitzar la consolidació.' });
    } finally {
        setIsSyncing(false);
    }
  };

  if (isUserLoading || isLoadingAlbarans) return <div className="p-12 text-center"><Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" /><p className="mt-4">Carregant documents de l'empresa...</p></div>

  return (
    <AdminGate pageTitle="Gestió d'Albarans" pageDescription="Supervisió i facturació agrupada per projecte.">
      <div className="max-w-full mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h1 className="text-3xl font-black tracking-tighter flex items-center gap-2 uppercase">
                <FileArchive className="h-8 w-8 text-primary" /> Albarans per Obra
            </h1>
            <Button variant="default" onClick={handleSyncAlbarans} disabled={isSyncing} className="w-full sm:w-auto bg-primary hover:bg-primary/90 shadow-lg">
                {isSyncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                Actualitzar Albarans de l'Equip
            </Button>
        </div>

        <Tabs defaultValue="pendents" className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-md mb-6 bg-slate-100 p-1">
            <TabsTrigger value="pendents" className="font-bold gap-2 data-[state=active]:bg-white">
                <Clock className="h-4 w-4" /> Pendents {pendingAlbarans.length > 0 && <Badge variant="destructive" className="ml-1">{pendingAlbarans.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="historial" className="font-bold gap-2 data-[state=active]:bg-white">
                <CheckCircle2 className="h-4 w-4" /> Facturats
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pendents">
            <Card className="border-primary/20 shadow-md">
              <CardHeader className="bg-primary/5">
                <CardTitle className="text-primary flex items-center gap-2">Treballs Pendents de Facturar</CardTitle>
                <CardDescription>Agrupació de tots els serveis realitzats per l'equip que encara no s'han cobrat.</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nº Albarà</TableHead>
                                <TableHead>Obra / Projecte</TableHead>
                                <TableHead>Client</TableHead>
                                <TableHead>Equip</TableHead>
                                <TableHead>Total Estimant</TableHead>
                                <TableHead className="text-right">Accions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                        {pendingAlbarans.map(albaran => (
                            <TableRow key={albaran.id} className="hover:bg-slate-50 transition-colors">
                                <TableCell className="font-black">#{String(albaran.albaranNumber).padStart(4, '0')}</TableCell>
                                <TableCell className="font-bold text-primary">
                                    <div className="flex items-center gap-2">
                                        <Briefcase className="h-4 w-4 shrink-0" /> 
                                        {albaran.projectName}
                                    </div>
                                </TableCell>
                                <TableCell className="font-medium">{albaran.customerName}</TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground italic max-w-[180px] truncate">
                                        <Users className="h-3 w-3 shrink-0" /> {albaran.employeeName}
                                    </div>
                                </TableCell>
                                <TableCell className="font-black text-lg text-slate-900">{albaran.totalAmount.toFixed(2)} €</TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end gap-2">
                                        <Button variant="outline" size="sm" asChild className="h-8">
                                            <Link href={`/dashboard/albarans/${albaran.id}`}>
                                                <Eye className="h-4 w-4 mr-1" /> Veure
                                            </Link>
                                        </Button>
                                        <Button size="sm" asChild className="bg-primary hover:bg-primary/90 h-8 shadow-sm">
                                            <Link href={`/dashboard/invoices?customerId=${albaran.customerId}&albaranId=${albaran.id}`}>
                                                <CreditCard className="mr-2 h-4 w-4" /> Facturar
                                            </Link>
                                        </Button>
                                        
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10">
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Vols eliminar aquest albarà?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        Això només esborra el document de l'albarà per permetre reagrupar els serveis de nou. 
                                                        Els registres de treball dels tècnics **no s'esborraran**.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel·lar</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleDeleteAlbaran(albaran.id, albaran.albaranNumber)} className="bg-destructive hover:bg-destructive/90">Eliminar Document</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                        {pendingAlbarans.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6} className="h-48 text-center">
                                    <div className="flex flex-col items-center justify-center text-muted-foreground space-y-2">
                                        <AlertCircle className="h-8 w-8 opacity-20" />
                                        <p className="italic">No hi ha treballs pendents de facturar.</p>
                                        <p className="text-xs">Prem el botó "Actualitzar Albarans" si has creat serveis nous.</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        )}
                        </TableBody>
                    </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="historial">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">Documents d'Obra Facturats</CardTitle>
                <CardDescription>Consulta els albarans que ja han estat convertits en factures oficials.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nº Albarà</TableHead>
                                <TableHead>Obra</TableHead>
                                <TableHead>Client</TableHead>
                                <TableHead>Total Facturat</TableHead>
                                <TableHead className="text-right">Accions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {historyAlbarans.map(albaran => (
                                <TableRow key={albaran.id} className="opacity-80">
                                    <TableCell className="font-bold">#{String(albaran.albaranNumber).padStart(4, '0')}</TableCell>
                                    <TableCell className="font-medium">{albaran.projectName}</TableCell>
                                    <TableCell>{albaran.customerName}</TableCell>
                                    <TableCell className="font-bold">{albaran.totalAmount.toFixed(2)} €</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="outline" size="sm" asChild className="h-8">
                                                <Link href={`/dashboard/albarans/${albaran.id}`}>
                                                    <Eye className="h-4 w-4" />
                                                </Link>
                                            </Button>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive opacity-20 hover:opacity-100">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Eliminar del historial?</AlertDialogTitle>
                                                        <AlertDialogDescription>Aquesta acció esborrarà l'albarà facturat. No recomanem esborrar documents ja processats fiscalment.</AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Enrere</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleDeleteAlbaran(albaran.id, albaran.albaranNumber)} className="bg-destructive">Eliminar definitivament</AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {historyAlbarans.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground italic">Encara no s'ha facturat cap albarà.</TableCell>
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
