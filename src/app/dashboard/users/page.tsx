
'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCollection, useUser, useFirestore, useMemoFirebase, deleteDocumentNonBlocking } from '@/firebase'
import { collection, query, doc, getDocs, writeBatch, collectionGroup, addDoc } from 'firebase/firestore'
import type { Employee, Customer, Project } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Edit, Trash2, ShieldAlert, Loader2, Database, RotateCcw } from 'lucide-react'
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

const WhatsAppIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M12.04 2.01A10.03 10.03 0 0 0 2 12.05a10.03 10.03 0 0 0 10.04 10.04 10.03 10.03 0 0 0 10.04-10.04c0-5.52-4.49-10.04-10.04-10.04zM12.04 20.1a8.03 8.03 0 0 1-8.03-8.04c0-4.43 3.6-8.03 8.03-8.03A8.03 8.03 0 0 1 20.07 12.05a8.03 8.03 0 0 1-8.03 8.04z"></path>
    <path d="M15.43 14.61c-.13-.06-1.12-.55-1.29-.62-.18-.06-.31-.1-.44.1-.13.2-.49.62-.6.74-.11.13-.22.14-.41.09-.19-.06-.82-.3-1.56-.96-.58-.51-1.02-1.15-1.13-1.34s-.01-.29.09-.38c.09-.09.2-.23.29-.34.1-.11.13-.19.19-.31.06-.13.03-.25-.01-.34-.05-.1-.44-1.06-.6-1.45-.16-.39-.32-.34-.44-.34-.11 0-.25-.01-.37-.01s-.32 0-.49.1c-.17.1-.44.2-.6.49-.16.29-.62.77-.62 1.87 0 1.1.63 2.17.72 2.32.09.15 1.25 1.91 3.03 2.68.43.18.77.29 1.04.37.52.16.99.14 1.36.09.43-.06 1.29-.52 1.47-.98.18-.47.18-.87.13-.98s-.13-.18-.28-.29z"></path>
  </svg>
);

