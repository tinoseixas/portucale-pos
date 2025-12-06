'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LogIn, MapPin, Users, Loader2 } from 'lucide-react'
import { useToast } from "@/hooks/use-toast"
import { useFirestore, useUser, useDoc, useCollection, useMemoFirebase } from '@/firebase'
import { addDoc, collection, doc, query, orderBy } from 'firebase/firestore'
import type { Employee, Customer, ServiceRecord } from '@/lib/types'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Header } from '@/components/Header'
import { BottomNav } from '@/components/BottomNav'


export default function NewServicePage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isStarting, setIsStarting] = useState(false);
  const { user, isUserLoading } = useUser()
  const firestore = useFirestore()
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('none');
  
  const employeeDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'employees', user.uid);
  }, [firestore, user]);

  const { data: currentEmployee, isLoading: isLoadingEmployee } = useDoc<Employee>(employeeDocRef);
  
  const customersQuery = useMemoFirebase(() => {
      if (!firestore || !user) return null
      return query(collection(firestore, 'customers'), orderBy('name', 'asc'))
  }, [firestore, user]);

  const { data: customers, isLoading: isLoadingCustomers } = useCollection<Customer>(customersQuery);


  const handleStartService = async () => {
    if (!user || !firestore || !currentEmployee) {
        toast({ variant: "destructive", title: "Error", description: "No s'han pogut carregar les dades de l'usuari. Si us plau, torna a intentar." });
        return;
    }
    
    setIsStarting(true);

    try {
        const selectedCustomer = customers?.find(c => c.id === selectedCustomerId);
        
        const now = new Date();
        const serviceRecord: Omit<ServiceRecord, 'id'> = {
            employeeId: currentEmployee.id,
            employeeName: `${currentEmployee.firstName} ${currentEmployee.lastName}`,
            arrivalDateTime: now.toISOString(),
            departureDateTime: now.toISOString(), 
            description: "Servei en curs...",
            projectName: '',
            pendingTasks: '',
            customerId: selectedCustomerId !== 'none' ? selectedCustomer?.id || '' : '',
            customerName: selectedCustomerId !== 'none' ? selectedCustomer?.name || '' : '',
            serviceHourlyRate: currentEmployee.hourlyRate,
            media: [],
            albarans: [],
            materials: [],
            createdAt: now.toISOString(),
        };
        
        // Service records are always created under the employee they belong to
        const serviceRecordsCollection = collection(firestore, `employees/${currentEmployee.id}/serviceRecords`);
        const docRef = await addDoc(serviceRecordsCollection, serviceRecord);
        
        toast({ 
            title: `Servei iniciat per a ${currentEmployee.firstName}!`,
            description: "S'ha iniciat el registre del servei.",
        });
        
        router.push(`/dashboard/edit/${docRef.id}?ownerId=${currentEmployee.id}`);

    } catch (error) {
        console.error("Error creating service record:", error);
        setIsStarting(false);
        toast({ variant: "destructive", title: "Error", description: "No s'ha pogut iniciar el servei." });
    }
  };
  
  const isDataLoading = isUserLoading || isLoadingEmployee || isLoadingCustomers;


  if (isUserLoading && !user) {
    return (
      <div className="flex items-center justify-center h-full">
        <p>Carregant...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="text-center">
          <CardHeader>
            <CardTitle>Inicia Sessió</CardTitle>
            <CardDescription>Necessites iniciar sessió per poder registrar un nou servei.</CardDescription>
          </CardHeader>
          <CardContent>
             <Button asChild>
                <Link href="/">
                  <LogIn className="mr-2 h-4 w-4" />
                  Iniciar Sessió
                </Link>
              </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <>
      <Header />
      <div className="max-w-2xl mx-auto flex items-center justify-center" style={{ height: '70vh' }}>
        <Card className="w-full text-center">
          <CardHeader>
            <CardTitle>Preparat per començar?</CardTitle>
            <CardDescription>Selecciona un client (opcional) i clica el botó per iniciar un nou servei.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
              <div className="space-y-2 text-left">
                <Label htmlFor="customerId" className="flex items-center gap-2"><Users className="h-4 w-4 text-muted-foreground" /> Client</Label>
                <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId} disabled={isLoadingCustomers}>
                  <SelectTrigger id="customerId">
                    <SelectValue placeholder={isLoadingCustomers ? "A carregar clients..." : "Selecciona un client..."} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Cap client</SelectItem>
                    {customers?.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button 
                  size="lg" 
                  className="w-full h-16 text-lg bg-accent hover:bg-accent/90 text-accent-foreground"
                  onClick={handleStartService}
                  disabled={isDataLoading || isStarting}
              >
                  {isDataLoading ? <Loader2 className="mr-3 h-6 w-6 animate-spin" /> : <MapPin className="mr-3 h-6 w-6" />}
                  {isDataLoading ? "Carregant dades..." : (isStarting ? "Iniciant..." : "Iniciar Servei")}
              </Button>
          </CardContent>
        </Card>
      </div>
      <BottomNav />
    </>
  )
}
