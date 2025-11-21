'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useCollection, useUser, useFirestore, useMemoFirebase } from '@/firebase'
import { collection, query, orderBy, collectionGroup } from 'firebase/firestore'
import type { Customer, ServiceRecord } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Briefcase, FileDown, Loader2 } from 'lucide-react'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { ReportPreview } from '@/components/ReportPreview'

export default function ReportsPage() {
    const firestore = useFirestore()
    const router = useRouter()
    const { user, isUserLoading } = useUser()
    const [selectedProject, setSelectedProject] = useState<string>('all')
    const [isGenerating, setIsGenerating] = useState(false)
    const reportRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!isUserLoading && !user) {
            router.push('/')
        }
    }, [isUserLoading, user, router])

    const isAdmin = useMemo(() => user?.email === 'tino@seixas.com', [user]);

    const customersQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'customers'), orderBy('name', 'asc')) : null, [firestore]);
    const { data: customers, isLoading: isLoadingCustomers } = useCollection<Customer>(customersQuery)

    const allServicesQuery = useMemoFirebase(() => {
        if (!firestore) return null
        return query(collectionGroup(firestore, 'serviceRecords'), orderBy('arrivalDateTime', 'desc'))
    }, [firestore])

    const { data: allServices, isLoading: isLoadingAllServices } = useCollection<ServiceRecord>(allServicesQuery)

    const projectNames = useMemo(() => {
        if (!allServices) return []
        const names = allServices.map(service => service.projectName).filter(Boolean)
        return [...new Set(names)].sort((a,b) => a.localeCompare(b));
    }, [allServices])

    const filteredServices = useMemo(() => {
        if (!allServices || selectedProject === 'all') return []
        return allServices.filter(service => service.projectName === selectedProject)
    }, [allServices, selectedProject])

    const associatedCustomer = useMemo(() => {
        if (filteredServices.length === 0 || !customers) return undefined;
        // Find the first service with a customerId and get that customer
        const firstServiceWithCustomer = filteredServices.find(s => s.customerId);
        if (!firstServiceWithCustomer) return undefined;
        return customers.find(c => c.id === firstServiceWithCustomer.customerId);
    }, [filteredServices, customers]);
    

    const handleExportPDF = async () => {
        const reportElement = reportRef.current
        if (!reportElement) return

        setIsGenerating(true)

        try {
            const canvas = await html2canvas(reportElement, {
                scale: 2,
                useCORS: true, 
                logging: false
            });

            const imgData = canvas.toDataURL('image/png')
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'px',
                format: [canvas.width, canvas.height]
            })

            pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height)

            const fileName = `Albara_${selectedProject}.pdf`.replace(/ /g, '_');
            pdf.save(fileName)

        } catch (error) {
            console.error("Error generating PDF:", error)
        } finally {
            setIsGenerating(false)
        }
    }

    const canGenerate = selectedProject !== 'all';

    if (isUserLoading || isLoadingAllServices || isLoadingCustomers) {
        return <p>Carregant...</p>
    }


    return (
        <div className="space-y-8 max-w-5xl mx-auto">
            <Card>
                <CardHeader>
                    <CardTitle>Generador d'Albarans (PDF)</CardTitle>
                    <CardDescription>Selecciona una obra per generar un albarà detallat.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1 space-y-2">
                             <label className="text-sm font-medium flex items-center gap-2"><Briefcase className="h-4 w-4" /> Obra</label>
                            <Select value={selectedProject} onValueChange={setSelectedProject}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecciona una obra" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Selecciona una obra per començar</SelectItem>
                                    {projectNames.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                     <div className="flex justify-end pt-4">
                        <Button
                            onClick={handleExportPDF}
                            disabled={isGenerating || !canGenerate}
                        >
                            {isGenerating ? (
                                <>
                                 <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                 Generant...
                                </>
                            ): (
                                <>
                                <FileDown className="mr-2 h-4 w-4" />
                                Exportar PDF
                                </>
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {canGenerate && (
                <Card>
                    <CardHeader>
                        <CardTitle>Previsualització de l'Albarà</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isLoadingAllServices ? (
                             <p>Carregant dades de l'albarà...</p>
                        ) : (
                           <ReportPreview
                                ref={reportRef}
                                customer={associatedCustomer}
                                projectName={selectedProject}
                                services={filteredServices}
                                showPricing={isAdmin}
                            />
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
