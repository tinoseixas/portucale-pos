
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
import { Briefcase, Archive, Loader2, Plus, Users, Search, Trash2, Clock, RotateCcw } from 'lucide-react'
import { AdminGate } from '@/components/AdminGate'
import { format, parseISO } from 'date-fns'
import { ca } from 'date-fns/locale'
import { useToast } from '@/hooks/use-toast'
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

    const activeProjects = useMemo(() => filteredProjects.filter(p => p.status === 'active'), [filteredProjects]);
    const archivedProjects = useMemo(() => filteredProjects.filter(p => p.status === 'finished'), [filteredProjects]);

    const handleArchiveProject = async (projectId: string, currentStatus: string) => {
        if (!firestore) return;
        const newStatus = currentStatus === 'active' ? 'finished' : 'active';
        try {
            await updateDoc(doc(firestore, 'projects', projectId), { status: newStatus });
            toast({ title: newStatus === 'finished' ? 'Obra arxivada' : 'Obra reactivada' });
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

    if (isLoadingProjects) return <div className="p-12 text-center h-[60vh] flex flex-col items-center justify-center"><Loader2 className="h-16 w-16 animate-spin text-primary" /><p className="mt-6 text-primary font-black tracking-widest">Carregant obres...</p></div>

    return (
        <AdminGate pageTitle="Gestió d'obres" pageDescription="Administra el llistat d'obres actives i finalitzades.">
            <div className="space-y-8 max-w-6xl mx-auto pb-10">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <h1 className="text-3xl font-black tracking-tight flex items-center gap-3 text-primary">
                        <Briefcase className="h-8 w-8" /> Gestió d'obres
                    </h1>
                </div>

                <Card className="border-none shadow-2xl bg-slate-900 text-white rounded-3xl overflow-hidden">
                    <CardHeader className="p-8">
                        <CardTitle className="text-xl font-black flex items-center gap-2">
                            <Plus className="h-5 w-5 text-accent" /> Nova obra
                        </CardTitle>
                        <CardDescription className="text-slate-400">Defineix una obra per un client per poder-la seleccionar als registres.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-8 pt-0 grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Client associat</Label>
                            <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                                <SelectTrigger className="h-14 bg-slate-800 border-none text-white font-bold rounded-2xl">
                                    <SelectValue placeholder="Selecciona client..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Escull un client...</SelectItem>
                                    {uniqueCustomers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Nom de l'obra</Label>
                            <Input 
                                placeholder="Ex: Reforma cuina C/Major" 
                                value={newProjectName}
                                onChange={(e) => setNewProjectName(e.target.value)}
                                className="h-14 bg-slate-800 border-none text-white font-bold rounded-2xl"
                            />
                        </div>
                        <div className="flex items-end">
                            <Button 
                                onClick={handleCreateProject} 
                                disabled={isSaving || !newProjectName.trim() || selectedCustomerId === 'none'}
                                className="w-full h-14 bg-accent hover:bg-accent/90 text-accent-foreground font-black tracking-widest rounded-2xl shadow-xl hover:scale-[1.02] transition-all"
                            >
                                {isSaving ? <Loader2 className="animate-spin h-5 w-5 mr-2" /> : <Plus className="h-5 w-5 mr-2" />}
                                Crear obra
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Tabs defaultValue="actives" className="w-full">
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-6 mb-6">
                        <TabsList className="bg-slate-200/50 p-1 rounded-2xl h-14">
                            <TabsTrigger value="actives" className="font-bold gap-2 px-6 rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-lg">
                                <Clock className="h-4 w-4" /> Actives ({activeProjects.length})
                            </TabsTrigger>
                            <TabsTrigger value="arxivades" className="font-bold gap-2 px-6 rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-lg">
                                <Archive className="h-4 w-4" /> Arxivades ({archivedProjects.length})
                            </TabsTrigger>
                        </TabsList>
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

                    <TabsContent value="actives">
                        <Card className="border-none shadow-xl rounded-3xl overflow-hidden bg-white">
                            <CardContent className="p-0">
                                <ProjectTable projects={activeProjects} onArchive={handleArchiveProject} onDelete={handleDeleteProject} />
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="arxivades">
                        <Card className="border-none shadow-xl rounded-3xl overflow-hidden bg-white opacity-80">
                            <CardContent className="p-0">
                                <ProjectTable projects={archivedProjects} onArchive={handleArchiveProject} onDelete={handleDeleteProject} />
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </AdminGate>
    )
}

function ProjectTable({ projects, onArchive, onDelete }: { projects: Project[], onArchive: any, onDelete: any }) {
    return (
        <div className="overflow-x-auto">
            <Table>
                <TableHeader>
                    <TableRow className="bg-slate-50/50">
                        <TableHead className="px-8 py-4 font-black uppercase text-[10px] tracking-widest text-slate-400">Obra / Projecte</TableHead>
                        <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-400">Client</TableHead>
                        <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-400">Data creació</TableHead>
                        <TableHead className="text-right px-8 font-black uppercase text-[10px] tracking-widest text-slate-400">Accions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {projects.map(project => (
                        <TableRow key={project.id} className="hover:bg-slate-50 transition-colors border-b-2 border-slate-50">
                            <TableCell className="px-8 py-6">
                                <div className="font-black text-slate-900 tracking-tight text-sm">{project.name}</div>
                            </TableCell>
                            <TableCell className="text-slate-600 font-bold">{project.customerName}</TableCell>
                            <TableCell className="text-xs text-slate-400 font-bold">{format(parseISO(project.createdAt), 'dd/MM/yyyy', { locale: ca })}</TableCell>
                            <TableCell className="text-right px-8">
                                <div className="flex justify-end gap-3">
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        onClick={() => onArchive(project.id, project.status)}
                                        className={project.status === 'active' 
                                            ? 'h-10 w-10 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors' 
                                            : 'h-10 w-10 text-primary hover:text-primary hover:bg-primary/10 rounded-xl transition-colors'}
                                        title={project.status === 'active' ? 'Arxivar obra' : 'Reactivar obra'}
                                    >
                                        {project.status === 'active' ? <Archive className="h-4 w-4" /> : <RotateCcw className="h-4 w-4" />}
                                    </Button>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-10 w-10 text-red-300 hover:text-red-600 hover:bg-red-50 rounded-xl">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent className="rounded-[2.5rem] p-10">
                                            <AlertDialogHeader>
                                                <AlertDialogTitle className="text-2xl font-black">Eliminar obra?</AlertDialogTitle>
                                                <AlertDialogDescription className="text-base font-medium">Aquesta acció és permanent i no es pot desfer.</AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter className="pt-6">
                                                <AlertDialogCancel className="h-14 rounded-2xl font-bold border-2 px-8">Cancel·lar</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => onDelete(project.id)} className="bg-red-600 h-14 rounded-2xl font-black px-8 text-white">Eliminar</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                    {projects.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={4} className="h-48 text-center">
                                <div className="flex flex-col items-center justify-center text-slate-300 space-y-2">
                                    <Briefcase className="h-12 w-12 opacity-20" />
                                    <p className="font-black uppercase text-[10px] tracking-widest italic">Sense dades per mostrar</p>
                                </div>
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    )
}
