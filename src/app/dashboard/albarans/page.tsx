'use client'

import { useMemo, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCollection, useUser, useFirestore, useMemoFirebase, deleteDocumentNonBlocking } from '@/firebase'
import { collection, query, orderBy, doc, getDocs, collectionGroup, writeBatch } from 'firebase/firestore'
import type { Albaran, ServiceRecord, Employee } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Eye, FileArchive, Trash2, RefreshCw, Loader2, AlertCircle, CreditCard, ArrowRight } from 'lucide-react'
import { format, parseISO } from 'date-fns'
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
import { calculateTotalAmount } from '@/lib/calculations'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import Link from 'next/link'


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
  
  const employeesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'employees')) : null, [firestore]);
  const { data: employees, isLoading: isLoadingEmployees } = useCollection<Employee>(employeesQuery);

  const pendingAlbarans = useMemo(() => {
    return albarans?.filter(a => a.status === 'pendent') || [];
  }, [albarans]);

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
    if (!firestore || !albarans || !employees) {
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
        const { totalGeneral: newTotalAmount } = calculateTotalAmount(associatedServices, employees);

        if (newTotalAmount.toFixed(2) !== albaran.totalAmount.toFixed(2)) {
            const albaranRef = doc(firestore, 'albarans', albaran.id);
            batch.update(albaranRef, { totalAmount: newTotalAmount });
            updatedCount++;
        }
      }

      if (updatedCount > 0) {
        await batch.commit();
      }

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

  const getStatusVariant = (status: Albaran['status']) => {
    switch (status) {
      case 'facturat':
        return 'default'
      case 'pendent':
        return 'secondary'
      default:
        return 'outline'
    }
  }


  if (isUserLoading || isLoadingAlbarans || isLoadingEmployees) {
    return <div className="flex items-center justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /><span className="ml-3">Carregant historial d'albarans...</span></div>
  }

  if (!user) {
    return null
  }

  return (
    <AdminGate pageTitle="Historial d'Albarans" pageDescription="Consulta i gestiona tots els albarans generats.">
        <div className="max-w-full mx-auto space-y-6">
        
        {/* Aviso de Albarans Pendents */}
        {pendingAlbarans.length > 0 && (
          <Alert className="bg-primary/5 border-primary/20 shadow-sm">
            <AlertCircle className="h-5 w-5 text-primary" />
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full">
              <div>
                <AlertTitle className="text-primary font-bold">Tens {pendingAlbarans.length} albarans pendents de facturar</AlertTitle>
                <AlertDescription className="text-muted-foreground">
                  Aquests documents han estat validats però encara no s'han convertit en factura.
                </AlertDescription>
              </div>
              <Button asChild size="sm" className="bg-primary hover:bg-primary/90 shrink-0">
                <Link href="/dashboard/invoices">
                  Anar a Facturació <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </Alert>
        )}

        <Card>
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
                <div className="bg-primary/10 p-3 rounded-xl">
                  <FileArchive className="h-8 w-8 text-primary" />
                </div>
                <div>
                    <CardTitle>Historial d'Albarans</CardTitle>
                    <CardDescription>Consulta tots els albarans que s'han generat al sistema.</CardDescription>
                </div>
            </div>
            <Button onClick={handleUpdateAllAlbarans} disabled={isUpdating} variant="outline" className="w-full sm:w-auto">
              {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              {isUpdating ? 'Actualitzant...' : 'Actualitzar Totals'}
            </Button>
            </CardHeader>
            <CardContent>
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead>Nº Albarà</TableHead>
                        <TableHead>Data Creació</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Obra</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Estat</TableHead>
                        <TableHead className="text-right">Accions</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {albarans && albarans.length > 0 ? albarans.map(albaran => (
                        <TableRow key={albaran.id} className={albaran.status === 'pendent' ? 'bg-primary/[0.02]' : ''}>
                        <TableCell className="font-bold">#{String(albaran.albaranNumber).padStart(4, '0')}</TableCell>
                        <TableCell>{format(parseISO(albaran.createdAt), 'dd/MM/yyyy HH:mm', { locale: ca })}</TableCell>
                        <TableCell className="font-medium">{albaran.customerName}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{albaran.projectName}</TableCell>
                        <TableCell className="font-semibold">{albaran.totalAmount.toFixed(2)} €</TableCell>
                        <TableCell>
                          <Badge variant={getStatusVariant(albaran.status)} className="capitalize">
                            {albaran.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                                {albaran.status === 'pendent' && (
                                  <Button 
                                    variant="secondary" 
                                    size="sm" 
                                    asChild
                                    className="bg-accent/10 text-accent-foreground hover:bg-accent/20 border-accent/20"
                                  >
                                    <Link href={`/dashboard/invoices?customerId=${albaran.customerId}&albaranId=${albaran.id}`}>
                                      <CreditCard className="mr-2 h-4 w-4" />
                                      Facturar
                                    </Link>
                                  </Button>
                                )}
                                <Button variant="outline" size="sm" onClick={() => router.push(`/dashboard/albarans/${albaran.id}`)}>
                                <Eye className="mr-2 h-4 w-4" />
                                Veure
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
                                        Aquesta acció no es pot desfer. Això eliminarà l'albarà <strong>#{albaran.albaranNumber}</strong> del historial, però no els registres de servei associats.
                                    </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel·lar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteAlbaran(albaran.id, albaran.albaranNumber)} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        </TableCell>
                        </TableRow>
                    )) : (
                        <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center">
                            No s'ha generat cap albarà encara.
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
