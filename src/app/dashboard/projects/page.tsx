
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
    
    // Form states for new project
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
            const customer = customers?.find(c => c.id === selectedCustomerId);
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

    if (isLoadingProjects) return <div className="p-12 text-center"><Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" /></div>

    return (
        <AdminGate pageTitle="Gestió d'Obres" pageDescription="Administra el llistat d'obres actives i finalitzades.">
            <div className="space-y-8 max-w-6xl mx-auto pb-10">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <h1 className="text-3xl font-black uppercase tracking-tight flex items-center gap-3">
                        <Briefcase className="h-8 w-8 text-primary" /> Gestió d'Obres
                    </h1>
                </div>

                <Card className="border-none shadow-lg bg-slate-900 text-white rounded-3xl overflow-hidden">
                    <CardHeader>
                        <CardTitle className="text-lg">Nova Obra / Projecte</CardTitle>
                        <CardDescription className="text-slate-400">Defineix una obra per un client per poder-la seleccionar als registres.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-slate-400">Client Associat</Label>
                            <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                                <SelectTrigger className="h-12 bg-slate-800 border-none text-white font-bold rounded-xl">
                                    <SelectValue placeholder="Selecciona client" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Escull un client...</SelectItem>
                                    {customers?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-slate-400">Nom de l'Obra</Label>
                            <Input 
                                placeholder="Ex: Reforma Cuina C/Major" 
                                value={newProjectName}
                                onChange={(e) => setNewProjectName(e.target.value)}
                                className="h-12 bg-slate-800 border-none text-white font-bold rounded-xl"
                            />
                        </div>
                        <div className="flex items-end">
                            <Button 
                                onClick={handleCreateProject} 
                                disabled={isSaving || !newProjectName.trim() || selectedCustomerId === 'none'}
                                className="w-full h-12 bg-accent hover:bg-accent/90 text-accent-foreground font-black uppercase tracking-widest rounded-xl"
                            >
                                {isSaving ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                                CREAR OBRA
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-xl rounded-3xl overflow-hidden">
                    <CardHeader className="bg-slate-50 border-b">
                        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                            <CardTitle>Llistat d'Obres</CardTitle>
                            <div className="relative w-full sm:w-72">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input 
                                    placeholder="Cerca obra o client..." 
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10 h-10 bg-white border-2 rounded-xl"
                                />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-50/50">
                                        <TableHead className="font-black uppercase text-[10px]">Obra / Projecte</TableHead>
                                        <TableHead className="font-black uppercase text-[10px]">Client</TableHead>
                                        <TableHead className="font-black uppercase text-[10px]">Estat</TableHead>
                                        <TableHead className="font-black uppercase text-[10px]">Data Creació</TableHead>
                                        <TableHead className="text-right font-black uppercase text-[10px]">Accions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredProjects.map(project => (
                                        <TableRow key={project.id} className="hover:bg-slate-50/50">
                                            <TableCell className="font-bold text-slate-900">{project.name}</TableCell>
                                            <TableCell className="text-slate-600 font-medium">{project.customerName}</TableCell>
                                            <TableCell>
                                                <Badge variant={project.status === 'active' ? 'default' : 'outline'} className="uppercase font-black text-[10px]">
                                                    {project.status === 'active' ? 'ACTIVA' : 'FINALITZADA'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-xs text-slate-400">{format(parseISO(project.createdAt), 'dd/MM/yyyy', { locale: ca })}</TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button 
                                                        variant="ghost" 
                                                        size="sm" 
                                                        onClick={() => handleArchiveProject(project.id, project.status)}
                                                        className={project.status === 'active' ? 'text-green-600' : 'text-primary'}
                                                        title={project.status === 'active' ? 'Marcar com Finalitzada' : 'Reactivar Obra'}
                                                    >
                                                        {project.status === 'active' ? <CheckCircle2 className="h-4 w-4 mr-1" /> : <Archive className="h-4 w-4 mr-1" />}
                                                        {project.status === 'active' ? 'Enllestir' : 'Reactivar'}
                                                    </Button>
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="text-red-400 hover:text-red-600">
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>Vols eliminar aquesta obra?</AlertDialogTitle>
                                                                <AlertDialogDescription>Si l'elimines, deixarà d'aparèixer als selectors. Els registres de treball ja creats no es veuran afectats.</AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Cancel·lar</AlertDialogCancel>
                                                                <AlertDialogAction onClick={() => handleDeleteProject(project.id)} className="bg-destructive">Eliminar</AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {filteredProjects.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-32 text-center text-slate-400 italic">No s'ha trobat cap obra amb aquests filtres.</TableCell>
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
