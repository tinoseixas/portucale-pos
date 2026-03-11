'use client'

import { useState, useMemo } from 'react'
import { useCollection, useUser, useFirestore, useMemoFirebase } from '@/firebase'
import { collection, query, orderBy, doc, updateDoc, deleteDoc, addDoc } from 'firebase/firestore'
import type { Project, Customer } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Briefcase, CheckCircle2, Archive, Loader2, Plus, Users, Search, Trash2 } from 'lucide-react'
import { AdminGate } from '@/components/AdminGate'
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

export default function ProjectsManagementPage() {
    const firestore = useFirestore()
    const { toast } = useToast()
    const [isSaving, setIsSaving] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    
    const [newProjectName, setNewProjectName] = useState('')
    const [selectedCustomerId, setSelectedCustomerId] = useState<string>('none')

    const projectsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'projects'), orderBy('createdAt', 'desc'));
    }, [firestore]);

    const { data: projects, isLoading: isLoadingProjects } = useCollection<Project>(projectsQuery);

    const customersQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'customers'), orderBy('name', 'asc'));
    }, [firestore]);

    const { data: customers } = useCollection<Customer>(customersQuery);

    // Deduplicate customers for the select list using aggressive normalization
    const uniqueCustomers = useMemo(() => {
        if (!customers) return [];
        const seen = new Set();
        return customers.filter(c => {
            const nameKey = c.name.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
            if (seen.has(nameKey)) return false;
            seen.add(nameKey);
            return true;
        }).sort((a, b) => a.name.localeCompare(b.name, 'ca'));
    }, [customers]);

    const filteredProjects = useMemo(() => {
        if (!projects) return [];
        return projects.filter(p => 
            p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
            p.customerName?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [projects, searchTerm]);

    const handleArchiveProject = async (projectId: string, currentStatus: string) => {
        if (!firestore) return;
        const newStatus = currentStatus === 'active' ? 'finished' : 'active';
        try {
            await updateDoc(doc(firestore, 'projects', projectId), { status: newStatus });
            toast({ title: newStatus === 'finished' ? 'Obra finalitzada' : 'Obra reactivada' });
        } catch (e) {
            toast({ variant: 'destructive', title: 'Error', description: 'No s\'ha pogut canviar l\'estat.' });
        }
    };

    const handleCreateProject = async () => {
        if (!firestore || !newProjectName.trim() || selectedCustomerId === 'none') return;
        setIsSaving(true);
        try {
            const customer = uniqueCustomers.find(c => c.id === selectedCustomerId);
            await addDoc(collection(firestore, 'projects'), {
                name: newProjectName.trim(),
                customerId: selectedCustomerId,
                customerName: customer?.name || 'N/A',
                status: 'active',
                createdAt: new Date().toISOString()
            });
            toast({ title: 'Obra creada', description: 'S\'ha afegit a la llista d\'obres actives.' });
            setNewProjectName('');
            setSelectedCustomerId('none');
        } catch (e) {
            toast({ variant: 'destructive', title: 'Error', description: 'No s\'ha pogut crear l\'obra.' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteProject = async (projectId: string) => {
        if (!firestore) return;
        try {
            await deleteDoc(doc(firestore, 'projects', projectId));
            toast({ title: 'Obra eliminada' });
        } catch (e) {
            toast({ variant: 'destructive', title: 'Error' });
        }
    };

    if (isLoadingProjects) return <div className="p-12 text-center h-[60vh] flex flex-col items-center justify-center"><Loader2 className="h-16 w-16 animate-spin text-primary" /><p className="mt-6 text-primary font-black uppercase tracking-widest">Carregant obres...</p></div>

    return (
        <AdminGate pageTitle="Gestió d'Obres" pageDescription="Administra el llistat d'obres actives i finalitzades.">
            <div className="space-y-8 max-w-6xl mx-auto pb-10">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <h1 className="text-4xl font-black uppercase tracking-tight flex items-center gap-3 text-primary">
                        <Briefcase className="h-10 w-10" /> Gestió d'Obres
                    </h1>
                </div>

                <Card className="border-none shadow-2xl bg-slate-900 text-white rounded-3xl overflow-hidden">
                    <CardHeader className="p-8">
                        <CardTitle className="text-xl font-black uppercase tracking-widest flex items-center gap-2">
                            <Plus className="h-5 w-5 text-accent" /> Nova Obra / Projecte
                        </CardTitle>
                        <CardDescription className="text-slate-400">Defineix una obra per un client per poder-la seleccionar als registres.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-8 pt-0 grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Client Associat</Label>
                            <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                                <SelectTrigger className="h-14 bg-slate-800 border-none text-white font-bold rounded-2xl">
                                    <SelectValue placeholder="Selecciona client" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Escull un client...</SelectItem>
                                    {uniqueCustomers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Nom de l'Obra</Label>
                            <Input 
                                placeholder="Ex: Reforma Cuina C/Major" 
                                value={newProjectName}
                                onChange={(e) => setNewProjectName(e.target.value)}
                                className="h-14 bg-slate-800 border-none text-white font-bold rounded-2xl"
                            />
                        </div>
                        <div className="flex items-end">
                            <Button 
                                onClick={handleCreateProject} 
                                disabled={isSaving || !newProjectName.trim() || selectedCustomerId === 'none'}
                                className="w-full h-14 bg-accent hover:bg-accent/90 text-accent-foreground font-black uppercase tracking-widest rounded-2xl shadow-xl hover:scale-[1.02] transition-all"
                            >
                                {isSaving ? <Loader2 className="animate-spin h-5 w-5 mr-2" /> : <Plus className="h-5 w-5 mr-2" />}
                                CREAR OBRA
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-2xl rounded-3xl overflow-hidden bg-white">
                    <CardHeader className="bg-slate-50 border-b p-8">
                        <div className="flex flex-col sm:flex-row justify-between items-center gap-6">
                            <CardTitle className="text-xl font-black uppercase tracking-widest flex items-center gap-3">
                                Llistat d'Obres
                                <Badge className="bg-primary text-white font-black">{filteredProjects.length}</Badge>
                            </CardTitle>
                            <div className="relative w-full sm:w-80">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                <Input 
                                    placeholder="Cerca obra o client..." 
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-12 h-12 bg-white border-2 rounded-xl font-bold"
                                />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-50/50">
                                        <TableHead className="px-8 py-4 font-black uppercase text-[10px] tracking-widest">Obra / Projecte</TableHead>
                                        <TableHead className="font-black uppercase text-[10px] tracking-widest">Client</TableHead>
                                        <TableHead className="font-black uppercase text-[10px] tracking-widest">Estat</TableHead>
                                        <TableHead className="font-black uppercase text-[10px] tracking-widest">Data Creació</TableHead>
                                        <TableHead className="text-right px-8 font-black uppercase text-[10px] tracking-widest">Accions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredProjects.map(project => (
                                        <TableRow key={project.id} className="hover:bg-slate-50 transition-colors border-b-2 border-slate-50">
                                            <TableCell className="px-8 py-6">
                                                <div className="font-black text-slate-900 uppercase tracking-tight text-sm">{project.name}</div>
                                            </TableCell>
                                            <TableCell className="text-slate-600 font-bold">{project.customerName}</TableCell>
                                            <TableCell>
                                                <Badge variant={project.status === 'active' ? 'default' : 'outline'} className={project.status === 'active' ? "uppercase font-black text-[10px] bg-green-600" : "uppercase font-black text-[10px] border-slate-300 text-slate-400"}>
                                                    {project.status === 'active' ? 'ACTIVA' : 'FINALITZADA'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-xs text-slate-400 font-bold">{format(parseISO(project.createdAt), 'dd/MM/yyyy', { locale: ca })}</TableCell>
                                            <TableCell className="text-right px-8">
                                                <div className="flex justify-end gap-3">
                                                    <Button 
                                                        variant="outline" 
                                                        size="sm" 
                                                        onClick={() => handleArchiveProject(project.id, project.status)}
                                                        className={project.status === 'active' ? 'text-green-600 border-green-200 hover:bg-green-50 rounded-xl font-bold h-10 px-4' : 'text-primary border-primary/20 hover:bg-primary/5 rounded-xl font-bold h-10 px-4'}
                                                    >
                                                        {project.status === 'active' ? <CheckCircle2 className="h-4 w-4 mr-2" /> : <Archive className="h-4 w-4 mr-2" />}
                                                        {project.status === 'active' ? 'Enllestir' : 'Reactivar'}
                                                    </Button>
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-10 w-10 text-red-300 hover:text-red-600 hover:bg-red-50 rounded-xl">
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent className="rounded-[2.5rem] p-10">
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle className="text-2xl font-black uppercase">Eliminar Obra?</AlertDialogTitle>
                                                                <AlertDialogDescription className="text-base font-medium">Si l'elimines, deixarà d'aparèixer als selectors. Els registres de treball ja creats no es veuran afectats.</AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter className="pt-6">
                                                                <AlertDialogCancel className="h-14 rounded-2xl font-bold border-2 px-8">Cancel·lar</AlertDialogCancel>
                                                                <AlertDialogAction onClick={() => handleDeleteProject(project.id)} className="bg-red-600 h-14 rounded-2xl font-black uppercase tracking-widest px-8">Eliminar</AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {filteredProjects.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-48 text-center">
                                                <div className="flex flex-col items-center justify-center text-slate-300 space-y-2">
                                                    <Briefcase className="h-12 w-12 opacity-20" />
                                                    <p className="font-black uppercase text-[10px] tracking-widest">No s'han trobat obres</p>
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
