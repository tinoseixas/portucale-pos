
'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LogIn, MapPin, Users, Loader2, Briefcase, Plus, FileText, Sparkles } from 'lucide-react'
import { useToast } from "@/hooks/use-toast"
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase'
import { addDoc, collection, doc, query, orderBy, where } from 'firebase/firestore'
import type { Employee, Customer, ServiceRecord, Project } from '@/lib/types'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { translateToCatalan } from '@/ai/flows/translate-service-record'

export default function NewServicePage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isStarting, setIsStarting] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const { user, isUserLoading } = useUser()
  const firestore = useFirestore()
  
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('none');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('none');
  const [description, setDescription] = useState('');
  
  const [isNewProjectDialogOpen, setIsNewProjectDialogOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [isCreatingProject, setIsCreatingProject] = useState(false);

  const employeeDocRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'employees', user.uid);
  }, [firestore, user]);

  const { data: currentEmployee, isLoading: isLoadingEmployee } = useDoc<Employee>(employeeDocRef);
  
  const customersQuery = useMemoFirebase(() => {
      if (!firestore || !user) return null
      return query(collection(firestore, 'customers'), orderBy('name', 'asc'))
  }, [firestore, user]);

  const { data: customers, isLoading: isLoadingCustomers } = useCollection<Customer>(customersQuery);

  const projectsQuery = useMemoFirebase(() => {
      if (!firestore || selectedCustomerId === 'none') return null;
      return query(
          collection(firestore, 'projects'), 
          where('customerId', '==', selectedCustomerId)
      );
  }, [firestore, selectedCustomerId]);

  const { data: allProjects, isLoading: isLoadingProjects } = useCollection<Project>(projectsQuery);

  const activeProjects = useMemo(() => {
      if (!allProjects) return [];
      return allProjects.filter(p => p.status === 'active').sort((a, b) => a.name.localeCompare(b.name, 'ca'));
  }, [allProjects]);

  const handleCreateProject = async () => {
      if (!firestore || !newProjectName.trim() || selectedCustomerId === 'none') return;
      setIsCreatingProject(true);
      try {
          const customer = customers?.find(c => c.id === selectedCustomerId);
          await addDoc(collection(firestore, 'projects'), {
              name: newProjectName.trim(),
              customerId: selectedCustomerId,
              customerName: customer?.name || 'N/A',
              status: 'active',
              createdAt: new Date().toISOString()
          });
          toast({ title: "Obra creada" });
          setIsNewProjectDialogOpen(false);
          setNewProjectName('');
      } catch (e) {
          toast({ variant: 'destructive', title: "Error" });
      } finally {
          setIsCreatingProject(false);
      }
  };

  const handleTranslate = async () => {
    if (!description.trim()) return;
    setIsTranslating(true);
    try {
        const result = await translateToCatalan({ text: description });
        if (result && result.translatedText) {
            setDescription(result.translatedText);
            toast({ title: "Traducció feta" });
        }
    } catch (e) {
        toast({ variant: 'destructive', title: "Error traducció" });
    } finally {
        setIsTranslating(false);
    }
  };

  const handleStartService = async () => {
    if (!user || !firestore || !currentEmployee) return;
    setIsStarting(true);
    try {
        const selectedCustomer = customers?.find(c => c.id === selectedCustomerId);
        const selectedProject = activeProjects?.find(p => p.id === selectedProjectId);
        const now = new Date();
        const serviceRecord: Omit<ServiceRecord, 'id'> = {
            employeeId: currentEmployee.id,
            employeeName: `${currentEmployee.firstName} ${currentEmployee.lastName}`,
            arrivalDateTime: now.toISOString(),
            departureDateTime: now.toISOString(), 
            description: description.trim() || "Servei en curs...",
            projectName: selectedProject?.name.trim() || '',
            projectId: selectedProjectId !== 'none' ? selectedProjectId : '',
            pendingTasks: '',
            customerId: selectedCustomerId !== 'none' ? selectedCustomerId : '',
            customerName: selectedCustomer?.name || '',
            serviceHourlyRate: currentEmployee.hourlyRate,
            media: [],
            albarans: [],
            materials: [],
            createdAt: now.toISOString(),
            isLunchSubtracted: true
        };
        const docRef = await addDoc(collection(firestore, `employees/${currentEmployee.id}/serviceRecords`), serviceRecord);
        toast({ title: "Servei iniciat" });
        router.push(`/dashboard/edit/${docRef.id}?ownerId=${currentEmployee.id}`);
    } catch (error) {
        setIsStarting(false);
        toast({ variant: "destructive", title: "Error" });
    }
  };
  
  if (!user && !isUserLoading) return <div className="p-12 text-center"><Button asChild><Link href="/">Anar al Login</Link></Button></div>;

  return (
      <div className="max-w-2xl mx-auto flex items-center justify-center min-h-[80vh] py-10 px-4">
        <Card className="w-full shadow-2xl border-none rounded-3xl overflow-hidden">
          <CardHeader className="bg-slate-900 text-white p-8 text-center space-y-2">
            <CardTitle className="text-3xl font-black uppercase tracking-tight">Nou Registre</CardTitle>
            <CardDescription className="text-slate-400 font-medium">Comença un nou treball.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8 pt-10 px-6 sm:px-10">
              <div className="space-y-6">
                <div className="space-y-2">
                    <Label className="flex items-center gap-2 font-black uppercase text-[10px] text-slate-400 tracking-widest pl-1"><Users className="h-3 w-3" /> Client</Label>
                    <Select value={selectedCustomerId} onValueChange={(val) => { setSelectedCustomerId(val); setSelectedProjectId('none'); }}>
                        <SelectTrigger className="h-14 rounded-2xl border-2 font-bold bg-slate-50">
                            <SelectValue placeholder="Selecciona un client" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">Cap client</SelectItem>
                            {customers?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>

                {selectedCustomerId !== 'none' && (
                    <div className="space-y-2">
                        <div className="flex justify-between items-center px-1">
                            <Label className="flex items-center gap-2 font-black uppercase text-[10px] text-slate-400 tracking-widest"><Briefcase className="h-3 w-3" /> Obra / Projecte</Label>
                            <Dialog open={isNewProjectDialogOpen} onOpenChange={setIsNewProjectDialogOpen}>
                                <DialogTrigger asChild><button className="text-[10px] font-black text-primary hover:underline uppercase">+ NOVA OBRA</button></DialogTrigger>
                                <DialogContent className="rounded-3xl">
                                    <DialogHeader><DialogTitle>Nova Obra</DialogTitle></DialogHeader>
                                    <div className="py-4"><Input placeholder="Nom de l'obra" value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)} className="h-12 rounded-xl font-bold" /></div>
                                    <DialogFooter><Button onClick={handleCreateProject} disabled={isCreatingProject || !newProjectName.trim()} className="bg-primary font-bold">Crear</Button></DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </div>
                        <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                            <SelectTrigger className="h-14 rounded-2xl border-2 font-bold bg-slate-50">
                                <SelectValue placeholder="Selecciona obra..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">Cap obra seleccionada</SelectItem>
                                {activeProjects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                )}

                <div className="space-y-2">
                    <div className="flex justify-between items-center px-1">
                        <Label className="flex items-center gap-2 font-black uppercase text-[10px] text-slate-400 tracking-widest"><FileText className="h-3 w-3" /> Descripció del treball</Label>
                        <Button type="button" variant="ghost" size="sm" onClick={handleTranslate} disabled={isTranslating || !description.trim()} className="text-primary font-black text-[10px] uppercase gap-1">
                            {isTranslating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />} Traduir (IA)
                        </Button>
                    </div>
                    <Textarea placeholder="Què has de fer avui?" value={description} onChange={(e) => setDescription(e.target.value)} className="rounded-2xl border-2 font-medium bg-slate-50 min-h-[120px] text-lg" />
                </div>
              </div>

              <Button size="lg" className="w-full h-20 text-xl font-black uppercase tracking-tight bg-accent hover:bg-accent/90 text-accent-foreground rounded-3xl shadow-xl hover:scale-[1.02] transition-transform" onClick={handleStartService} disabled={isStarting || isLoadingEmployee}>
                  {isStarting ? <Loader2 className="mr-3 h-8 w-8 animate-spin" /> : <MapPin className="mr-3 h-8 w-8" />}
                  INICIAR SERVEI
              </Button>
          </CardContent>
        </Card>
      </div>
  )
}
