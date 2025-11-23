'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LogIn, MapPin, Users, Loader2, User as UserIcon } from 'lucide-react'
import { useToast } from "@/hooks/use-toast"
import { useFirestore, useUser, useDoc, useCollection, useMemoFirebase } from '@/firebase'
import { addDoc, collection, doc, query, orderBy } from 'firebase/firestore'
import type { Employee, Customer, ServiceRecord } from '@/lib/types'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'


export default function NewServicePage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isStarting, setIsStarting] = useState(false);
  const { user, isUserLoading } = useUser()
  const firestore = useFirestore()
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('none');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  
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

  const employeesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'employees'), orderBy('firstName', 'asc'));
  }, [firestore]);

  const { data: employees, isLoading: isLoadingEmployees } = useCollection<Employee>(employeesQuery);

  // Set the default selected employee to the current user when data is available
  useEffect(() => {
    if (user && !selectedEmployeeId) {
      setSelectedEmployeeId(user.uid);
    }
  }, [user, selectedEmployeeId]);


  const handleStartService = async () => {
    if (!user || !firestore || !selectedEmployeeId || !employees) {
        toast({ variant: "destructive", title: "Error", description: "No s'han pogut carregar les dades de l'usuari." });
        return;
    }
    
    setIsStarting(true);
    
    const selectedEmployee = employees.find(e => e.id === selectedEmployeeId);
    if (!selectedEmployee) {
        toast({ variant: "destructive", title: "Error", description: "L'empleat seleccionat no és vàlid." });
        setIsStarting(false);
        return;
    }

    const getLocation = new Promise<{ latitude: number; longitude: number } | null>((resolve) => {
        if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    resolve({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                    });
                },
                (error) => {
                    console.warn("Geolocation Error:", error.message);
                    toast({
                        variant: 'destructive',
                        title: 'Error de Geolocalització',
                        description: `No s'ha pogut obtenir la teva ubicació: ${error.message}`,
                    });
                    resolve(null); // Resolve with null if there's an error
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        } else {
            toast({
                variant: 'destructive',
                title: 'Geolocalització no suportada',
                description: 'El teu navegador no suporta la geolocalització.',
            });
            resolve(null); // Resolve with null if not supported
        }
    });

    try {
        const location = await getLocation;

        const selectedCustomer = customers?.find(c => c.id === selectedCustomerId);
        
        const now = new Date();
        const serviceRecord: Omit<ServiceRecord, 'id'> = {
            employeeId: selectedEmployee.id,
            employeeName: `${selectedEmployee.firstName} ${selectedEmployee.lastName}`,
            arrivalDateTime: now.toISOString(),
            departureDateTime: now.toISOString(), 
            description: "Servei en curs...",
            projectName: '',
            pendingTasks: '',
            customerId: selectedCustomerId !== 'none' ? selectedCustomer?.id || '' : '',
            customerName: selectedCustomerId !== 'none' ? selectedCustomer?.name || '' : '',
            location: location || undefined,
            media: [],
            albarans: [],
            materials: [],
            createdAt: now.toISOString(),
        };
        
        // Service records are always created under the employee they belong to
        const serviceRecordsCollection = collection(firestore, `employees/${selectedEmployee.id}/serviceRecords`);
        const docRef = await addDoc(serviceRecordsCollection, serviceRecord);
        
        toast({ 
            title: `Servei iniciat per a ${selectedEmployee.firstName}!`,
            description: "S'ha iniciat el registre del servei." + (location ? " Ubicació guardada." : " No s'ha pogut guardar la ubicació."),
        });
        
        // Redirect to the edit page with the ownerId of the record's actual owner
        router.push(`/dashboard/edit/${docRef.id}?ownerId=${selectedEmployee.id}`);

    } catch (error) {
        console.error("Error creating service record:", error);
        setIsStarting(false);
        toast({ variant: "destructive", title: "Error", description: "No s'ha pogut iniciar el servei." });
    }
  };
  
  const isDataLoading = isUserLoading || isLoadingEmployee || isLoadingCustomers || isLoadingEmployees;


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
    <div className="max-w-2xl mx-auto flex items-center justify-center" style={{ height: '70vh' }}>
      <Card className="w-full text-center">
        <CardHeader>
          <CardTitle>Preparat per començar?</CardTitle>
          <CardDescription>Selecciona un tècnic i un client (opcional) i clica el botó per iniciar un nou servei.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <div className="space-y-2 text-left">
                <Label htmlFor="employeeId" className="flex items-center gap-2"><UserIcon className="h-4 w-4 text-muted-foreground" /> Tècnic</Label>
                <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId} disabled={isLoadingEmployees}>
                    <SelectTrigger id="employeeId">
                        <SelectValue placeholder={isLoadingEmployees ? "A carregar tècnics..." : "Selecciona un tècnic..."} />
                    </SelectTrigger>
                    <SelectContent>
                        {employees?.map(e => (
                        <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
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
  )
}
