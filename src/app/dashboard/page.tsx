'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { PlusCircle, List, Calendar as CalendarIcon, User, Edit, Search, Trash2, Briefcase } from 'lucide-react'
import { ServiceCard } from '@/components/ServiceCard'
import { ServiceCalendar } from '@/components/ServiceCalendar'
import type { ServiceRecord, Employee } from '@/lib/types'
import { useCollection, useUser, useFirestore, useMemoFirebase, errorEmitter, FirestorePermissionError, deleteDocumentNonBlocking } from '@/firebase';
import { collection, query, orderBy, getDocs, collectionGroup, doc } from 'firebase/firestore';
import { ADMIN_EMAIL } from '@/lib/admin'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardHeader, CardContent, CardDescription, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { format, parseISO, isSameDay, startOfDay, isToday } from 'date-fns'
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
  const [view, setView] = useState<'list' | 'calendar'>('list');
  
  // Admin state
  const [allServices, setAllServices] = useState<ServiceRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoadingAllData, setIsLoadingAllData] = useState(true);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);

  // Filters state
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedProject, setSelectedProject] = useState<string>('all');


  // Regular user's services
  const userServicesQuery = useMemoFirebase(() => {
    if (!user || (user && user.email === ADMIN_EMAIL)) return null;
    return query(collection(firestore, `employees/${user.uid}/serviceRecords`), orderBy('arrivalDateTime', 'desc'));
  }, [firestore, user]);

  const { data: userServices, isLoading: isLoadingUserServices } = useCollection<ServiceRecord>(userServicesQuery);

  const isUserAdmin = useMemo(() => user?.email === ADMIN_EMAIL, [user]);
  
  useEffect(() => {
    if (isUserLoading || !firestore) return;

    if (isUserAdmin) {
      const fetchAdminData = async () => {
        setIsLoadingAllData(true);
        try {
          // Fetch employees first to identify the admin
          const employeeSnapshot = await getDocs(query(collection(firestore, 'employees')));
          const employeesData = employeeSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Employee));
          setEmployees(employeesData);
          
          const adminUser = employeesData.find(e => e.email === ADMIN_EMAIL);
          
          // Then fetch all services
          const serviceSnapshot = await getDocs(query(collectionGroup(firestore, 'serviceRecords'), orderBy('arrivalDateTime', 'desc')));
          let servicesData = serviceSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ServiceRecord));
          
          // Filter out admin's own services
          if (adminUser) {
            servicesData = servicesData.filter(service => service.employeeId !== adminUser.id);
          }
          
          setAllServices(servicesData);

        } catch (error) {
          console.error("Admin data fetch failed:", error);
          // Only emit a permission error if that's what it is
          if ((error as any)?.code === 'permission-denied') {
             const contextualError = new FirestorePermissionError({
              operation: 'list',
              path: 'serviceRecords (collectionGroup)',
            });
            errorEmitter.emit('permission-error', contextualError);
          }
          // Reset state on error
          setAllServices([]);
          setEmployees([]);
        } finally {
          setIsLoadingAllData(false);
        }
      };
      fetchAdminData();
    } else {
      setIsLoadingAllData(false);
    }
  }, [isUserAdmin, firestore, isUserLoading]);
  
  // Effect to show reminder notification
  useEffect(() => {
    if (!isUserAdmin && !isLoadingUserServices && userServices) {
      const now = new Date();
      const currentHour = now.getHours();
      
      // Check if it's between 8 AM and 5 PM (17:00)
      if (currentHour >= 8 && currentHour < 17) {
        const hasServiceToday = userServices.some(service => isToday(parseISO(service.arrivalDateTime)));
        
        if (!hasServiceToday) {
          toast({
            title: "Recordatori",
            description: "Encara no has registrat cap servei avui. No t'oblidis de fer-ho!",
          });
        }
      }
    }
  }, [isUserAdmin, isLoadingUserServices, userServices, toast]);
  
  const projectNames = useMemo(() => {
    const servicesToUse = isUserAdmin ? allServices : userServices;
    if (!servicesToUse) return [];
    const names = servicesToUse.map(service => service.projectName).filter(Boolean);
    return [...new Set(names)];
  }, [isUserAdmin, allServices, userServices]);


  const filteredServices = useMemo(() => {
    const servicesToFilter = isUserAdmin ? allServices : userServices;
    if (!servicesToFilter) return [];

    let filtered = servicesToFilter.filter(service => {
        const userMatch = selectedUser === 'all' || service.employeeId === selectedUser;
        const dateMatch = !selectedDate || isSameDay(parseISO(service.arrivalDateTime), selectedDate);
        const projectMatch = selectedProject === 'all' || service.projectName === selectedProject;
        return userMatch && dateMatch && projectMatch;
    });

    if (isUserAdmin) {
        const dayColors = ['bg-white', 'bg-slate-50'];
        let currentColorIndex = 0;
        let lastDate: string | null = null;
        
        // Reverse for processing, then reverse back for display
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
            };
        });
        return colored.reverse();
    }

    return filtered;

  }, [isUserAdmin, allServices, userServices, selectedUser, selectedDate, selectedProject]);
  
  // Clear selected rows when filters change
  useEffect(() => {
    setSelectedRows([]);
  }, [filteredServices]);


  const services = filteredServices as (ServiceRecord[] | ServiceWithRowColor[]);
  const isLoading = isUserAdmin ? isLoadingAllData : (isUserLoading || isLoadingUserServices);
  
  const handleEventClick = (service: ServiceRecord) => {
    const path = isUserAdmin ? `/dashboard/edit/${service.id}?ownerId=${service.employeeId}` : `/dashboard/edit/${service.id}`;
    router.push(path);
  };
  
  const getEmployeeName = (employeeId: string) => {
    const employee = employees.find(e => e.id === employeeId);
    return employee ? `${employee.firstName} ${employee.lastName}` : 'Desconegut';
  };

  const handleDeleteSelected = () => {
    if (!firestore) return;
    
    selectedRows.forEach(serviceId => {
      // Find the service to get the employeeId
      const service = allServices.find(s => s.id === serviceId);
      if (service) {
        const docRef = doc(firestore, `employees/${service.employeeId}/serviceRecords`, serviceId);
        deleteDocumentNonBlocking(docRef);
      }
    });

    toast({
      title: `${selectedRows.length} servei(s) eliminat(s)`,
      description: 'Els registres seleccionats han estat eliminats.',
    });

    // Optimistically remove from UI
    setAllServices(allServices.filter(s => !selectedRows.includes(s.id)));
    setSelectedRows([]);
  }
  
  const renderAdminView = () => (
     <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
            <div>
                <CardTitle>Tots els Serveis</CardTitle>
                <CardDescription>Visualitza, filtra i gestiona tots els registres de servei.</CardDescription>
            </div>
             {selectedRows.length > 0 && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Eliminar ({selectedRows.length})
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Estàs segur?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Aquesta acció eliminarà permanentment {selectedRows.length} registre(s) de servei. Aquesta acció no es pot desfer.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel·lar</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDeleteSelected} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
            )}
        </div>
        <div className="flex flex-col sm:flex-row gap-4 pt-4 flex-wrap">
            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <User className="mr-2 h-4 w-4 text-muted-foreground" />
                <SelectValue placeholder="Filtrar per usuari" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tots els Usuaris</SelectItem>
                {employees.filter(emp => emp.email !== ADMIN_EMAIL).map(emp => (
                  <SelectItem key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full sm:w-[240px] justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, "PPP", { locale: ca }) : <span>Filtrar per data</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  initialFocus
                  locale={ca}
                />
              </PopoverContent>
            </Popover>

            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <Briefcase className="mr-2 h-4 w-4 text-muted-foreground" />
                <SelectValue placeholder="Filtrar per obra" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Totes les Obres</SelectItem>
                {projectNames.map(name => (
                  <SelectItem key={name} value={name}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {(selectedUser !== 'all' || selectedDate || selectedProject !== 'all') && (
              <Button variant="ghost" onClick={() => { setSelectedUser('all'); setSelectedDate(undefined); setSelectedProject('all'); }}>
                Neteja filtres
              </Button>
            )}
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px] px-2">
                 <Checkbox
                    checked={selectedRows.length > 0 && services.length > 0 && selectedRows.length === services.length}
                    onCheckedChange={(checked) => {
                       setSelectedRows(checked ? services.map(s => s.id) : []);
                    }}
                    aria-label="Seleccionar totes les files"
                  />
              </TableHead>
              <TableHead className="w-[10px]"></TableHead>
              <TableHead>Funcionari</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Obra</TableHead>
              <TableHead>Descripció</TableHead>
              <TableHead>Última Modificació</TableHead>
              <TableHead className="text-right">Accions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {services && services.length > 0 ? (services as ServiceWithRowColor[]).map(service => (
              <TableRow key={service.id} className={service.rowColor} data-state={selectedRows.includes(service.id) && "selected"}>
                <TableCell className="px-2">
                    <Checkbox
                        checked={selectedRows.includes(service.id)}
                        onCheckedChange={(checked) => {
                        setSelectedRows(
                            checked
                            ? [...selectedRows, service.id]
                            : selectedRows.filter((id) => id !== service.id)
                        );
                        }}
                        aria-label={`Seleccionar fila ${service.id}`}
                    />
                </TableCell>
                <TableCell>
                  <div 
                    className="h-full w-1 rounded-full" 
                    style={{ backgroundColor: getUserColor(service.employeeId) }}
                  />
                </TableCell>
                <TableCell className="font-medium">{getEmployeeName(service.employeeId)}</TableCell>
                <TableCell>{format(parseISO(service.arrivalDateTime), 'dd/MM/yyyy HH:mm')}</TableCell>
                <TableCell className="max-w-[200px] truncate">{service.projectName}</TableCell>
                <TableCell className="max-w-[300px] truncate">{service.description}</TableCell>
                <TableCell>
                  {service.updatedAt ? format(parseISO(service.updatedAt), 'dd/MM/yy HH:mm') : '-'}
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="outline" size="sm" asChild>
                     <Link href={`/dashboard/edit/${service.id}?ownerId=${service.employeeId}`}>
                        <Edit className="mr-2 h-4 w-4" /> Detalls
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  No s'han trobat serveis per als filtres seleccionats.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );

  const renderUserView = () => (
      view === 'list' ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {services && (services as ServiceRecord[]).map(service => (
              <ServiceCard 
                  key={service.id} 
                  service={service} 
                  isUserAdmin={isUserAdmin}
              />
            ))}
          </div>
      ) : (
         <ServiceCalendar services={(services as ServiceRecord[]) || []} onSelectEvent={handleEventClick} />
      )
  );

  const renderSkeletons = () => (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
                <CardHeader>
                    <Skeleton className="h-6 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent className="space-y-4">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                    <div className="flex justify-between items-center pt-2">
                        <Skeleton className="h-5 w-1/4" />
                        <Skeleton className="h-8 w-1/3" />
                    </div>
                </CardContent>
            </Card>
        ))}
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{isUserAdmin ? "Tauler d'Administrador" : "Els Meus Serveis"}</h1>
          <p className="text-muted-foreground">{isUserAdmin ? "Una vista general de tots els registres." : "Un resum de la teva jornada laboral."}</p>
        </div>
        <div className="hidden md:flex items-center gap-2">
            {!isUserAdmin && (
              <Button variant="outline" onClick={() => setView(view === 'list' ? 'calendar' : 'list')}>
                  {view === 'list' ? <CalendarIcon className="mr-2 h-4 w-4" /> : <List className="mr-2 h-4 w-4" />}
                  {view === 'list' ? 'Calendari' : 'Llista'}
              </Button>
            )}
            {!isUserAdmin && (
              <Button asChild className="bg-accent hover:bg-accent/90 text-accent-foreground">
                  <Link href="/dashboard/new">
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Nou Servei
                  </Link>
              </Button>
            )}
        </div>
      </div>
      
      {isLoading ? renderSkeletons() : (
        (!services || services.length === 0) && (!isUserAdmin || allServices.length === 0) ? (
          <div className="text-center py-16 border-2 border-dashed rounded-lg">
              <h2 className="text-xl font-semibold">No hi ha serveis registrats</h2>
              <p className="text-muted-foreground">{isUserAdmin ? "Encara no hi ha serveis registrats per cap usuari." : "Comença afegint el teu primer servei del dia."}</p>
              {!isUserAdmin && (
                <Button asChild className="mt-4 bg-accent hover:bg-accent/90 text-accent-foreground">
                    <Link href="/dashboard/new">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Afegeix un Servei
                    </Link>
                </Button>
              )}
          </div>
        ) : (
          isUserAdmin ? renderAdminView() : renderUserView()
        )
      )}
    </div>
  )
}
