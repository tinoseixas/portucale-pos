
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
import { Eye, FileArchive, CreditCard, Clock, CheckCircle2, Loader2, Trash2, Users, RefreshCw, Briefcase, AlertCircle, Search, X, Archive, Edit } from 'lucide-react'
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

  const uniqueCustomers = useMemo(() => {
    if (!customers) return [];
    const seen = new Set();
    return customers.filter(c => {
      const nameKey = c.name.toLowerCase().trim().replace(/\s+/g, ' ');
      if (seen.has(nameKey)) return false;
      seen.add(nameKey);
      return true;
    });
  }, [customers]);

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
    toast({ title: 'Document esborrat', description: `L'albarà #${albaranNumber} s'ha eliminat.` });
  }

  const handleSyncAlbarans = async () => {
    if (!firestore) return;
    setIsSyncing(true);
    toast({ title: 'Sincronitzant obres...', description: 'Consolidant la feina de tot l\'equip.' });

    try {
        const employeesSnap = await getDocs(collection(firestore, 'employees'));
        const employees = employeesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Employee));
        
        const servicesSnap = await getDocs(collectionGroup(firestore, 'serviceRecords'));
        const allServices = servicesSnap.docs.map(d => ({ id: d.id, ...d.data() } as ServiceRecord));
        
        const latestAlbaransSnap = await getDocs(collection(firestore, 'albarans'));
        const latestAlbarans = latestAlbaransSnap.docs.map(d => ({ id: d.id, ...d.data() } as Albaran));

        const handledServiceIds = new Set(
            latestAlbarans.filter(a => a.status === 'facturat' || a.status === 'arxivat')
                     .flatMap(a => a.serviceRecordIds)
        );
        
        const pendingServices = allServices.filter(s => 
            !handledServiceIds.has(s.id) && 
            !s.deleted &&
            s.customerId && s.projectName &&
            s.projectName.trim() !== ""
        );

        const groupedByProject: Record<string, ServiceRecord[]> = {};
        pendingServices.forEach(s => {
            const normalizedName = s.projectName.trim().toLowerCase().replace(/\s+/g, ' ');
            const projectKey = `${s.customerId}_${normalizedName}`;
            
            if (!groupedByProject[projectKey]) groupedByProject[projectKey] = [];
            groupedByProject[projectKey].push(s);
        });

        const batch = writeBatch(firestore);
        
        const counterRef = doc(firestore, "counters", "albarans");
        const counterSnap = await getDocs(query(collection(firestore, "counters"), where("__name__", "==", "albarans")));
        let nextNum = !counterSnap.empty ? (counterSnap.docs[0].data().lastNumber || 0) : 0;

        latestAlbarans.filter(a => a.status === 'pendent').forEach(a => {
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
                projectName: firstService.projectName.trim(),
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

        toast({ title: 'Sincronització enllestida', description: `S'han generat ${createdCount} obres actualitzades.` });
    } catch (error) {
        console.error(error);
        toast({ variant: 'destructive', title: 'Error en la sincronització' });
    } finally {
        setIsSyncing(false);
    }
  };

  const clearFilters = () => {
    setFilterCustomer('all')
    setSearchProject('')
  }

  if (isUserLoading || isLoadingAlbarans) return <div className="p-12 text-center h-[60vh] flex flex-col items-center justify-center"><Loader2 className="h-16 w-16 animate-spin text-primary" /><p className="mt-6 text-primary font-black uppercase tracking-widest">Carregant albarans...</p></div>

  return (
    <AdminGate pageTitle="Gestió d'Albarans" pageDescription="Supervisió i agrupació de treballs per projecte.">
      <div className="max-w-full mx-auto space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
            <div className="space-y-1">
                <h1 className="text-4xl font-black tracking-tighter flex items-center gap-3 uppercase text-primary">
                    <FileArchive className="h-10 w-10" /> Historial d'Albarans
                </h1>
                <p className="text-muted-foreground font-medium">Control i generació de documents per obra.</p>
            </div>
            <Button variant="default" onClick={handleSyncAlbarans} disabled={isSyncing} className="w-full sm:w-auto bg-primary hover:bg-primary/90 shadow-xl font-black uppercase tracking-widest h-14 px-8 rounded-2xl hover:scale-[1.02] transition-all">
                {isSyncing ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <RefreshCw className="mr-2 h-5 w-5" />}
                Actualitzar Obres de l'Equip
            </Button>
        </div>

        <Card className="bg-white border-none shadow-2xl rounded-3xl overflow-hidden">
            <CardContent className="p-6 bg-slate-50/50">
                <div className="flex flex-col md:flex-row gap-6 items-end">
                    <div className="flex-1 space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2 px-1"><Users className="h-3 w-3" /> Filtrar per Client</label>
                        <Select value={filterCustomer} onValueChange={setFilterCustomer}>
                            <SelectTrigger className="bg-white border-2 h-12 rounded-xl font-bold">
                                <SelectValue placeholder="Tots els clients" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Tots els clients</SelectItem>
                                {uniqueCustomers.map(c => (
                                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex-1 space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2 px-1"><Search className="h-3 w-3" /> Cerca per Obra</label>
                        <div className="relative">
                            <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                            <Input 
                                placeholder="Nom del projecte..." 
                                value={searchProject}
                                onChange={(e) => setSearchProject(e.target.value)}
                                className="pl-12 bg-white border-2 h-12 rounded-xl font-bold"
                            />
                        </div>
                    </div>
                    <Button variant="ghost" onClick={clearFilters} className="font-black text-slate-400 uppercase text-[10px] tracking-widest hover:bg-slate-100 h-12">
                        <X className="h-4 w-4 mr-1" /> Netejar
                    </Button>
                </div>
            </CardContent>
        </Card>

        <Tabs defaultValue="pendents" className="w-full">
          <TabsList className="grid w-full grid-cols-3 max-w-xl mb-10 bg-slate-200/50 p-1.5 rounded-2xl h-16">
            <TabsTrigger value="pendents" className="font-black uppercase text-[10px] tracking-widest gap-2 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-xl rounded-xl transition-all">
                <Clock className="h-4 w-4" /> Pendents {pendingAlbarans.length > 0 && <Badge variant="destructive" className="ml-1 rounded-md px-1.5 h-5 bg-red-500">{pendingAlbarans.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="historial" className="font-black uppercase text-[10px] tracking-widest gap-2 data-[state=active]:bg-white data-[state=active]:text-green-600 data-[state=active]:shadow-xl rounded-xl transition-all">
                <CheckCircle2 className="h-4 w-4" /> Facturats
            </TabsTrigger>
            <TabsTrigger value="arxivats" className="font-black uppercase text-[10px] tracking-widest gap-2 data-[state=active]:bg-white data-[state=active]:text-slate-600 data-[state=active]:shadow-xl rounded-xl transition-all">
                <Archive className="h-4 w-4" /> Arxivats
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pendents">
            <Card className="border-none shadow-2xl rounded-3xl overflow-hidden">
              <CardHeader className="bg-primary/5 p-8 border-b border-primary/10">
                <CardTitle className="text-primary flex items-center gap-2 text-xl font-black uppercase tracking-tight">Treballs pendents de facturar</CardTitle>
                <CardDescription className="text-primary/60 font-medium">Llista automàtica de treballs agrupats per obra.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50/50">
                                <TableHead className="px-8 font-black uppercase text-[10px] tracking-widest">Nº Albarà</TableHead>
                                <TableHead className="font-black uppercase text-[10px] tracking-widest">Obra / Projecte</TableHead>
                                <TableHead className="font-black uppercase text-[10px] tracking-widest">Client</TableHead>
                                <TableHead className="font-black uppercase text-[10px] tracking-widest">Import Est.</TableHead>
                                <TableHead className="text-right px-8 font-black uppercase text-[10px] tracking-widest">Accions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                        {pendingAlbarans.map(albaran => (
                            <TableRow key={albaran.id} className="hover:bg-primary/5 transition-colors border-b-2 border-slate-50">
                                <TableCell className="px-8 font-black text-slate-400">#{String(albaran.albaranNumber).padStart(4, '0')}</TableCell>
                                <TableCell>
                                    <div className="flex flex-col">
                                        <span className="font-black text-slate-900 uppercase text-sm tracking-tight">{albaran.projectName}</span>
                                        <span className="text-[10px] text-slate-400 font-bold italic flex items-center gap-1 mt-1">
                                            <Users className="h-3 w-3" /> {albaran.employeeName}
                                        </span>
                                    </div>
                                </TableCell>
                                <TableCell className="font-bold text-slate-600">{albaran.customerName}</TableCell>
                                <TableCell className="font-black text-xl text-primary">{albaran.totalAmount.toFixed(2)} €</TableCell>
                                <TableCell className="text-right px-8">
                                    <div className="flex justify-end gap-3">
                                        <Button variant="outline" size="icon" asChild className="h-10 w-10 border-2 border-primary text-primary hover:bg-primary hover:text-white rounded-xl shadow-sm transition-all" title="Veure i Editar">
                                            <Link href={`/dashboard/albarans/${albaran.id}`}>
                                                <Edit className="h-4 w-4" />
                                            </Link>
                                        </Button>
                                        <Button size="sm" asChild className="bg-primary hover:bg-primary/90 h-10 px-5 shadow-lg font-black uppercase text-[10px] tracking-widest rounded-xl hover:scale-[1.02] transition-all">
                                            <Link href={`/dashboard/invoices?customerId=${albaran.customerId}&albaranId=${albaran.id}`}>
                                                <CreditCard className="mr-2 h-4 w-4" /> Facturar
                                            </Link>
                                        </Button>
                                        
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-10 w-10 text-red-300 hover:text-red-600 hover:bg-red-50 rounded-xl">
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent className="rounded-[2.5rem] p-10">
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle className="text-2xl font-black uppercase">Eliminar Albarà?</AlertDialogTitle>
                                                    <AlertDialogDescription className="text-base font-medium">
                                                        Això només esborra o document de resum. Els registres de treball dels tècnics es mantindran intactes per poder-los tornar a agrupar.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter className="pt-6">
                                                    <AlertDialogCancel className="h-14 rounded-2xl font-bold border-2 px-8">Enrere</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleDeleteAlbaran(albaran.id, albaran.albaranNumber)} className="bg-red-600 h-14 rounded-2xl font-black uppercase tracking-widest px-8">Confirmar</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                        {pendingAlbarans.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} className="h-64 text-center">
                                    <div className="flex flex-col items-center justify-center text-slate-300 space-y-4">
                                        <AlertCircle className="h-16 w-16 opacity-20" />
                                        <div className="space-y-1">
                                            <p className="font-black uppercase tracking-widest">Sense obres pendents</p>
                                            <p className="text-sm font-medium italic">Fes clic a "Actualitzar Obres" per carregar la feina nova.</p>
                                        </div>
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
            <Card className="border-none shadow-2xl rounded-3xl overflow-hidden">
              <CardHeader className="bg-green-50 p-8 border-b border-green-100">
                <CardTitle className="text-green-700 flex items-center gap-2 text-xl font-black uppercase tracking-tight">Albarans facturats</CardTitle>
                <CardDescription className="text-green-600/60 font-medium">Documents que ja han estat convertits en factures oficials.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50/50">
                                <TableHead className="px-8 font-black uppercase text-[10px] tracking-widest">Nº Albarà</TableHead>
                                <TableHead className="font-black uppercase text-[10px] tracking-widest">Obra</TableHead>
                                <TableHead className="font-black uppercase text-[10px] tracking-widest">Client</TableHead>
                                <TableHead className="font-black uppercase text-[10px] tracking-widest">Total</TableHead>
                                <TableHead className="text-right px-8 font-black uppercase text-[10px] tracking-widest">Accions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {historyAlbarans.map(albaran => (
                                <TableRow key={albaran.id} className="opacity-80 hover:opacity-100 border-b border-slate-50">
                                    <TableCell className="px-8 font-bold text-slate-400">#{String(albaran.albaranNumber).padStart(4, '0')}</TableCell>
                                    <TableCell className="font-black uppercase text-xs">{albaran.projectName}</TableCell>
                                    <TableCell className="font-bold text-slate-500">{albaran.customerName}</TableCell>
                                    <TableCell className="font-black text-slate-900">{albaran.totalAmount.toFixed(2)} €</TableCell>
                                    <TableCell className="text-right px-8">
                                        <Button variant="outline" size="sm" asChild className="h-10 px-6 font-black uppercase text-[10px] tracking-widest border-2 rounded-xl">
                                            <Link href={`/dashboard/albarans/${albaran.id}`}>
                                                <Eye className="h-4 w-4 mr-2" /> Veure
                                            </Link>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {historyAlbarans.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-32 text-center text-slate-400 italic font-medium">No s'ha facturat cap albarà encara.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="arxivats">
            <Card className="border-none shadow-2xl rounded-3xl overflow-hidden">
              <CardHeader className="bg-slate-100 p-8 border-b border-slate-200">
                <CardTitle className="flex items-center gap-2 text-slate-600 text-xl font-black uppercase tracking-tight">Albarans arxivats</CardTitle>
                <CardDescription className="text-slate-500 font-medium">Documents fora de la llista activa.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50/50">
                                <TableHead className="px-8 font-black uppercase text-[10px] tracking-widest">Nº Albarà</TableHead>
                                <TableHead className="font-black uppercase text-[10px] tracking-widest">Obra</TableHead>
                                <TableHead className="font-black uppercase text-[10px] tracking-widest">Client</TableHead>
                                <TableHead className="text-right px-8 font-black uppercase text-[10px] tracking-widest">Accions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {archivedAlbarans.map(albaran => (
                                <TableRow key={albaran.id} className="opacity-60 bg-slate-50/20 grayscale">
                                    <TableCell className="px-8 font-bold">#{String(albaran.albaranNumber).padStart(4, '0')}</TableCell>
                                    <TableCell className="font-medium text-xs uppercase">{albaran.projectName}</TableCell>
                                    <TableCell className="text-xs">{albaran.customerName}</TableCell>
                                    <TableCell className="text-right px-8">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="outline" size="sm" onClick={() => updateDocumentNonBlocking(doc(firestore!, 'albarans', albaran.id), { status: 'pendent' })} className="h-9 px-4 font-black uppercase text-[10px] tracking-widest border-2 rounded-xl hover:bg-primary hover:text-white transition-all">
                                                Recuperar
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleDeleteAlbaran(albaran.id, albaran.albaranNumber)} className="h-9 w-9 text-red-400">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {archivedAlbarans.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-32 text-center text-slate-400 italic">No hi ha albarans arxivats.</TableCell>
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
