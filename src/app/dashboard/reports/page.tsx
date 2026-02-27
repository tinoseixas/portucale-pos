
'use client'

import { useMemo, useRef, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useCollection, useUser, useFirestore, useMemoFirebase } from '@/firebase'
import { collection, query, orderBy, collectionGroup, doc, runTransaction, setDoc, where } from 'firebase/firestore'
import type { Customer, ServiceRecord, Employee, Albaran } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Briefcase, FileDown, Loader2, Users, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { ReportPreview } from '@/components/ReportPreview'
import { useToast } from '@/hooks/use-toast'
import { AdminGate } from '@/components/AdminGate'
import { calculateTotalAmount } from '@/lib/calculations'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

export default function ReportsPage() {
    const firestore = useFirestore()
    const router = useRouter()
    const { user, isUserLoading } = useUser()
    const { toast } = useToast();
    
    const [selectedCustomerId, setSelectedCustomerId] = useState<string>('all');
    const [selectedProject, setSelectedProject] = useState<string>('all')
    const [isGenerating, setIsGenerating] = useState(false)


    const customersQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'customers'), orderBy('name', 'asc')) : null, [firestore]);
    const { data: customers, isLoading: isLoadingCustomers } = useCollection<Customer>(customersQuery)

    const allServicesQuery = useMemoFirebase(() => {
        if (!firestore) return null
        return query(collectionGroup(firestore, 'serviceRecords'), orderBy('arrivalDateTime', 'desc'))
    }, [firestore])

    const { data: allServices, isLoading: isLoadingAllServices } = useCollection<ServiceRecord>(allServicesQuery)

    const employeesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'employees')) : null, [firestore]);
    const { data: employees, isLoading: isLoadingEmployees } = useCollection<Employee>(employeesQuery);

    const albaransQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'albarans'), where('status', '==', 'pendent')) : null, [firestore]);
    const { data: pendingAlbarans } = useCollection<Albaran>(albaransQuery);


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
        if (!allServices || selectedProject === 'all') return [];
        return allServices.filter(s => s.projectName === selectedProject);
    }, [allServices, selectedProject]);


    const associatedCustomer = useMemo(() => {
        if (filteredServices.length === 0 || !customers) return undefined;
        const firstServiceWithCustomer = filteredServices.find(s => s.customerId);
        if (!firstServiceWithCustomer || !firstServiceWithCustomer.customerId) return undefined;
        return customers.find(c => c.id === firstServiceWithCustomer.customerId);
    }, [filteredServices, customers]);
    
    // Verifica si ja existeix un albarà pendent per a aquesta obra
    const existingAlbaran = useMemo(() => {
        if (!pendingAlbarans || selectedProject === 'all') return null;
        return pendingAlbarans.find(a => a.projectName === selectedProject && a.customerId === selectedCustomerId);
    }, [pendingAlbarans, selectedProject, selectedCustomerId]);
    
    
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
            
            const { totalGeneral } = calculateTotalAmount(filteredServices, employees);

            const albaranRef = doc(collection(firestore, "albarans"));
            const albaranData: Albaran = {
                id: albaranRef.id,
                albaranNumber: newAlbaranNumber,
                createdAt: new Date().toISOString(),
                customerId: associatedCustomer?.id || '',
                customerName: associatedCustomer?.name || 'N/A',
                projectName: selectedProject !== 'all' ? selectedProject : 'Varis Projectes',
                serviceRecordIds: filteredServices.map(s => s.id),
                totalAmount: totalGeneral,
                status: 'pendent',
            };

            await setDoc(albaranRef, albaranData);

            toast({
                title: "Albarà Guardat",
                description: `L'albarà #${newAlbaranNumber} ha estat guardat a l'historial.`,
            });
            
            if (exportType === 'pdf') {
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
        return <p className="p-8 text-center">Carregant generador...</p>
    }


    return (
        <AdminGate pageTitle="Generador d'Albarans" pageDescription="Crea un nou document per consolidar serveis.">
            <div className="space-y-8 max-w-7xl mx-auto">
                <Card>
                    <CardHeader>
                        <CardTitle>Generador d'Albarans</CardTitle>
                        <CardDescription>Selecciona un client i una obra per consolidar els serveis realitzats en un sol document.</CardDescription>
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
                                <Select value={selectedProject} onValueChange={handleProjectChange} disabled={projectNames.length === 0 && selectedCustomerId === 'all'}>
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

                        {existingAlbaran && (
                            <Alert className="bg-amber-50 border-amber-200">
                                <AlertTriangle className="h-4 w-4 text-amber-600" />
                                <AlertTitle className="text-amber-800">Albarà ja existent</AlertTitle>
                                <AlertDescription className="text-amber-700">
                                    Ja existeix un albarà pendent (<strong>#{existingAlbaran.albaranNumber}</strong>) per a aquesta obra. 
                                    Si edites els serveis originals, l'albarà existent s'actualitzarà sol. No cal que en creïs un de nou.
                                </AlertDescription>
                            </Alert>
                        )}

                        <div className="flex justify-end pt-4 gap-2 flex-wrap">
                            <Button
                                onClick={() => handleExport('save')}
                                disabled={isGenerating || !canGenerate}
                                variant="outline"
                            >
                                {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Guardar Només
                            </Button>
                            <Button
                                onClick={() => handleExport('pdf')}
                                disabled={isGenerating || !canGenerate}
                                className="bg-primary hover:bg-primary/90"
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
                            <CardTitle className="flex items-center gap-2">
                                <CheckCircle2 className="h-5 w-5 text-green-500" />
                                Previsualització: {selectedProject}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ReportPreview
                                customer={associatedCustomer}
                                projectName={selectedProject}
                                services={filteredServices}
                                showPricing={true}
                                albaranNumber={-1} 
                                employees={employees || []}
                            />
                        </CardContent>
                    </Card>
                )}
            </div>
        </AdminGate>
    )
}
