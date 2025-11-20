'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LogIn, MapPin } from 'lucide-react'
import { useToast } from "@/hooks/use-toast"
import { useFirestore, useUser, useDoc } from '@/firebase'
import { addDoc, collection, doc } from 'firebase/firestore'
import type { Employee } from '@/lib/types'


export default function NewServicePage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isStarting, setIsStarting] = useState(false);
  const { user, isUserLoading } = useUser()
  const firestore = useFirestore()
  
  const employeeDocRef = useMemo(() => {
    if (!user) return null;
    return doc(firestore, 'employees', user.uid);
  }, [firestore, user]);

  const { data: employee } = useDoc<Employee>(employeeDocRef);


  const handleStartService = async () => {
    if (!user || !firestore) {
        toast({ variant: "destructive", title: "Error", description: "Has d'iniciar sessió." });
        return;
    }
    
    setIsStarting(true);
    
    const now = new Date();
    const serviceRecord = {
        employeeId: user.uid,
        arrivalDateTime: now.toISOString(),
        departureDateTime: now.toISOString(), 
        description: "Servei en curs...",
        projectName: '',
        pendingTasks: '',
        customerId: '',
        customerName: '',
        media: [],
        albarans: [],
        createdAt: now.toISOString(),
    };
    
    const serviceRecordsCollection = collection(firestore, `employees/${user.uid}/serviceRecords`);

    try {
        const docRef = await addDoc(serviceRecordsCollection, serviceRecord);
        
        if (docRef.id) {
            const userName = employee?.firstName || 'funcionari';
            toast({ 
                title: `Gràcies, ${userName}!`,
                description: "S'ha iniciat el registre del servei."
            });
            router.push(`/dashboard/edit/${docRef.id}`);
        } else {
           throw new Error("Failed to get document reference after creation.");
        }
    } catch (error) {
        console.error("Error creating service record:", error);
        setIsStarting(false);
        toast({ variant: "destructive", title: "Error", description: "No s'ha pogut iniciar el servei." });
    }
  };


  if (isUserLoading) {
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
    <div className="max-w-2xl mx-auto flex items-center justify-center" style={{ height: '60vh' }}>
      <Card className="w-full text-center">
        <CardHeader>
          <CardTitle>Preparat per començar?</CardTitle>
          <CardDescription>Clica el botó per iniciar un nou servei.</CardDescription>
        </CardHeader>
        <CardContent>
            <Button 
                size="lg" 
                className="w-full h-16 text-lg bg-accent hover:bg-accent/90 text-accent-foreground"
                onClick={handleStartService}
                disabled={isStarting}
            >
                <MapPin className="mr-3 h-6 w-6" />
                {isStarting ? "Iniciant..." : "Iniciar Servei"}
            </Button>
        </CardContent>
      </Card>
    </div>
  )
}
