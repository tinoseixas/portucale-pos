'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { useDoc, useUser, useFirestore, useMemoFirebase, deleteDocumentNonBlocking, useCollection } from '@/firebase'
import { collection, query, where, getDocs, doc, collectionGroup } from 'firebase/firestore'
import type { Customer, ServiceRecord, Albaran, Employee } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FileDown, Loader2, ArrowLeft, Trash2 } from 'lucide-react'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
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

const A4_WIDTH_PX = 595.28;
const A4_HEIGHT_PX = 841.89;

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
    
    // Auto-export if query param is set
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
            
            // Fetch Customer
            if (albaran.customerId) {
                const customerSnap = await getDocs(query(collection(firestore, 'customers'), where('__name__', '==', albaran.customerId)))
                if (!customerSnap.empty) {
                    setCustomer({ id: customerSnap.docs[0].id, ...customerSnap.docs[0].data() } as Customer)
                }
            }
            
            // Fetch Service Records
            if (albaran.serviceRecordIds && albaran.serviceRecordIds.length > 0) {
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
            }
            setIsLoadingData(false)
        }

        fetchData()
    }, [albaran, firestore, employees])


    const handleExportPDF = async () => {
        const reportElement = reportRef.current
        if (!reportElement) return

        setIsGenerating(true)

        try {
             // Use jsPDF in 'p' (pixels) mode for direct mapping
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'px',
                format: [A4_WIDTH_PX, A4_HEIGHT_PX]
            });

            // Get the HTML content's dimensions
            const contentWidth = reportElement.scrollWidth;
            const contentHeight = reportElement.scrollHeight;

            // Calculate the scaling factor to fit content onto an A4 page
            const widthScale = A4_WIDTH_PX / contentWidth;
            const heightScale = A4_HEIGHT_PX / contentHeight;
            const scale = Math.min(widthScale, 1); // Use width scale, but don't upscale

            const canvas = await html2canvas(reportElement, {
                scale: 2, // Render at high resolution
                useCORS: true,
                logging: false,
                width: contentWidth,
                height: contentHeight,
                windowWidth: contentWidth,
                windowHeight: contentHeight
            });
            
            const imgData = canvas.toDataURL('image/png');
            
            // Calculate image dimensions in the PDF
            const imgWidth = canvas.width * scale;
            const imgHeight = canvas.height * scale;

            // Add image to PDF, it will be scaled down to fit
            pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);

            const fileName = `Albara_${albaran?.albaranNumber || albaranId}.pdf`.replace(/ /g, '_');
            pdf.save(fileName)
        } catch (error) {
            console.error("Error generating PDF:", error)
            toast({ variant: 'destructive', title: 'Error', description: 'No s\'ha pogut generar el PDF.' });
        } finally {
            setIsGenerating(false)
        }
    }
    
    // Automatically trigger export if the conditions are met
    useEffect(() => {
        if (shouldExport && !isLoading && !isGenerating && services.length > 0) {
            handleExportPDF();
            // Optional: remove query param from URL after export
            router.replace(`/dashboard/albarans/${albaranId}`, { scroll: false });
        }
         // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [shouldExport, isLoading, isGenerating, services, albaranId, router]);


    const handleDeleteAlbaran = () => {
        if (!albaranDocRef) return;
        
        deleteDocumentNonBlocking(albaranDocRef);

        toast({
            title: 'Albarà Eliminat',
            description: `L'albarà #${albaran?.albaranNumber} ha estat eliminat del historial.`,
        });

        router.push('/dashboard/albarans');
    }
    
    const isLoading = isUserLoading || isLoadingAlbaran || isLoadingData || isLoadingEmployees;

    if (isLoading) {
        return <div className="text-center p-8"><Loader2 className="h-8 w-8 animate-spin mx-auto" /> Carregant dades de l'albarà...</div>
    }
    
    if (!albaran) {
        return <p>No s'ha trobat l'albarà.</p>
    }

    return (
        <AdminGate pageTitle="Detall de l'Albarà" pageDescription="Aquesta secció està protegida.">
            <div className="space-y-8 max-w-5xl mx-auto">
                <div className="flex justify-between items-center flex-wrap gap-2">
                    <Button variant="ghost" onClick={() => router.push('/dashboard/albarans')}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Tornar a l'historial
                    </Button>
                    <div className="flex items-center gap-2">
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive">
                                    <Trash2 className="mr-2 h-4 w-4" /> Eliminar Albarà
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>Estàs segur que vols eliminar l'albarà?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Aquesta acció no es pot desfer. S'eliminarà l'albarà <strong>#{albaran.albaranNumber}</strong> del historial. 
                                    Els registres de servei originals no seran afectats.
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
                        >
                            {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
                            Exportar PDF
                        </Button>
                    </div>
                </div>
                
                <Card>
                    <CardHeader>
                        <CardTitle>Albarà #{String(albaran.albaranNumber).padStart(4, '0')}</CardTitle>
                        <CardDescription>Generat per a l'obra "{albaran.projectName}" per al client "{albaran.customerName}".</CardDescription>
                    </CardHeader>
                    <CardContent>
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
