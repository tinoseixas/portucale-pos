'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { PlusCircle } from 'lucide-react'
import { ServiceCard } from '@/components/ServiceCard'
import type { ServiceRecord, Employee } from '@/lib/types'
import { useCollection, useUser, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, collectionGroup, getDocs } from 'firebase/firestore';
import { ADMIN_UID } from '@/lib/admin'

export default function DashboardPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [allServices, setAllServices] = useState<ServiceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const isUserAdmin = user?.uid === ADMIN_UID;

  // This query is for the regular user view
  const serviceRecordsQuery = useMemoFirebase(() => {
    if (!user || isUserAdmin) return null;
    return collection(firestore, `employees/${user.uid}/serviceRecords`);
  }, [firestore, user, isUserAdmin]);

  const { data: userServices, isLoading: isLoadingUserServices } = useCollection<ServiceRecord>(serviceRecordsQuery);

  useEffect(() => {
    async function fetchAllServices() {
      if (isUserAdmin && firestore) {
        setIsLoading(true);
        const servicesQuery = query(collectionGroup(firestore, 'serviceRecords'));
        const querySnapshot = await getDocs(servicesQuery);
        const services: ServiceRecord[] = [];
        querySnapshot.forEach((doc) => {
          services.push({ id: doc.id, ...doc.data() } as ServiceRecord);
        });
        setAllServices(services);
        setIsLoading(false);
      }
    }
    fetchAllServices();
  }, [isUserAdmin, firestore]);
  
  useEffect(() => {
    if (!isUserAdmin) {
      setIsLoading(isLoadingUserServices);
    }
  }, [isLoadingUserServices, isUserAdmin])

  const services = isUserAdmin ? allServices : userServices;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{isUserAdmin ? "Tots els Serveis" : "Serveis del Dia"}</h1>
          <p className="text-muted-foreground">{isUserAdmin ? "Una vista general de tots els registres." : "Un resum de la teva jornada laboral."}</p>
        </div>
        <div className="hidden md:block">
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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {services.map(service => (
            <ServiceCard key={service.id} service={service} />
          ))}
        </div>
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
