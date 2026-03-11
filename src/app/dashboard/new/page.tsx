'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LogIn, MapPin, Users, Loader2, Briefcase, Plus, Sparkles, FileText } from 'lucide-react'
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
      const filtered = allProjects.filter(p => p.status === 'active');
      const seen = new Set();
      return filtered.filter(p => {
          const nameKey = p.name.toLowerCase().trim().replace(/\s+/g, ' ');
          if (seen.has(nameKey)) return false;
          seen.add(nameKey);
          return true;
      }).sort((a, b) => a.name.localeCompare(b.name));
  }, [allProjects]);

  const uniqueCustomers = useMemo(() => {
    if (!customers) return [];
    const seen = new Set();
    return customers.filter(c => {
      const nameKey = c.name.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
      if (seen.has(nameKey)) return false;
      seen.add(nameKey);
      return true;
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [customers]);

  const handleTranslate = async () => {
    if (!description || !description.trim()) return;
    setIsTranslating(true);
    try {
        const res = await translateToCatalan({ text: description });
        if (res && res.translatedText) {
            setDescription(res.translatedText);
            toast({ title: 'Traducció completada', description: 'El text ha estat corregit correctament.' });
        }
    } catch (e) {
        toast({ variant: 'destructive', title: 'Error en la traducció' });
    } finally {
        setIsTranslating(false);
    }
  };

  const handleCreateProject = async () => {
      if (!firestore || !newProjectName.trim() || selectedCustomerId === 'none') return;
      setIsCreatingProject(true);
      try {
          const customer = uniqueCustomers.find(c => c.id === selectedCustomerId);
          const projectRef = await addDoc(collection(firestore, 'projects'), {
              name: newProjectName.trim(),
              customerId: selectedCustomerId,
              customerName: customer?.name || 'N/A',
              status: 'active',
              createdAt: new Date().toISOString()
          });
          toast({ title: "Obra creada", description: "S'ha afegit la nova obra correctament." });
          setSelectedProjectId(projectRef.id);
          setIsNewProjectDialogOpen(false);
          setNewProjectName('');
      } catch (e) {
          console.error(e);
          toast({ variant: 'destructive', title: "Error", description: "No s'ha pogut crear l'obra." });
      } finally {
          setIsCreatingProject(false);
      }
  };

  const handleStartService = async () => {
    if (!user || !firestore || !currentEmployee) {
        toast({ variant: "destructive", title: "Error", description: "No s'han pogut carregar les dades de l'usuari." });
        return;
    }
    
    setIsStarting(true);

    try {
        const selectedCustomer = uniqueCustomers?.find(c => c.id === selectedCustomerId);
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
            customerId: selectedCustomerId !== 'none' ? selectedCustomer?.id || '' : '',
            customerName: selectedCustomerId !== 'none' ? selectedCustomer?.name || '' : '',
            serviceHourlyRate: currentEmployee.hourlyRate,
            media: [],
            albarans: [],
            materials: [],
            createdAt: now.toISOString(),
            isLunchSubtracted: true
        };
        
        const serviceRecordsCollection = collection(firestore, `employees/${currentEmployee.id}/serviceRecords`);
        const docRef = await addDoc(serviceRecordsCollection, serviceRecord);
        
        toast({ 
            title: `Servei iniciat!`,
            description: "S'ha obert un nou registre de treball.",
        });
        
        router.push(`/dashboard/edit/${docRef.id}?ownerId=${currentEmployee.id}`);

    } catch (error) {
        console.error("Error creating service record:", error);
        setIsStarting(false);
        toast({ variant: "destructive", title: "Error", description: "No s'ha pogut iniciar el servei." });
    }
  };
  
  const isDataLoading = isUserLoading || isLoadingEmployee || isLoadingCustomers;

  if (!user && !isUserLoading) {
    return (
      <div className="max-w-2xl mx-auto flex items-center justify-center h-[70vh]">
        <Card className="text-center w-full">
          <CardHeader>
            <CardTitle>Inicia Sessió</CardTitle>
            <CardDescription>Necessites accés per registrar serveis.</CardDescription>
          </CardHeader>
          <CardContent>
             <Button asChild className="bg-primary text-white">
                <Link href="/">Anar al Portal</Link>
              </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
      <div className="max-w-2xl mx-auto flex items-center justify-center min-h-[80vh] py-10">
        <Card className="w-full shadow-2xl border-none rounded-3xl overflow-hidden">
          <CardHeader className="bg-slate-900 text-white p-8 text-center">
            <CardTitle className="text-3xl font-black uppercase tracking-tight">Nou Registre</CardTitle>
            <CardDescription className="text-slate-400">Comença un nou treball per a un client.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8 pt-10">
              <div className="space-y-6">
                <div className="space-y-2">
                    <Label htmlFor="customerId" className="flex items-center gap-2 font-black uppercase text-[10px] text-slate-400 tracking-widest pl-1"><Users className="h-3 w-3" /> Client</Label>
                    <Select value={selectedCustomerId} onValueChange={(val) => { setSelectedCustomerId(val); setSelectedProjectId('none'); }}>
                    <SelectTrigger id="customerId" className="h-14 rounded-2xl border-2 font-bold bg-slate-50">
                        <SelectValue placeholder={isLoadingCustomers ? "Carregant..." : "Selecciona un client"} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="none">Cap client</SelectItem>
                        {uniqueCustomers?.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                    </SelectContent>
                    </Select>
                </div>

                {selectedCustomerId !== 'none' && (
                    <div className="space-y-2">
                        <div className="flex justify-between items-center px-1">
                            <Label htmlFor="projectId" className="flex items-center gap-2 font-black uppercase text-[10px] text-slate-400 tracking-widest"><Briefcase className="h-3 w-3" /> Obra / Projecte</Label>
                            <Dialog open={isNewProjectDialogOpen} onOpenChange={setIsNewProjectDialogOpen}>
                                <DialogTrigger asChild>
                                    <button className="text-[10px] font-black text-primary hover:underline uppercase">+ NOVA OBRA</button>
                                </DialogTrigger>
                                <DialogContent className="rounded-3xl">
                                    <DialogHeader>
                                        <DialogTitle>Nova Obra</DialogTitle>
                                        <DialogDescription>Afegeix una nova obra activa per a aquest client.</DialogDescription>
                                    </DialogHeader>
                                    <div className="py-4">
                                        <Input 
                                            placeholder="Nom de l'obra" 
                                            value={newProjectName}
                                            onChange={(e) => setNewProjectName(e.target.value)}
                                            className="h-12 rounded-xl font-bold"
                                        />
                                    </div>
                                    <DialogFooter>
                                        <Button variant="outline" onClick={() => setIsNewProjectDialogOpen(false)}>Enrere</Button>
                                        <Button onClick={handleCreateProject} disabled={isCreatingProject || !newProjectName.trim()} className="bg-primary font-bold">Crear Obra</Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </div>
                        <Select value={selectedProjectId} onValueChange={setSelectedProjectId} disabled={isLoadingProjects}>
                            <SelectTrigger id="projectId" className="h-14 rounded-2xl border-2 font-bold bg-slate-50">
                                <SelectValue placeholder={isLoadingProjects ? "Carregant obres..." : "Selecciona una obra activa"} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">Selecciona una obra...</SelectItem>
                                {activeProjects?.map(p => (
                                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                ))}
                                {activeProjects?.length === 0 && <SelectItem value="none" disabled>No hi ha obres actives</SelectItem>}
                            </SelectContent>
                        </Select>
                    </div>
                )}

                <div className="space-y-2">
                    <div className="flex justify-between items-center px-1">
                        <Label htmlFor="description" className="flex items-center gap-2 font-black uppercase text-[10px] text-slate-400 tracking-widest"><FileText className="h-3 w-3" /> Què vas a fer? (Opcional)</Label>
                        <Button 
                            type="button" 
                            variant="ghost" 
                            size="sm" 
                            onClick={handleTranslate} 
                            disabled={isTranslating || !description.trim()}
                            className="h-6 text-[10px] font-black text-primary uppercase hover:bg-primary/5 px-2 rounded-lg"
                        >
                            {isTranslating ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Sparkles className="h-3 w-3 mr-1" />}
                            Traduir (IA)
                        </Button>
                    </div>
                    <Textarea 
                        id="description"
                        placeholder="Ex: Instal·lació de caldera, revisió de tubs..." 
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="rounded-2xl border-2 font-medium bg-slate-50 min-h-[100px]"
                    />
                </div>
              </div>

              <Button 
                  size="lg" 
                  className="w-full h-20 text-xl font-black uppercase tracking-tighter bg-accent hover:bg-accent/90 text-accent-foreground rounded-[2rem] shadow-xl hover:scale-[1.02] transition-transform mt-4"
                  onClick={handleStartService}
                  disabled={isDataLoading || isStarting}
              >
                  {isDataLoading ? <Loader2 className="mr-3 h-8 w-8 animate-spin" /> : <MapPin className="mr-3 h-8 w-8" />}
                  {isDataLoading ? "CARREGANT..." : (isStarting ? "INICIANT..." : "INICIAR SERVEI")}
              </Button>
          </CardContent>
        </Card>
      </div>
  )
}
