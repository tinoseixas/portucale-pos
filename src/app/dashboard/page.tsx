'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { PlusCircle, Calendar as CalendarIcon, User, Edit, Trash2, Briefcase, Filter, History, Search, X, Download, AlertTriangle, ShieldCheck, Loader2 } from 'lucide-react'
import type { ServiceRecord, Employee } from '@/lib/types'
import { useUser, useFirestore, updateDocumentNonBlocking, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, getDocs, collectionGroup, doc, getDoc, setDoc } from 'firebase/firestore';
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
  '#3b82f6', '#ef4444', '#10b981', '#f97316', '#8b5cf6', '#ec4899', '#f59e0b', '#14b8a6'
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
  
  const [needsBackup, setNeedsBackup] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const employeeDocRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'employees', user.uid);
  }, [firestore, user]);
  const { data: currentEmployee } = useDoc<Employee>(employeeDocRef);

  const handleCloudBackup = useCallback(async () => {
    if (!firestore || !user) return;
    const today = format(new Date(), 'yyyy-MM-dd');
    const backupId = `daily_${today}`;
    const backupRef = doc(firestore, 'backups', backupId);

    try {
        const backupSnap = await getDoc(backupRef);
        if (backupSnap.exists()) {
            return;
        }

        const data: any = {
            customers: [],
            projects: [],
            albarans: [],
            invoices: [],
            quotes: [],
            receipts: [],
            serviceRecords: []
        };

        const collections = ['customers', 'projects', 'albarans', 'invoices', 'quotes', 'receipts', 'employees'];
        for (const colName of collections) {
            const snap = await getDocs(collection(firestore, colName));
            data[colName] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        }

        const servicesSnap = await getDocs(collectionGroup(firestore, 'serviceRecords'));
        data.serviceRecords = servicesSnap.docs.map(d => ({ 
            id: d.id, 
            parentPath: d.ref.parent.path, 
            ...d.data() 
        }));

        await setDoc(backupRef, {
            id: backupId,
            createdAt: new Date().toISOString(),
            data: JSON.stringify(data),
            createdBy: user.uid
        });

        localStorage.setItem('last_backup_date', today);
        setNeedsBackup(false);
    } catch (e) {
        console.error("Error en la còpia de seguretat automàtica:", e);
    }
  }, [firestore, user]);

  useEffect(() => {
    if (isUserLoading || !firestore || !user) {
      if (!isUserLoading && !user) setIsLoadingData(false);
      return;
    }
    
    const fetchData = async () => {
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

            if (currentEmployee?.role === 'admin') {
                const lastBackup = localStorage.getItem('last_backup_date');
                const today = format(new Date(), 'yyyy-MM-dd');
                if (lastBackup !== today) {
                    setNeedsBackup(true);
                    handleCloudBackup();
                }
            }

        } catch (error) {
            console.error("Error en carregar dades:", error);
        } finally {
            setIsLoadingData(false);
        }
    };
    
    fetchData();
  }, [firestore, isUserLoading, user, currentEmployee?.role, handleCloudBackup]);
  
  const projectNames = useMemo(() => {
    const names = allServices.map(service => service.projectName?.trim()).filter(Boolean);
    const seen = new Set();
    const unique: string[] = [];
    names.forEach(n => {
        if (n) {
            const key = n.toLowerCase();
            if (!seen.has(key)) {
                seen.add(key);
                unique.push(n);
            }
        }
    });
    return unique.sort((a, b) => a.localeCompare(b, 'ca'));
  }, [allServices]);

  const filteredServices = useMemo(() => {
    let filtered = allServices.filter(service => {
        const userMatch = selectedUser === 'all' || service.employeeId === selectedUser;
        const dateMatch = !selectedDate || isSameDay(parseISO(service.arrivalDateTime), selectedDate);
        const projectMatch = selectedProject === 'all' || (service.projectName?.trim() === selectedProject);
        return userMatch && dateMatch && projectMatch;
    });

    const dayColors = ['bg-white', 'bg-slate-50'];
    let currentColorIndex = 0;
    let lastDate: string | null = null;
    
    const colored = filtered.slice().reverse().map(service => {
        const serviceDay = format(startOfDay(parseISO(service.arrivalDateTime)), 'yyyy-MM-dd');
        if (lastDate === null) {
            lastDate = serviceDay;
        } else if (serviceDay !== lastDate) {
            lastDate = serviceDay;
            currentColorIndex = (currentColorIndex + 1) % dayColors.length;
        }
        return {
            ...service,
            rowColor: dayColors[currentColorIndex],
        } as ServiceRecordWithColor;
    });
    return colored.reverse();

  }, [allServices, selectedUser, selectedDate, selectedProject]);
  
  const getEmployeeNameDisplay = (service: ServiceRecord) => {
    const employee = employees.find(e => e.id === service.employeeId);
    if (employee) return `${employee.firstName} ${employee.lastName}`;
    return service.employeeName || 'Tècnic';
  };

  const handleMoveToTrash = () => {
    if (!firestore) return;
    
    selectedRows.forEach(serviceId => {
      const service = allServices.find(s => s.id === serviceId);
      if (service) {
        const docRef = doc(firestore, `employees/${service.employeeId}/serviceRecords`, serviceId);
        updateDocumentNonBlocking(docRef, { 
            deleted: true, 
            deletedAt: new Date().toISOString() 
        });
      }
    });

    toast({
      title: `${selectedRows.length} registres enviats a la paperera`,
      description: 'Pots recuperar-los a la secció de Paperera.',
    });

    setAllServices(allServices.filter(s => !selectedRows.includes(s.id)));
    setSelectedRows([]);
  };

  const handleBackup = async () => {
    if (!firestore) return;
    setIsExporting(true);
    toast({ title: "Preparant còpia de seguretat...", description: "Espera un moment." });
    
    try {
        const data: any = {
            customers: [],
            projects: [],
            albarans: [],
            invoices: [],
            quotes: [],
            receipts: [],
            serviceRecords: []
        };

        const collections = ['customers', 'projects', 'albarans', 'invoices', 'quotes', 'receipts', 'employees'];
        for (const colName of collections) {
            const snap = await getDocs(collection(firestore, colName));
            data[colName] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        }

        const servicesSnap = await getDocs(collectionGroup(firestore, 'serviceRecords'));
        data.serviceRecords = servicesSnap.docs.map(d => ({ 
            id: d.id, 
            parentPath: d.ref.parent.path, 
            ...d.data() 
        }));

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const today = format(new Date(), 'yyyy-MM-dd');
        a.href = url;
        a.download = `TS-Serveis-Backup-${today}.json`;
        a.click();
        
        localStorage.setItem('last_backup_date', today);
        setNeedsBackup(false);
        toast({ title: "Còpia completada!", description: "Les teves dades estan segures." });
    } catch (e) {
        toast({ variant: 'destructive', title: "Error en la còpia" });
    } finally {
        setIsExporting(false);
    }
  };
  
  if (isUserLoading) {
    return (
      <div className="max-w-7xl mx-auto space-y-8 p-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }
  
  if (!user) {
    router.push('/');
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 md:space-y-12 px-4 md:px-8">
      
      {needsBackup && (
          <div className="bg-accent/15 border-2 border-accent/30 p-5 md:p-6 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-4 md:gap-6 animate-in slide-in-from-top duration-500 shadow-xl">
              <div className="flex items-center gap-4 text-center md:text-left">
                  <div className="hidden md:block bg-accent p-3 rounded-2xl shadow-lg">
                    <AlertTriangle className="h-6 w-6 text-accent-foreground" />
                  </div>
                  <div>
                      <p className="font-black text-slate-900 uppercase tracking-tight">Còpia de Seguretat Necessària</p>
                      <p className="text-[10px] md:text-xs text-slate-500 font-bold uppercase tracking-widest">Còpia automàtica en curs. Recomanem descàrrega local.</p>
                  </div>
              </div>
              <Button onClick={handleBackup} disabled={isExporting} className="bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest h-12 md:h-14 px-6 md:px-10 rounded-2xl shadow-xl w-full md:w-auto text-xs">
                  {isExporting ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Download className="mr-2 h-4 w-4" />}
                  DESCARREGAR ARA
              </Button>
          </div>
      )}

      <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-black tracking-tighter leading-[0.9] text-slate-900 uppercase">
            REGISTRES DE<br />TREBALL
          </h1>
          <p className="text-slate-400 font-bold uppercase text-[9px] md:text-[10px] tracking-[0.2em]">Supervisió de serveis realitzats per l'equip.</p>
        </div>
        <div className="flex items-center gap-2 md:gap-3 w-full md:w-auto">
            <Button asChild variant="outline" className="h-12 md:h-14 px-4 md:px-6 border-2 border-slate-300 text-slate-500 font-black uppercase tracking-widest rounded-2xl hover:bg-slate-50 text-[10px] md:text-xs">
                <Link href="/dashboard/trash">
                    <History className="mr-2 h-4 w-4" />
                    Paperera
                </Link>
            </Button>
            <Button asChild className="h-12 md:h-14 px-6 md:px-8 bg-accent hover:bg-accent/90 text-accent-foreground flex-1 md:flex-none font-black uppercase tracking-widest rounded-2xl shadow-xl hover:scale-[1.02] transition-transform text-[10px] md:text-xs">
                <Link href="/dashboard/new">
                    <PlusCircle className="mr-2 h-5 w-5 md:h-6 md:w-6" />
                    Nou Servei
                </Link>
            </Button>
        </div>
      </div>
      
      {isLoadingData ? (
        <div className="space-y-4">
            <Skeleton className="h-40 w-full rounded-3xl" />
        </div>
      ) : (
        <Card className="border-none shadow-2xl rounded-[2rem] md:rounded-[2.5rem] bg-white overflow-hidden">
            <CardHeader className="bg-slate-50/50 p-6 md:p-8 border-b border-slate-100">
                <div className="flex flex-col md:row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-3 text-slate-900">
                        <Filter className="h-5 w-5 md:h-6 w-6 text-primary" />
                        <CardTitle className="text-lg md:text-xl font-black uppercase tracking-tight">Filtres de Supervisió</CardTitle>
                    </div>
                    <div className="flex gap-2">
                        {currentEmployee?.role === 'admin' && !needsBackup && (
                            <Button variant="ghost" onClick={handleBackup} disabled={isExporting} className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-primary h-8 px-2">
                                <ShieldCheck className="h-3 w-3 md:h-4 md:w-4 mr-1.5" /> Backup OK
                            </Button>
                        )}
                        {selectedRows.length > 0 && (
                            <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" className="font-black uppercase tracking-widest h-9 px-4 rounded-xl shadow-lg text-[9px]">
                                <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Esborrar ({selectedRows.length})
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="rounded-[2.5rem] p-8 max-w-[90vw] md:max-w-lg">
                                <AlertDialogHeader>
                                <AlertDialogTitle className="text-xl md:text-2xl font-black uppercase">Moure a la paperera?</AlertDialogTitle>
                                <AlertDialogDescription className="text-sm md:text-base font-medium">Podràs recuperar aquests registres més tard si cal.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter className="pt-4 flex flex-col md:flex-row gap-2">
                                <AlertDialogCancel className="h-12 md:h-14 rounded-2xl font-bold border-2 w-full md:w-auto">Enrere</AlertDialogCancel>
                                <AlertDialogAction onClick={handleMoveToTrash} className="bg-red-600 h-12 md:h-14 rounded-2xl font-black uppercase tracking-widest px-8 w-full md:w-auto">Eliminar</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                            </AlertDialog>
                        )}
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-6">
                    <div className="space-y-1.5">
                        <label className="text-[9px] md:text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Tècnic</label>
                        <Select value={selectedUser} onValueChange={setSelectedUser}>
                        <SelectTrigger className="bg-white border-2 h-12 md:h-14 rounded-2xl font-bold text-slate-700 text-xs md:text-sm">
                            <User className="mr-2 h-4 w-4 md:h-5 md:w-5 text-slate-300" />
                            <SelectValue placeholder="Tots els Tècnics" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Tots els Tècnics</SelectItem>
                            <SelectItem value={user.uid} className="font-bold text-primary italic">La meva feina</SelectItem>
                            {employees.filter(e => e.id !== user.uid).map(emp => (
                            <SelectItem key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</SelectItem>
                            ))}
                        </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[9px] md:text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Data de Servei</label>
                        <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-start text-left font-bold bg-white border-2 h-12 md:h-14 rounded-2xl text-slate-700 text-xs md:text-sm">
                                <CalendarIcon className="mr-2 h-4 w-4 md:h-5 md:w-5 text-slate-300" />
                                {selectedDate ? format(selectedDate, "PPP", { locale: ca }) : <span>Tria una data</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} initialFocus locale={ca} />
                        </PopoverContent>
                        </Popover>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[9px] md:text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Obra / Projecte</label>
                        <Select value={selectedProject} onValueChange={setSelectedProject}>
                        <SelectTrigger className="bg-white border-2 h-12 md:h-14 rounded-2xl font-bold text-slate-700 text-xs md:text-sm">
                            <Briefcase className="mr-2 h-4 w-4 md:h-5 md:w-5 text-slate-300" />
                            <SelectValue placeholder="Totes les Obres" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Totes les Obres</SelectItem>
                            {projectNames.map(name => (
                            <SelectItem key={name} value={name}>{name}</SelectItem>
                            ))}
                        </SelectContent>
                        </Select>
                    </div>
                </div>
                
                {(selectedUser !== 'all' || selectedDate || selectedProject !== 'all') && (
                    <div className="flex justify-end pt-4">
                        <Button variant="ghost" onClick={() => { setSelectedUser('all'); setSelectedDate(undefined); setSelectedProject('all'); }} className="text-[9px] md:text-[10px] font-black uppercase text-primary tracking-widest hover:bg-primary/5 h-8">
                            <X className="h-3 w-3 mr-1" /> Netejar Filtres
                        </Button>
                    </div>
                )}
            </CardHeader>
            
            <CardContent className="p-0">
                <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-200">
                    <Table>
                    <TableHeader className="bg-slate-50/30">
                        <TableRow className="border-b-2 border-slate-50">
                        <TableHead className="w-[50px] md:w-[60px] px-4 md:px-8 py-4 md:py-6">
                            <Checkbox
                                checked={selectedRows.length > 0 && filteredServices.length > 0 && selectedRows.length === filteredServices.length}
                                onCheckedChange={(checked) => setSelectedRows(checked ? filteredServices.map(s => s.id) : [])}
                            />
                        </TableHead>
                        <TableHead className="font-black uppercase text-[9px] md:text-[10px] tracking-widest text-slate-400">Tècnic</TableHead>
                        <TableHead className="font-black uppercase text-[9px] md:text-[10px] tracking-widest text-slate-400">Data i Hora</TableHead>
                        <TableHead className="font-black uppercase text-[9px] md:text-[10px] tracking-widest text-slate-400">Obra</TableHead>
                        <TableHead className="font-black uppercase text-[9px] md:text-[10px] tracking-widest text-slate-400 hidden lg:table-cell">Descripció</TableHead>
                        <TableHead className="text-right px-4 md:px-8 font-black uppercase text-[9px] md:text-[10px] tracking-widest text-slate-400">Acció</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredServices.length > 0 ? filteredServices.map(service => (
                        <TableRow key={service.id} className={cn((service as any).rowColor, "hover:bg-slate-100/50 transition-colors border-b border-slate-50")}>
                            <TableCell className="px-4 md:px-8">
                                <Checkbox
                                    checked={selectedRows.includes(service.id)}
                                    onCheckedChange={(checked) => {
                                        setSelectedRows(checked ? [...selectedRows, service.id] : selectedRows.filter(id => id !== service.id));
                                    }}
                                />
                            </TableCell>
                            <TableCell>
                                <div className="flex items-center gap-2 md:gap-3">
                                    <div className="h-2.5 w-2.5 md:h-3 md:w-3 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: getUserColor(service.employeeId) }} />
                                    <span className="font-black text-[10px] md:text-xs text-slate-900 uppercase tracking-tight truncate max-w-[80px] md:max-w-none">{getEmployeeNameDisplay(service)}</span>
                                </div>
                            </TableCell>
                            <TableCell className="font-bold text-slate-500 text-[10px] md:text-xs whitespace-nowrap">
                                {format(parseISO(service.arrivalDateTime), 'dd/MM/yy HH:mm')}
                            </TableCell>
                            <TableCell className="max-w-[120px] md:max-w-[180px] truncate font-black text-slate-900 uppercase text-[10px] md:text-xs">
                                {service.projectName || 'SENSE NOM'}
                            </TableCell>
                            <TableCell className="max-w-[300px] truncate text-slate-400 text-xs hidden lg:table-cell italic font-medium">
                                {service.description}
                            </TableCell>
                            <TableCell className="text-right px-4 md:px-8">
                                <Button variant="outline" size="sm" asChild className="h-9 md:h-10 px-3 md:px-5 border-2 border-slate-200 rounded-xl font-black uppercase text-[9px] md:text-[10px] tracking-widest hover:border-primary hover:text-primary transition-all">
                                    <Link href={`/dashboard/edit/${service.id}?ownerId=${service.employeeId}`}>
                                        <Edit className="h-3 w-3 md:h-3.5 md:w-3.5 md:mr-2" /> <span className="hidden md:inline">Editar</span>
                                    </Link>
                                </Button>
                            </TableCell>
                        </TableRow>
                        )) : (
                        <TableRow>
                            <TableCell colSpan={6} className="h-64 text-center">
                                <div className="flex flex-col items-center justify-center space-y-4 opacity-30 grayscale">
                                    <Search className="h-10 w-10 md:h-12 md:w-12" />
                                    <p className="font-black uppercase text-[10px] md:text-xs tracking-widest italic">No s'han trobat registres que coincideixin.</p>
                                </div>
                            </TableCell>
                        </TableRow>
                        )}
                    </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
      )}
    </div>
  );
}
