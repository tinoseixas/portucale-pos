
'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCollection, useUser, useFirestore, useMemoFirebase, useDoc } from '@/firebase'
import { collection, query, doc, getDocs, writeBatch, collectionGroup, orderBy, limit, where } from 'firebase/firestore'
import type { Employee, ServiceRecord } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Edit, ShieldAlert, Loader2, Database, AlertCircle, Download, Upload, RefreshCw, FileWarning, Cloud, RotateCcw, Star, Plus } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { AdminGate } from '@/components/AdminGate'
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
  const [isImporting, setIsImporting] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const employeesQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(collection(firestore, 'employees'));
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

  const processImportData = async (data: any) => {
    if (!firestore) return;
    
    const runInChunks = async (items: any[], callback: (item: any, batch: any) => void) => {
        let batch = writeBatch(firestore);
        let count = 0;
        for (const item of items) {
            callback(item, batch);
            count++;
            if (count === 400) {
                await batch.commit();
                batch = writeBatch(firestore);
                count = 0;
            }
        }
        if (count > 0) await batch.commit();
    };

    if (data.customers) {
        await runInChunks(data.customers, (c, batch) => {
            const { id, ...rest } = c;
            batch.set(doc(firestore, 'customers', id), rest, { merge: true });
        });
    }

    if (data.projects) {
        await runInChunks(data.projects, (p, batch) => {
            const { id, ...rest } = p;
            batch.set(doc(firestore, 'projects', id), rest, { merge: true });
        });
    }

    if (data.serviceRecords) {
        await runInChunks(data.serviceRecords, (s, batch) => {
            const { id, parentPath, ...rest } = s;
            if (parentPath) {
                batch.set(doc(firestore, parentPath, id), rest, { merge: true });
            }
        });
    }

    for (const col of ['albarans', 'invoices', 'quotes', 'receipts', 'employees']) {
        if (data[col]) {
            await runInChunks(data[col], (docData, batch) => {
                const { id, ...rest } = docData;
                batch.set(doc(firestore, col, id), rest, { merge: true });
            });
        }
    }
  };

  const handleRestoreFromCloud = async (backup: any) => {
    if (!firestore) return;
    setRestoringId(backup.id);
    toast({ title: "Restaurant dades...", description: "Això pot trigar uns segons." });

    try {
        const data = JSON.parse(backup.data);
        await processImportData(data);
        
        toast({ title: "Restauració completada" });
        window.location.reload();
    } catch (e) {
        console.error(e);
        toast({ variant: 'destructive', title: "Error en restaurar" });
    } finally {
        setRestoringId(null);
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
        a.download = `TS-Serveis-Backup-${format(new Date(), 'yyyy-MM-dd')}.json`;
        a.click();
        
        toast({ title: "Backup completat" });
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
            await processImportData(data);
            toast({ title: "Importació Finalitzada" });
            window.location.reload();
        } catch (err) {
            console.error(err);
            toast({ variant: 'destructive', title: "Error en importar" });
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
  
  if (isLoading) return <p className="p-12 text-center font-bold uppercase tracking-widest">Carregant...</p>
  if (!user) return null;

  return (
    <AdminGate pageTitle="Gestió d'Usuaris" pageDescription="Aquesta secció està protegida.">
        <div className="max-w-4xl mx-auto space-y-10 pb-20">
        <Card className="border-none shadow-xl rounded-3xl overflow-hidden">
            <CardHeader className="bg-slate-900 text-white">
                <CardTitle className="text-2xl font-black uppercase tracking-tight">Gestió d'Usuaris</CardTitle>
                <CardDescription className="text-slate-400">Visualitza i gestiona els perfils.</CardDescription>
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

        <div className="space-y-10">
            <Card className="border-none shadow-2xl bg-blue-50/50 rounded-[2.5rem] overflow-hidden">
                <CardHeader className="bg-primary text-white p-8">
                    <CardTitle className="text-xl font-black uppercase tracking-widest flex items-center gap-2">
                        <Cloud className="h-6 w-6" />
                        Còpies de Seguretat al Firebase
                    </CardTitle>
                    <CardDescription className="text-blue-100 font-medium italic">Historial de backups automàtics.</CardDescription>
                </CardHeader>
                <CardContent className="p-0 bg-white">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-slate-50">
                                <TableRow>
                                    <TableHead className="px-8 py-4 font-black uppercase text-[10px] tracking-widest">Identificador</TableHead>
                                    <TableHead className="font-black uppercase text-[10px] tracking-widest">Data i Hora</TableHead>
                                    <TableHead className="text-right px-8 font-black uppercase text-[10px] tracking-widest">Accions</TableHead>
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
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="outline" size="sm" disabled={restoringId === backup.id} className="h-9 px-4 border-primary text-primary font-black uppercase text-[10px] tracking-widest rounded-xl hover:bg-primary hover:text-white transition-all">
                                                        {restoringId === backup.id ? <Loader2 className="animate-spin h-3 w-3 mr-2" /> : <RotateCcw className="h-3 w-3 mr-2" />}
                                                        Restaurar
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent className="rounded-[2.5rem] p-10">
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle className="text-2xl font-black uppercase">Restaurar versió?</AlertDialogTitle>
                                                        <AlertDialogDescription className="text-base font-medium">
                                                            Això sobreescriurà les dades actuals amb la versió del dia <strong>{format(parseISO(backup.createdAt), 'dd/MM/yyyy')}</strong>.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter className="pt-6">
                                                        <AlertDialogCancel className="h-14 rounded-2xl font-bold px-8 border-2">Cancel·lar</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleRestoreFromCloud(backup)} className="bg-primary h-14 rounded-2xl font-black uppercase px-8 text-white">RESTAURAR TOT</AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow><TableCell colSpan={3} className="text-center py-8 text-slate-400 italic">No hi ha backups encara.</TableCell></TableRow>
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
                    <CardDescription className="text-slate-400 font-medium italic">Exportació i restauració de dades.</CardDescription>
                </CardHeader>
                <CardContent className="p-8 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="p-6 bg-white rounded-3xl border-2 border-primary/10 shadow-sm space-y-4">
                            <div className="space-y-1">
                                <p className="font-black text-primary uppercase text-xs">Còpia Local</p>
                                <p className="text-[10px] text-slate-400 font-bold uppercase">Descarrega en format .json.</p>
                            </div>
                            <Button variant="outline" onClick={handleExportData} className="w-full h-12 border-primary text-primary font-black uppercase tracking-widest rounded-xl hover:bg-primary/5">
                                <Download className="h-4 w-4 mr-2" />
                                EXPORTAR ARA
                            </Button>
                        </div>
                        <div className="p-6 bg-white rounded-3xl border-2 border-primary/10 shadow-sm space-y-4">
                            <div className="space-y-1">
                                <p className="font-black text-primary uppercase text-xs">Restaurar des de Fitxer</p>
                                <p className="text-[10px] text-slate-400 font-bold uppercase">Carrega un fitxer .json exportat.</p>
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

                    <div className="bg-slate-900 border-2 border-primary p-4 rounded-2xl flex gap-3 shadow-inner">
                        <AlertCircle className="h-6 w-6 text-primary shrink-0" />
                        <div className="text-[10px] font-bold text-slate-400 uppercase leading-relaxed">
                            <span className="text-white">NOTA:</span> El sistema fa backups automàtics cada dia. 
                            Utilitza aquestes funcions només per a emergències o trasllat de dades.
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
        </div>
    </AdminGate>
  )
}