export default function UsersPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { user, isUserLoading } = useUser()
  const firestore = useFirestore()
  const [isClearing, setIsClearing] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);

  const employeesQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(collection(firestore, 'employees'))
  }, [firestore, user])

  const { data: employees, isLoading: isLoadingEmployees } = useCollection<Employee>(employeesQuery)
  
  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/');
    }
  }, [isUserLoading, user, router]);

  const handleWhatsAppClick = (phoneNumber: string) => {
    const internationalNumber = phoneNumber.startsWith('+') ? phoneNumber : `376${phoneNumber.replace(/\s+/g, '')}`;
    window.open(`https://wa.me/${internationalNumber}`, '_blank');
  };

  const handleClearAllData = async () => {
    if (!firestore) return;
    setIsClearing(true);
    toast({ title: "Netejant dades...", description: "S'estan eliminant tots els registres." });

    try {
        const collections = ['customers', 'projects', 'albarans', 'invoices', 'receipts', 'quotes'];
        const batch = writeBatch(firestore);

        for (const colName of collections) {
            const snap = await getDocs(collection(firestore, colName));
            snap.forEach(d => batch.delete(d.ref));
        }

        const servicesSnap = await getDocs(collectionGroup(firestore, 'serviceRecords'));
        servicesSnap.forEach(d => batch.delete(d.ref));

        const countersSnap = await getDocs(collection(firestore, 'counters'));
        countersSnap.forEach(d => batch.delete(d.ref));

        await batch.commit();
        toast({ title: "Base de dades neta", description: "S'han eliminat tots els registres amb èxit." });
        router.refresh();
    } catch (error) {
        console.error(error);
        toast({ variant: 'destructive', title: "Error", description: "No s'ha pogut netejar la base de dades." });
    } finally {
        setIsClearing(false);
    }
  };

  const handleRestoreSampleData = async () => {
    if (!firestore) return;
    setIsSeeding(true);
    toast({ title: "Restaurant dades...", description: "S'està creant el contingut de prova." });

    try {
        // Create Sample Customers
        const customers = [
            { name: "Residencial Els Arcs", address: "Carrer de les Escoles 12, Andorra la Vella", nrt: "L-706521-X", email: "info@elsarcs.ad" },
            { name: "Promocions Canillo 2000", address: "Av. Sant Joan 4, Canillo", nrt: "F-123456-Z", email: "gerencia@canillo2000.ad" }
        ];

        const batch = writeBatch(firestore);
        
        for (const cust of customers) {
            const cRef = doc(collection(firestore, 'customers'));
            batch.set(cRef, cust);
            
            // Create a sample project for each customer
            const pRef = doc(collection(firestore, 'projects'));
            batch.set(pRef, {
                name: `Reforma Interior - ${cust.name}`,
                customerId: cRef.id,
                customerName: cust.name,
                status: 'active',
                createdAt: new Date().toISOString()
            });
        }

        await batch.commit();
        toast({ title: "Dades restaurades", description: "S'han afegit clients e obres de mostra." });
        router.push('/dashboard');
    } catch (error) {
        console.error(error);
        toast({ variant: 'destructive', title: "Error", description: "No s'han pogut carregar les dades de prova." });
    } finally {
        setIsSeeding(false);
    }
  };

  const getInitials = (employee: Employee) => {
    if (employee.firstName && employee.lastName) return `${employee.firstName[0]}${employee.lastName[0]}`.toUpperCase()
    if (employee.firstName) return employee.firstName[0].toUpperCase()
    if (employee.email) return employee.email[0].toUpperCase()
    return 'U'
  }
  
  const isLoading = isUserLoading || isLoadingEmployees;
  const isAdmin = user?.email === 'tinoseixas@gmail.com';
  
  if (isLoading) return <p className="p-12 text-center font-bold uppercase tracking-widest">Carregant usuaris...</p>
  if (!user) return null;

  return (
    <AdminGate pageTitle="Gestió d'Usuaris" pageDescription="Aquesta secció està protegida.">
        <div className="max-w-4xl mx-auto space-y-10 pb-20">
        <Card className="border-none shadow-xl rounded-3xl overflow-hidden">
            <CardHeader className="bg-slate-900 text-white">
                <CardTitle className="text-2xl font-black uppercase tracking-tight">Gestió d'Usuaris</CardTitle>
                <CardDescription className="text-slate-400">Visualitza i gestiona tots els empleats registrats.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader className="bg-slate-50">
                    <TableRow>
                        <TableHead className="px-8 font-black uppercase text-[10px] tracking-widest">Empleat</TableHead>
                        <TableHead className="font-black uppercase text-[10px] tracking-widest">ID d'Empleat</TableHead>
                        <TableHead className="font-black uppercase text-[10px] tracking-widest">Rol</TableHead>
                        <TableHead className="text-right px-8 font-black uppercase text-[10px] tracking-widest">Accions</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {employees?.map(employee => (
                        <TableRow key={employee.id} className="hover:bg-slate-50">
                        <TableCell className="px-8 py-4">
                            <div className="flex items-center gap-3">
                            <Avatar className="border-2 border-primary/10">
                                <AvatarImage src={employee.avatar} />
                                <AvatarFallback className="font-black bg-primary/10 text-primary">{getInitials(employee)}</AvatarFallback>
                            </Avatar>
                            <p className="font-black text-slate-900 uppercase text-xs">{employee.firstName} {employee.lastName}</p>
                            </div>
                        </TableCell>
                        <TableCell className="font-bold text-slate-400">#{employee.employeeId}</TableCell>
                        <TableCell>
                            <Badge variant={employee.role === 'admin' ? 'default' : 'secondary'} className="font-black uppercase text-[10px]">
                            {employee.role || 'user'}
                            </Badge>
                        </TableCell>
                        <TableCell className="text-right px-8">
                          <div className="flex justify-end items-center gap-2">
                              <Button asChild variant="outline" size="icon" className="h-9 w-9 rounded-xl border-2">
                                  <Link href={`/dashboard/users/edit/${employee.id}`}>
                                      <Edit className="h-4 w-4" />
                                  </Link>
                              </Button>
                              {employee.phoneNumber && (
                              <Button variant="ghost" size="icon" onClick={() => handleWhatsAppClick(employee.phoneNumber!)} className="h-9 w-9 text-green-500">
                                  <WhatsAppIcon className="h-5 w-5" />
                              </Button>
                              )}
                          </div>
                        </TableCell>
                        </TableRow>
                    ))}
                    </TableBody>
                </Table>
            </div>
            </CardContent>
        </Card>

        {isAdmin && (
            <Card className="border-none shadow-2xl bg-red-50/50 rounded-[2.5rem] overflow-hidden">
                <CardHeader className="bg-red-600 text-white p-8">
                    <CardTitle className="text-xl font-black uppercase tracking-widest flex items-center gap-2">
                        <ShieldAlert className="h-6 w-6" />
                        Zona de Perill (Admin)
                    </CardTitle>
                    <CardDescription className="text-red-100 font-medium italic">Accions per a la configuració de la nova base de dades.</CardDescription>
                </CardHeader>
                <CardContent className="p-8 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="p-6 bg-white rounded-3xl border-2 border-red-100 shadow-sm space-y-4">
                            <div className="space-y-1">
                                <p className="font-black text-slate-900 uppercase text-xs">Repor registres (Eliminar dades)</p>
                                <p className="text-[10px] text-slate-400 font-bold uppercase">Neteja tota la informació per començar de nou.</p>
                            </div>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="destructive" disabled={isClearing} className="w-full h-12 font-black uppercase tracking-widest rounded-xl">
                                        {isClearing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                                        LIMPAR TUDO
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="rounded-[2.5rem] p-10">
                                    <AlertDialogHeader>
                                        <AlertDialogTitle className="text-2xl font-black uppercase text-red-600 italic">ATENCIÓ! ACCIÓ IRREVERSIBLE</AlertDialogTitle>
                                        <AlertDialogDescription className="text-base font-medium">
                                            Això esborrarà **TODOS** os registos (Clientes, Obras, Alvarás, Facturas). Os perfis de utilizador mantêm-se.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter className="pt-6">
                                        <AlertDialogCancel className="h-14 rounded-2xl font-bold border-2 px-8">CANCEL·LAR</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleClearAllData} className="bg-red-600 h-14 rounded-2xl font-black uppercase tracking-widest px-8">SÍ, REPOR TUDO</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>

                        <div className="p-6 bg-white rounded-3xl border-2 border-primary/10 shadow-sm space-y-4">
                            <div className="space-y-1">
                                <p className="font-black text-primary uppercase text-xs">Restaurar Dades de Prova</p>
                                <p className="text-[10px] text-slate-400 font-bold uppercase">Crea clients e obres de mostra automàticament.</p>
                            </div>
                            <Button variant="outline" onClick={handleRestoreSampleData} disabled={isSeeding} className="w-full h-12 border-primary text-primary font-black uppercase tracking-widest rounded-xl hover:bg-primary/5">
                                {isSeeding ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Database className="h-4 w-4 mr-2" />}
                                CARREGAR MOSTRA
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        )}
        </div>
    </AdminGate>
  )
}
