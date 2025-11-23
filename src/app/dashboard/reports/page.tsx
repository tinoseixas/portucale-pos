'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useCollection, useUser, useFirestore, useMemoFirebase } from '@/firebase'
import { collection, query, orderBy, collectionGroup, doc, runTransaction, serverTimestamp, setDoc } from 'firebase/firestore'
import type { Customer, ServiceRecord } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Briefcase, FileDown, Loader2, Users } from 'lucide-react'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { ReportPreview } from '@/components/ReportPreview'
import { useToast } from '@/hooks/use-toast'
import { AdminGate } from '@/components/AdminGate'
import { differenceInMinutes, parseISO, isValid } from 'date-fns'

function calculateTotalMinutes(services: ServiceRecord[]): number {
    if (!services) return 0;

    return services.reduce((total, service) => {
        if (service.arrivalDateTime && service.departureDateTime) {
            const startDate = parseISO(service.arrivalDateTime);
            const endDate = parseISO(service.departureDateTime);

            if (!isValid(startDate) || !isValid(endDate) || startDate.getTime() === endDate.getTime()) {
              return total;
            }
            return total + differenceInMinutes(endDate, startDate);
        }
        return total;
    }, 0);
}

export default function ReportsPage() {
    const firestore = useFirestore()
    const router = useRouter()
    const { user, isUserLoading } = useUser()
    const { toast } = useToast();
    
    const [selectedCustomerId, setSelectedCustomerId] = useState<string>('all');
    const [selectedProject, setSelectedProject] = useState<string>('all')
    const [isGenerating, setIsGenerating] = useState(false)
    const reportRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!isUserLoading && !user) {
            router.push('/')
        }
    }, [isUserLoading, user, router])

    const customersQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'customers'), orderBy('name', 'asc')) : null, [firestore]);
    const { data: customers, isLoading: isLoadingCustomers } = useCollection<Customer>(customersQuery)

    const allServicesQuery = useMemoFirebase(() => {
        if (!firestore) return null
        return query(collectionGroup(firestore, 'serviceRecords'), orderBy('arrivalDateTime', 'desc'))
    }, [firestore])

    const { data: allServices, isLoading: isLoadingAllServices } = useCollection<ServiceRecord>(allServicesQuery)

     // Effect to auto-select customer when a project is chosen
    useEffect(() => {
        if (selectedProject !== 'all' && allServices) {
            const serviceForProject = allServices.find(s => s.projectName === selectedProject && s.customerId);
            if (serviceForProject && serviceForProject.customerId && serviceForProject.customerId !== selectedCustomerId) {
                setSelectedCustomerId(serviceForProject.customerId);
            }
        }
    // The dependency array is intentionally kept this way to avoid infinite loops
    // when the customer is auto-selected.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedProject, allServices]);

    const projectNames = useMemo(() => {
        if (!allServices) return []
        
        let servicesToFilter = allServices;
        // If a customer is selected, filter projects for that customer
        if (selectedCustomerId !== 'all') {
            servicesToFilter = allServices.filter(s => s.customerId === selectedCustomerId);
        }

        const names = servicesToFilter.map(service => service.projectName).filter(Boolean)
        return [...new Set(names)].sort((a,b) => a.localeCompare(b));
    }, [allServices, selectedCustomerId])


    const filteredServices = useMemo(() => {
        if (!allServices) return [];

        let services = allServices;
        
        if (selectedCustomerId !== 'all') {
            services = services.filter(s => s.customerId === selectedCustomerId);
        }

        if (selectedProject !== 'all') {
            services = services.filter(s => s.projectName === selectedProject);
        }

        if (selectedCustomerId === 'all' && selectedProject === 'all') {
            return [];
        }
        
        if (selectedProject !== 'all' && selectedCustomerId === 'all') {
             const customerIdForProject = services.find(s => s.projectName === selectedProject)?.customerId;
             if(customerIdForProject) {
                return services.filter(s => s.projectName === selectedProject && s.customerId === customerIdForProject);
             }
        }

        return services;
    }, [allServices, selectedCustomerId, selectedProject])

    const associatedCustomer = useMemo(() => {
        if (filteredServices.length === 0 || !customers) return undefined;
        // Find the first service with a customerId and get that customer
        const firstServiceWithCustomer = filteredServices.find(s => s.customerId);
        if (!firstServiceWithCustomer || !firstServiceWithCustomer.customerId) return undefined;
        return customers.find(c => c.id === firstServiceWithCustomer.customerId);
    }, [filteredServices, customers]);
    
    
    const handleCustomerChange = (customerId: string) => {
        setSelectedCustomerId(customerId);
        setSelectedProject('all'); // Reset project when customer changes
    };

    const handleExport = async (exportType: 'pdf' | 'save') => {
        if (!firestore || !canGenerate) return;

        setIsGenerating(true)
        try {
            const counterRef = doc(firestore, "counters", "albarans");
            const newAlbaranNumber = await runTransaction(firestore, async (transaction) => {
                const counterDoc = await transaction.get(counterRef);
                if (!counterDoc.exists()) {
                    transaction.set(counterRef, { lastNumber: 1 });
                    return 1;
                }
                const newNumber = (counterDoc.data().lastNumber || 0) + 1;
                transaction.update(counterRef, { lastNumber: newNumber });
                return newNumber;
            });
            
            const totalMinutes = calculateTotalMinutes(filteredServices);
            const totalHours = totalMinutes / 60;
            const laborCost = totalHours * 30;

            const materialsSubtotal = filteredServices.reduce((total, service) => {
                return total + (service.materials || []).reduce((subtotal, material) => {
                    return subtotal + (material.quantity * material.unitPrice);
                }, 0);
            }, 0);

            const subtotal = materialsSubtotal + laborCost;
            const ivaRate = 0.045; // 4.5% IGI for Andorra
            const iva = subtotal * ivaRate;
            const totalAmount = subtotal + iva;
            
            const albaranRef = doc(collection(firestore, "albarans"));
            await setDoc(albaranRef, {
                id: albaranRef.id,
                albaranNumber: newAlbaranNumber,
                createdAt: new Date().toISOString(),
                customerId: associatedCustomer?.id || '',
                customerName: associatedCustomer?.name || 'N/A',
                projectName: selectedProject !== 'all' ? selectedProject : 'Varis Projectes',
                serviceRecordIds: filteredServices.map(s => s.id),
                totalAmount: totalAmount,
            });

            toast({
                title: "Albarà Guardat",
                description: `L'albarà #${newAlbaranNumber} ha estat guardat a l'historial.`,
            });
            
            if (exportType === 'pdf') {
                const reportElement = reportRef.current
                if (!reportElement) throw new Error("Report element not found");

                const canvas = await html2canvas(reportElement, { scale: 2, useCORS: true, logging: false });
                const imgData = canvas.toDataURL('image/png')
                const pdf = new jsPDF({ orientation: 'portrait', unit: 'px', format: [canvas.width, canvas.height] });
                pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height)
                const fileName = `Albara_${selectedProject || associatedCustomer?.name || 'report'}.pdf`.replace(/ /g, '_');
                pdf.save(fileName)
            }
             router.push(`/dashboard/albarans/${albaranRef.id}`);

        } catch (error) {
            console.error("Error generating PDF:", error)
            toast({
                variant: 'destructive',
                title: 'Error',
                description: "No s'ha pogut generar l'albarà.",
            });
        } finally {
            setIsGenerating(false)
        }
    }


    const canGenerate = filteredServices.length > 0;
    const isLoading = isUserLoading || isLoadingAllServices || isLoadingCustomers;

    if (isLoading) {
        return <p>Carregant...</p>
    }


    return (
        <AdminGate pageTitle="Generador d'Albarans" pageDescription="Aquesta secció està protegida.">
            <div className="space-y-8 max-w-5xl mx-auto">
                <Card>
                    <CardHeader>
                        <CardTitle>Generador d'Albarans</CardTitle>
                        <CardDescription>Selecciona un client i/o una obra per generar un albarà detallat.</CardDescription>
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
                                        <SelectItem value="all">Tots els clients</SelectItem>
                                        {customers?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex-1 space-y-2">
                                <label className="text-sm font-medium flex items-center gap-2"><Briefcase className="h-4 w-4" /> Obra</label>
                                <Select value={selectedProject} onValueChange={setSelectedProject} disabled={projectNames.length === 0}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecciona una obra" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Totes les obres</SelectItem>
                                        {projectNames.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="flex justify-end pt-4 gap-2">
                            <Button
                                onClick={() => handleExport('save')}
                                disabled={isGenerating || !canGenerate}
                            >
                                {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
                                Guardar Albarà
                            </Button>
                            <Button
                                onClick={() => handleExport('pdf')}
                                disabled={isGenerating || !canGenerate}
                            >
                                {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
                                Guardar i Exportar PDF
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
                                    projectName={selectedProject !== 'all' ? selectedProject : 'Varis Projectes'}
                                    services={filteredServices}
                                    showPricing={true}
                                    albaranNumber={-1} // Placeholder number for preview
                                />
                            )}
                        </CardContent>
                    </Card>
                )}
            </div>
        </AdminGate>
    )
}
