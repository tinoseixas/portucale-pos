'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { useDoc, useUser, useFirestore, useMemoFirebase, deleteDocumentNonBlocking, useCollection } from '@/firebase'
import { collection, query, where, getDocs, doc, collectionGroup, getDoc } from 'firebase/firestore'
import type { Customer, ServiceRecord, Albaran, Employee } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FileDown, Loader2, ArrowLeft, Trash2, Briefcase, CreditCard } from 'lucide-react'
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

    const albaranDocRef = useMemoFirebase(() => firestore && albaranId ? doc(firestore, 'albarans', albaranId) : null, [firestore, albaranId])
    const { data: albaran, isLoading: isLoadingAlbaran } = useDoc<Albaran>(albaranDocRef)

    const employeesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'employees')) : null, [firestore]);
    const { data: employees, isLoading: isLoadingEmployees } = useCollection<Employee>(employeesQuery);
    
    const shouldExport = searchParams.get('export') === 'true';

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
            
            // 2. Carregar serveis optimitzats
            if (albaran.serviceRecordIds && albaran.serviceRecordIds.length > 0) {
                const optimizedQuery = query(
                    collectionGroup(firestore, 'serviceRecords'),
                    where('customerId', '==', albaran.customerId),
                    where('projectName', '==', albaran.projectName)
                );
                
                const servicesSnapshot = await getDocs(optimizedQuery);
                
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
        if (albaran && employees) {
            fetchData();
        }
    }, [albaran, employees, fetchData]);


    const handleExportPDF = async () => {
        const reportElement = reportRef.current;
        if (!reportElement) return;

        setIsGenerating(true);
        toast({ title: 'Generant PDF...', description: 'Optimitzant mida per a enviament ràpid.' });

        try {
            const canvas = await html2canvas(reportElement, {
                scale: 1.0, // Escala 1:1 per reduir pes dràsticament
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff'
            });
            
            const imgData = canvas.toDataURL('image/jpeg', 0.5); // Qualitat 50% per fitxer ultra-lleuger
            const pdf = new jsPDF('p', 'mm', 'a4', true);
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
            toast({ title: 'PDF Generat!', description: 'El document ja es pot enviar.' });

        } catch (error) {
            console.error("Error PDF:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'No s\'ha pogut crear el PDF.' });
        } finally {
            setIsGenerating(false);
        }
    };
    
    useEffect(() => {
        if (shouldExport && hasLoaded && !isLoadingData && !isGenerating && services.length > 0) {
            handleExportPDF();
            router.replace(`/dashboard/albarans/${albaranId}`, { scroll: false });
        }
         // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [shouldExport, hasLoaded, isLoadingData, isGenerating, services.length, albaranId, router]);


    const handleDeleteAlbaran = () => {
        if (!albaranDocRef) return;
        deleteDocumentNonBlocking(albaranDocRef);
        toast({ title: 'Albarà eliminat', description: `S'ha esborrat correctament.` });
        router.push('/dashboard/albarans');
    }
    
    const isLoading = isUserLoading || isLoadingAlbaran || (isLoadingData && !hasLoaded) || isLoadingEmployees;

    if (isLoading) {
        return <div className="text-center p-12 flex flex-col items-center justify-center h-[60vh]"><Loader2 className="h-12 w-12 animate-spin text-primary" /><p className="mt-4 text-muted-foreground font-medium">Carregant detalls de l'obra...</p></div>
    }
    
    if (!albaran) {
        return <div className="p-8 text-center">No s'ha trobat l'albarà demanat.</div>
    }

    return (
        <AdminGate pageTitle="Detall de l'Albarà" pageDescription="Consulta els treballs agrupats per projecte.">
            <div className="space-y-8 max-w-5xl mx-auto pb-10">
                <div className="flex justify-between items-center flex-wrap gap-4">
                    <Button variant="ghost" onClick={() => router.push('/dashboard/albarans')} className="font-bold">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Tornar a la llista
                    </Button>
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                        {albaran.status === 'pendent' && (
                            <Button asChild className="bg-green-600 hover:bg-green-700 shadow-md font-bold">
                                <Link href={`/dashboard/invoices?customerId=${albaran.customerId}&albaranId=${albaran.id}`}>
                                    <CreditCard className="mr-2 h-4 w-4" />
                                    Facturar Obra
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
                                    Aquesta acció només esborra el document de resum. Els registres de treball dels tècnics no es veuran afectats.
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>Cancel·lar</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDeleteAlbaran} className="bg-destructive">Eliminar definitivament</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>

                        <Button
                            onClick={handleExportPDF}
                            disabled={isGenerating}
                            className="bg-slate-900 hover:bg-slate-800 text-white font-bold"
                        >
                            {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
                            PDF Lleuger
                        </Button>
                    </div>
                </div>
                
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
                        <ReportPreview
                            ref={reportRef}
                            customer={customer}
                            projectName={albaran.projectName}
                            services={services}
                            showPricing={true}
                            albaranNumber={albaran.albaranNumber}
                            employees={employees || []}
                        />
                    </CardContent>
                </Card>
            </div>
        </AdminGate>
    )
}
