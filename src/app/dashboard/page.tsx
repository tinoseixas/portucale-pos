'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { PlusCircle, List, Calendar } from 'lucide-react'
import { ServiceCard } from '@/components/ServiceCard'
import { ServiceCalendar } from '@/components/ServiceCalendar'
import type { ServiceRecord } from '@/lib/types'
import { useCollection, useUser, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, getDocs, collectionGroup } from 'firebase/firestore';
import { ADMIN_EMAIL } from '@/lib/admin'
import { Skeleton } from '@/components/ui/skeleton'

export default function DashboardPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const [view, setView] = useState<'list' | 'calendar'>('list');
  
  // State for admin's view of all services
  const [allServices, setAllServices] = useState<ServiceRecord[]>([]);
  const [isLoadingAllServices, setIsLoadingAllServices] = useState(true);

  // State for regular user's services
  const userServicesQuery = useMemoFirebase(() => {
    if (!user || (user && user.email === ADMIN_EMAIL)) return null;
    return query(collection(firestore, `employees/${user.uid}/serviceRecords`), orderBy('arrivalDateTime', 'desc'));
  }, [firestore, user]);

  const { data: userServices, isLoading: isLoadingUserServices } = useCollection<ServiceRecord>(userServicesQuery);

  const isUserAdmin = useMemo(() => user?.email === ADMIN_EMAIL, [user]);

  useEffect(() => {
    if (isUserLoading || !firestore) return;

    if (isUserAdmin) {
      const fetchAllServices = async () => {
        setIsLoadingAllServices(true);
        try {
          // Use collectionGroup to fetch all serviceRecords across all employees
          const servicesQuery = query(collectionGroup(firestore, 'serviceRecords'), orderBy('arrivalDateTime', 'desc'));
          const snapshot = await getDocs(servicesQuery);
          const servicesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ServiceRecord));
          setAllServices(servicesData);
        } catch (error) {
          console.error("Error fetching all services for admin:", error);
          setAllServices([]);
        } finally {
          setIsLoadingAllServices(false);
        }
      };
      fetchAllServices();
    } else {
        // If not admin, no need to load all services
        setIsLoadingAllServices(false);
    }
  }, [isUserAdmin, firestore, isUserLoading]);

  const services = isUserAdmin ? allServices : userServices;
  const isLoading = isUserAdmin ? isLoadingAllServices : (isUserLoading || isLoadingUserServices);
  
  const handleEventClick = (service: ServiceRecord) => {
    const path = isUserAdmin ? `/dashboard/edit/${service.id}?ownerId=${service.employeeId}` : `/dashboard/edit/${service.id}`;
    router.push(path);
  };

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
      
      {isLoading ? renderSkeletons() : (
        !services || services.length === 0 ? (
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
        ) : (
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
        )
      )}
    </div>
  )
}
