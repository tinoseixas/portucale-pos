
'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCollection, useUser, useFirestore, useMemoFirebase } from '@/firebase'
import { collection, query, doc, getDocs, writeBatch, collectionGroup, addDoc, setDoc, orderBy, limit } from 'firebase/firestore'
import type { Employee, Customer, ServiceRecord, Albaran, Invoice, Quote, Project, Receipt } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Edit, ShieldAlert, Loader2, Database, AlertCircle, Download, Upload, RefreshCw, FileWarning, Cloud } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { AdminGate } from '@/components/AdminGate'
import { format, parseISO } from 'date-fns'
import { ca } from 'date-fns/locale'

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
  const [isSeeding, setIsSeeding] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const employeesQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(collection(firestore, 'employees'))
  }, [firestore, user])

  const { data: employees, isLoading: isLoadingEmployees } = useCollection<Employee>(employeesQuery)

  const backupsQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(collection(firestore, 'backups'), orderBy('createdAt', 'desc'), limit(10))
  }, [firestore, user]);

  const { data: cloudBackups, isLoading: isLoadingBackups } = useCollection<any>(backupsQuery);
  
  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/');
    }
  }, [isUserLoading, user, router]);

  const handleWhatsAppClick = (phoneNumber: string) => {
    const internationalNumber = phoneNumber.startsWith('+') ? phoneNumber : `376${phoneNumber.replace(/\s+/g, '')}`;
    window.open(`https://wa.me/${internationalNumber}`, '_blank');
  };

  const handleRestoreSampleData = async () => {
    if (!firestore || !user) return;
    setIsSeeding(true);
    toast({ title: "Restaurant dades...", description: "S'està creant el contingut de prova complet." });

    try {
        const batch = writeBatch(firestore);
        
        const customers = [
            { name: "Comunitat Edifici Font de Ferro", address: "AD200 Encamp", nrt: "L-706521-X", email: "info@fontferro.ad" },
            { name: "Hotel Roc de Caldes", address: "Ctra. d'Engolasters, Escaldes-Engordany", nrt: "F-123456-Z", email: "recepcio@rocdescaldes.ad" },
            { name: "Comú d'Encamp - Dept. Obres", address: "Plaça dels Arinsols, Encamp", nrt: "G-000001-A", email: "obres@encamp.ad" },
            { name: "Residencial Les Terrasses", address: "Av. Príncep Benlloch, Andorra la Vella", nrt: "L-998877-B", email: "admin@terrasses.ad" },
            { name: "Restaurant L'Era d'en Jaume", address: "Carrer Major, Ordino", nrt: "F-554433-C", email: "reserves@erajaume.ad" }
        ];

        for (const cust of customers) {
            const cRef = doc(collection(firestore, 'customers'));
            batch.set(cRef, cust);
            
            const pRef = doc(collection(firestore, 'projects'));
            const projectData = {
                name: `Manteniment Preventiu - ${cust.name}`,
                customerId: cRef.id,
                customerName: cust.name,
                status: 'active' as const,
                createdAt: new Date().toISOString()
            };
            batch.set(pRef, projectData);

            const sRef = doc(collection(firestore, `employees/${user.uid}/serviceRecords`));
            const serviceData: Omit<ServiceRecord, 'id'> = {
                employeeId: user.uid,
                employeeName: user.displayName || user.email?.split('@')[0] || 'Tècnic',
                arrivalDateTime: new Date().toISOString(),
                departureDateTime: new Date(Date.now() + 7200000).toISOString(), 
                description: `Revisió general de instal·lacions i verificació de punts crítics a ${cust.name}.`,
                projectName: projectData.name,
                projectId: pRef.id,
                pendingTasks: "",
                customerId: cRef.id,
                customerName: cust.name,
                serviceHourlyRate: 30,
                media: [],
                albarans: [],
                materials: [{ description: "Material divers de revisió", quantity: 1, unitPrice: 15 }],
                createdAt: new Date().toISOString(),
                isLunchSubtracted: true
            };
            batch.set(sRef, serviceData);
        }

        await batch.commit();
        toast({ title: "Dades restaurades", description: "S'han afegit 5 clients corporatius i les seves obres." });
        router.push('/dashboard');
    } catch (error) {
        console.error(error);
        toast({ variant: 'destructive', title: "Error", description: "No s'han pogut carregar les dades." });
    } finally {
        setIsSeeding(false);
    }
  };

  const handleExportData = async () => {
    if (!firestore) return;
    toast({ title: "Preparant exportació..." });
    
    try {
        const data: any = {
            customers: [],
            projects: [],
            albarans: [],
            invoices: [],
            quotes: [],
            receipts: [],
            serviceRecords: []
        };

        const collections = ['customers', 'projects', 'albarans', 'invoices', 'quotes', 'receipts', 'employees'];
        for (const colName of collections) {
            const snap = await getDocs(collection(firestore, colName));
            data[colName] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        }

        const servicesSnap = await getDocs(collectionGroup(firestore, 'serviceRecords'));
        data.serviceRecords = servicesSnap.docs.map(d => ({ 
            id: d.id, 
            parentPath: d.ref.parent.path, 
            ...d.data() 
        }));

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `TS-Serveis-Full-Backup-${format(new Date(), 'yyyy-MM-dd')}.json`;
        a.click();
        
        toast({ title: "Backup completat", description: "El fitxer s'ha descarregat correctament." });
    } catch (e) {
        toast({ variant: 'destructive', title: "Error exportant" });
    }
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !firestore) return;

    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
        try {
            const data = JSON.parse(evt.target?.result as string);
            const batch = writeBatch(firestore);
            
            // 1. Clientes
            data.customers?.forEach((c: any) => {
                const { id, ...rest } = c;
                batch.set(doc(firestore, 'customers', id), rest);
            });

            // 2. Projectes
            data.projects?.forEach((p: any) => {
                const { id, ...rest } = p;
                batch.set(doc(firestore, 'projects', id), rest);
            });

            // 3. Service Records (Requires parent path handling)
            data.serviceRecords?.forEach((s: any) => {
                const { id, parentPath, ...rest } = s;
                if (parentPath) {
                    batch.set(doc(firestore, parentPath, id), rest);
                }
            });

            // 4. Otros documentos
            ['albarans', 'invoices', 'quotes', 'receipts', 'employees'].forEach(col => {
                data[col]?.forEach((docData: any) => {
                    const { id, ...rest } = docData;
                    batch.set(doc(firestore, col, id), rest);
                });
            });

            await batch.commit();
            toast({ title: "Importació Finalitzada", description: "Totes les dades s'han restaurat correctament." });
            window.location.reload();
        } catch (err) {
            console.error(err);
            toast({ variant: 'destructive', title: "Error en importar", description: "El fitxer no és un backup vàlid." });
        } finally {
            setIsImporting(false);
        }
    };
    reader.readAsText(file);
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
            <div className="space-y-10">
                <Card className="border-none shadow-2xl bg-blue-50/50 rounded-[2.5rem] overflow-hidden">
                    <CardHeader className="bg-primary text-white p-8">
                        <CardTitle className="text-xl font-black uppercase tracking-widest flex items-center gap-2">
                            <Cloud className="h-6 w-6" />
                            Còpies de Seguretat al Firebase
                        </CardTitle>
                        <CardDescription className="text-blue-100 font-medium italic">Historial de backups automàtics guardats a la nuvol.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0 bg-white">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-slate-50">
                                    <TableRow>
                                        <TableHead className="px-8 py-4 font-black uppercase text-[10px] tracking-widest">Identificador</TableHead>
                                        <TableHead className="font-black uppercase text-[10px] tracking-widest">Data i Hora</TableHead>
                                        <TableHead className="text-right px-8 font-black uppercase text-[10px] tracking-widest">Estat</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoadingBackups ? (
                                        <TableRow><TableCell colSpan={3} className="text-center py-8"><Loader2 className="animate-spin h-6 w-6 mx-auto text-primary" /></TableCell></TableRow>
                                    ) : cloudBackups && cloudBackups.length > 0 ? cloudBackups.map(backup => (
                                        <TableRow key={backup.id} className="hover:bg-slate-50">
                                            <TableCell className="px-8 py-4 font-bold text-slate-600">{backup.id}</TableCell>
                                            <TableCell className="text-xs font-medium text-slate-400">
                                                {format(parseISO(backup.createdAt), 'dd MMMM yyyy HH:mm', { locale: ca })}
                                            </TableCell>
                                            <TableCell className="text-right px-8">
                                                <Badge className="bg-green-100 text-green-700 border-green-200 uppercase font-black text-[10px]">Cloud OK</Badge>
                                            </TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow><TableCell colSpan={3} className="text-center py-8 text-slate-400 italic">No hi ha backups al núvol encara.</TableCell></TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-2xl bg-slate-50 rounded-[2.5rem] overflow-hidden">
                    <CardHeader className="bg-slate-900 text-white p-8">
                        <CardTitle className="text-xl font-black uppercase tracking-widest flex items-center gap-2">
                            <ShieldAlert className="h-6 w-6 text-primary" />
                            Zona de Recuperació Manual
                        </CardTitle>
                        <CardDescription className="text-slate-400 font-medium italic">Accions per restaurar o exportar dades al teu ordinador.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-8 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="p-6 bg-white rounded-3xl border-2 border-primary/10 shadow-sm space-y-4">
                                <div className="space-y-1">
                                    <p className="font-black text-primary uppercase text-xs">Còpia de Seguretat Local</p>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase">Descarrega TOTS els registres en format .json.</p>
                                </div>
                                <Button variant="outline" onClick={handleExportData} className="w-full h-12 border-primary text-primary font-black uppercase tracking-widest rounded-xl hover:bg-primary/5">
                                    <Download className="h-4 w-4 mr-2" />
                                    EXPORTAR ARA
                                </Button>
                            </div>
                            <div className="p-6 bg-white rounded-3xl border-2 border-primary/10 shadow-sm space-y-4">
                                <div className="space-y-1">
                                    <p className="font-black text-primary uppercase text-xs">Restaurar des de Fitxer</p>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase">Carrega un fitxer .json prèviament exportat.</p>
                                </div>
                                <div className="relative">
                                    <input type="file" accept=".json" onChange={handleImportData} className="hidden" id="import-json" />
                                    <Button asChild variant="outline" disabled={isImporting} className="w-full h-12 border-primary text-primary font-black uppercase tracking-widest rounded-xl hover:bg-primary/5 cursor-pointer">
                                        <label htmlFor="import-json" className="flex items-center justify-center gap-2">
                                            {isImporting ? <Loader2 className="animate-spin h-4 w-4" /> : <Upload className="h-4 w-4" />}
                                            IMPORTAR BACKUP
                                        </label>
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 bg-amber-50 rounded-3xl border-2 border-amber-200 shadow-sm space-y-4">
                            <div className="flex items-start gap-4">
                                <div className="bg-amber-100 p-2 rounded-xl">
                                    <FileWarning className="h-6 w-6 text-amber-600" />
                                </div>
                                <div className="space-y-1">
                                    <p className="font-black text-amber-800 uppercase text-xs">Emergència: Dades de Prova</p>
                                    <p className="text-[10px] text-amber-600 font-bold uppercase">Només si la base està buida i vols carregar exemples.</p>
                                </div>
                            </div>
                            <Button variant="outline" onClick={handleRestoreSampleData} disabled={isSeeding} className="w-full h-12 border-amber-300 text-amber-700 font-black uppercase tracking-widest rounded-xl hover:bg-amber-100">
                                {isSeeding ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                                CARREGAR MOSTRA COMPLETA
                            </Button>
                        </div>

                        <div className="bg-slate-900 border-2 border-primary p-4 rounded-2xl flex gap-3 shadow-inner">
                            <AlertCircle className="h-6 w-6 text-primary shrink-0" />
                            <div className="text-[10px] font-bold text-slate-400 uppercase leading-relaxed">
                                <span className="text-white">RECOMANACIÓ:</span> El sistema fa backups automàtics cada dia al Firebase. 
                                En cas de pèrdua massiva, contacta amb suport per restaurar una versió de l'historial del núvol.
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        )}
        </div>
    </AdminGate>
  )
}

    