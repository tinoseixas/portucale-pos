'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { useDoc, useUser, useFirestore, useMemoFirebase, deleteDocumentNonBlocking, useCollection, updateDocumentNonBlocking } from '@/firebase'
import { collection, query, getDocs, doc, collectionGroup, getDoc } from 'firebase/firestore'
import type { Customer, ServiceRecord, Albaran, Employee } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FileDown, Loader2, ArrowLeft, Trash2, Briefcase, CreditCard, AlertCircle, Edit, Save, ListChecks, ArrowRight } from 'lucide-react'
import { ReportPreview } from '@/components/ReportPreview'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useToast } from '@/hooks/use-toast'
import { AdminGate } from '@/components/AdminGate'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function AlbaranDetailPage() {
    const firestore = useFirestore()
    const router = useRouter()
    const params = useParams()
    const searchParams = useSearchParams()
    const { toast } = useToast()
    const albaranId = params.id as string

    const { user, isUserLoading } = useUser()
    const [isGenerating, setIsGenerating] = useState(false)
    const reportRef = useRef<HTMLDivElement>(null)
    const [services, setServices] = useState<ServiceRecord[]>([])
    const [customer, setCustomer] = useState<Customer | undefined>()
    const [isLoadingData, setIsLoadingData] = useState(false)
    const [hasLoaded, setHasLoaded] = useState(false)
    
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
    const [editProjectName, setEditProjectName] = useState('')

    const albaranDocRef = useMemoFirebase(() => firestore && albaranId ? doc(firestore, 'albarans', albaranId) : null, [firestore, albaranId])
    const { data: albaran, isLoading: isLoadingAlbaran } = useDoc<Albaran>(albaranDocRef)

    const employeesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'employees')) : null, [firestore]);
    const { data: employees } = useCollection<Employee>(employeesQuery);
    
    const shouldExport = searchParams.get('export') === 'true';

    useEffect(() => {
        if (albaran) {
            setEditProjectName(albaran.projectName);
        }
    }, [albaran]);

    const fetchData = useCallback(async () => {
        if (!firestore || !albaran || !employees || hasLoaded) return

        setIsLoadingData(true)
        
        try {
            // 1. Carregar dades del client
            if (albaran.customerId) {
                const customerSnap = await getDoc(doc(firestore, 'customers', albaran.customerId));
                if (customerSnap.exists()) {
                    setCustomer({ id: customerSnap.id, ...customerSnap.data() } as Customer)
                }
            }
            
            // 2. Carregar serveis (Mètode robust)
            if (albaran.serviceRecordIds && albaran.serviceRecordIds.length > 0) {
                const servicesSnapshot = await getDocs(collectionGroup(firestore, 'serviceRecords'));
                
                const fetchedServices = servicesSnapshot.docs
                    .map(doc => ({ id: doc.id, ...doc.data() } as ServiceRecord))
                    .filter(s => albaran.serviceRecordIds.includes(s.id))
                    .map(serviceData => {
                        if (!serviceData.employeeName) {
                            const employee = employees.find(e => e.id === serviceData.employeeId);
                            if (employee) {
                                serviceData.employeeName = `${employee.firstName} ${employee.lastName}`;
                            }
                        }
                        return serviceData;
                    });
                
                setServices(fetchedServices);
            }
            setHasLoaded(true);
        } catch (e) {
            console.error("Error carregant dades:", e);
            toast({ variant: 'destructive', title: 'Error', description: 'No s\'han pogut carregar els detalls del document.' });
        } finally {
            setIsLoadingData(false)
        }
    }, [albaran, firestore, employees, toast, hasLoaded]);

    useEffect(() => {
        if (albaran && employees && !hasLoaded) {
            fetchData();
        }
    }, [albaran, employees, fetchData, hasLoaded]);


    const handleExportPDF = async () => {
        const reportElement = reportRef.current;
        if (!reportElement) return;

        setIsGenerating(true);
        toast({ title: 'Generant PDF...', description: 'Processant document.' });

        try {
            const canvas = await html2canvas(reportElement, {
                scale: 1.5,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff'
            });
            
            const imgData = canvas.toDataURL('image/jpeg', 0.6); 
            const pdf = new jsPDF({
                orientation: 'p',
                unit: 'mm',
                format: 'a4',
                compress: true
            });
            
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const imgWidth = pdfWidth;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            let heightLeft = imgHeight;
            let position = 0;

            pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
            heightLeft -= pdfHeight;

            while (heightLeft > 0) {
                position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
                heightLeft -= pdfHeight;
            }
            
            pdf.save(`Albara-${albaran?.projectName.replace(/\s+/g, '-')}.pdf`);
            toast({ title: 'PDF Generat!', description: 'Document exportat correctament.' });

        } catch (error) {
            console.error("Error PDF:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'No s\'ha pogut crear el PDF.' });
        } finally {
            setIsGenerating(false);
        }
    };
    
    const handleUpdateAlbaran = () => {
        if (!albaranDocRef || !editProjectName.trim()) return;
        updateDocumentNonBlocking(albaranDocRef, { projectName: editProjectName.trim() });
        setIsEditDialogOpen(false);
        toast({ title: 'Albarà actualitzat', description: 'El nom del projecte s\'ha canviat.' });
    };

    const handleDeleteAlbaran = () => {
        if (!albaranDocRef) return;
        deleteDocumentNonBlocking(albaranDocRef);
        toast({ title: 'Albarà eliminat', description: `S'ha esborrat correctament.` });
        router.push('/dashboard/albarans');
    }
    
    const isLoading = isUserLoading || isLoadingAlbaran || (isLoadingData && !hasLoaded);

    if (isLoading) {
        return <div className="text-center p-12 flex flex-col items-center justify-center h-[60vh]"><Loader2 className="h-12 w-12 animate-spin text-primary" /><p className="mt-4 text-muted-foreground font-medium">Carregant dades...</p></div>
    }
    
    if (!albaran) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] p-8 text-center space-y-4">
                <div className="bg-red-100 p-4 rounded-full"><AlertCircle className="h-12 w-12 text-red-600" /></div>
                <h2 className="text-2xl font-bold">No s'ha trobat l'albarà</h2>
                <Button onClick={() => router.push('/dashboard/albarans')} variant="outline">Tornar al llistat</Button>
            </div>
        )
    }

    return (
        <AdminGate pageTitle="Detall de l'Albarà" pageDescription="Consulta els treballs agrupats per projecte.">
            <div className="space-y-8 max-w-5xl mx-auto pb-10">
                <div className="flex justify-between items-center flex-wrap gap-4">
                    <Button variant="ghost" onClick={() => router.push('/dashboard/albarans')} className="font-bold">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Enrere
                    </Button>
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                            <DialogTrigger asChild>
                                <Button variant="outline" className="font-bold">
                                    <Edit className="mr-2 h-4 w-4" /> Editar Títol
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Editar Nom del Projecte</DialogTitle>
                                    <DialogDescription>Aquest nom apareixerà a la capçalera de l'albarà imprès.</DialogDescription>
                                </DialogHeader>
                                <div className="py-4 space-y-2">
                                    <Label>Nom de l'Obra / Projecte</Label>
                                    <Input value={editProjectName} onChange={(e) => setEditProjectName(e.target.value)} />
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel·lar</Button>
                                    <Button onClick={handleUpdateAlbaran} className="bg-primary font-bold">Desar Canvis</Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>

                        {albaran.status === 'pendent' && (
                            <Button asChild className="bg-green-600 hover:bg-green-700 shadow-md font-bold">
                                <Link href={`/dashboard/invoices?customerId=${albaran.customerId}&albaranId=${albaran.id}`}>
                                    <CreditCard className="mr-2 h-4 w-4" />
                                    Facturar
                                </Link>
                            </Button>
                        )}

                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" className="font-bold">
                                    <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>Vols eliminar l'albarà?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Només s'esborra el document de resum. El treball dels tècnics no es veu afectat.
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>Cancel·lar</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDeleteAlbaran} className="bg-destructive">Confirmar eliminació</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>

                        <Button
                            onClick={handleExportPDF}
                            disabled={isGenerating}
                            className="bg-slate-900 hover:bg-slate-800 text-white font-bold"
                        >
                            {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
                            EXPORTAR PDF
                        </Button>
                    </div>
                </div>
                
                {/* Gestió de Serveis */}
                <Card className="border-2 border-primary/10 shadow-sm bg-slate-50/50">
                    <CardHeader className="py-4">
                        <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                            <ListChecks className="h-4 w-4" /> Serveis inclosos en aquest albarà
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                            {services.map(s => (
                                <div key={s.id} className="bg-white p-3 rounded-xl border-2 flex justify-between items-center group hover:border-primary transition-all">
                                    <div className="min-w-0">
                                        <p className="text-xs font-black truncate">{s.description}</p>
                                        <p className="text-[10px] text-slate-400 font-bold">{s.employeeName}</p>
                                    </div>
                                    <Button variant="ghost" size="icon" asChild className="h-8 w-8 text-primary group-hover:bg-primary/10">
                                        <Link href={`/dashboard/edit/${s.id}?ownerId=${s.employeeId}`}>
                                            <ArrowRight className="h-4 w-4" />
                                        </Link>
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <Card className="shadow-2xl border-none">
                    <CardHeader className="bg-slate-900 text-white rounded-t-lg">
                        <div className="flex justify-between items-start">
                            <div>
                                <CardTitle className="flex items-center gap-2 text-2xl">
                                    <Briefcase className="h-6 w-6 text-primary" />
                                    Albarà #{String(albaran.albaranNumber).padStart(4, '0')}
                                </CardTitle>
                                <CardDescription className="text-slate-400">Projecte: {albaran.projectName}</CardDescription>
                            </div>
                            <Badge variant={albaran.status === 'facturat' ? 'default' : 'destructive'} className="uppercase">
                                {albaran.status}
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        {services.length > 0 ? (
                            <ReportPreview
                                ref={reportRef}
                                customer={customer}
                                projectName={albaran.projectName}
                                services={services}
                                showPricing={true}
                                albaranNumber={albaran.albaranNumber}
                                employees={employees || []}
                            />
                        ) : (
                            <div className="p-12 text-center text-muted-foreground italic">
                                No s'han pogut carregar les línies de servei.
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AdminGate>
    )
}
