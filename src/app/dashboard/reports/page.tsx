'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useCollection, useUser, useFirestore, useMemoFirebase } from '@/firebase'
import { collection, query, where, orderBy, collectionGroup } from 'firebase/firestore'
import type { Customer, ServiceRecord } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Building, Briefcase, FileDown, Loader2 } from 'lucide-react'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { ReportPreview } from '@/components/ReportPreview'

export default function ReportsPage() {
    const firestore = useFirestore()
    const router = useRouter()
    const { user, isUserLoading } = useUser()
    const [selectedCustomerId, setSelectedCustomerId] = useState<string>('all')
    const [selectedProject, setSelectedProject] = useState<string>('all')
    const [isGenerating, setIsGenerating] = useState(false)
    const reportRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!isUserLoading && !user) {
            router.push('/dashboard')
        }
    }, [isUserLoading, user, router])

    const isAdmin = useMemo(() => user?.email === 'tino@seixas.com', [user]);

    const customersQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'customers'), orderBy('name', 'asc')) : null, [firestore]);
    const { data: customers } = useCollection<Customer>(customersQuery)

    // Use collectionGroup to query across all 'serviceRecords' subcollections
    const allServicesQuery = useMemoFirebase(() => {
        if (!firestore || !user) return null
        return query(collectionGroup(firestore, 'serviceRecords'), orderBy('arrivalDateTime', 'desc'))
    }, [firestore, user])

    const { data: allServices, isLoading: isLoadingAllServices } = useCollection<ServiceRecord>(allServicesQuery)

    const projectNames = useMemo(() => {
        if (!allServices) return []
        const customerServices = selectedCustomerId === 'all'
            ? allServices
            : allServices.filter(s => s.customerId === selectedCustomerId)
        const names = customerServices.map(service => service.projectName).filter(Boolean)
        return [...new Set(names)]
    }, [allServices, selectedCustomerId])

    const filteredServices = useMemo(() => {
        if (!allServices) return []
        return allServices.filter(service => {
            const customerMatch = selectedCustomerId === 'all' || service.customerId === selectedCustomerId
            const projectMatch = selectedProject === 'all' || service.projectName === selectedProject
            return customerMatch && projectMatch
        })
    }, [allServices, selectedCustomerId, selectedProject])

    const selectedCustomer = useMemo(() => customers?.find(c => c.id === selectedCustomerId), [customers, selectedCustomerId])

    const handleExportPDF = async () => {
        const reportElement = reportRef.current
        if (!reportElement) return

        setIsGenerating(true)

        try {
            const canvas = await html2canvas(reportElement, {
                scale: 2, // Higher scale for better quality
                useCORS: true, // Important for external images
                logging: false
            });

            const imgData = canvas.toDataURL('image/png')
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'px',
                format: [canvas.width, canvas.height]
            })

            pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height)

            const fileName = `Albara_${selectedCustomer?.name || 'General'}_${selectedProject || 'Tots'}.pdf`;
            pdf.save(fileName)

        } catch (error) {
            console.error("Error generating PDF:", error)
        } finally {
            setIsGenerating(false)
        }
    }

    if (isUserLoading) {
        return <p>Carregant...</p>
    }


    return (
        <div className="space-y-8 max-w-5xl mx-auto">
            <Card>
                <CardHeader>
                    <CardTitle>Generador d'Albarans (PDF)</CardTitle>
                    <CardDescription>Selecciona un client i una obra per generar un albarà detallat.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1 space-y-2">
                            <label className="text-sm font-medium flex items-center gap-2"><Building className="h-4 w-4" /> Client</label>
                            <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecciona un client" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Tots els Clients</SelectItem>
                                    {customers?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex-1 space-y-2">
                             <label className="text-sm font-medium flex items-center gap-2"><Briefcase className="h-4 w-4" /> Obra</label>
                            <Select value={selectedProject} onValueChange={setSelectedProject} disabled={selectedCustomerId === 'all'}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecciona una obra" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Totes les Obres</SelectItem>
                                    {projectNames.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                     <div className="flex justify-end pt-4">
                        <Button
                            onClick={handleExportPDF}
                            disabled={isGenerating || selectedCustomerId === 'all' || selectedProject === 'all'}
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

            {(selectedCustomerId !== 'all' && selectedProject !== 'all') && (
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
                                customer={selectedCustomer}
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
