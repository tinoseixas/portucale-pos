'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCollection, useUser, useFirestore, useMemoFirebase, deleteDocumentNonBlocking } from '@/firebase'
import { collection, query, addDoc, doc, writeBatch } from 'firebase/firestore'
import type { Customer } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { ADMIN_EMAIL } from '@/lib/admin'
import { Edit, Trash2, PlusCircle, Building, Mail, Phone, Hash, Upload } from 'lucide-react'
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
import { useToast } from '@/hooks/use-toast'

// Dades de client de mostra per importar. Substitueix-les per les teves dades reals.
const mockCustomers: Omit<Customer, 'id'>[] = [
  {
    name: 'Constructora Solida',
    address: 'Carrer de la Construcció, 10, Barcelona',
    contact: '932001122',
    email: 'info@solidaconstruct.com',
    nrt: 'A12345678',
  },
  {
    name: 'Reformes Integrals PobleNou',
    address: 'Rambla del Poblenou, 55, Barcelona',
    contact: '933004455',
    email: 'contacte@reformespoblenou.es',
    nrt: 'B87654321',
  },
  {
    name: 'Jardineria El Pi',
    address: 'Carrer del Bosc, 2, Sant Cugat',
    contact: '935896677',
    email: 'jardineria@elpi.cat',
    nrt: 'C12312312',
  },
];


export default function CustomersPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { user, isUserLoading } = useUser()
  const firestore = useFirestore()
  const [isImporting, setIsImporting] = useState(false)

  const isCurrentUserAdmin = useMemo(() => {
    if (isUserLoading || !user) return false;
    return user.email === ADMIN_EMAIL;
  }, [user, isUserLoading]);

  const customersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    // Only admins can see this page, but we secure the query anyway
    return isCurrentUserAdmin ? query(collection(firestore, 'customers')) : null;
  }, [firestore, isCurrentUserAdmin])

  const { data: customers, isLoading: isLoadingCustomers } = useCollection<Customer>(customersQuery)
  
  const handleImportMockData = async () => {
    if (!firestore) return;
    setIsImporting(true);

    try {
      const batch = writeBatch(firestore);
      const customersCollection = collection(firestore, 'customers');
      
      mockCustomers.forEach(customerData => {
        const docRef = doc(customersCollection); // Create a new doc with a random ID
        batch.set(docRef, customerData);
      });

      await batch.commit();

      toast({
        title: 'Importació Completa',
        description: `${mockCustomers.length} clients de mostra han estat afegits.`,
      });
    } catch (error) {
      console.error("Error en importar clients:", error);
      toast({
        variant: 'destructive',
        title: 'Error en la importació',
        description: 'No s\'han pogut afegir els clients de mostra.',
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleDeleteCustomer = (customerId: string, customerName: string) => {
    if (!firestore) return;
    const customerDocRef = doc(firestore, 'customers', customerId);
    
    deleteDocumentNonBlocking(customerDocRef);
    
    toast({
      title: 'Client Eliminat',
      description: `El client ${customerName} ha estat eliminat correctament.`,
    });
  };
  
  if (isUserLoading || isLoadingCustomers) {
    return <p>Carregant clients...</p>
  }
  
  if (!isCurrentUserAdmin) {
     return <p>Accés no autoritzat.</p>;
  }

  return (
    <div className="max-w-6xl mx-auto">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Gestió de Clients</CardTitle>
            <CardDescription>Visualitza, afegeix i gestiona tots els clients registrats.</CardDescription>
          </div>
           <div className="flex gap-2">
            <Button variant="outline" onClick={handleImportMockData} disabled={isImporting}>
              <Upload className="mr-2 h-4 w-4" />
              {isImporting ? 'Important...' : 'Importar Dades de Mostra'}
            </Button>
            <Button onClick={() => router.push('/dashboard/customers/edit/new')}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Nou Client
            </Button>
           </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>NIF</TableHead>
                <TableHead>Correu electrònic</TableHead>
                <TableHead>Telèfon</TableHead>
                <TableHead className="text-right">Accions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers && customers.length > 0 ? customers.map(customer => (
                <TableRow key={customer.id}>
                  <TableCell>
                    <div className="font-medium flex items-center gap-2">
                        <Building className="h-4 w-4 text-muted-foreground" />
                        {customer.name}
                    </div>
                    <div className="text-sm text-muted-foreground">{customer.address}</div>
                  </TableCell>
                  <TableCell>
                     <div className="flex items-center gap-2">
                        <Hash className="h-4 w-4 text-muted-foreground" />
                        {customer.nrt || 'N/A'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        {customer.email || 'N/A'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        {customer.contact || 'N/A'}
                    </div>
                  </TableCell>
                  <TableCell className="text-right flex justify-end items-center gap-2">
                     <Button asChild variant="outline" size="sm" onClick={() => router.push(`/dashboard/customers/edit/${customer.id}`)}>
                        <Edit className="h-4 w-4" />
                    </Button>
                   
                    <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm">
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                        <AlertDialogTitle>Estàs segur?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Aquesta acció no es pot desfer. Això eliminarà permanentment el client <strong>{customer.name}</strong>.
                        </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                        <AlertDialogCancel>Cancel·lar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeleteCustomer(customer.id, customer.name)} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                    </AlertDialog>
                  
                  </TableCell>
                </TableRow>
              )) : (
                 <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                        No s'han trobat clients. Comença afegint-ne un o important dades de mostra.
                    </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
