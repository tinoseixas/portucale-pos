
'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { useDoc, useUser, useFirestore, useMemoFirebase, deleteDocumentNonBlocking, useCollection } from '@/firebase'
import { collection, query, where, getDocs, doc, collectionGroup } from 'firebase/firestore'
import type { Customer, ServiceRecord, Albaran, Employee } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FileDown, Loader2, ArrowLeft, Trash2 } from 'lucide-react'
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
    const [isLoadingData, setIsLoadingData] = useState(true)

    const albaranDocRef = useMemoFirebase(() => firestore && albaranId ? doc(firestore, 'albarans', albaranId) : null, [firestore, albaranId])
    const { data: albaran, isLoading: isLoadingAlbaran } = useDoc<Albaran>(albaranDocRef)

    const employeesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'employees')) : null, [firestore]);
    const { data: employees, isLoading: isLoadingEmployees } = useCollection<Employee>(employeesQuery);
    
    const shouldExport = searchParams.get('export') === 'true';

    useEffect(() => {
        if (!isUserLoading && !user) {
            router.push('/')
        }
    }, [isUserLoading, user, router])

    useEffect(() => {
        const fetchData = async () => {
            if (!firestore || !albaran || !employees) return

            setIsLoadingData(true)
            
            if (albaran.customerId) {
                const customerSnap = await getDocs(query(collection(firestore, 'customers'), where('__name__', '==', albaran.customerId)))
                if (!customerSnap.empty) {
                    setCustomer({ id: customerSnap.docs[0].id, ...customerSnap.docs[0].data() } as Customer)
                }
            }
            
            if (albaran.serviceRecordIds && albaran.serviceRecordIds.length > 0) {
                try {
                    const allServicesSnapshot = await getDocs(collectionGroup(firestore, 'serviceRecords'));
                    
                    const fetchedServices = albaran.serviceRecordIds.map(serviceId => {
                        const serviceDoc = allServicesSnapshot.docs.find(doc => doc.id === serviceId);
                        if (!serviceDoc) return null;
                        
                        const serviceData = { id: serviceDoc.id, ...serviceDoc.data() } as ServiceRecord;
                        
                        if (!serviceData.employeeName) {
                            const employee = employees.find(e => e.id === serviceData.employeeId);
                            if (employee) {
                                serviceData.employeeName = `${employee.firstName} ${employee.lastName}`;
                            }
                        }
                        return serviceData;
                    }).filter(Boolean) as ServiceRecord[];
                    
                    setServices(fetchedServices);
                } catch (e) {
                    console.error("Error fetching service records:", e);
                    toast({ variant: 'destructive', title: 'Error', description: 'No s\'han pogut carregar els detalls del servei.' });
                }
            }
            setIsLoadingData(false)
        }

        fetchData()
    }, [albaran, firestore, employees, toast])


    const handleExportPDF = async () => {
        const reportElement = reportRef.current;
        if (!reportElement) return;

        setIsGenerating(true);
        toast({ title: 'Generant PDF optimitzat...', description: 'Processant imatges per reduir el pes.' });

        try {
            const canvas = await html2canvas(reportElement, {
                scale: 1.2, // Reduït per minimitzar pes de fitxer
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff'
            });
            
            // Compressió JPEG al 60% per fitxers lleugers
            const imgData = canvas.toDataURL('image/jpeg', 0.6);
            const pdf = new jsPDF('p', 'mm', 'a4', true); // compress: true
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const canvasWidth = canvas.width;
            const canvasHeight = canvas.height;
            const ratio = canvasWidth / canvasHeight;
            const imgWidth = pdfWidth;
            const imgHeight = imgWidth / ratio;

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
            
            pdf.save(`Albara-${String(albaran?.albaranNumber).padStart(4, '0')}.pdf`);
            
            toast({ title: 'PDF Generat!', description: 'L\'enviament serà molt més ràpid ara.' });

        } catch (error) {
            console.error("Error en generar el PDF:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'No s\'ha pogut generar el PDF.' });
        } finally {
            setIsGenerating(false);
        }
    };
    
    const isLoading = isUserLoading || isLoadingAlbaran || isLoadingData || isLoadingEmployees;
    
    useEffect(() => {
        if (shouldExport && !isLoading && !isGenerating && services.length > 0) {
            handleExportPDF();
            router.replace(`/dashboard/albarans/${albaranId}`, { scroll: false });
        }
         // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [shouldExport, isLoading, isGenerating, services, albaranId, router]);


    const handleDeleteAlbaran = () => {
        if (!albaranDocRef) return;
        deleteDocumentNonBlocking(albaranDocRef);
        toast({ title: 'Albarà Eliminat', description: `L'albarà #${albaran?.albaranNumber} ha estat esborrat.` });
        router.push('/dashboard/albarans');
    }
    

    if (isLoading) {
        return <div className="text-center p-8"><Loader2 className="h-8 w-8 animate-spin mx-auto" /> Carregant dades de l'albarà...</div>
    }
    
    if (!albaran) {
        return <p>No s'ha trobat l'albarà.</p>
    }

    return (
        <AdminGate pageTitle="Detall de l'Albarà" pageDescription="Aquesta secció està protegida.">
            <div className="space-y-8 max-w-5xl mx-auto">
                <div className="flex justify-between items-center flex-wrap gap-4">
                    <Button variant="ghost" onClick={() => router.push('/dashboard/albarans')}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Tornar a l'historial
                    </Button>
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive">
                                    <Trash2 className="mr-2 h-4 w-4" /> Eliminar Document
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>Vols eliminar l'albarà?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Aquesta acció eliminarà l'albarà <strong>#{albaran.albaranNumber}</strong> de l'historial. 
                                    Els registres de servei originals no es veuran afectats.
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>Cancel·lar</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDeleteAlbaran} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>

                        <Button
                            onClick={handleExportPDF}
                            disabled={isGenerating}
                            className="bg-primary hover:bg-primary/90 shadow-md font-bold"
                        >
                            {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
                            Exportar PDF Lleuger
                        </Button>
                    </div>
                </div>
                
                <Card className="shadow-2xl border-none">
                    <CardHeader className="bg-slate-900 text-white rounded-t-lg">
                        <CardTitle>Albarà #{String(albaran.albaranNumber).padStart(4, '0')}</CardTitle>
                        <CardDescription className="text-slate-400">Projecte: {albaran.projectName} | Client: {albaran.customerName}</CardDescription>
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
