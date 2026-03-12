'use client'

import { useMemo, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useCollection, useUser, useFirestore, useMemoFirebase } from '@/firebase'
import { collection, query, doc, writeBatch, orderBy } from 'firebase/firestore'
import type { Customer } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Edit, Trash2, PlusCircle, Building, Mail, Phone, Upload, Search, Loader2, ListPlus, X, FileSpreadsheet, CheckSquare, MapPin, Hash } from 'lucide-react'
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
  
  const [selectedRows, setSelectedRows] = useState<string[]>([])
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false)
  const [bulkText, setBulkText] = useState('')
  const [excelCustomers, setExcelCustomers] = useState<Partial<Customer>[]>([])
  const [isImporting, setIsImporting] = useState(false)

  const customersQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'customers'), orderBy('name', 'asc'));
  }, [firestore, user])

  const { data: customers, isLoading: isLoadingCustomers } = useCollection<Customer>(customersQuery)
  
  const displayCustomers = useMemo(() => {
    if (!customers) return [];
    const sorted = [...customers].sort((a, b) => a.name.localeCompare(b.name, 'ca'));
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
        c.nrt?.toLowerCase().includes(search) ||
        c.email?.toLowerCase().includes(search)
    );
  }, [customers, searchTerm]);

  const handleBulkImport = async () => {
    if (!firestore) return;
    let customersToImport: Partial<Customer>[] = excelCustomers.length > 0 ? excelCustomers : 
        bulkText.split('\n').map(n => ({ name: n.trim() })).filter(c => c.name && c.name.length > 0);

    if (customersToImport.length === 0) return;
    setIsImporting(true);
    
    try {
        const batch = writeBatch(firestore);
        let count = 0;
        for (const cust of customersToImport) {
            if (!cust.name) continue;
            const cRef = doc(collection(firestore, 'customers'));
            batch.set(cRef, {
                name: cust.name,
                nrt: cust.nrt || '',
                street: cust.street || '',
                city: cust.city || '',
                postalCode: cust.postalCode || '',
                contact: cust.contact || '',
                email: cust.email || ''
            });
            count++;
        }
        await batch.commit();
        toast({ title: "Importació completada", description: `S'han afegit ${count} clients correctament.` });
        setIsBulkDialogOpen(false);
        setBulkText('');
        setExcelCustomers([]);
    } catch (e) {
        toast({ variant: 'destructive', title: "Error en la importació" });
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
            const ws = wb.Sheets[wb.SheetNames[0]];
            // defval: "" garanteix que cel·les buides no facin saltar les columnes
            const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" }) as any[][];
            
            // MAPEIG ESTRICTE DE 7 COLUMNES (Ignorant la primera fila de títols):
            // 0: Nom, 1: NRT, 2: Rua, 3: Ciutat, 4: CP, 5: Tel, 6: Email
            const parsed: Partial<Customer>[] = data.slice(1).map(row => {
                const getString = (val: any) => val !== undefined && val !== null ? String(val).trim() : "";
                return {
                    name: getString(row[0]),
                    nrt: getString(row[1]),
                    street: getString(row[2]),
                    city: getString(row[3]),
                    postalCode: getString(row[4]),
                    contact: getString(row[5]),
                    email: getString(row[6]),
                };
            }).filter(c => c.name && c.name.length > 1 && c.name !== "Nom" && c.name !== "Name");
            
            setExcelCustomers(parsed);
            toast({ title: "Excel processat", description: `S'han detectat ${parsed.length} línies de dades (ignorant capçalera).` });
        } catch (err) {
            toast({ variant: 'destructive', title: "Error llegint el fitxer Excel" });
        }
    };
    reader.readAsBinaryString(file);
  };

  const handleDeleteCustomer = async (id: string) => {
    if (!firestore) return;
    const batch = writeBatch(firestore);
    batch.delete(doc(firestore, 'customers', id));
    await batch.commit();
    toast({ title: 'Client eliminat correctament.' });
  };

  const handleBulkDelete = async () => {
    if (!firestore || selectedRows.length === 0) return;
    setIsImporting(true);
    try {
        const batch = writeBatch(firestore);
        selectedRows.forEach(id => batch.delete(doc(firestore, 'customers', id)));
        await batch.commit();
        toast({ title: "Eliminació massiva completada" });
        setSelectedRows([]);
    } catch (e) {
        toast({ variant: 'destructive', title: "Error en l'eliminació" });
    } finally {
        setIsImporting(false);
    }
  };

  if (isUserLoading || isLoadingCustomers) {
    return (
        <div className="p-12 text-center flex flex-col items-center justify-center h-[60vh]">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
            <p className="mt-6 font-black uppercase tracking-widest text-primary">Carregant llista de clients...</p>
        </div>
    );
  }

  return (
    <AdminGate pageTitle="Gestió de Clients" pageDescription="Administració centralitzada de dades.">
        <div className="max-w-7xl mx-auto space-y-8 px-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
            <div className="space-y-1">
                <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter text-slate-900 flex items-center gap-3">
                    <Building className="h-10 w-10 text-primary" /> Base de Clients
                </h1>
                <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest pl-1">Ordre de 7 columnes (Nom, NRT, Rua, Ciutat, CP, Tel, Email).</p>
            </div>
            <div className="flex gap-3 w-full sm:w-auto">
                <Dialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
                    <DialogTrigger asChild>
                        <Button variant="outline" className="h-14 px-6 border-2 border-primary text-primary font-black uppercase tracking-widest rounded-2xl shadow-lg hover:bg-primary/5">
                            <ListPlus className="mr-2 h-5 w-5" /> Importar Excel
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="rounded-[2.5rem] max-w-xl">
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-black uppercase">Importar Excel amb Capçalera</DialogTitle>
                            <DialogDescription className="font-bold text-primary">
                                El sistema ignorarà la 1ª fila. Ordre: 1.Nom | 2.NRT | 3.Rua | 4.Ciutat | 5.CP | 6.Tel | 7.Email
                            </DialogDescription>
                        </DialogHeader>
                        <div className="py-4 space-y-6">
                            {excelCustomers.length > 0 ? (
                                <div className="bg-green-50 border-2 border-green-200 p-6 rounded-3xl flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <CheckSquare className="h-8 w-8 text-green-600" />
                                        <div>
                                            <p className="font-black text-green-800 uppercase text-sm">{excelCustomers.length} Registres Detectats</p>
                                            <p className="text-[10px] text-green-600 font-bold uppercase">Pronts per carregar a la base de dades.</p>
                                        </div>
                                    </div>
                                    <Button variant="ghost" onClick={() => setExcelCustomers([])} className="text-green-700 hover:bg-green-100">Netejar</Button>
                                </div>
                            ) : (
                                <div className="p-8 border-4 border-dashed border-primary/20 rounded-3xl bg-primary/5 text-center space-y-4">
                                    <FileSpreadsheet className="h-12 w-12 mx-auto text-primary" />
                                    <div className="space-y-1">
                                        <p className="text-xs font-black uppercase text-slate-600">Pujar fitxer .xlsx o .xls</p>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Es mapejaran les primeres 7 columnes a partir de la 2ª fila.</p>
                                    </div>
                                    <input type="file" ref={fileInputRef} onChange={handleExcelUpload} accept=".xlsx, .xls" className="hidden" />
                                    <Button onClick={() => fileInputRef.current?.click()} variant="outline" className="border-primary text-primary font-bold px-8">Escollir fitxer</Button>
                                </div>
                            )}
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase text-slate-400 pl-1">O enganxa noms manualment (un per línia)</Label>
                                <Textarea value={bulkText} onChange={(e) => setBulkText(e.target.value)} rows={4} className="rounded-2xl border-2 font-bold bg-slate-50" placeholder="Nom del Client 1&#10;Nom del Client 2..." />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button onClick={handleBulkImport} disabled={isImporting || (excelCustomers.length === 0 && !bulkText.trim())} className="bg-primary font-black uppercase w-full h-14 rounded-2xl shadow-xl">
                                {isImporting ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : <Upload className="mr-2 h-5 w-5" />}
                                EXECUTAR IMPORTACIÓ ARA
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <Button onClick={() => router.push('/dashboard/customers/edit/new')} className="h-14 px-8 bg-accent text-accent-foreground font-black uppercase tracking-widest rounded-2xl shadow-xl hover:scale-[1.02] transition-transform">
                    <PlusCircle className="mr-2 h-6 w-6" /> Nou Client
                </Button>
            </div>
        </div>

        <Card className="border-none shadow-2xl rounded-[2.5rem] overflow-hidden bg-white">
            <CardHeader className="bg-slate-900 text-white p-8">
                <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-4">
                        <CardTitle className="text-xl font-black uppercase tracking-widest flex items-center gap-3">
                            Directori
                            <Badge className="bg-accent text-accent-foreground font-black text-sm px-3">{displayCustomers.length}</Badge>
                        </CardTitle>
                        {selectedRows.length > 0 && (
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="destructive" className="font-black uppercase text-[10px] tracking-widest h-10 px-6 rounded-xl animate-in zoom-in-95 shadow-lg">
                                        <Trash2 className="mr-2 h-4 w-4" /> Esborrar Selecció ({selectedRows.length})
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="rounded-[2.5rem] p-10">
                                    <AlertDialogHeader>
                                        <AlertDialogTitle className="text-2xl font-black uppercase text-slate-900">Confirmar Eliminació?</AlertDialogTitle>
                                        <AlertDialogDescription className="text-base font-medium">S'esborraran {selectedRows.length} registres de forma permanent de la base de dades.</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter className="pt-6">
                                        <AlertDialogCancel className="h-14 rounded-2xl font-bold px-8 border-2">Enrere</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleBulkDelete} className="bg-red-600 h-14 rounded-2xl font-black uppercase px-8">SÍ, ESBORRAR TOT</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        )}
                    </div>
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                        <Input placeholder="Cerca per nom, NRT o e-mail..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-12 bg-slate-800 border-none text-white h-14 rounded-2xl focus:ring-2 ring-primary" />
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0">
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader className="bg-slate-50/50">
                    <TableRow className="border-b-2 border-slate-100">
                        <TableHead className="w-[80px] px-8 py-6">
                            <Checkbox 
                                checked={selectedRows.length > 0 && selectedRows.length === displayCustomers.length} 
                                onCheckedChange={(c) => setSelectedRows(c ? displayCustomers.map(x => x.id) : [])} 
                            />
                        </TableHead>
                        <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-400">1. Nom del Client</TableHead>
                        <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-400">2. NRT</TableHead>
                        <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-400">3-5. Localització (Rua, Ciutat, CP)</TableHead>
                        <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-400">6-7. Contacte</TableHead>
                        <TableHead className="text-right px-8 font-black uppercase text-[10px] tracking-widest text-slate-400">Accions</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {displayCustomers.map(customer => (
                        <TableRow key={customer.id} className={`${selectedRows.includes(customer.id) ? 'bg-primary/5' : ''} hover:bg-slate-50 transition-colors border-b border-slate-50`}>
                        <TableCell className="px-8 py-6">
                            <Checkbox 
                                checked={selectedRows.includes(customer.id)} 
                                onCheckedChange={(c) => setSelectedRows(prev => c ? [...prev, customer.id] : prev.filter(x => x !== customer.id))} 
                            />
                        </TableCell>
                        <TableCell>
                            <div className="flex items-center gap-2">
                                <span className="font-black text-slate-900 uppercase text-sm tracking-tight">{customer.name}</span>
                                {customer.isDuplicate && <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200 text-[8px] font-black uppercase">Duplicat</Badge>}
                            </div>
                        </TableCell>
                        <TableCell>
                            <Badge variant="outline" className="font-black text-[10px] border-slate-200 text-slate-500 bg-white">
                                {customer.nrt || 'N/A'}
                            </Badge>
                        </TableCell>
                        <TableCell>
                            <div className="text-[10px] font-bold text-slate-500 uppercase leading-relaxed">
                                <p className="text-slate-900 font-black truncate max-w-[220px]">{customer.street || '---'}</p>
                                <p className="flex items-center gap-1">
                                    <MapPin className="h-2 w-2 text-primary" /> {customer.postalCode} {customer.city}
                                </p>
                            </div>
                        </TableCell>
                        <TableCell>
                            <div className="space-y-1 text-[10px] font-bold text-slate-500">
                                {customer.email && <p className="flex items-center gap-2 text-primary font-black uppercase tracking-tight truncate max-w-[180px]"><Mail className="h-3 w-3" /> {customer.email}</p>}
                                {customer.contact && <p className="flex items-center gap-2 text-slate-400"><Phone className="h-3 w-3" /> {customer.contact}</p>}
                            </div>
                        </TableCell>
                        <TableCell className="text-right px-8">
                            <div className="flex justify-end gap-3">
                                <Button variant="outline" size="icon" onClick={() => router.push(`/dashboard/customers/edit/${customer.id}`)} className="h-10 w-10 border-2 rounded-xl text-primary border-primary/20 hover:bg-primary hover:text-white transition-all shadow-sm">
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
                                            <AlertDialogDescription className="text-base font-medium">Aquesta acció no es pot desfer. Les dades de <strong>{customer.name}</strong> es perdran.</AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter className="pt-6">
                                            <AlertDialogCancel className="h-14 rounded-2xl font-bold px-8 border-2">Cancel·lar</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleDeleteCustomer(customer.id)} className="bg-red-600 h-14 rounded-2xl font-black uppercase px-8">Confirmar</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        </TableCell>
                        </TableRow>
                    ))}
                    {displayCustomers.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={6} className="h-64 text-center">
                                <div className="flex flex-col items-center justify-center space-y-4 opacity-20 grayscale">
                                    <Building className="h-16 w-16" />
                                    <p className="font-black uppercase text-xs tracking-widest italic">No hi ha cap client a la llista.</p>
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
