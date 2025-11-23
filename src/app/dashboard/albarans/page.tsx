'use client'

import { useMemo, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCollection, useUser, useFirestore, useMemoFirebase, deleteDocumentNonBlocking } from '@/firebase'
import { collection, query, orderBy, doc, getDocs, collectionGroup, writeBatch, updateDoc } from 'firebase/firestore'
import type { Albaran, ServiceRecord } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Eye, FileArchive, Trash2, RefreshCw, Loader2 } from 'lucide-react'
import { format, parseISO, differenceInMinutes, isValid } from 'date-fns'
import { ca } from 'date-fns/locale'
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


function calculateTotalMinutes(services: ServiceRecord[]): number {
    if (!services) return 0;

    return services.reduce((total, service) => {
        if (service.arrivalDateTime && service.departureDateTime) {
            const startDate = parseISO(service.arrivalDateTime);
            const endDate = parseISO(service.departureDateTime);

            if (!isValid(startDate) || !isValid(endDate) || startDate.getTime() === endDate.getTime()) {
              return total;
            }
            return total + differenceInMinutes(endDate, startDate);
        }
        return total;
    }, 0);
}


export default function AlbaransHistoryPage() {
  const router = useRouter()
  const { user, isUserLoading } = useUser()
  const firestore = useFirestore()
  const { toast } = useToast()
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/')
    }
  }, [isUserLoading, user, router])

  const albaransQuery = useMemoFirebase(() => {
    if (!firestore) return null
    return query(collection(firestore, 'albarans'), orderBy('albaranNumber', 'desc'))
  }, [firestore])

  const { data: albarans, isLoading: isLoadingAlbarans } = useCollection<Albaran>(albaransQuery)

  const handleDeleteAlbaran = (albaranId: string, albaranNumber: number) => {
    if (!firestore) return;
    const albaranDocRef = doc(firestore, 'albarans', albaranId);
    
    deleteDocumentNonBlocking(albaranDocRef);
    
    toast({
      title: 'Albarà Eliminat',
      description: `L'albarà #${albaranNumber} ha estat eliminat del historial.`,
    });
  };

  const handleUpdateAllAlbarans = async () => {
    if (!firestore || !albarans) {
      toast({ variant: 'destructive', title: 'Error', description: 'No s\'han pogut carregar les dades.' });
      return;
    }

    setIsUpdating(true);
    toast({ title: 'Actualitzant totals...', description: 'Aquesta operació pot trigar uns moments.' });

    try {
      const allServicesSnapshot = await getDocs(collectionGroup(firestore, 'serviceRecords'));
      const allServicesData = allServicesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ServiceRecord));
      
      const batch = writeBatch(firestore);
      let updatedCount = 0;

      for (const albaran of albarans) {
        const associatedServices = allServicesData.filter(service => albaran.serviceRecordIds.includes(service.id));

        const totalMinutes = calculateTotalMinutes(associatedServices);
        const totalHours = totalMinutes / 60;
        const laborCost = totalHours * 30;

        const materialsSubtotal = associatedServices.reduce((total, service) => {
            return total + (service.materials || []).reduce((subtotal, material) => {
                return subtotal + (material.quantity * material.unitPrice);
            }, 0);
        }, 0);
        
        const subtotal = materialsSubtotal + laborCost;
        const ivaRate = 0.045;
        const iva = subtotal * ivaRate;
        const newTotalAmount = subtotal + iva;


        if (newTotalAmount.toFixed(2) !== albaran.totalAmount.toFixed(2)) {
            const albaranRef = doc(firestore, 'albarans', albaran.id);
            batch.update(albaranRef, { totalAmount: newTotalAmount });
            updatedCount++;
        }
      }

      await batch.commit();

      toast({
        title: 'Actualització Completa',
        description: `${updatedCount} albarà(ns) han estat actualitzats.`,
      });

    } catch (error) {
      console.error("Error actualitzant albarans:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'No s\'ha pogut completar l\'actualització.' });
    } finally {
      setIsUpdating(false);
    }
  };


  if (isUserLoading || isLoadingAlbarans) {
    return <p>Carregant historial...</p>
  }

  if (!user) {
    return null
  }

  return (
    <AdminGate pageTitle="Historial d'Albarans" pageDescription="Aquesta secció està protegida.">
        <div className="max-w-6xl mx-auto">
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-4">
                <FileArchive className="h-8 w-8" />
                <div>
                    <CardTitle>Historial d'Albarans</CardTitle>
                    <CardDescription>Consulta tots els albarans que s'han generat.</CardDescription>
                </div>
            </div>
            <Button onClick={handleUpdateAllAlbarans} disabled={isUpdating} variant="outline">
              {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              {isUpdating ? 'Actualitzant...' : 'Actualitzar Totals Anteriors'}
            </Button>
            </CardHeader>
            <CardContent>
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead>Nº Albarà</TableHead>
                    <TableHead>Data Creació</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Obra</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead className="text-right">Accions</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {albarans && albarans.length > 0 ? albarans.map(albaran => (
                    <TableRow key={albaran.id}>
                    <TableCell className="font-bold">#{String(albaran.albaranNumber).padStart(4, '0')}</TableCell>
                    <TableCell>{format(parseISO(albaran.createdAt), 'dd/MM/yyyy HH:mm', { locale: ca })}</TableCell>
                    <TableCell>{albaran.customerName}</TableCell>
                    <TableCell>{albaran.projectName}</TableCell>
                    <TableCell>{albaran.totalAmount.toFixed(2)} €</TableCell>
                    <TableCell className="text-right flex items-center justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => router.push(`/dashboard/albarans/${albaran.id}`)}>
                        <Eye className="mr-2 h-4 w-4" />
                        Veure
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
                                Aquesta acció no es pot desfer. Això eliminarà l'albarà <strong>#{albaran.albaranNumber}</strong> del historial, però no els registres de servei associats.
                            </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                            <AlertDialogCancel>Cancel·lar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteAlbaran(albaran.id, albaran.albaranNumber)} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                        </AlertDialog>
                    </TableCell>
                    </TableRow>
                )) : (
                    <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                        No s'ha generat cap albarà encara.
                    </TableCell>
                    </TableRow>
                )}
                </TableBody>
            </Table>
            </CardContent>
        </Card>
        </div>
    </AdminGate>
  )
}
