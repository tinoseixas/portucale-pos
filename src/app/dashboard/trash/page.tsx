
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser, useFirestore, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase'
import { collectionGroup, query, getDocs, doc, orderBy } from 'firebase/firestore'
import type { ServiceRecord } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { ArrowLeft, History, RotateCcw, Trash2, Loader2, AlertCircle } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ca } from 'date-fns/locale'
import { useToast } from '@/hooks/use-toast'
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

export default function TrashPage() {
  const { user, isUserLoading } = useUser()
  const firestore = useFirestore()
  const router = useRouter()
  const { toast } = useToast()
  
  const [deletedServices, setDeletedServices] = useState<ServiceRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchDeletedServices = async () => {
    if (!firestore) return;
    setIsLoading(true);
    try {
        const q = query(collectionGroup(firestore, 'serviceRecords'), orderBy('arrivalDateTime', 'desc'));
        const snap = await getDocs(q);
        const data = snap.docs
            .map(d => ({ id: d.id, ...d.data() } as ServiceRecord))
            .filter(s => s.deleted === true);
        setDeletedServices(data);
    } catch (e) {
        console.error(e);
    } finally {
        setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user && firestore) {
        fetchDeletedServices();
    }
  }, [user, firestore]);

  const handleRestore = (service: ServiceRecord) => {
    if (!firestore) return;
    const docRef = doc(firestore, `employees/${service.employeeId}/serviceRecords`, service.id);
    updateDocumentNonBlocking(docRef, { deleted: false, deletedAt: null });
    
    setDeletedServices(prev => prev.filter(s => s.id !== service.id));
    toast({ title: "Registre recuperat", description: "El servei ha tornat al dashboard principal." });
  };

  const handlePermanentDelete = (service: ServiceRecord) => {
    if (!firestore) return;
    const docRef = doc(firestore, `employees/${service.employeeId}/serviceRecords`, service.id);
    deleteDocumentNonBlocking(docRef);
    
    setDeletedServices(prev => prev.filter(s => s.id !== service.id));
    toast({ title: "Eliminat permanentment", variant: "destructive" });
  };

  if (isUserLoading || isLoading) return <div className="p-12 text-center h-[60vh] flex flex-col items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /><p className="mt-4">Carregant papelera...</p></div>

  return (
    <div className="max-w-5xl mx-auto space-y-8">
        <Button variant="ghost" onClick={() => router.push('/dashboard')} className="font-bold">
            <ArrowLeft className="mr-2 h-4 w-4" /> Tornar al Dashboard
        </Button>

        <Card className="border-none shadow-2xl rounded-3xl overflow-hidden">
            <CardHeader className="bg-slate-900 text-white p-8">
                <div className="flex items-center gap-4">
                    <div className="bg-primary/20 p-3 rounded-2xl">
                        <History className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                        <CardTitle className="text-3xl font-black uppercase tracking-tighter">Papelera de Registres</CardTitle>
                        <CardDescription className="text-slate-400">Recupera els serveis esborrats per error.</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-slate-50">
                            <TableRow>
                                <TableHead className="px-8 py-4 font-black uppercase text-[10px] tracking-widest">Data Original</TableHead>
                                <TableHead className="font-black uppercase text-[10px] tracking-widest">Obra / Projecte</TableHead>
                                <TableHead className="font-black uppercase text-[10px] tracking-widest">Esborrat el</TableHead>
                                <TableHead className="text-right px-8 font-black uppercase text-[10px] tracking-widest">Accions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {deletedServices.length > 0 ? deletedServices.map(service => (
                                <TableRow key={service.id} className="hover:bg-slate-50 transition-colors border-b-2 border-slate-50">
                                    <TableCell className="px-8 py-6 font-bold text-slate-500">
                                        {format(parseISO(service.arrivalDateTime), 'dd/MM/yyyy')}
                                    </TableCell>
                                    <TableCell className="font-black text-slate-900 uppercase text-sm">
                                        {service.projectName || 'Sense nom'}
                                    </TableCell>
                                    <TableCell className="text-xs text-red-400 font-bold italic">
                                        {service.deletedAt ? format(parseISO(service.deletedAt), 'dd/MM/yy HH:mm') : 'Data no registrada'}
                                    </TableCell>
                                    <TableCell className="text-right px-8">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="outline" size="sm" onClick={() => handleRestore(service)} className="bg-green-50 text-green-600 border-green-200 hover:bg-green-100 font-bold h-10 px-4 rounded-xl">
                                                <RotateCcw className="h-4 w-4 mr-2" /> Restaurar
                                            </Button>
                                            
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-10 w-10 text-red-300 hover:text-red-600 rounded-xl">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent className="rounded-[2.5rem] p-10">
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle className="text-2xl font-black uppercase">Eliminar definitivament?</AlertDialogTitle>
                                                        <AlertDialogDescription>Aquesta acció no es pot desfer. El registre es perdrà per sempre.</AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter className="pt-6">
                                                        <AlertDialogCancel className="h-14 rounded-2xl font-bold border-2 px-8">Enrere</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handlePermanentDelete(service)} className="bg-red-600 h-14 rounded-2xl font-black uppercase tracking-widest px-8">SÍ, ESBORRAR</AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-64 text-center">
                                        <div className="flex flex-col items-center justify-center text-slate-300 space-y-4">
                                            <AlertCircle className="h-16 w-16 opacity-20" />
                                            <p className="font-black uppercase tracking-widest">La papelera està buida</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    </div>
  );
}
