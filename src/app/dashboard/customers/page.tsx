
'use client'

import { useMemo, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useCollection, useUser, useFirestore, useMemoFirebase, deleteDocumentNonBlocking } from '@/firebase'
import { collection, query, addDoc, doc, writeBatch, orderBy, getDocs } from 'firebase/firestore'
import type { Customer } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Edit, Trash2, PlusCircle, Building, Mail, Phone, Upload, Search, Loader2, ListPlus, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useToast } from '@/hooks/use-toast'
import { AdminGate } from '@/components/AdminGate'

export default function CustomersPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { user, isUserLoading } = useUser()
  const firestore = useFirestore()
  const [searchTerm, setSearchTerm] = useState('')
  
  // Bulk Import State
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false)
  const [bulkText, setBulkText] = useState('')
  const [isImporting, setIsImporting] = useState(false)

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/');
    }
  }, [isUserLoading, user, router]);

  const customersQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'customers'), orderBy('name', 'asc'));
  }, [firestore, user])

  const { data: customers, isLoading: isLoadingCustomers } = useCollection<Customer>(customersQuery)
  
  const displayCustomers = useMemo(() => {
    if (!customers) return [];
    
    const seen = new Set();
    const unique = customers.filter(c => {
      const nameKey = c.name.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
      if (seen.has(nameKey)) return false;
      seen.add(nameKey);
      return true;
    }).sort((a, b) => a.name.localeCompare(b.name, 'ca'));

    if (!searchTerm) return unique;
    const search = searchTerm.toLowerCase().trim();
    return unique.filter(c => 
        c.name.toLowerCase().includes(search) || 
        c.nrt?.toLowerCase().includes(search)
    );
  }, [customers, searchTerm]);

  const handleBulkImport = async () => {
    if (!firestore || !bulkText.trim()) return;
    setIsImporting(true);
    const names = bulkText.split('\n').map(n => n.trim()).filter(n => n.length > 0);
    
    try {
        const batch = writeBatch(firestore);
        let count = 0;
        
        for (const name of names) {
            // Basic check to avoid duplicates within the import itself
            const exists = customers?.some(c => c.name.toLowerCase().trim() === name.toLowerCase());
            if (!exists) {
                const cRef = doc(collection(firestore, 'customers'));
                batch.set(cRef, { name, address: '', contact: '', email: '', nrt: '' });
                count++;
            }
        }
        
        if (count > 0) {
            await batch.commit();
            toast({ title: "Importació completada", description: `S'han afegit ${count} nous clients.` });
        } else {
            toast({ title: "Sense canvis", description: "Tots els clients ja existien a la llista." });
        }
        
        setBulkText('');
        setIsBulkDialogOpen(false);
    } catch (e) {
        toast({ variant: 'destructive', title: "Error", description: "No s'ha pogut realitzar l'importació." });
    } finally {
        setIsImporting(false);
    }
  };

  const handleDeleteCustomer = (customerId: string, customerName: string) => {
    if (!firestore) return;
    const customerDocRef = doc(firestore, 'customers', customerId);
    deleteDocumentNonBlocking(customerDocRef);
    toast({
      title: 'Client Eliminat',
      description: `El client ${customerName} ha estat eliminat.`,
    });
  };
  
  const isLoading = isUserLoading || isLoadingCustomers;

  if (isLoading) return <div className="p-12 text-center h-[60vh] flex flex-col items-center justify-center"><Loader2 className="h-16 w-16 animate-spin text-primary" /><p className="mt-6 text-primary font-black uppercase tracking-widest">Carregant llista de clients...</p></div>;
  if (!user) return null;

  return (
    <AdminGate pageTitle="Gestió de Clients" pageDescription="Visualitza, afegeix i gestiona tots els clients registrats.">
        <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
            <div className="space-y-1">
                <h1 className="text-4xl font-black uppercase tracking-tighter text-primary flex items-center gap-3">
                    <Building className="h-10 w-10" /> Base de Clients
                </h1>
                <p className="text-muted-foreground font-medium">Gestió centralitzada de dades de contacte i facturació.</p>
            </div>
            <div className="flex gap-3 w-full sm:w-auto">
                <Dialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
                    <DialogTrigger asChild>
                        <Button variant="outline" className="h-14 px-6 border-2 border-primary text-primary font-black uppercase tracking-widest rounded-2xl shadow-lg hover:bg-primary/5">
                            <ListPlus className="mr-2 h-5 w-5" /> Importació Massa
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="rounded-[2rem] max-w-xl">
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-black uppercase">Importar Llista de Clients</DialogTitle>
                            <DialogDescription className="font-medium">Enganxa una llista de noms (un per línia). El sistema crearà les fitxes automàticament.</DialogDescription>
                        </DialogHeader>
                        <div className="py-4">
                            <Textarea 
                                placeholder="Client A&#10;Client B&#10;Empresa C..." 
                                value={bulkText} 
                                onChange={(e) => setBulkText(e.target.value)} 
                                rows={10}
                                className="rounded-2xl border-2 font-bold p-4 bg-slate-50"
                            />
                        </div>
                        <DialogFooter>
                            <Button variant="ghost" onClick={() => setIsBulkDialogOpen(false)} className="font-bold">Cancel·lar</Button>
                            <Button onClick={handleBulkImport} disabled={isImporting || !bulkText.trim()} className="bg-primary font-black uppercase tracking-widest px-8">
                                {isImporting ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Upload className="mr-2 h-4 w-4" />}
                                COMENÇAR IMPORTACIÓ
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <Button onClick={() => router.push('/dashboard/customers/edit/new')} className="flex-1 sm:flex-none h-14 px-8 bg-accent hover:bg-accent/90 text-accent-foreground font-black uppercase tracking-widest rounded-2xl shadow-xl hover:scale-[1.02] transition-all">
                    <PlusCircle className="mr-2 h-6 w-6" /> Nou Client
                </Button>
            </div>
        </div>

        <Card className="border-none shadow-2xl rounded-3xl overflow-hidden bg-white">
            <CardHeader className="bg-slate-900 text-white p-8">
                <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                    <CardTitle className="text-xl font-black uppercase tracking-widest flex items-center gap-3">
                        Llistat Directori
                        <Badge className="bg-accent text-accent-foreground font-black border-none">{displayCustomers.length}</Badge>
                    </CardTitle>
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                        <Input 
                            placeholder="Buscar per nom o NRT..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-12 bg-slate-800 border-none text-white h-12 rounded-xl focus-visible:ring-accent font-bold"
                        />
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0">
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                    <TableRow className="bg-slate-50">
                        <TableHead className="px-8 font-black uppercase text-[10px] tracking-widest">Nom del Client</TableHead>
                        <TableHead className="font-black uppercase text-[10px] tracking-widest">NIF / NRT</TableHead>
                        <TableHead className="font-black uppercase text-[10px] tracking-widest">Contacte</TableHead>
                        <TableHead className="text-right px-8 font-black uppercase text-[10px] tracking-widest">Accions</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {displayCustomers.length > 0 ? displayCustomers.map(customer => (
                        <TableRow key={customer.id} className="hover:bg-slate-50 transition-colors border-b-2 border-slate-50">
                        <TableCell className="px-8 py-6">
                            <div className="font-black text-slate-900 uppercase tracking-tight text-sm">
                                {customer.name}
                            </div>
                            <div className="text-[10px] text-slate-400 font-bold max-w-[250px] truncate mt-1">{customer.address}</div>
                        </TableCell>
                        <TableCell>
                            <Badge variant="outline" className="font-black text-[10px] border-slate-200 bg-slate-50 text-slate-600 px-3 py-1">
                                {customer.nrt || 'N/A'}
                            </Badge>
                        </TableCell>
                        <TableCell>
                            <div className="space-y-1">
                                {customer.email && (
                                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                                        <Mail className="h-3 w-3 text-primary" /> {customer.email}
                                    </div>
                                )}
                                {customer.contact && (
                                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                                        <Phone className="h-3 w-3 text-primary" /> {customer.contact}
                                    </div>
                                )}
                                {!customer.email && !customer.contact && <span className="text-[10px] text-slate-300 italic font-bold">Sense contacte</span>}
                            </div>
                        </TableCell>
                        <TableCell className="text-right px-8">
                            <div className="flex justify-end items-center gap-3">
                                <Button asChild variant="outline" size="icon" onClick={() => router.push(`/dashboard/customers/edit/${customer.id}`)} className="h-10 w-10 border-2 rounded-xl text-primary border-primary/20 hover:bg-primary hover:text-white transition-all shadow-sm">
                                    <Edit className="h-4 w-4" />
                                </Button>
                            
                                <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-10 w-10 text-red-300 hover:text-red-600 hover:bg-red-50 rounded-xl">
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="rounded-[2.5rem] p-10">
                                    <AlertDialogHeader>
                                    <AlertDialogTitle className="text-2xl font-black uppercase">Eliminar Client?</AlertDialogTitle>
                                    <AlertDialogDescription className="text-base font-medium">
                                        Aquesta acció no es pot desfer. S'eliminarà o client <strong>{customer.name}</strong> de la base de dades.
                                    </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter className="pt-6">
                                    <AlertDialogCancel className="h-14 rounded-2xl font-bold border-2 px-8">Cancel·lar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteCustomer(customer.id, customer.name)} className="bg-red-600 h-14 rounded-2xl font-black uppercase tracking-widest px-8">Confirmar eliminació</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        </TableCell>
                        </TableRow>
                    )) : (
                        <TableRow>
                            <TableCell colSpan={4} className="h-48 text-center">
                                <div className="flex flex-col items-center justify-center text-slate-300 space-y-2">
                                    <Building className="h-12 w-12 opacity-20" />
                                    <p className="font-black uppercase text-[10px] tracking-widest">No s'han trobat clients</p>
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
    </AdminGate>
  )
}
