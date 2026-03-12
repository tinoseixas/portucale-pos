'use client'

import { useMemo, useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useCollection, useUser, useFirestore, useMemoFirebase } from '@/firebase'
import { collection, query, doc, writeBatch, orderBy } from 'firebase/firestore'
import type { Customer } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Edit, Trash2, PlusCircle, Building, Mail, Phone, Upload, Search, Loader2, ListPlus, X, FileSpreadsheet, CheckSquare, AlertTriangle, MapPin, Hash, MapPinned } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
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
import * as XLSX from 'xlsx'

export default function CustomersPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { user, isUserLoading } = useUser()
  const firestore = useFirestore()
  const [searchTerm, setSearchTerm] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Selection State
  const [selectedRows, setSelectedRows] = useState<string[]>([])
  
  // Bulk Import State
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false)
  const [bulkText, setBulkText] = useState('')
  const [excelCustomers, setExcelCustomers] = useState<Partial<Customer>[]>([])
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
    
    // We sort them
    const sorted = [...customers].sort((a, b) => a.name.localeCompare(b.name, 'ca'));

    // We identify duplicates but show them all so the user can delete them
    const counts: Record<string, number> = {};
    sorted.forEach(c => {
        const key = c.name.toLowerCase().trim().replace(/\s+/g, ' ');
        counts[key] = (counts[key] || 0) + 1;
    });

    const withDuplicateInfo = sorted.map(c => ({
        ...c,
        isDuplicate: counts[c.name.toLowerCase().trim().replace(/\s+/g, ' ')] > 1
    }));

    if (!searchTerm) return withDuplicateInfo;
    const search = searchTerm.toLowerCase().trim();
    return withDuplicateInfo.filter(c => 
        c.name.toLowerCase().includes(search) || 
        c.nrt?.toLowerCase().includes(search)
    );
  }, [customers, searchTerm]);

  const handleBulkImport = async () => {
    if (!firestore) return;
    
    let customersToImport: Partial<Customer>[] = [];
    
    if (excelCustomers.length > 0) {
        customersToImport = excelCustomers;
    } else if (bulkText.trim()) {
        customersToImport = bulkText.split('\n')
            .map(n => ({ 
                name: n.trim(), 
                street: '', 
                city: '', 
                postalCode: '', 
                contact: '', 
                email: '', 
                nrt: '' 
            }))
            .filter(c => c.name.length > 0);
    }

    if (customersToImport.length === 0) {
        toast({ variant: 'destructive', title: "Sense dades", description: "No hi ha clients per importar." });
        return;
    }

    setIsImporting(true);
    
    try {
        const batch = writeBatch(firestore);
        let count = 0;
        
        for (const cust of customersToImport) {
            if (!cust.name) continue;
            
            // Basic check to avoid adding exact duplicates if they already exist
            const alreadyExists = customers?.some(c => c.name.toLowerCase().trim() === cust.name!.toLowerCase().trim());
            if (!alreadyExists) {
                const cRef = doc(collection(firestore, 'customers'));
                batch.set(cRef, {
                    name: cust.name,
                    street: cust.street || '',
                    city: cust.city || '',
                    postalCode: cust.postalCode || '',
                    contact: cust.contact || '',
                    email: cust.email || '',
                    nrt: cust.nrt || ''
                });
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
        setExcelCustomers([]);
        setIsBulkDialogOpen(false);
    } catch (e) {
        console.error(e);
        toast({ variant: 'destructive', title: "Error", description: "No s'ha pogut realitzar l'importació." });
    } finally {
        setIsImporting(false);
    }
  };

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
        try {
            const bstr = evt.target?.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
            
            // MAPEO ESTRICTO DE 7 COLUMNAS:
            // 0: Nome, 1: NRT, 2: Rua, 3: Cidade, 4: Código Postal, 5: Telefone, 6: E-mail
            const parsed: Partial<Customer>[] = data.slice(1).map(row => ({
                name: String(row[0] || '').trim(),
                nrt: String(row[1] || '').trim(),
                street: String(row[2] || '').trim(),
                city: String(row[3] || '').trim(),
                postalCode: String(row[4] || '').trim(),
                contact: String(row[5] || '').trim(),
                email: String(row[6] || '').trim(),
            })).filter(c => c.name && c.name !== 'undefined' && c.name.length > 1 && c.name.toLowerCase() !== 'nom');
            
            if (parsed.length > 0) {
                setExcelCustomers(parsed);
                setBulkText(''); 
                toast({ title: "Excel processat", description: `S'han detectat ${parsed.length} clients amb dades completes.` });
            } else {
                toast({ variant: 'destructive', title: "Fitxer buit", description: "No s'han trobat dades vàlides al fitxer." });
            }
        } catch (err) {
            console.error(err);
            toast({ variant: 'destructive', title: "Error Excel", description: "El fitxer no s'ha pogut llegir correctament." });
        }
    };
    reader.readAsBinaryString(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDeleteCustomer = async (customerId: string) => {
    if (!firestore) return;
    setIsImporting(true);
    try {
        const batch = writeBatch(firestore);
        batch.delete(doc(firestore, 'customers', customerId));
        await batch.commit();
        toast({ title: 'Client Eliminat' });
    } catch (e) {
        toast({ variant: 'destructive', title: 'Error' });
    } finally {
        setIsImporting(false);
    }
  };

  const handleBulkDelete = async () => {
    if (!firestore || selectedRows.length === 0) return;
    setIsImporting(true);
    try {
        const batch = writeBatch(firestore);
        selectedRows.forEach(id => {
            batch.delete(doc(firestore, 'customers', id));
        });
        await batch.commit();
        toast({ title: "Eliminació massiva", description: `S'han esborrat ${selectedRows.length} clients.` });
        setSelectedRows([]);
    } catch (e) {
        toast({ variant: 'destructive', title: "Error", description: "No s'ha pogut completar l'acció." });
    } finally {
        setIsImporting(false);
    }
  };
  
  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
        setSelectedRows(displayCustomers.map(c => c.id));
    } else {
        setSelectedRows([]);
    }
  }

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
                <Dialog open={isBulkDialogOpen} onOpenChange={(open) => { setIsBulkDialogOpen(open); if(!open) setExcelCustomers([]); }}>
                    <DialogTrigger asChild>
                        <Button variant="outline" className="h-14 px-6 border-2 border-primary text-primary font-black uppercase tracking-widest rounded-2xl shadow-lg hover:bg-primary/5">
                            <ListPlus className="mr-2 h-5 w-5" /> Importació Massa / Excel
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="rounded-[2rem] max-w-xl">
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-black uppercase">Importar Clients</DialogTitle>
                            <DialogDescription className="font-medium">Carrega un Excel o enganxa noms per crear múltiples clients.</DialogDescription>
                        </DialogHeader>
                        <div className="py-4 space-y-6">
                            {excelCustomers.length > 0 ? (
                                <div className="bg-green-50 border-2 border-green-200 p-6 rounded-3xl flex items-center justify-between animate-in zoom-in-95">
                                    <div className="flex items-center gap-4">
                                        <div className="bg-green-600 p-2 rounded-xl text-white">
                                            <CheckSquare className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <p className="font-black text-green-800 uppercase text-sm">{excelCustomers.length} Clients Detectats</p>
                                            <p className="text-[10px] text-green-600 font-bold uppercase tracking-tight">Dades de l'Excel a punt per importar.</p>
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="sm" onClick={() => setExcelCustomers([])} className="text-green-700 hover:bg-green-100 font-bold">Netejar</Button>
                                </div>
                            ) : (
                                <div className="p-6 border-4 border-dashed border-primary/20 rounded-3xl bg-primary/5 text-center space-y-4">
                                    <FileSpreadsheet className="h-12 w-12 mx-auto text-primary" />
                                    <div>
                                        <p className="font-black text-primary uppercase text-sm">Carregar Ficheiro Excel</p>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 leading-relaxed">
                                            L'ordre ha de ser:<br/>
                                            1. Nome | 2. NRT | 3. Rua | 4. Cidade | 5. CP | 6. Tel. | 7. Email
                                        </p>
                                    </div>
                                    <input type="file" ref={fileInputRef} onChange={handleExcelUpload} accept=".xlsx, .xls" className="hidden" />
                                    <Button onClick={() => fileInputRef.current?.click()} variant="outline" className="bg-white border-primary text-primary font-bold rounded-xl h-10 px-6">Escollir fitxer</Button>
                                </div>
                            )}

                            {!excelCustomers.length && (
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase text-slate-400 pl-1">O enganxa la llista manualment (només noms, un per línia)</Label>
                                    <Textarea 
                                        placeholder="Client A&#10;Client B&#10;Empresa C..." 
                                        value={bulkText} 
                                        onChange={(e) => setBulkText(e.target.value)} 
                                        rows={6}
                                        className="rounded-2xl border-2 font-bold p-4 bg-slate-50"
                                    />
                                </div>
                            )}
                        </div>
                        <DialogFooter>
                            <Button variant="ghost" onClick={() => setIsBulkDialogOpen(false)} className="font-bold">Cancel·lar</Button>
                            <Button onClick={handleBulkImport} disabled={isImporting || (!bulkText.trim() && excelCustomers.length === 0)} className="bg-primary font-black uppercase tracking-widest px-8">
                                {isImporting ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Upload className="mr-2 h-4 w-4" />}
                                IMPORTAR ARA
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
                    <div className="flex items-center gap-4">
                        <CardTitle className="text-xl font-black uppercase tracking-widest flex items-center gap-3">
                            Directori de Clients
                            <Badge className="bg-accent text-accent-foreground font-black border-none">{displayCustomers.length}</Badge>
                        </CardTitle>
                        {selectedRows.length > 0 && (
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="destructive" className="font-black uppercase text-[10px] tracking-widest h-10 px-6 rounded-xl shadow-lg border-2 border-white animate-in zoom-in-95">
                                        <Trash2 className="mr-2 h-4 w-4" /> Esborrar ({selectedRows.length})
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="rounded-[2.5rem] p-10">
                                    <AlertDialogHeader>
                                        <AlertDialogTitle className="text-2xl font-black uppercase">Esborrar Seleccionats?</AlertDialogTitle>
                                        <AlertDialogDescription className="text-base font-medium">S'eliminaran <strong>{selectedRows.length}</strong> registres de la base de dades permanentment.</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter className="pt-6">
                                        <AlertDialogCancel className="h-14 rounded-2xl font-bold border-2">Enrere</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleBulkDelete} className="bg-red-600 h-14 rounded-2xl font-black uppercase tracking-widest px-8">Confirmar eliminació</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        )}
                    </div>
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
                        <TableHead className="w-[60px] px-8 py-6">
                            <Checkbox 
                                checked={selectedRows.length > 0 && selectedRows.length === displayCustomers.length}
                                onCheckedChange={(checked) => toggleSelectAll(!!checked)}
                            />
                        </TableHead>
                        <TableHead className="font-black uppercase text-[10px] tracking-widest">Nom del Client</TableHead>
                        <TableHead className="font-black uppercase text-[10px] tracking-widest">NIF / NRT</TableHead>
                        <TableHead className="font-black uppercase text-[10px] tracking-widest">Morada Completa</TableHead>
                        <TableHead className="font-black uppercase text-[10px] tracking-widest">Contacte</TableHead>
                        <TableHead className="text-right px-8 font-black uppercase text-[10px] tracking-widest">Accions</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {displayCustomers.length > 0 ? displayCustomers.map(customer => (
                        <TableRow key={customer.id} className={`${selectedRows.includes(customer.id) ? 'bg-primary/5' : ''} hover:bg-slate-50 transition-colors border-b-2 border-slate-50`}>
                        <TableCell className="px-8">
                            <Checkbox 
                                checked={selectedRows.includes(customer.id)}
                                onCheckedChange={(checked) => {
                                    setSelectedRows(prev => checked ? [...prev, customer.id] : prev.filter(id => id !== customer.id));
                                }}
                            />
                        </TableCell>
                        <TableCell className="py-6">
                            <div className="flex items-center gap-2">
                                <div className="font-black text-slate-900 uppercase tracking-tight text-sm">
                                    {customer.name}
                                </div>
                                {(customer as any).isDuplicate && (
                                    <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200 text-[8px] font-black uppercase px-1.5 h-4">
                                        <AlertTriangle className="h-2 w-2 mr-1" /> Duplicat
                                    </Badge>
                                )}
                            </div>
                        </TableCell>
                        <TableCell>
                            <Badge variant="outline" className="font-black text-[10px] border-slate-200 bg-slate-50 text-slate-600 px-3 py-1">
                                {customer.nrt || 'N/A'}
                            </Badge>
                        </TableCell>
                        <TableCell>
                            <div className="flex flex-col gap-0.5 min-w-[200px]">
                                <div className="text-[10px] text-slate-900 font-black uppercase truncate">
                                    {customer.street || <span className="text-slate-300 italic">Sense carrer</span>}
                                </div>
                                <div className="text-[10px] text-slate-400 font-bold uppercase">
                                    {customer.postalCode ? `${customer.postalCode} ` : ''}{customer.city || ''}
                                </div>
                            </div>
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
                                    <AlertDialogAction onClick={() => handleDeleteCustomer(customer.id)} className="bg-red-600 h-14 rounded-2xl font-black uppercase tracking-widest px-8">Confirmar eliminació</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        </TableCell>
                        </TableRow>
                    )) : (
                        <TableRow>
                            <TableCell colSpan={6} className="h-48 text-center">
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
