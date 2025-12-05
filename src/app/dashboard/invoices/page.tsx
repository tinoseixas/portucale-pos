'use client'

import { useMemo, useRef, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useCollection, useUser, useFirestore, useMemoFirebase } from '@/firebase'
import { collection, query, orderBy, doc, runTransaction, setDoc, getDocs, collectionGroup, where } from 'firebase/firestore'
import type { Customer, Quote, Albaran, InvoiceItem, Employee, ServiceRecord, Invoice } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Briefcase, FileDown, Loader2, Users, Plus, Trash2, ImagePlus, Euro, FileArchive, Save, Receipt, Copy } from 'lucide-react'
import { InvoicePreview } from '@/components/InvoicePreview'
import { useToast } from '@/hooks/use-toast'
import { AdminGate } from '@/components/AdminGate'
import { calculateTotalAmount } from '@/lib/calculations'
import { format, parseISO, differenceInMinutes } from 'date-fns'
import { ca } from 'date-fns/locale'

export default function InvoicesPage() {
    const firestore = useFirestore()
    const { user, isUserLoading } = useUser()
    const { toast } = useToast()
    const router = useRouter()
    
    const [selectedProjectName, setSelectedProjectName] = useState<string>('none');
    const [selectedCustomerId, setSelectedCustomerId] = useState<string>('none');
    const [projectName, setProjectName] = useState<string>('');
    const [isSaving, setIsSaving] = useState(false);
    
    // This state will hold all services to be invoiced, with an added albaranNumber for grouping
    const [servicesForInvoice, setServicesForInvoice] = useState<ServiceRecord[]>([]);
    
    const [sourceInfo, setSourceInfo] = useState<{ id: string, type: 'albaran' | 'quote' }[]>([]);

    // Data fetching
    const customersQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'customers'), orderBy('name', 'asc')) : null, [firestore]);
    const { data: customers, isLoading: isLoadingCustomers } = useCollection<Customer>(customersQuery);

    const albaransQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'albarans'), orderBy('albaranNumber', 'desc')) : null, [firestore]);
    const { data: albarans, isLoading: isLoadingAlbarans } = useCollection<Albaran>(albaransQuery);
    
    const employeesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'employees')) : null, [firestore]);
    const { data: employees, isLoading: isLoadingEmployees } = useCollection<Employee>(employeesQuery);

    const projectsWithAlbarans = useMemo(() => {
        if (!albarans) return [];
        const projectMap = new Map<string, { customerId: string, customerName: string }>();
        albarans.forEach(a => {
            if (a.projectName && !projectMap.has(a.projectName)) {
                projectMap.set(a.projectName, { customerId: a.customerId, customerName: a.customerName });
            }
        });
        return Array.from(projectMap.entries()).map(([projectName, data]) => ({
            name: projectName,
            ...data
        }));
    }, [albarans]);

    useEffect(() => {
        const importFromProject = async () => {
            if (selectedProjectName === 'none' || !albarans || !firestore || !employees) {
                setServicesForInvoice([]);
                setSourceInfo([]);
                return;
            };

            toast({ title: `Important dades de l'obra: ${selectedProjectName}...` });

            const projectAlbarans = albarans.filter(a => a.projectName === selectedProjectName);
            if (projectAlbarans.length === 0) {
                 toast({ variant: 'destructive', title: 'Error', description: "No s'han trobat albarans per a aquesta obra." });
                 return;
            }
            
            const mainCustomer = customers?.find(c => c.id === projectAlbarans[0].customerId);
            if(mainCustomer) setSelectedCustomerId(mainCustomer.id);
            setProjectName(projectAlbarans[0].projectName);
            
            const allSourceIds = projectAlbarans.map(a => ({ id: a.id, type: 'albaran' as const }));
            setSourceInfo(allSourceIds);

            try {
                const allServicesSnapshot = await getDocs(collectionGroup(firestore, 'serviceRecords'));
                const allServices = allServicesSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as ServiceRecord));
                
                let aggregatedServices: ServiceRecord[] = [];
                projectAlbarans.forEach(albaran => {
                    const servicesOfThisAlbaran = allServices.filter(service => albaran.serviceRecordIds.includes(service.id))
                        .map(service => ({
                            ...service,
                            albaranNumber: albaran.albaranNumber // Add albaran number for grouping in preview
                        }));
                    aggregatedServices.push(...servicesOfThisAlbaran);
                });
                
                setServicesForInvoice(aggregatedServices);

            } catch (e) {
                console.error("Error fetching services for project:", e);
                toast({ variant: 'destructive', title: 'Error', description: "No s'han pogut carregar els detalls de l'obra." });
            }
        };
        importFromProject();
    }, [selectedProjectName, albarans, firestore, employees, customers, toast]);


    const associatedCustomer = useMemo(() => {
        if (!selectedCustomerId || !customers || selectedCustomerId === 'none') return undefined;
        return customers.find(c => c.id === selectedCustomerId);
    }, [selectedCustomerId, customers]);

    
    // --- Save and Export Logic ---
    const handleSaveInvoice = async (exportAfter: boolean) => {
        if (!firestore || !employees) return;
        if(servicesForInvoice.length === 0) {
            toast({ variant: 'destructive', title: 'Error', description: 'No hi ha serveis per facturar.' });
            return;
        }
        setIsSaving(true);
        
        try {
            const counterRef = doc(firestore, "counters", "invoices");
            const newInvoiceNumber = await runTransaction(firestore, async (transaction) => {
                const counterDoc = await transaction.get(counterRef);
                if (!counterDoc.exists()) {
                    transaction.set(counterRef, { lastNumber: 1 });
                    return 1;
                }
                const newNumber = (counterDoc.data().lastNumber || 0) + 1;
                transaction.update(counterRef, { lastNumber: newNumber });
                return newNumber;
            });
            
            // The items for the invoice are derived directly from the services' materials
            const invoiceItems = servicesForInvoice.flatMap(service => 
                (service.materials || []).map(material => ({
                    ...material,
                    discount: 0, // Assuming no discount for now, can be added later
                    albaranNumber: service.albaranNumber
                }))
            );
            
            const { laborCost, totalGeneral } = calculateTotalAmount(servicesForInvoice, employees);

            const invoiceRef = doc(collection(firestore, "invoices"));
            const invoiceData: Omit<Invoice, 'id'> = {
                invoiceNumber: newInvoiceNumber,
                createdAt: new Date().toISOString(),
                customerId: associatedCustomer?.id || '',
                customerName: associatedCustomer?.name || 'N/A',
                projectName: projectName || 'Sense nom',
                items: invoiceItems,
                labor: { description: "Mà d'obra", cost: laborCost },
                totalAmount: totalGeneral,
                sourceId: sourceInfo.map(s => s.id).join(','),
                sourceType: sourceInfo.length > 0 ? sourceInfo[0].type : undefined,
                status: 'pendent',
            };
            
            await setDoc(invoiceRef, { ...invoiceData, id: invoiceRef.id });

            toast({
                title: "Factura Guardada",
                description: `La factura #${newInvoiceNumber} ha estat guardada a l'historial.`,
            });
            
            if (exportAfter) {
                router.push(`/dashboard/invoices/${invoiceRef.id}?export=true`);
            } else {
                 router.push(`/dashboard/invoices/${invoiceRef.id}`);
            }

        } catch (error) {
            console.error("Error generating invoice:", error)
            toast({
                variant: 'destructive',
                title: 'Error',
                description: "No s'ha pogut generar la factura.",
            });
        } finally {
            setIsSaving(false);
        }
    };

    const isLoading = isUserLoading || isLoadingCustomers || isLoadingAlbarans || isLoadingEmployees;

    if (isLoading) {
        return <p>Carregant...</p>
    }

    // Convert services to items for the preview, as it might still expect items format
    const previewItems = servicesForInvoice.flatMap(service =>
      (service.materials || []).map(material => ({
        ...material,
        discount: 0,
        albaranNumber: service.albaranNumber,
      }))
    );


    return (
        <AdminGate pageTitle="Generador de Factures" pageDescription="Aquesta secció està protegida.">
            <div className="space-y-8 max-w-5xl mx-auto">
                 <Card>
                    <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-4">
                        <div>
                            <CardTitle>Generador de Factures</CardTitle>
                            <CardDescription>Crea una factura important dades o afegint articles manualment.</CardDescription>
                        </div>
                         <Button onClick={() => router.push('/dashboard/invoices/history')}>
                            <FileArchive className="mr-2 h-4 w-4" /> Historial de Factures
                        </Button>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* --- Importers --- */}
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2"><Copy className="h-4 w-4"/> Importar Obra</Label>
                            <Select value={selectedProjectName} onValueChange={setSelectedProjectName}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecciona una obra per importar albarans..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">No importar</SelectItem>
                                    {projectsWithAlbarans.map(p => <SelectItem key={p.name} value={p.name}>{p.name} ({p.customerName})</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2"><Users className="h-4 w-4" /> Client</Label>
                                <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecciona un client" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">Cap client seleccionat</SelectItem>
                                        {customers?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2"><Briefcase className="h-4 w-4" /> Obra</Label>
                                <Input 
                                    placeholder="Nom del projecte o obra"
                                    value={projectName}
                                    onChange={(e) => setProjectName(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="flex justify-end pt-4 gap-2 flex-wrap">
                             <Button onClick={() => handleSaveInvoice(false)} disabled={isSaving}>
                                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                Guardar Factura
                            </Button>
                             <Button onClick={() => handleSaveInvoice(true)} disabled={isSaving}>
                                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
                                Guardar i Exportar
                            </Button>
                        </div>
                    </CardContent>
                </Card>
                
                {/* --- Preview --- */}
                <Card>
                    <CardHeader>
                        <CardTitle>Previsualització de la Factura</CardTitle>
                    </CardHeader>
                    <CardContent>
                       <InvoicePreview
                         customer={associatedCustomer}
                         projectName={projectName}
                         items={previewItems}
                         services={servicesForInvoice}
                         employees={employees || []}
                       />
                    </CardContent>
                </Card>
            </div>
        </AdminGate>
    )
}
