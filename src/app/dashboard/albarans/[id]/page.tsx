'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
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

export default function AlbaranDetailPage() {
    const firestore = useFirestore()
    const router = useRouter()
    params = useParams()
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
                 // This is inefficient, but Firestore collectionGroup queries need a composite index
                 // to query by document ID across collections. A better way would be to store the full path.
                 // For now, we fetch all and find.
                const allServicesSnapshot = await getDocs(collectionGroup(firestore, 'serviceRecords'));
                
                const fetchedServices = albaran.serviceRecordIds.map(serviceId => {
                    const serviceDoc = allServicesSnapshot.docs.find(doc => doc.id === serviceId);
                    if (!serviceDoc) return null;
                    
                    const serviceData = { id: serviceDoc.id, ...serviceDoc.data() } as ServiceRecord;
                    
                    // If employeeName is missing, find it from the employees list
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
            const canvas = await html2canvas(reportElement, { scale: 2, useCORS: true, logging: false });
            const imgData = canvas.toDataURL('image/png')
            const pdf = new jsPDF({ orientation: 'portrait', unit: 'px', format: [canvas.width, canvas.height] })
            pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height)
            const fileName = `Albara_${albaran?.albaranNumber || albaranId}.pdf`.replace(/ /g, '_');
            pdf.save(fileName)
        } catch (error) {
            console.error("Error generating PDF:", error)
        } finally {
            setIsGenerating(false)
        }
    }

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
        return <p>Carregant dades de l'albarà...</p>
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
