'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { PlusCircle, List, Calendar } from 'lucide-react'
import { ServiceCard } from '@/components/ServiceCard'
import { ServiceCalendar } from '@/components/ServiceCalendar'
import type { ServiceRecord } from '@/lib/types'
import { useCollection, useUser, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, collectionGroup, orderBy } from 'firebase/firestore';
import { ADMIN_UID } from '@/lib/admin'

export default function DashboardPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const [view, setView] = useState<'list' | 'calendar'>('list');

  const isUserAdmin = useMemo(() => user?.uid === ADMIN_UID, [user]);

  // Determine the query based on user role
  const servicesQuery = useMemoFirebase(() => {
    if (isUserLoading || !firestore) return null;
    
    if (isUserAdmin) {
      // Admin: Fetch all services from the collection group, ordered by date
      return query(collectionGroup(firestore, 'serviceRecords'), orderBy('arrivalDateTime', 'desc'));
    } else if (user) {
      // Regular user: Fetch only their services, ordered by date
      return query(collection(firestore, `employees/${user.uid}/serviceRecords`), orderBy('arrivalDateTime', 'desc'));
    }
    
    return null;
  }, [firestore, user, isUserAdmin, isUserLoading]);
  
  const { data: services, isLoading: isLoadingServices } = useCollection<ServiceRecord>(servicesQuery);
  
  const handleEventClick = (service: ServiceRecord) => {
    router.push(`/dashboard/edit/${service.id}`);
  };

  const isLoading = isUserLoading || isLoadingServices;

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
      
      {isLoading && <p>Carregant serveis...</p>}

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
