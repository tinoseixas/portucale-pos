'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { PlusCircle, List, Calendar } from 'lucide-react'
import { ServiceCard } from '@/components/ServiceCard'
import { ServiceCalendar } from '@/components/ServiceCalendar'
import type { ServiceRecord, Employee } from '@/lib/types'
import { useCollection, useUser, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { ADMIN_EMAIL } from '@/lib/admin'

export default function DashboardPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [allServices, setAllServices] = useState<ServiceRecord[]>([]);
  const [isLoadingAllServices, setIsLoadingAllServices] = useState(false);

  const isUserAdmin = useMemo(() => user?.email === ADMIN_EMAIL, [user]);

  // Query for regular user's services
  const userServicesQuery = useMemoFirebase(() => {
    if (isUserLoading || !firestore || isUserAdmin || !user) return null;
    return query(collection(firestore, `employees/${user.uid}/serviceRecords`), orderBy('arrivalDateTime', 'desc'));
  }, [firestore, user, isUserAdmin, isUserLoading]);
  
  const { data: userServices, isLoading: isLoadingUserServices } = useCollection<ServiceRecord>(userServicesQuery);

  useEffect(() => {
    if (isUserAdmin && firestore && !isUserLoading) {
      const fetchAllServices = async () => {
        setIsLoadingAllServices(true);
        try {
          // 1. Fetch all employees
          const employeesCollection = collection(firestore, 'employees');
          const employeeSnapshot = await getDocs(employeesCollection);
          const employees = employeeSnapshot.docs.map(doc => doc.data() as Employee);

          // 2. Fetch service records for each employee in parallel
          const servicePromises = employees.map(employee => {
            const servicesCollection = collection(firestore, `employees/${employee.id}/serviceRecords`);
            return getDocs(query(servicesCollection, orderBy('arrivalDateTime', 'desc')));
          });
          
          const serviceSnapshots = await Promise.all(servicePromises);
          
          // 3. Aggregate all services
          const combinedServices: ServiceRecord[] = [];
          serviceSnapshots.forEach(snapshot => {
            snapshot.docs.forEach(doc => {
              combinedServices.push({ id: doc.id, ...(doc.data() as Omit<ServiceRecord, 'id'>) });
            });
          });

          // 4. Sort all services by date
          combinedServices.sort((a, b) => new Date(b.arrivalDateTime).getTime() - new Date(a.arrivalDateTime).getTime());
          
          setAllServices(combinedServices);
        } catch (error) {
          console.error("Error fetching all services for admin:", error);
          setAllServices([]);
        } finally {
          setIsLoadingAllServices(false);
        }
      };

      fetchAllServices();
    }
  }, [isUserAdmin, firestore, isUserLoading]);
  
  const services = isUserAdmin ? allServices : userServices;
  const isLoading = isUserAdmin ? isLoadingAllServices : (isUserLoading || isLoadingUserServices);
  
  const handleEventClick = (service: ServiceRecord) => {
    // Admin needs to know the owner of the service to build the correct path
    const path = isUserAdmin ? `/dashboard/edit/${service.id}?ownerId=${service.employeeId}` : `/dashboard/edit/${service.id}`;
    router.push(path);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{isUserAdmin ? "Tots els Serveis" : "Els Meus Serveis"}</h1>
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
      
      {isLoading && <p>{isUserAdmin ? "Carregant tots els serveis..." : "Carregant serveis..."}</p>}

      {!isLoading && services && services.length > 0 ? (
        view === 'list' ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {services.map(service => (
                <ServiceCard 
                    key={service.id} 
                    service={service} 
                    isUserAdmin={isUserAdmin}
                />
              ))}
            </div>
        ) : (
           <ServiceCalendar services={services} onSelectEvent={handleEventClick} />
        )
      ) : (
        !isLoading && (
            <div className="text-center py-16 border-2 border-dashed rounded-lg">
                <h2 className="text-xl font-semibold">No hi ha serveis registrats</h2>
                <p className="text-muted-foreground">{isUserAdmin ? "Encara no hi ha serveis registrats per cap usuari." : "Comença afegint el teu primer servei del dia."}</p>
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
