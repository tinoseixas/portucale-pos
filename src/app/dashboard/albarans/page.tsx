
'use client'

import { useMemo, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCollection, useUser, useFirestore, useMemoFirebase, deleteDocumentNonBlocking } from '@/firebase'
import { collection, query, orderBy, doc, getDocs, collectionGroup, setDoc, runTransaction } from 'firebase/firestore'
import type { Albaran, ServiceRecord, Employee } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Eye, FileArchive, CreditCard, Clock, CheckCircle2, Loader2, Trash2, User, RefreshCw } from 'lucide-react'
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

  // Consulta global: sense filtres d'usuari per veure-ho tot
  const albaransQuery = useMemoFirebase(() => {
    if (!firestore) return null
    return query(collection(firestore, 'albarans'))
  }, [firestore])

  const { data: albarans, isLoading: isLoadingAlbarans } = useCollection<Albaran>(albaransQuery)

  // Ordenació manual per evitar problemes amb índexs de Firestore
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
        description: `L'albarà #${albaranNumber} ha estat esborrat de l'historial.` 
    });
  }

  // Eina per sincronitzar serveis que no tenen albarà encara (per dades d'altres usuaris)
  const handleSyncAlbarans = async () => {
    if (!firestore) return;
    setIsSyncing(true);
    toast({ title: 'Sincronitzant...', description: 'Cercant serveis sense albarà de tota l\'equip.' });

    try {
        const employeesSnap = await getDocs(collection(firestore, 'employees'));
        const employees = employeesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Employee));
        
        const servicesSnap = await getDocs(collectionGroup(firestore, 'serviceRecords'));
        const existingAlbaranIds = new Set(sortedAlbarans.map(a => a.id));
        
        let createdCount = 0;
        const counterRef = doc(firestore, "counters", "albarans");

        for (const serviceDoc of servicesSnap.docs) {
            if (!existingAlbaranIds.has(serviceDoc.id)) {
                const service = { id: serviceDoc.id, ...serviceDoc.data() } as ServiceRecord;
                
                // Només creem albarà per serveis que tenen descripció o dades
                if (service.description === "Servei en curs...") continue;

                const newNumber = await runTransaction(firestore, async (transaction) => {
                    const counterDoc = await transaction.get(counterRef);
                    const nextNum = (counterDoc.exists() ? counterDoc.data().lastNumber : 0) + 1;
                    transaction.set(counterRef, { lastNumber: nextNum }, { merge: true });
                    return nextNum;
                });

                const { totalGeneral } = calculateTotalAmount([service], employees);
                const employee = employees.find(e => e.id === service.employeeId);

                const albaranData: Albaran = {
                    id: service.id,
                    albaranNumber: newNumber,
                    createdAt: service.createdAt || new Date().toISOString(),
                    customerId: service.customerId || '',
                    customerName: service.customerName || 'N/A',
                    projectName: service.projectName || 'Sense nom',
                    serviceRecordIds: [service.id],
                    totalAmount: totalGeneral,
                    status: 'pendent',
                    employeeId: service.employeeId,
                    employeeName: employee ? `${employee.firstName} ${employee.lastName}` : service.employeeName || 'N/A'
                };

                await setDoc(doc(firestore, 'albarans', service.id), albaranData);
                createdCount++;
            }
        }

        toast({ title: 'Sincronització completada', description: `S'han generat ${createdCount} albarans nous de tota l'equip.` });
    } catch (error) {
        console.error(error);
        toast({ variant: 'destructive', title: 'Error', description: 'No s\'ha pogut completar la sincronització.' });
    } finally {
        setIsSyncing(false);
    }
  };

  if (isUserLoading || isLoadingAlbarans) return <div className="p-12 text-center"><Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" /><p className="mt-4">Carregant albarans de tota l'equip...</p></div>

  return (
    <AdminGate pageTitle="Gestió d'Albarans" pageDescription="Supervisió i facturació de tots els serveis realitzats.">
      <div className="max-w-full mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h1 className="text-3xl font-black tracking-tighter flex items-center gap-2 uppercase">
                <FileArchive className="h-8 w-8 text-primary" /> Historial d'Albarans
            </h1>
            <Button variant="outline" onClick={handleSyncAlbarans} disabled={isSyncing} className="w-full sm:w-auto">
                {isSyncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                Sincronitzar Serveis de l'Equip
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
                <CardTitle className="text-primary flex items-center gap-2">Albarans Pendents de Facturar</CardTitle>
                <CardDescription>Visualització de tota la feina pendent de tota l'empresa.</CardDescription>
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
                                <TableCell className="text-xs font-bold text-primary"><User className="h-3 w-3 inline mr-1" /> {albaran.employeeName || 'N/A'}</TableCell>
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
                                                        Aquesta acció eliminarà l'albarà <strong>#{albaran.albaranNumber}</strong> de l'historial de facturació. El registre de treball original es mantindrà intacte.
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
                                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground italic">No hi ha albarans pendents de facturar.</TableCell>
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
              <CardHeader><CardTitle>Historial de Documents Facturats</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
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
                                    <TableCell className="text-xs">{format(parseISO(albaran.createdAt), 'dd/MM/yyyy')}</TableCell>
                                    <TableCell className="text-xs font-medium"><User className="h-3 w-3 inline mr-1" /> {albaran.employeeName || 'N/A'}</TableCell>
                                    <TableCell>{albaran.customerName}</TableCell>
                                    <TableCell className="font-bold">{albaran.totalAmount.toFixed(2)} €</TableCell>
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
                                                        <AlertDialogTitle>Eliminar registre?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            Estàs segur que vols eliminar l'albarà <strong>#{albaran.albaranNumber}</strong> de l'historial?
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
        </Tabs>
      </div>
    </AdminGate>
  )
}
