
'use client'

import { useMemo, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useCollection, useUser, useFirestore, useMemoFirebase, deleteDocumentNonBlocking } from '@/firebase'
import { collection, query, addDoc, doc, writeBatch, orderBy, getDocs } from 'firebase/firestore'
import type { Customer } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
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
import { AdminGate } from '@/components/AdminGate'

// Dades de client de mostra para sincronização inicial
const mockCustomers: Omit<Customer, 'id'>[] = [
  { name: 'Adiel Serveis', nrt: 'F333016-C', address: 'Cami de engolasters 2', email: '', contact: '' },
  { name: 'ADVOCADA EVA LOPEZ HERRERO', nrt: 'F-216873-R', address: 'C/LES CANALS N°5 1°18', email: '', contact: '' },
  { name: 'Albertina Almeida', nrt: 'F-173750-T', address: 'Avinguda Joan Marti nº44', email: '', contact: '' },
  { name: 'Àlex Terés', nrt: '', address: 'Pleta d’Ordino 38A', email: '', contact: '390500' },
  { name: 'Alimentària UNIÓ la verema', nrt: 'L-706700-X', address: 'AV. SALOU, 54 LOCAL 8', email: 'administracio@alimentariaunio.com', contact: '' },
  { name: 'AndBnB S.L', nrt: 'L716427', address: 'Cortals ,Piso Font del Ferro, -3 5', email: '', contact: '' },
  { name: 'Certes Ventures SLU', nrt: 'B25851882', address: 'Ctra. d’Argolell núm. 1', email: 'mvilaporte@gmail.com', contact: '' },
  { name: 'Clínica dental Diet Kahn', nrt: 'C802450z', address: 'Carrer Josep Rossel Calva 13', email: 'Clinicadietkahn@andorra.ad', contact: '803020' },
  { name: 'CONSTRUCCIONS LA BORDA, S.L.', nrt: '', address: 'CL DE LA VALIRETA, 3 2 1, AD200 Encamp, Andorra', email: '', contact: '' },
  { name: 'Dirgest', nrt: 'L711805D', address: 'Carre Bonaventura Riberaigua, 25, 5 B', email: 'amorchon@dirgest.eu', contact: '' },
  { name: 'Mesas Trigo sl', nrt: '', address: 'Avinguda Meritxell, 75 3ª planta despatx 8-10 Edifici Quars', email: 'eva.seixas@mesastrigo.com', contact: '887007' },
  { name: 'Policlinica Dental Roge', nrt: 'L144354s', address: 'Av.Rocaford 30', email: 'recepcio@dentalroge.com', contact: '844500' },
  { name: 'Residència Clara Rabassa', nrt: 'U-126 896-N', address: 'Avda. Princep Benlloch, 26-30', email: 'direccio@clararabassa.com', contact: '805960' },
  { name: 'VILADOMAT, SAU', nrt: 'A-700966-G', address: 'Carrer Roureda de Sansa, 10', email: 'immasopena@viladomat.com', contact: '' }
].sort((a, b) => a.name.localeCompare(b.name, 'ca', { sensitivity: 'base' }));


