
'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCollection, useUser, useFirestore, useMemoFirebase, deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase'
import { collection, query, orderBy, doc, getDocs, collectionGroup, writeBatch, where } from 'firebase/firestore'
import type { Albaran, ServiceRecord, Employee, Customer } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Eye, FileArchive, CreditCard, Clock, CheckCircle2, Loader2, Trash2, Users, RefreshCw, Briefcase, AlertCircle, Search, Filter, X, Archive, Edit } from 'lucide-react'
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
  const { toast } = useToast()
  const { isUserLoading } = useUser()
  const firestore = useFirestore()
  const [isSyncing, setIsSyncing] = useState(false)
  
  // Filtres
  const [filterCustomer, setFilterCustomer] = useState<string>('all')
  const [searchProject, setSearchProject] = useState<string>('')

  const albaransQuery = useMemoFirebase(() => {
    if (!firestore) return null
    return query(collection(firestore, 'albarans'), orderBy('albaranNumber', 'desc'))
  }, [firestore])

  const { data: albarans, isLoading: isLoadingAlbarans } = useCollection<Albaran>(albaransQuery)

  const customersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'customers'), orderBy('name', 'asc'));
  }, [firestore]);
  const { data: customers } = useCollection<Customer>(customersQuery);

  const filteredAlbarans = useMemo(() => {
    if (!albarans) return []
    return albarans.filter(a => {
      const customerMatch = filterCustomer === 'all' || a.customerId === filterCustomer
      const projectMatch = !searchProject || a.projectName.toLowerCase().includes(searchProject.toLowerCase())
      return customerMatch && projectMatch
    })
  }, [albarans, filterCustomer, searchProject])

  const pendingAlbarans = useMemo(() => filteredAlbarans.filter(a => a.status === 'pendent'), [filteredAlbarans]);
  const historyAlbarans = useMemo(() => filteredAlbarans.filter(a => a.status === 'facturat'), [filteredAlbarans]);
  const archivedAlbarans = useMemo(() => filteredAlbarans.filter(a => a.status === 'arxivat'), [filteredAlbarans]);

  const handleDeleteAlbaran = (albaranId: string, albaranNumber: number) => {
    if (!firestore) return;
    const albaranRef = doc(firestore, 'albarans', albaranId);
    deleteDocumentNonBlocking(albaranRef);
    toast({ 
        title: 'Document esborrat', 
        description: `L'albarà #${albaranNumber} s'ha eliminat de la llista.` 
    });
  }

  const handleArchiveAlbaran = (albaranId: string) => {
    if (!firestore) return;
    const albaranRef = doc(firestore, 'albarans', albaranId);
    updateDocumentNonBlocking(albaranRef, { status: 'arxivat' });
    toast({ title: 'Albarà arxivat', description: 'El document s\'ha mogut a la pestanya d\'arxiu.' });
  }

  const handleSyncAlbarans = async () => {
    if (!firestore) return;
    setIsSyncing(true);
    toast({ title: 'Agrupant serveis...', description: 'Consolidant la feina de tot l\'equip per obra.' });

    try {
        const employeesSnap = await getDocs(collection(firestore, 'employees'));
        const employees = employeesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Employee));
        
        const servicesSnap = await getDocs(collectionGroup(firestore, 'serviceRecords'));
        const allServices = servicesSnap.docs.map(d => ({ id: d.id, ...d.data() } as ServiceRecord));
        
        // Excloem serveis que ja estan en albarans FACTURATS o ARXIVATS
        const handledServiceIds = new Set(
            albarans?.filter(a => a.status === 'facturat' || a.status === 'arxivat')
                     .flatMap(a => a.serviceRecordIds) || []
        );
        
        const pendingServices = allServices.filter(s => 
            !handledServiceIds.has(s.id) && 
            s.description !== "Servei en curs..." &&
            s.customerId && s.projectName
        );

        if (pendingServices.length === 0 && albarans?.filter(a => a.status === 'pendent').length === 0) {
            toast({ title: 'Sense canvis', description: 'No hi ha nous serveis per agrupar.' });
            setIsSyncing(false);
            return;
        }

        const groupedByProject: Record<string, ServiceRecord[]> = {};
        pendingServices.forEach(s => {
            const key = `${s.customerId}_${s.projectName.trim().toLowerCase()}`.replace(/[^a-z0-9_]/gi, '_');
            if (!groupedByProject[key]) groupedByProject[key] = [];
            groupedByProject[key].push(s);
        });

        const batch = writeBatch(firestore);
        
        const counterRef = doc(firestore, "counters", "albarans");
        const counterSnap = await getDocs(query(collection(firestore, "counters"), where("__name__", "==", "albarans")));
        let nextNum = !counterSnap.empty ? counterSnap.docs[0].data().lastNumber : 0;

        // Esborrem només els pendents actuals per regenerar-los amb les noves dades
        albarans?.filter(a => a.status === 'pendent').forEach(a => {
            batch.delete(doc(firestore, 'albarans', a.id));
        });

        let createdCount = 0;
        for (const key in groupedByProject) {
            const projectServices = groupedByProject[key];
            const firstService = projectServices[0];
            nextNum++;
            
            const { totalGeneral } = calculateTotalAmount(projectServices, employees);
            const technicianNames = Array.from(new Set(projectServices.map(s => s.employeeName || 'N/A'))).join(', ');

            const albaranRef = doc(collection(firestore, 'albarans'));
            const albaranData: Albaran = {
                id: albaranRef.id,
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

            batch.set(albaranRef, albaranData);
            createdCount++;
        }

        batch.set(counterRef, { lastNumber: nextNum }, { merge: true });
        await batch.commit();

        toast({ 
            title: 'Sincronització completada', 
            description: `S'han generat ${createdCount} albarans d'obra.` 
        });
    } catch (error) {
        console.error(error);
        toast({ variant: 'destructive', title: 'Error', description: 'No s\'ha pogut realitzar l\'agrupació.' });
    } finally {
        setIsSyncing(false);
    }
  };

  const clearFilters = () => {
    setFilterCustomer('all')
    setSearchProject('')
  }

  if (isUserLoading || isLoadingAlbarans) return <div className="p-12 text-center"><Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" /><p className="mt-4">Carregant historial d'albarans...</p></div>

  return (
    <AdminGate pageTitle="Gestió d'Albarans" pageDescription="Supervisió i agrupació de treballs per projecte.">
      <div className="max-w-full mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h1 className="text-3xl font-black tracking-tighter flex items-center gap-2 uppercase">
                <FileArchive className="h-8 w-8 text-primary" /> Historial d'Albarans
            </h1>
            <Button variant="default" onClick={handleSyncAlbarans} disabled={isSyncing} className="w-full sm:w-auto bg-primary hover:bg-primary/90 shadow-lg font-bold">
                {isSyncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                Actualitzar Albarans de l'Equip
            </Button>
        </div>

        {/* Panell de Filtres */}
        <Card className="bg-slate-50 border-none shadow-inner">
            <CardContent className="p-4">
                <div className="flex flex-col md:flex-row gap-4 items-end">
                    <div className="flex-1 space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2"><Users className="h-3 w-3" /> Filtrar per Client</label>
                        <Select value={filterCustomer} onValueChange={setFilterCustomer}>
                            <SelectTrigger className="bg-white border-2">
                                <SelectValue placeholder="Tots els clients" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Tots els clients</SelectItem>
                                {customers?.map(c => (
                                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex-1 space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2"><Search className="h-3 w-3" /> Cerca per Obra</label>
                        <div className="relative">
                            <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input 
                                placeholder="Nom del projecte..." 
                                value={searchProject}
                                onChange={(e) => setSearchProject(e.target.value)}
                                className="pl-10 bg-white border-2"
                            />
                        </div>
                    </div>
                    <Button variant="ghost" onClick={clearFilters} size="sm" className="font-bold text-slate-500">
                        <X className="h-4 w-4 mr-1" /> Netejar
                    </Button>
                </div>
            </CardContent>
        </Card>

        <Tabs defaultValue="pendents" className="w-full">
          <TabsList className="grid w-full grid-cols-3 max-w-lg mb-6 bg-slate-100 p-1">
            <TabsTrigger value="pendents" className="font-bold gap-2 data-[state=active]:bg-white">
                <Clock className="h-4 w-4" /> Pendents {pendingAlbarans.length > 0 && <Badge variant="destructive" className="ml-1">{pendingAlbarans.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="historial" className="font-bold gap-2 data-[state=active]:bg-white">
                <CheckCircle2 className="h-4 w-4" /> Facturats
            </TabsTrigger>
            <TabsTrigger value="arxivats" className="font-bold gap-2 data-[state=active]:bg-white">
                <Archive className="h-4 w-4" /> Arxivats
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pendents">
            <Card className="border-primary/20 shadow-md">
              <CardHeader className="bg-primary/5">
                <CardTitle className="text-primary flex items-center gap-2">Treballs pendents de facturar</CardTitle>
                <CardDescription>Agrupació per obra de tota la feina feta encara no cobrada.</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nº Albarà</TableHead>
                                <TableHead>Obra / Projecte</TableHead>
                                <TableHead>Client</TableHead>
                                <TableHead>Tècnics</TableHead>
                                <TableHead>Total Est.</TableHead>
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
                                        <Button variant="outline" size="icon" asChild className="h-8 w-8 font-bold border-primary text-primary hover:bg-primary/10" title="Editar">
                                            <Link href={`/dashboard/albarans/${albaran.id}`}>
                                                <Edit className="h-4 w-4" />
                                            </Link>
                                        </Button>
                                        <Button variant="outline" size="icon" onClick={() => handleArchiveAlbaran(albaran.id)} className="h-8 w-8 font-bold text-slate-500" title="Arxivar">
                                            <Archive className="h-4 w-4" />
                                        </Button>
                                        <Button size="sm" asChild className="bg-primary hover:bg-primary/90 h-8 shadow-sm font-bold">
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
                                                    <AlertDialogTitle>Vols eliminar aquest document?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        Això només esborra l'albarà de resum. Els registres de treball dels tècnics es mantindran intactes per poder-los tornar a agrupar si cal.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Enrere</AlertDialogCancel>
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
                                <TableCell colSpan={6} className="h-48 text-center">
                                    <div className="flex flex-col items-center justify-center text-muted-foreground space-y-2">
                                        <AlertCircle className="h-8 w-8 opacity-20" />
                                        <p className="italic">No s'han trobat albarans pendents amb aquests filtres.</p>
                                        <p className="text-xs">Prova de netejar els filtres o prem "Actualitzar".</p>
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
                <CardTitle className="flex items-center gap-2">Albarans ja facturats</CardTitle>
                <CardDescription>Consulta el registre de documents que ja han estat convertits en factures.</CardDescription>
              </CardHeader>
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
                                <TableRow key={albaran.id} className="opacity-80">
                                    <TableCell className="font-bold">#{String(albaran.albaranNumber).padStart(4, '0')}</TableCell>
                                    <TableCell className="font-medium">{albaran.projectName}</TableCell>
                                    <TableCell>{albaran.customerName}</TableCell>
                                    <TableCell className="font-bold">{albaran.totalAmount.toFixed(2)} €</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="outline" size="sm" asChild className="h-8 font-bold">
                                                <Link href={`/dashboard/albarans/${albaran.id}`}>
                                                    <Eye className="h-4 w-4 mr-1" /> Veure
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
                                                        <AlertDialogTitle>Eliminar de l'historial?</AlertDialogTitle>
                                                        <AlertDialogDescription>Aquesta acció esborrarà el document de l'albarà facturat. No es recomana esborrar documents ja processats.</AlertDialogDescription>
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
                                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground italic">No s'han trobat albarans facturats amb aquests filtres.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="arxivats">
            <Card className="shadow-sm border-slate-200">
              <CardHeader className="bg-slate-50">
                <CardTitle className="flex items-center gap-2 text-slate-600">Albarans arxivats</CardTitle>
                <CardDescription>Documents que no s'han facturat i s'han tret del llistat actiu.</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
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
                            {archivedAlbarans.map(albaran => (
                                <TableRow key={albaran.id} className="opacity-60 bg-slate-50/50">
                                    <TableCell className="font-bold">#{String(albaran.albaranNumber).padStart(4, '0')}</TableCell>
                                    <TableCell>{albaran.projectName}</TableCell>
                                    <TableCell>{albaran.customerName}</TableCell>
                                    <TableCell>{albaran.totalAmount.toFixed(2)} €</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="outline" size="sm" onClick={() => updateDocumentNonBlocking(doc(firestore!, 'albarans', albaran.id), { status: 'pendent' })} className="h-8 font-bold">
                                                Recuperar
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleDeleteAlbaran(albaran.id, albaran.albaranNumber)} className="h-8 w-8 text-destructive">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {archivedAlbarans.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground italic">No hi ha albarans arxivats.</TableCell>
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
