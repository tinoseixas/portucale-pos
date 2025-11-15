'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { PlusCircle, List, Calendar } from 'lucide-react'
import { ServiceCard } from '@/components/ServiceCard'
import { ServiceCalendar } from '@/components/ServiceCalendar'
import type { ServiceRecord, Employee } from '@/lib/types'
import { useCollection, useUser, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, collectionGroup, onSnapshot } from 'firebase/firestore';
import { ADMIN_UID } from '@/lib/admin'

export default function DashboardPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const [allServices, setAllServices] = useState<ServiceRecord[]>([]);
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState<'list' | 'calendar'>('list');

  const isUserAdmin = useMemo(() => user?.uid === ADMIN_UID, [user]);

  // Query for regular user's services
  const userServicesQuery = useMemoFirebase(() => {
    if (isUserLoading || !user || isUserAdmin) return null;
    return query(collection(firestore, `employees/${user.uid}/serviceRecords`));
  }, [firestore, user, isUserAdmin, isUserLoading]);
  
  const { data: userServices, isLoading: isLoadingUserServices } = useCollection<ServiceRecord>(userServicesQuery);

  // Fetch all services and employees if the user is an admin
  useEffect(() => {
    async function fetchAdminData() {
      if (isUserAdmin && firestore) {
        setIsLoading(true);
        // Fetch all services
        const servicesQuery = query(collectionGroup(firestore, 'serviceRecords'));
        const servicesUnsubscribe = onSnapshot(servicesQuery, (querySnapshot) => {
          const services: ServiceRecord[] = [];
          querySnapshot.forEach((doc) => {
            services.push({ id: doc.id, ...doc.data() } as ServiceRecord);
          });
          const sortedServices = services.sort((a, b) => 
            new Date(b.arrivalDateTime).getTime() - new Date(a.arrivalDateTime).getTime()
          );
          setAllServices(sortedServices);
        }, (error) => {
           console.error("Error fetching all services:", error);
        });

        // Fetch all employees
        const employeesQuery = query(collection(firestore, 'employees'));
        const employeesUnsubscribe = onSnapshot(employeesQuery, (querySnapshot) => {
          const employees: Employee[] = [];
          querySnapshot.forEach((doc) => {
            employees.push({ id: doc.id, ...doc.data() } as Employee);
          });
          setAllEmployees(employees);
        }, (error) => {
          console.error("Error fetching employees:", error);
        });
        
        // This combines loading state, but you could have separate ones
        Promise.all([
            new Promise(resolve => onSnapshot(servicesQuery, resolve)),
            new Promise(resolve => onSnapshot(employeesQuery, resolve))
        ]).then(() => {
            setIsLoading(false);
        }).catch(() => {
            setIsLoading(false);
        })

        return () => {
          servicesUnsubscribe();
          employeesUnsubscribe();
        };
      }
    }

    if (!isUserLoading) {
      if (isUserAdmin) {
        fetchAdminData();
      } else {
        setIsLoading(isLoadingUserServices);
      }
    }
  }, [isUserAdmin, firestore, isUserLoading, isLoadingUserServices]);

  const services = isUserAdmin ? allServices : userServices?.sort((a, b) => 
    new Date(b.arrivalDateTime).getTime() - new Date(a.arrivalDateTime).getTime()
  );
  
  const employeeMap = useMemo(() => {
    if (!isUserAdmin) return {};
    return allEmployees.reduce((acc, employee) => {
      acc[employee.id] = `${employee.firstName} ${employee.lastName}`;
      return acc;
    }, {} as Record<string, string>);
  }, [allEmployees, isUserAdmin]);
  
  const handleEventClick = (service: ServiceRecord) => {
    router.push(`/dashboard/edit/${service.id}`);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{isUserAdmin ? "Tots els Serveis" : "Serveis del Dia"}</h1>
          <p className="text-muted-foreground">{isUserAdmin ? "Una vista general de tots els registres." : "Un resum de la teva jornada laboral."}</p>
        </div>
        <div className="hidden md:flex items-center gap-2">
            <Button variant="outline" onClick={() => setView(view === 'list' ? 'calendar' : 'list')}>
                {view === 'list' ? <Calendar className="mr-2 h-4 w-4" /> : <List className="mr-2 h-4 w-4" />}
                {view === 'list' ? 'Calendari' : 'Llista'}
            </Button>
            <Button asChild className="bg-accent hover:bg-accent/90 text-accent-foreground">
                <Link href="/dashboard/new">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Nou Servei
                </Link>
            </Button>
        </div>
      </div>
      
      {(isLoading || isUserLoading) && <p>Carregant serveis...</p>}

      {!(isLoading || isUserLoading) && services && services.length > 0 ? (
        view === 'list' ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {services.map(service => (
                <ServiceCard 
                    key={service.id} 
                    service={service} 
                    isUserAdmin={isUserAdmin}
                    employeeName={isUserAdmin ? employeeMap[service.employeeId] : undefined}
                />
              ))}
            </div>
        ) : (
           <ServiceCalendar services={services} onSelectEvent={handleEventClick} />
        )
      ) : (
        !(isLoading || isUserLoading) && (
            <div className="text-center py-16 border-2 border-dashed rounded-lg">
                <h2 className="text-xl font-semibold">No hi ha serveis registrats</h2>
                <p className="text-muted-foreground mt-2">Comença afegint el teu primer servei del dia.</p>
                <Button asChild className="mt-4 bg-accent hover:bg-accent/90 text-accent-foreground">
                    <Link href="/dashboard/new">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Afegeix un Servei
                    </Link>
                </Button>
            </div>
        )
      )}
    </div>
  )
}