export default function CustomersPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { user, isUserLoading } = useUser()
  const firestore = useFirestore()
  const [isImporting, setIsImporting] = useState(false)

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/');
    }
  }, [isUserLoading, user, router]);

  const customersQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'customers'), orderBy('name', 'asc'));
  }, [firestore, user])

  const { data: customers, isLoading: isLoadingCustomers } = useCollection<Customer>(customersQuery)
  
  // DEDUPLICAÇÃO DE CLIENTES NA LISTA VISUAL
  const displayCustomers = useMemo(() => {
    if (!customers) return [];
    const seen = new Set();
    return customers.filter(c => {
      const nameKey = c.name.toLowerCase().trim().replace(/\s+/g, ' ');
      if (seen.has(nameKey)) return false;
      seen.add(nameKey);
      return true;
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [customers]);

  const handleImportMockData = async () => {
    if (!firestore) return;
    setIsImporting(true);

    try {
      const existingSnap = await getDocs(collection(firestore, 'customers'));
      const existingNames = new Set(existingSnap.docs.map(doc => doc.data().name.toLowerCase().trim().replace(/\s+/g, ' ')));

      const batch = writeBatch(firestore);
      const customersCollection = collection(firestore, 'customers');
      
      let addedCount = 0;
      mockCustomers.forEach(customerData => {
        const nameKey = customerData.name.toLowerCase().trim().replace(/\s+/g, ' ');
        if (!existingNames.has(nameKey)) {
          const docRef = doc(customersCollection);
          batch.set(docRef, { ...customerData, name: customerData.name.trim() });
          existingNames.add(nameKey); 
          addedCount++;
        }
      });

      if (addedCount > 0) {
        await batch.commit();
        toast({
          title: 'Sincronització Completa',
          description: `${addedCount} nous clients han estat afegits sense duplicats.`,
        });
      } else {
        toast({
          title: 'Sense canvis',
          description: 'Tots els clients já existeixen a la base de dades.',
        });
      }
    } catch (error) {
      console.error("Error en importar clients:", error);
      toast({
        variant: 'destructive',
        title: 'Error en la sincronització',
        description: "No s'han pogut afegir els clients.",
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
      description: `El client ${customerName} ha estat eliminat.`,
    });
  };
  
  const isLoading = isUserLoading || isLoadingCustomers;

  if (isLoading) return <p className="p-4">Carregant clients...</p>;
  if (!user) return null;

  return (
    <AdminGate pageTitle="Gestió de Clients" pageDescription="Visualitza, afegeix i gestiona tots els clients registrats.">
        <div className="max-w-6xl mx-auto">
        <Card>
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-4">
            <div>
                <CardTitle>Gestió de Clients</CardTitle>
                <CardDescription>Visualitza, afegeix i gestiona tots els clients registrats.</CardDescription>
            </div>
            <div className="flex gap-2 flex-wrap w-full sm:w-auto">
                <Button variant="outline" onClick={handleImportMockData} disabled={isImporting} className="w-full sm:w-auto">
                <Upload className="mr-2 h-4 w-4" />
                {isImporting ? 'Sincronitzant...' : 'Sincronitzar Dades'}
                </Button>
                <Button onClick={() => router.push('/dashboard/customers/edit/new')} className="w-full sm:w-auto">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Nou Client
                </Button>
            </div>
            </CardHeader>
            <CardContent>
            <div className="overflow-x-auto">
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
                    {displayCustomers.length > 0 ? displayCustomers.map(customer => (
                        <TableRow key={customer.id}>
                        <TableCell>
                            <div className="font-medium flex items-center gap-2">
                                <Building className="h-4 w-4 text-muted-foreground" />
                                {customer.name}
                            </div>
                            <div className="text-sm text-muted-foreground max-w-[200px] truncate">{customer.address}</div>
                        </TableCell>
                        <TableCell>
                            <div className="flex items-center gap-2">
                                <Hash className="h-4 w-4 text-muted-foreground" />
                                {customer.nrt || 'N/A'}
                            </div>
                        </TableCell>
                        <TableCell>
                            <div className="flex items-center gap-2 max-w-[150px] truncate">
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
                        <TableCell className="text-right">
                            <div className="flex justify-end items-center gap-2">
                                <Button asChild variant="outline" size="icon" onClick={() => router.push(`/dashboard/customers/edit/${customer.id}`)}>
                                    <Edit className="h-4 w-4" />
                                </Button>
                            
                                <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="destructive" size="icon">
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                    <AlertDialogTitle>Estàs segur?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Aquesta acció no es pot desfer. S'eliminarà el client <strong>{customer.name}</strong>.
                                    </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel·lar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteCustomer(customer.id, customer.name)} className="bg-destructive">Eliminar</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        </TableCell>
                        </TableRow>
                    )) : (
                        <TableRow>
                            <TableCell colSpan={5} className="h-24 text-center">
                                No s'han trobat clients.
                            </TableCell>
                        </TableRow>
                    )}
                    </TableBody>
                </Table>
            </div>
            </CardContent>
        </Card>
        </div>
    </AdminGate>
  )
}
