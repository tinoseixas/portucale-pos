'use client'

import { useMemo, useRef, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useCollection, useUser, useFirestore, useMemoFirebase } from '@/firebase'
import { collection, query, orderBy, collectionGroup } from 'firebase/firestore'
import type { Customer, ServiceRecord, Employee } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Briefcase, FileDown, Loader2, Users } from 'lucide-react'
import { QuotePreview } from '@/components/QuotePreview'
import { useToast } from '@/hooks/use-toast'
import { AdminGate } from '@/components/AdminGate'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

export default function QuotesPage() {
    const firestore = useFirestore()
    const router = useRouter()
    const { user, isUserLoading } = useUser()
    const { toast } = useToast();
    
    const [selectedCustomerId, setSelectedCustomerId] = useState<string>('all');
    const [selectedProject, setSelectedProject] = useState<string>('all')
    const [isGenerating, setIsGenerating] = useState(false)
    const quoteRef = useRef<HTMLDivElement>(null)


    const customersQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'customers'), orderBy('name', 'asc')) : null, [firestore]);
    const { data: customers, isLoading: isLoadingCustomers } = useCollection<Customer>(customersQuery)

    const allServicesQuery = useMemoFirebase(() => {
        if (!firestore) return null
        return query(collectionGroup(firestore, 'serviceRecords'), orderBy('arrivalDateTime', 'desc'))
    }, [firestore])

    const { data: allServices, isLoading: isLoadingAllServices } = useCollection<ServiceRecord>(allServicesQuery)

    const employeesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'employees')) : null, [firestore]);
    const { data: employees, isLoading: isLoadingEmployees } = useCollection<Employee>(employeesQuery);


    const projectNames = useMemo(() => {
        if (!allServices) return []
        
        let servicesToFilter = allServices;
        if (selectedCustomerId !== 'all') {
            servicesToFilter = allServices.filter(s => s.customerId === selectedCustomerId);
        }

        const names = servicesToFilter.map(service => service.projectName).filter(Boolean)
        return [...new Set(names)].sort((a,b) => a.localeCompare(b));
    }, [allServices, selectedCustomerId])


    const filteredServices = useMemo(() => {
        if (!allServices) return [];

        if (selectedProject !== 'all') {
            return allServices.filter(s => s.projectName === selectedProject);
        }
        
        if (selectedCustomerId !== 'all') {
            return allServices.filter(s => s.customerId === selectedCustomerId);
        }

        return [];
    }, [allServices, selectedCustomerId, selectedProject]);


    const associatedCustomer = useMemo(() => {
        if (filteredServices.length === 0 || !customers) return undefined;
        const firstServiceWithCustomer = filteredServices.find(s => s.customerId);
        if (!firstServiceWithCustomer || !firstServiceWithCustomer.customerId) return undefined;
        return customers.find(c => c.id === firstServiceWithCustomer.customerId);
    }, [filteredServices, customers]);
    
    
    const handleCustomerChange = (customerId: string) => {
        setSelectedCustomerId(customerId);
        setSelectedProject('all');
    };
    
    const handleProjectChange = (projectName: string) => {
        setSelectedProject(projectName);
         if (projectName !== 'all' && selectedCustomerId === 'all') {
            const service = allServices?.find(s => s.projectName === projectName);
            if (service?.customerId) {
                setSelectedCustomerId(service.customerId);
            }
        }
    }


    const handleExportPDF = async () => {
        const quoteElement = quoteRef.current;
        if (!quoteElement) return;

        setIsGenerating(true);
        
        const originalStyles = {
            width: quoteElement.style.width,
            maxWidth: quoteElement.style.maxWidth,
        };

        try {
            quoteElement.style.width = '1024px';
            quoteElement.style.maxWidth = 'none';

            const canvas = await html2canvas(quoteElement, {
                scale: 2,
                useCORS: true,
                logging: false,
                windowWidth: 1440
            });
            
            quoteElement.style.width = originalStyles.width;
            quoteElement.style.maxWidth = originalStyles.maxWidth;

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4',
            });

            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            
            const imgProps = pdf.getImageProperties(imgData);
            const imgWidth = imgProps.width;
            const imgHeight = imgProps.height;

            const ratio = imgWidth / imgHeight;
            let finalWidth = pdfWidth - 20; 
            let finalHeight = finalWidth / ratio;

            if (finalHeight > pdfHeight - 20) {
                finalHeight = pdfHeight - 20;
                finalWidth = finalHeight * ratio;
            }

            const x = (pdfWidth - finalWidth) / 2;
            const y = 10;

            pdf.addImage(imgData, 'PNG', x, y, finalWidth, finalHeight);
            
            const projectNameStr = selectedProject !== 'all' ? selectedProject : 'Varis';
            const customerNameStr = associatedCustomer?.name || 'Client';
            const fileName = `Orcament_${projectNameStr}_${customerNameStr}.pdf`.replace(/ /g, '_');
            pdf.save(fileName);

        } catch (error) {
            console.error("Error generating PDF:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'No s\'ha pogut generar el PDF.' });
        } finally {
            quoteElement.style.width = originalStyles.width;
            quoteElement.style.maxWidth = originalStyles.maxWidth;
            setIsGenerating(false);
        }
    };


    const canGenerate = filteredServices.length > 0;
    const isLoading = isUserLoading || isLoadingAllServices || isLoadingCustomers || isLoadingEmployees;

    if (isLoading) {
        return <p>Carregant...</p>
    }


    return (
        <AdminGate pageTitle="Generador d'Orçaments" pageDescription="Aquesta secció està protegida.">
            <div className="space-y-8 max-w-5xl mx-auto">
                <Card>
                    <CardHeader>
                        <CardTitle>Generador d'Orçaments</CardTitle>
                        <CardDescription>Selecciona un client i/o una obra per generar un orçament detallat amb imatges.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex flex-col sm:flex-row gap-4">
                            <div className="flex-1 space-y-2">
                                <label className="text-sm font-medium flex items-center gap-2"><Users className="h-4 w-4" /> Client</label>
                                <Select value={selectedCustomerId} onValueChange={handleCustomerChange}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecciona un client" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Cap client seleccionat</SelectItem>
                                        {customers?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex-1 space-y-2">
                                <label className="text-sm font-medium flex items-center gap-2"><Briefcase className="h-4 w-4" /> Obra</label>
                                <Select value={selectedProject} onValueChange={handleProjectChange} disabled={projectNames.length === 0 && selectedCustomerId === 'all'}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecciona una obra" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Totes les obres del client</SelectItem>
                                        {projectNames.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="flex justify-end pt-4 gap-2 flex-wrap">
                            <Button
                                onClick={handleExportPDF}
                                disabled={isGenerating || !canGenerate}
                            >
                                {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
                                Exportar PDF
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {canGenerate && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Previsualització de l'Orçament</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {isLoadingAllServices ? (
                                <p>Carregant dades de l'orçament...</p>
                            ) : (
                            <QuotePreview
                                    ref={quoteRef}
                                    customer={associatedCustomer}
                                    projectName={selectedProject !== 'all' ? selectedProject : 'Varis Projectes'}
                                    services={filteredServices}
                                    showPricing={true}
                                    quoteNumber={-1} // Placeholder number for preview
                                    employees={employees || []}
                                />
                            )}
                        </CardContent>
                    </Card>
                )}
            </div>
        </AdminGate>
    )
}
