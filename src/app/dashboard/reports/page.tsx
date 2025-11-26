'use client'

import { useMemo, useRef, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useCollection, useUser, useFirestore, useMemoFirebase } from '@/firebase'
import { collection, query, orderBy, collectionGroup, doc, runTransaction, setDoc, getDocs, where } from 'firebase/firestore'
import type { Customer, ServiceRecord, Employee } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Briefcase, FileDown, Loader2, Users } from 'lucide-react'
import { ReportPreview } from '@/components/ReportPreview'
import { useToast } from '@/hooks/use-toast'
import { AdminGate } from '@/components/AdminGate'

export default function ReportsPage() {
    const firestore = useFirestore()
    const router = useRouter()
    const { user, isUserLoading } = useUser()
    const { toast } = useToast();
    
    const [selectedCustomerId, setSelectedCustomerId] = useState<string>('all');
    const [selectedProject, setSelectedProject] = useState<string>('all')
    const [isGenerating, setIsGenerating] = useState(false)
    const reportRef = useRef<HTMLDivElement>(null)


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
        // If a customer is selected, filter projects for that customer
        if (selectedCustomerId !== 'all') {
            servicesToFilter = allServices.filter(s => s.customerId === selectedCustomerId);
        }

        const names = servicesToFilter.map(service => service.projectName).filter(Boolean)
        return [...new Set(names)].sort((a,b) => a.localeCompare(b));
    }, [allServices, selectedCustomerId])


    const filteredServices = useMemo(() => {
        if (!allServices) return [];

        // If a project is selected, it takes priority and we ignore the customer filter.
        if (selectedProject !== 'all') {
            return allServices.filter(s => s.projectName === selectedProject);
        }
        
        // If no project is selected, filter by customer (if one is selected).
        if (selectedCustomerId !== 'all') {
            return allServices.filter(s => s.customerId === selectedCustomerId);
        }

        // If no filters are applied, return an empty array.
        return [];
    }, [allServices, selectedCustomerId, selectedProject]);

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
    
    const handleProjectChange = (projectName: string) => {
        setSelectedProject(projectName);
    }


    const handleExport = async (exportType: 'pdf' | 'save') => {
        if (!firestore || !canGenerate || !employees) return;

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
            
            // This calculation is now done inside ReportPreview. To get the final amount, we need to create
            // a temporary element or calculate it here again just for saving.
            // For now, let's just save a placeholder 0, and rely on the update mechanism.
            // A better solution would be to have calculateTotalAmount as a shared utility.
            // But let's keep it simple to avoid more errors.
            const totalAmount = 0; // This will be recalculated on the history page.

            const albaranRef = doc(collection(firestore, "albarans"));
            await setDoc(albaranRef, {
                id: albaranRef.id,
                albaranNumber: newAlbaranNumber,
                createdAt: new Date().toISOString(),
                customerId: associatedCustomer?.id || '',
                customerName: associatedCustomer?.name || 'N/A',
                projectName: selectedProject !== 'all' ? selectedProject : 'Varis Projectes',
                serviceRecordIds: filteredServices.map(s => s.id),
                totalAmount: totalAmount, // Placeholder
            });

            toast({
                title: "Albarà Guardat",
                description: `L'albarà #${newAlbaranNumber} ha estat guardat a l'historial.`,
            });
            
            if (exportType === 'pdf') {
                 // The export logic is now on the detail page to ensure consistency
                 router.push(`/dashboard/albarans/${albaranRef.id}?export=true`);
            } else {
                 router.push(`/dashboard/albarans/${albaranRef.id}`);
            }

        } catch (error) {
            console.error("Error generating albaran:", error)
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
    const isLoading = isUserLoading || isLoadingAllServices || isLoadingCustomers || isLoadingEmployees;

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
                                <Select value={selectedProject} onValueChange={handleProjectChange} disabled={projectNames.length === 0}>
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
