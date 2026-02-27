'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { PlusCircle, Calendar as CalendarIcon, User, Edit, Trash2, Briefcase, Filter } from 'lucide-react'
import type { ServiceRecord, Employee } from '@/lib/types'
import { useUser, useFirestore, deleteDocumentNonBlocking } from '@/firebase';
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
  '#3b82f6', '#ef4444', '#10b981', '#f97316', '#8b5cf6', '#ec4899', '#f59e0b', '#14b8a6'
];

const getUserColor = (userId: string) => {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return userColors[Math.abs(hash) % userColors.length];
};

type ServiceWithRowColor = ServiceRecord & { rowColor: string };

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
            const servicesData = serviceSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ServiceRecord));
            setAllServices(servicesData);

        } catch (error) {
            console.error("Error en carregar dades:", error);
        } finally {
            setIsLoadingData(false);
        }
    };
    
    fetchData();
  }, [firestore, isUserLoading, user]);
  
  const projectNames = useMemo(() => {
    const names = allServices.map(service => service.projectName).filter(Boolean);
    return [...new Set(names)].sort((a, b) => a.localeCompare(b));
  }, [allServices]);

  const filteredServices = useMemo(() => {
    let filtered = allServices.filter(service => {
        const userMatch = selectedUser === 'all' || service.employeeId === selectedUser;
        const dateMatch = !selectedDate || isSameDay(parseISO(service.arrivalDateTime), selectedDate);
        const projectMatch = selectedProject === 'all' || service.projectName === selectedProject;
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
        } as ServiceWithRowColor;
    });
    return colored.reverse();

  }, [allServices, selectedUser, selectedDate, selectedProject]);
  
  const getEmployeeName = (employeeId: string) => {
    const employee = employees.find(e => e.id === employeeId);
    return employee ? `${employee.firstName} ${employee.lastName}` : 'Desconegut';
  };

  const handleDeleteSelected = () => {
    if (!firestore) return;
    
    selectedRows.forEach(serviceId => {
      const service = allServices.find(s => s.id === serviceId);
      if (service) {
        const docRef = doc(firestore, `employees/${service.employeeId}/serviceRecords`, serviceId);
        deleteDocumentNonBlocking(docRef);
      }
    });

    toast({
      title: `${selectedRows.length} registres eliminats`,
      description: 'Els serveis seleccionats s\'han esborrat correctament.',
    });

    setAllServices(allServices.filter(s => !selectedRows.includes(s.id)));
    setSelectedRows([]);
  };
  
  if (isUserLoading) {
    return (
      <div className="space-y-8 p-4">
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
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight uppercase">Registres de Treball</h1>
          <p className="text-muted-foreground">Gestió de tots els serveis realitzats per l'equip.</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button asChild className="bg-accent hover:bg-accent/90 text-accent-foreground flex-1 sm:flex-none font-bold">
                <Link href="/dashboard/new">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Nou Servei
                </Link>
            </Button>
        </div>
      </div>
      
      {isLoadingData ? (
        <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-40 w-full" />
        </div>
      ) : (
        <Card className="border-none shadow-lg">
            <CardHeader className="bg-slate-50/50 rounded-t-lg border-b">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Filter className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg">Filtres de Supervisió</CardTitle>
                    </div>
                    {selectedRows.length > 0 && (
                        <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm" className="font-bold">
                            <Trash2 className="mr-2 h-4 w-4" /> Eliminar Seleccionats ({selectedRows.length})
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                            <AlertDialogTitle>Vols eliminar els serveis seleccionats?</AlertDialogTitle>
                            <AlertDialogDescription>Aquesta acció esborrarà permanentment {selectedRows.length} registres. Recorda que si ja tenen albarà, l'hauràs d'actualitzar.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                            <AlertDialogCancel>Enrere</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDeleteSelected} className="bg-destructive">Eliminar definitivament</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                        </AlertDialog>
                    )}
                </div>
                <div className="flex flex-col sm:flex-row gap-3 pt-4 flex-wrap">
                    <Select value={selectedUser} onValueChange={setSelectedUser}>
                    <SelectTrigger className="w-full sm:w-[220px] bg-white h-10">
                        <User className="mr-2 h-4 w-4 text-muted-foreground" />
                        <SelectValue placeholder="Tècnic" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Tots els Tècnics</SelectItem>
                        <SelectItem value={user.uid} className="font-bold text-primary">La meva feina</SelectItem>
                        {employees.filter(e => e.id !== user.uid).map(emp => (
                        <SelectItem key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</SelectItem>
                        ))}
                    </SelectContent>
                    </Select>

                    <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full sm:w-[240px] justify-start text-left font-normal bg-white h-10">
                        <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                        {selectedDate ? format(selectedDate, "PPP", { locale: ca }) : <span>Tria una data</span>}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} initialFocus locale={ca} />
                    </PopoverContent>
                    </Popover>

                    <Select value={selectedProject} onValueChange={setSelectedProject}>
                    <SelectTrigger className="w-full sm:w-[220px] bg-white h-10">
                        <Briefcase className="mr-2 h-4 w-4 text-muted-foreground" />
                        <SelectValue placeholder="Obra / Projecte" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Totes les Obres</SelectItem>
                        {projectNames.map(name => (
                        <SelectItem key={name} value={name}>{name}</SelectItem>
                        ))}
                    </SelectContent>
                    </Select>
                    
                    {(selectedUser !== 'all' || selectedDate || selectedProject !== 'all') && (
                    <Button variant="ghost" onClick={() => { setSelectedUser('all'); setSelectedDate(undefined); setSelectedProject('all'); }} className="text-xs">
                        Netejar Filtres
                    </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <Table>
                    <TableHeader className="bg-slate-50/30">
                        <TableRow>
                        <TableHead className="w-[40px] px-4">
                            <Checkbox
                                checked={selectedRows.length > 0 && filteredServices.length > 0 && selectedRows.length === filteredServices.length}
                                onCheckedChange={(checked) => setSelectedRows(checked ? filteredServices.map(s => s.id) : [])}
                            />
                        </TableHead>
                        <TableHead>Tècnic</TableHead>
                        <TableHead>Data i Hora</TableHead>
                        <TableHead>Obra</TableHead>
                        <TableHead className="hidden md:table-cell">Descripció</TableHead>
                        <TableHead className="text-right px-4">Acció</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredServices.length > 0 ? filteredServices.map(service => (
                        <TableRow key={service.id} className={cn((service as any).rowColor, "hover:bg-slate-100/50 transition-colors")}>
                            <TableCell className="px-4">
                                <Checkbox
                                    checked={selectedRows.includes(service.id)}
                                    onCheckedChange={(checked) => {
                                        setSelectedRows(checked ? [...selectedRows, service.id] : selectedRows.filter(id => id !== service.id));
                                    }}
                                />
                            </TableCell>
                            <TableCell>
                                <div className="flex items-center gap-2">
                                    <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: getUserColor(service.employeeId) }} />
                                    <span className="font-semibold text-sm whitespace-nowrap">{getEmployeeName(service.employeeId)}</span>
                                </div>
                            </TableCell>
                            <TableCell className="text-xs whitespace-nowrap">{format(parseISO(service.arrivalDateTime), 'dd/MM/yy HH:mm')}</TableCell>
                            <TableCell className="max-w-[150px] truncate font-medium">{service.projectName || 'Sense nom'}</TableCell>
                            <TableCell className="max-w-[250px] truncate text-muted-foreground text-xs hidden md:table-cell">{service.description}</TableCell>
                            <TableCell className="text-right px-4">
                                <Button variant="outline" size="sm" asChild className="h-8 font-bold">
                                    <Link href={`/dashboard/edit/${service.id}?ownerId=${service.employeeId}`}>
                                        <Edit className="h-3 w-3 mr-1" /> Editar
                                    </Link>
                                </Button>
                            </TableCell>
                        </TableRow>
                        )) : (
                        <TableRow>
                            <TableCell colSpan={6} className="h-32 text-center text-muted-foreground italic">No s'han trobat registres que coincideixin.</TableCell>
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
