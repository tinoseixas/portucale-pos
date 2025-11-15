'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { PlusCircle, List, Calendar as CalendarIcon, User, Edit, Search } from 'lucide-react'
import { ServiceCard } from '@/components/ServiceCard'
import { ServiceCalendar } from '@/components/ServiceCalendar'
import type { ServiceRecord, Employee } from '@/lib/types'
import { useCollection, useUser, useFirestore, useMemoFirebase, errorEmitter, FirestorePermissionError } from '@/firebase';
import { collection, query, orderBy, getDocs, collectionGroup } from 'firebase/firestore';
import { ADMIN_EMAIL } from '@/lib/admin'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardHeader, CardContent, CardDescription, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { format, parseISO, isSameDay } from 'date-fns'
import { ca } from 'date-fns/locale'
import { cn } from '@/lib/utils'

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

export default function DashboardPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const [view, setView] = useState<'list' | 'calendar'>('list');
  
  // Admin state
  const [allServices, setAllServices] = useState<ServiceRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoadingAllServices, setIsLoadingAllServices] = useState(true);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(true);

  // Filters state
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();


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
        // Fetch all employees for the filter
        setIsLoadingEmployees(true);
        const employeesQuery = query(collection(firestore, 'employees'));
        try {
          const employeeSnapshot = await getDocs(employeesQuery);
          const employeesData = employeeSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Employee));
          setEmployees(employeesData);
        } catch (error) {
          console.error("Failed to fetch employees:", error);
        } finally {
          setIsLoadingEmployees(false);
        }

        // Fetch all services
        setIsLoadingAllServices(true);
        const servicesQuery = query(collectionGroup(firestore, 'serviceRecords'), orderBy('arrivalDateTime', 'desc'));
        
        try {
          const snapshot = await getDocs(servicesQuery);
          const servicesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ServiceRecord));
          setAllServices(servicesData);
        } catch (error) {
          console.error("Admin service fetch failed, emitting contextual error:", error);
          const contextualError = new FirestorePermissionError({
              operation: 'list',
              path: 'serviceRecords (collectionGroup)',
          });
          errorEmitter.emit('permission-error', contextualError);
          setAllServices([]);
        } finally {
          setIsLoadingAllServices(false);
        }
      };
      fetchAdminData();
    } else {
        setIsLoadingAllServices(false);
        setIsLoadingEmployees(false);
    }
  }, [isUserAdmin, firestore, isUserLoading]);

  const filteredServices = useMemo(() => {
    if (!isUserAdmin) return userServices;
    
    return allServices.filter(service => {
        const userMatch = selectedUser === 'all' || service.employeeId === selectedUser;
        const dateMatch = !selectedDate || isSameDay(parseISO(service.arrivalDateTime), selectedDate);
        return userMatch && dateMatch;
    });
  }, [isUserAdmin, allServices, userServices, selectedUser, selectedDate]);

  const services = filteredServices;
  const isLoading = isUserAdmin ? (isLoadingAllServices || isLoadingEmployees) : (isUserLoading || isLoadingUserServices);
  
  const handleEventClick = (service: ServiceRecord) => {
    const path = isUserAdmin ? `/dashboard/edit/${service.id}?ownerId=${service.employeeId}` : `/dashboard/edit/${service.id}`;
    router.push(path);
  };
  
  const getEmployeeName = (employeeId: string) => {
    const employee = employees.find(e => e.id === employeeId);
    return employee ? `${employee.firstName} ${employee.lastName}` : 'Desconegut';
  };
  
  const renderAdminView = () => (
     <Card>
      <CardHeader>
        <CardTitle>Tots els Serveis</CardTitle>
        <CardDescription>Visualitza, filtra i gestiona tots els registres de servei.</CardDescription>
        <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <User className="mr-2 h-4 w-4 text-muted-foreground" />
                <SelectValue placeholder="Filtrar per usuari" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tots els Usuaris</SelectItem>
                {employees.map(emp => (
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
            
            {(selectedUser !== 'all' || selectedDate) && (
              <Button variant="ghost" onClick={() => { setSelectedUser('all'); setSelectedDate(undefined); }}>
                Neteja filtres
              </Button>
            )}
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[10px]"></TableHead>
              <TableHead>Funcionari</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Descripció</TableHead>
              <TableHead className="text-right">Accions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {services && services.length > 0 ? services.map(service => (
              <TableRow key={service.id}>
                <TableCell>
                  <div 
                    className="h-full w-1 rounded-full" 
                    style={{ backgroundColor: getUserColor(service.employeeId) }}
                  />
                </TableCell>
                <TableCell className="font-medium">{getEmployeeName(service.employeeId)}</TableCell>
                <TableCell>{format(parseISO(service.arrivalDateTime), 'dd/MM/yyyy HH:mm')}</TableCell>
                <TableCell className="max-w-[300px] truncate">{service.description}</TableCell>
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
                <TableCell colSpan={5} className="h-24 text-center">
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
            {services && services.map(service => (
              <ServiceCard 
                  key={service.id} 
                  service={service} 
                  isUserAdmin={isUserAdmin}
              />
            ))}
          </div>
      ) : (
         <ServiceCalendar services={services || []} onSelectEvent={handleEventClick} />
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

    