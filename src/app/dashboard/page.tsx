'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { PlusCircle, Calendar as CalendarIcon, User, Edit, Trash2, Briefcase, Filter, History, Search, X, Download, AlertTriangle, Loader2, RefreshCw } from 'lucide-react'
import type { ServiceRecord, Employee } from '@/lib/types'
import { useUser, useFirestore, updateDocumentNonBlocking, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, getDocs, collectionGroup, doc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { format, parseISO, isSameDay, startOfDay } from 'date-fns'
import { ca } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { Checkbox } from "@/components/ui/checkbox"
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
import { useToast } from "@/hooks/use-toast"

const userColors = [
  '#005691', '#E31E24', '#10b981', '#f97316', '#8b5cf6', '#ec4899', '#FFD700', '#14b8a6'
];

const getUserColor = (userId: string) => {
  if (!userId) return '#94a3b8';
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return userColors[Math.abs(hash) % userColors.length];
};

type ServiceRecordWithColor = ServiceRecord & { rowColor: string };

export default function DashboardPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [allServices, setAllServices] = useState<ServiceRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);

  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedProject, setSelectedProject] = useState<string>('all');
  
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const employeeDocRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'employees', user.uid);
  }, [firestore, user]);
  const { data: currentEmployee } = useDoc<Employee>(employeeDocRef);

  const fetchData = useCallback(async () => {
    if (!firestore || !user) return;
    setIsLoadingData(true);
    try {
        const employeeSnapshot = await getDocs(query(collection(firestore, 'employees')));
        const employeesData = employeeSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Employee));
        setEmployees(employeesData);

        const servicesQuery = query(collectionGroup(firestore, 'serviceRecords'), orderBy('arrivalDateTime', 'desc'));
        const serviceSnapshot = await getDocs(servicesQuery);
        const servicesData = serviceSnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() } as ServiceRecord))
            .filter(s => !s.deleted); 
        setAllServices(servicesData);
    } catch (error) {
        console.error("Error carregar dades:", error);
        toast({ variant: 'destructive', title: "Error", description: "No s'han pogut carregar els registres." });
    } finally {
        setIsLoadingData(false);
    }
  }, [firestore, user, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshTrigger]);

  const projectNames = useMemo(() => {
    const names = allServices.map(s => s.projectName?.trim()).filter(Boolean);
    const unique = Array.from(new Set(names));
    return (unique as string[]).sort((a, b) => a.localeCompare(b, 'ca'));
  }, [allServices]);

  const filteredServices = useMemo(() => {
    let filtered = allServices.filter(service => {
        const userMatch = selectedUser === 'all' || service.employeeId === selectedUser;
        const dateMatch = !selectedDate || isSameDay(parseISO(service.arrivalDateTime), selectedDate);
        const projectMatch = selectedProject === 'all' || (service.projectName?.trim() === selectedProject);
        return userMatch && dateMatch && projectMatch;
    });

    const dayColors = ['bg-white', 'bg-slate-50/50'];
    let currentColorIndex = 0;
    let lastDate: string | null = null;
    
    return filtered.map(service => {
        const serviceDay = format(startOfDay(parseISO(service.arrivalDateTime)), 'yyyy-MM-dd');
        if (lastDate !== null && serviceDay !== lastDate) {
            currentColorIndex = (currentColorIndex + 1) % dayColors.length;
        }
        lastDate = serviceDay;
        return { ...service, rowColor: dayColors[currentColorIndex] } as ServiceRecordWithColor;
    });
  }, [allServices, selectedUser, selectedDate, selectedProject]);
  
  const handleMoveToTrash = () => {
    if (!firestore) return;
    selectedRows.forEach(id => {
      const service = allServices.find(s => s.id === id);
      if (service) {
        const docRef = doc(firestore, `employees/${service.employeeId}/serviceRecords`, id);
        updateDocumentNonBlocking(docRef, { deleted: true, deletedAt: new Date().toISOString() });
      }
    });
    setAllServices(prev => prev.filter(s => !selectedRows.includes(s.id)));
    setSelectedRows([]);
    toast({ title: "Enviat a la paperera" });
  };

  if (isUserLoading || isLoadingData) return <div className="max-w-7xl mx-auto p-8"><Skeleton className="h-40 w-full rounded-3xl" /></div>;
  if (!user) { router.push('/'); return null; }

  return (
    <div className="max-w-7xl mx-auto space-y-8 md:space-y-12 px-4 md:px-8 pb-20">
      <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter leading-none text-primary uppercase">REGISTRES DE<br /><span className="text-accent">TREBALL</span></h1>
          <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em] pl-1">Supervisió detallada dels serveis realitzats per l'equip.</p>
        </div>
        <div className="flex flex-wrap gap-3 w-full md:w-auto">
            <Button onClick={() => setRefreshTrigger(prev => prev + 1)} variant="outline" className="h-14 border-2 border-slate-200 text-slate-500 font-black uppercase tracking-widest rounded-2xl text-[10px] px-6">
                <RefreshCw className="mr-2 h-4 w-4" />Actualitzar
            </Button>
            <Button asChild variant="outline" className="h-14 border-2 border-slate-200 text-slate-500 font-black uppercase tracking-widest rounded-2xl text-[10px] px-6">
                <Link href="/dashboard/trash"><History className="mr-2 h-4 w-4" />Paperera</Link>
            </Button>
            <Button asChild className="h-14 bg-accent hover:bg-accent/90 text-primary flex-1 md:flex-none font-black uppercase tracking-widest rounded-2xl shadow-xl text-[10px] px-8 border-b-4 border-primary/20">
                <Link href="/dashboard/new"><PlusCircle className="mr-2 h-5 w-5" />Nou Registre</Link>
            </Button>
        </div>
      </div>
      
      <Card className="border-none shadow-2xl rounded-[2.5rem] bg-white overflow-hidden border-t-8 border-primary">
          <CardHeader className="bg-slate-50/50 p-8 border-b border-slate-100 space-y-6">
              <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3 text-primary">
                      <Filter className="h-6 w-6" />
                      <CardTitle className="text-xl font-black uppercase tracking-tight">Filtres de Control</CardTitle>
                  </div>
                  {selectedRows.length > 0 && (
                      <AlertDialog>
                          <AlertDialogTrigger asChild>
                              <Button variant="destructive" className="font-black uppercase h-10 px-6 rounded-xl shadow-lg text-[10px] bg-destructive hover:bg-destructive/90">
                                  <Trash2 className="mr-2 h-4 w-4" /> Esborrar ({selectedRows.length})
                              </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="rounded-[2.5rem] p-10">
                              <AlertDialogHeader>
                                  <AlertDialogTitle className="text-2xl font-black uppercase text-primary">Moure a la paperera?</AlertDialogTitle>
                                  <AlertDialogDescription className="font-medium text-base text-slate-500">Aquests registres podran ser recuperats més tard si cal.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter className="pt-6">
                                  <AlertDialogCancel className="h-14 rounded-2xl font-bold border-2">Enrere</AlertDialogCancel>
                                  <AlertDialogAction onClick={handleMoveToTrash} className="bg-destructive h-14 rounded-2xl font-black uppercase tracking-widest px-8">Confirmar</AlertDialogAction>
                              </AlertDialogFooter>
                          </AlertDialogContent>
                      </AlertDialog>
                  )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Tècnic Responsable</label>
                      <Select value={selectedUser} onValueChange={setSelectedUser}>
                          <SelectTrigger className="h-14 rounded-2xl border-2 font-bold bg-white text-xs text-primary">
                              <User className="mr-2 h-4 w-4 text-slate-300" />
                              <SelectValue placeholder="Tots els Tècnics" />
                          </SelectTrigger>
                          <SelectContent>
                              <SelectItem value="all">Tots els Tècnics</SelectItem>
                              {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName}</SelectItem>)}
                          </SelectContent>
                      </Select>
                  </div>
                  <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Data de Realització</label>
                      <Popover>
                          <PopoverTrigger asChild>
                              <Button variant="outline" className="w-full justify-start text-left font-bold border-2 h-14 rounded-2xl bg-white text-xs text-primary">
                                  <CalendarIcon className="mr-2 h-4 w-4 text-slate-300" />
                                  {selectedDate ? format(selectedDate, "PPP", { locale: ca }) : <span>Tria una data</span>}
                              </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} locale={ca} /></PopoverContent>
                      </Popover>
                  </div>
                  <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Projecte / Obra</label>
                      <Select value={selectedProject} onValueChange={setSelectedProject}>
                          <SelectTrigger className="h-14 rounded-2xl border-2 font-bold bg-white text-xs text-primary">
                              <Briefcase className="mr-2 h-4 w-4 text-slate-300" />
                              <SelectValue placeholder="Totes les Obres" />
                          </SelectTrigger>
                          <SelectContent>
                              <SelectItem value="all">Totes les Obres</SelectItem>
                              {projectNames.map(name => <SelectItem key={name} value={name}>{name}</SelectItem>)}
                          </SelectContent>
                      </Select>
                  </div>
              </div>
          </CardHeader>
          <CardContent className="p-0">
              <div className="overflow-x-auto">
                  <Table>
                      <TableHeader className="bg-slate-50/30">
                          <TableRow className="border-b-2 border-slate-50">
                              <TableHead className="w-16 px-8 py-6">
                                  <Checkbox 
                                      checked={selectedRows.length > 0 && selectedRows.length === filteredServices.length}
                                      onCheckedChange={c => setSelectedRows(c ? filteredServices.map(s => s.id) : [])}
                                  />
                              </TableHead>
                              <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-400">Tècnic</TableHead>
                              <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-400">Data i Hora</TableHead>
                              <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-400">Obra</TableHead>
                              <TableHead className="text-right px-8 font-black uppercase text-[10px] tracking-widest">Acció</TableHead>
                          </TableRow>
                      </TableHeader>
                      <TableBody>
                          {filteredServices.map(service => (
                              <TableRow key={service.id} className={cn(service.rowColor, "hover:bg-primary/5 transition-colors border-b border-slate-50")}>
                                  <TableCell className="px-8"><Checkbox checked={selectedRows.includes(service.id)} onCheckedChange={c => setSelectedRows(prev => c ? [...prev, service.id] : prev.filter(id => id !== service.id))} /></TableCell>
                                  <TableCell>
                                      <div className="flex items-center gap-3">
                                          <div className="h-3 w-3 rounded-full shadow-sm border border-black/10" style={{ backgroundColor: getUserColor(service.employeeId) }} />
                                          <span className="font-black text-xs text-slate-900 uppercase tracking-tight">{service.employeeName || 'Tècnic'}</span>
                                      </div>
                                  </TableCell>
                                  <TableCell className="font-bold text-slate-500 text-xs">{format(parseISO(service.arrivalDateTime), 'dd/MM/yy HH:mm')}</TableCell>
                                  <TableCell className="font-black text-primary uppercase text-xs truncate max-w-[200px]">{service.projectName || 'SENSE NOM'}</TableCell>
                                  <TableCell className="text-right px-8">
                                      <Button variant="outline" size="sm" asChild className="h-10 px-5 border-2 rounded-xl font-black uppercase text-[10px] tracking-widest border-primary/20 text-primary hover:bg-primary hover:text-white transition-all">
                                          <Link href={`/dashboard/edit/${service.id}?ownerId=${service.employeeId}`}><Edit className="h-3.5 w-3.5 mr-2" />Editar</Link>
                                      </Button>
                                  </TableCell>
                              </TableRow>
                          ))}
                          {filteredServices.length === 0 && (
                              <TableRow><TableCell colSpan={5} className="h-64 text-center opacity-30 grayscale"><Search className="h-12 w-12 mx-auto mb-4" /><p className="font-black uppercase text-xs italic">No s'han trobat registres segons els filtres.</p></TableCell></TableRow>
                          )}
                      </TableBody>
                  </Table>
              </div>
          </CardContent>
      </Card>
    </div>
  );
}
