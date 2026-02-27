
'use client'

import { useMemo, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCollection, useUser, useFirestore, useMemoFirebase, deleteDocumentNonBlocking } from '@/firebase'
import { collection, query, orderBy, doc, getDocs, collectionGroup, setDoc, runTransaction, where, writeBatch } from 'firebase/firestore'
import type { Albaran, ServiceRecord, Employee } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Eye, FileArchive, CreditCard, Clock, CheckCircle2, Loader2, Trash2, Users, RefreshCw, Briefcase } from 'lucide-react'
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

  const albaransQuery = useMemoFirebase(() => {
    if (!firestore) return null
    return query(collection(firestore, 'albarans'))
  }, [firestore])

  const { data: albarans, isLoading: isLoadingAlbarans } = useCollection<Albaran>(albaransQuery)

  const sortedAlbarans = useMemo(() => {
    if (!albarans) return [];
    return [...albarans].sort((a, b) => (b.albaranNumber || 0) - (a.albaranNumber || 0));
  }, [albarans]);

  const pendingAlbarans = useMemo(() => sortedAlbarans.filter(a => a.status === 'pendent'), [sortedAlbarans]);
  const historyAlbarans = useMemo(() => sortedAlbarans.filter(a => a.status === 'facturat'), [sortedAlbarans]);

  const handleDeleteAlbaran = (albaranId: string, albaranNumber: number) => {
    if (!firestore) return;
    const albaranRef = doc(firestore, 'albarans', albaranId);
    deleteDocumentNonBlocking(albaranRef);
    toast({ 
        title: 'Albarà Eliminat', 
        description: `L'albarà #${albaranNumber} ha estat esborrat.` 
    });
  }

  // EINA DE CONSOLIDACIÓ PER OBRA
  const handleSyncAlbarans = async () => {
    if (!firestore) return;
    setIsSyncing(true);
    toast({ title: 'Consolidant dades...', description: 'Agrupant serveis de tota l\'equip per obra.' });

    try {
        const employeesSnap = await getDocs(collection(firestore, 'employees'));
        const employees = employeesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Employee));
        
        const servicesSnap = await getDocs(collectionGroup(firestore, 'serviceRecords'));
        const allServices = servicesSnap.docs.map(d => ({ id: d.id, ...d.data() } as ServiceRecord));
        
        // Obtenir IDs de serveis que ja estan en albarans facturats
        const invoicedServiceIds = new Set(historyAlbarans.flatMap(a => a.serviceRecordIds));
        
        // Serveis pendents de facturar
        const pendingServices = allServices.filter(s => 
            !invoicedServiceIds.has(s.id) && 
            s.description !== "Servei en curs..." &&
            s.customerId && s.projectName
        );

        // Agrupar serveis per Client + Obra
        const groupedByProject: Record<string, ServiceRecord[]> = {};
        pendingServices.forEach(s => {
            const key = `${s.customerId}_${s.projectName.trim().toLowerCase()}`;
            if (!groupedByProject[key]) groupedByProject[key] = [];
            groupedByProject[key].push(s);
        });

        const batch = writeBatch(firestore);
        const counterRef = doc(firestore, "counters", "albarans");
        const counterDoc = await getDocs(query(collection(firestore, "counters"), where("__name__", "==", "albarans")));
        let nextNum = !counterDoc.empty ? counterDoc.docs[0].data().lastNumber : 0;

        // Eliminar albarans pendents antics per evitar duplicats abans de la nova consolidació
        pendingAlbarans.forEach(a => {
            batch.delete(doc(firestore, 'albarans', a.id));
        });

        let createdCount = 0;
        for (const key in groupedByProject) {
            const projectServices = groupedByProject[key];
            const firstService = projectServices[0];
            nextNum++;
            
            const { totalGeneral } = calculateTotalAmount(projectServices, employees);
            
            // Llista de tècnics únics
            const technicianNames = Array.from(new Set(projectServices.map(s => s.employeeName || 'N/A'))).join(', ');

            const albaranId = `alb_${key}`; // ID determinista per evitar duplicats per obra
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
                employeeName: technicianNames // Mostrem tots els que han treballat a l'obra
            };

            batch.set(doc(firestore, 'albarans', albaranId), albaranData);
            createdCount++;
        }

        batch.set(counterRef, { lastNumber: nextNum }, { merge: true });
        await batch.commit();

        toast({ title: 'Sincronització completada', description: `S'han generat ${createdCount} albarans agrupats per obra.` });
    } catch (error) {
        console.error(error);
        toast({ variant: 'destructive', title: 'Error', description: 'No s\'ha pogut consolidar la informació.' });
    } finally {
        setIsSyncing(false);
    }
  };

  if (isUserLoading || isLoadingAlbarans) return <div className="p-12 text-center"><Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" /><p className="mt-4">Carregant albarans de tota l'empresa...</p></div>

  return (
    <AdminGate pageTitle="Gestió d'Albarans" pageDescription="Supervisió i facturació per projecte.">
      <div className="max-w-full mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h1 className="text-3xl font-black tracking-tighter flex items-center gap-2 uppercase">
                <FileArchive className="h-8 w-8 text-primary" /> Albarans per Obra
            </h1>
            <Button variant="default" onClick={handleSyncAlbarans} disabled={isSyncing} className="w-full sm:w-auto bg-primary hover:bg-primary/90">
                {isSyncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                Actualitzar Albarans de l'Equip
            </Button>
        </div>

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
                <CardTitle className="text-primary flex items-center gap-2">Treballs Pendents de Facturar</CardTitle>
                <CardDescription>Aquí s'agrupen tots els serveis de tots els tècnics per cada obra.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nº Albarà</TableHead>
                                <TableHead>Obra / Projecte</TableHead>
                                <TableHead>Client</TableHead>
                                <TableHead>Tècnics</TableHead>
                                <TableHead>Total Obra</TableHead>
                                <TableHead className="text-right">Accions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                        {pendingAlbarans.map(albaran => (
                            <TableRow key={albaran.id} className="bg-white/50">
                                <TableCell className="font-black">#{String(albaran.albaranNumber).padStart(4, '0')}</TableCell>
                                <TableCell className="font-bold text-primary flex items-center gap-2">
                                    <Briefcase className="h-4 w-4" /> {albaran.projectName}
                                </TableCell>
                                <TableCell className="font-medium">{albaran.customerName}</TableCell>
                                <TableCell className="text-xs italic max-w-[200px] truncate">
                                    <Users className="h-3 w-3 inline mr-1" /> {albaran.employeeName}
                                </TableCell>
                                <TableCell className="font-black text-lg">{albaran.totalAmount.toFixed(2)} €</TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end gap-2">
                                        <Button variant="outline" size="sm" asChild><Link href={`/dashboard/albarans/${albaran.id}`}><Eye className="h-4 w-4 mr-1" /> Veure Detall</Link></Button>
                                        <Button size="sm" asChild className="bg-primary hover:bg-primary/90 shadow-md"><Link href={`/dashboard/invoices?customerId=${albaran.customerId}&albaranId=${albaran.id}`}><CreditCard className="mr-2 h-4 w-4" /> Facturar Obra</Link></Button>
                                        
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10">
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Eliminar Albarà?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        Aquesta acció només elimina el document de l'albarà per permetre reagrupar els serveis. Els registres de treball dels tècnics no s'esborraran.
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
                        {pendingAlbarans.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground italic">No hi ha treballs pendents. Prem el botó superior per sincronitzar si creus que n'hi ha.</TableCell>
                            </TableRow>
                        )}
                        </TableBody>
                    </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="historial">
            <Card>
              <CardHeader><CardTitle>Documents d'Obra Facturats</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nº Albarà</TableHead>
                                <TableHead>Obra</TableHead>
                                <TableHead>Client</TableHead>
                                <TableHead>Total</TableHead>
                                <TableHead className="text-right">Accions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {historyAlbarans.map(albaran => (
                                <TableRow key={albaran.id}>
                                    <TableCell className="font-bold">#{String(albaran.albaranNumber).padStart(4, '0')}</TableCell>
                                    <TableCell className="font-medium text-primary">{albaran.projectName}</TableCell>
                                    <TableCell>{albaran.customerName}</TableCell>
                                    <TableCell className="font-bold">{albaran.totalAmount.toFixed(2)} €</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="outline" size="sm" asChild><Link href={`/dashboard/albarans/${albaran.id}`}><Eye className="h-4 w-4" /></Link></Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleDeleteAlbaran(albaran.id, albaran.albaranNumber)} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
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
        </Tabs>
      </div>
    </AdminGate>
  )
}
