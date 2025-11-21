'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useDoc, useUser, useFirestore, useMemoFirebase } from '@/firebase'
import { collection, query, where, getDocs, doc, collectionGroup } from 'firebase/firestore'
import type { Customer, ServiceRecord, Albaran } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FileDown, Loader2, ArrowLeft } from 'lucide-react'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { ReportPreview } from '@/components/ReportPreview'

export default function AlbaranDetailPage() {
    const firestore = useFirestore()
    const router = useRouter()
    const params = useParams()
    const albaranId = params.id as string

    const { user, isUserLoading } = useUser()
    const [isGenerating, setIsGenerating] = useState(false)
    const reportRef = useRef<HTMLDivElement>(null)
    const [services, setServices] = useState<ServiceRecord[]>([])
    const [customer, setCustomer] = useState<Customer | undefined>()
    const [isLoadingData, setIsLoadingData] = useState(true)

    const albaranDocRef = useMemoFirebase(() => firestore && albaranId ? doc(firestore, 'albarans', albaranId) : null, [firestore, albaranId])
    const { data: albaran, isLoading: isLoadingAlbaran } = useDoc<Albaran>(albaranDocRef)
    

    useEffect(() => {
        if (!isUserLoading && !user) {
            router.push('/')
        }
    }, [isUserLoading, user, router])

    useEffect(() => {
        const fetchData = async () => {
            if (!firestore || !albaran) return

            setIsLoadingData(true)
            
            // Fetch Customer
            if (albaran.customerId) {
                const customerRef = doc(firestore, 'customers', albaran.customerId)
                const customerSnap = await getDocs(query(collection(firestore, 'customers'), where('__name__', '==', albaran.customerId)))
                if (!customerSnap.empty) {
                    setCustomer({ id: customerSnap.docs[0].id, ...customerSnap.docs[0].data() } as Customer)
                }
            }
            
            // Fetch Service Records
            if (albaran.serviceRecordIds && albaran.serviceRecordIds.length > 0) {
                 const serviceRecordsPromises = albaran.serviceRecordIds.map(async (serviceId) => {
                    const q = query(collection(firestore, "employees"), where("serviceRecords", "array-contains", serviceId))
                    
                    const querySnapshot = await getDocs(query(collectionGroup(firestore, 'serviceRecords'), where('__name__', '==', `employees/placeholder/serviceRecords/${serviceId}`)));

                    // This is inefficient, but Firestore collectionGroup queries need a composite index
                    // to query by document ID across collections. A better way would be to store the full path.
                    // For now, we fetch all and find.
                    const allServicesSnapshot = await getDocs(collectionGroup(firestore, 'serviceRecords'));
                    const serviceDoc = allServicesSnapshot.docs.find(doc => doc.id === serviceId);

                    return serviceDoc ? { id: serviceDoc.id, ...serviceDoc.data() } as ServiceRecord : null;
                });
                
                const fetchedServices = (await Promise.all(serviceRecordsPromises)).filter(Boolean) as ServiceRecord[];
                setServices(fetchedServices);
            }
            setIsLoadingData(false)
        }

        fetchData()
    }, [albaran, firestore])


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
    
    const isLoading = isUserLoading || isLoadingAlbaran || isLoadingData;

    if (isLoading) {
        return <p>Carregant dades de l'albarà...</p>
    }
    
    if (!albaran) {
        return <p>No s'ha trobat l'albarà.</p>
    }

    return (
        <div className="space-y-8 max-w-5xl mx-auto">
            <div className="flex justify-between items-center">
                 <Button variant="ghost" onClick={() => router.push('/dashboard/albarans')}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Tornar a l'historial
                </Button>
                <Button
                    onClick={handleExportPDF}
                    disabled={isGenerating}
                >
                    {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
                    Exportar PDF
                </Button>
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
                    />
                </CardContent>
            </Card>
        </div>
    )
}
