
'use client'

import { useMemo, useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCollection, useUser, useFirestore, useMemoFirebase } from '@/firebase'
import { collection, query, orderBy, doc, runTransaction, setDoc, getDocs, collectionGroup, where, writeBatch } from 'firebase/firestore'
import type { Customer, Quote, Albaran, Employee, ServiceRecord, Invoice } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Briefcase, FileDown, Loader2, Users, FileArchive, Save, Receipt, Copy, X } from 'lucide-react'
import { InvoicePreview } from '@/components/InvoicePreview'
import { useToast } from '@/hooks/use-toast'
import { AdminGate } from '@/components/AdminGate'
import { calculateTotalAmount } from '@/lib/calculations'
import { Checkbox } from '@/components/ui/checkbox'

function InvoicesPageContent() {
    const firestore = useFirestore()
    const { user, isUserLoading } = useUser()
    const { toast } = useToast()
    const router = useRouter()
    const searchParams = useSearchParams()
    
    const [selectedCustomerId, setSelectedCustomerId] = useState<string>('none');
    const [selectedAlbaranIds, setSelectedAlbaranIds] = useState<string[]>([]);
    
    const [projectName, setProjectName] = useState<string>('');
    const [isSaving, setIsSaving] = useState(false);
    
    const [servicesForInvoice, setServicesForInvoice] = useState<ServiceRecord[]>([]);
    const [applyIva, setApplyIva] = useState<boolean>(true);

    const customersQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'customers'), orderBy('name', 'asc')) : null, [firestore]);
    const { data: customers, isLoading: isLoadingCustomers } = useCollection<Customer>(customersQuery);

    const albaransQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'albarans'), orderBy('albaranNumber', 'desc')) : null, [firestore]);
    const { data: albarans, isLoading: isLoadingAlbarans } = useCollection<Albaran>(albaransQuery);
    
    const employeesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'employees'), orderBy('firstName', 'asc')) : null, [firestore]);
    const { data: employees, isLoading: isLoadingEmployees } = useCollection<Employee>(employeesQuery);

    // Auto-select customer and albaran from URL params
    useEffect(() => {
        const customerIdParam = searchParams.get('customerId');
        const albaranIdParam = searchParams.get('albaranId');

        if (customerIdParam && customers && selectedCustomerId === 'none') {
            setSelectedCustomerId(customerIdParam);
        }

        if (albaranIdParam && albarans && selectedAlbaranIds.length === 0) {
            setSelectedAlbaranIds([albaranIdParam]);
        }
    }, [searchParams, customers, albarans, selectedCustomerId, selectedAlbaranIds]);

    const availableAlbarans = useMemo(() => {
        if (!albarans || selectedCustomerId === 'none') return [];
        // Only show albarans that are 'pendent' (pending)
        return albarans.filter(a => a.customerId === selectedCustomerId && a.status === 'pendent');
    }, [albarans, selectedCustomerId]);
    
    const handleAlbaranSelection = (albaranId: string, checked: boolean) => {
        setSelectedAlbaranIds(prev => 
            checked ? [...prev, albaranId] : prev.filter(id => id !== albaranId)
        );
    };

    const importAlbarans = useCallback(async () => {
        if (selectedAlbaranIds.length === 0 || !albarans || !firestore || !employees) {
            setServicesForInvoice([]);
            return;
        }

        const selectedAlbarans = albarans.filter(a => selectedAlbaranIds.includes(a.id));
        if (selectedAlbarans.length === 0) {
            return;
        }

        const firstAlbaran = selectedAlbarans[0];
        setProjectName(firstAlbaran.projectName);
        
        try {
            const allServiceRecordIds = selectedAlbarans.flatMap(a => a.serviceRecordIds);
            if(allServiceRecordIds.length === 0) {
                setServicesForInvoice([]);
                return;
            }

            const allServicesSnapshot = await getDocs(collectionGroup(firestore, 'serviceRecords'));
            const allServicesData = allServicesSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as ServiceRecord));
            
            const aggregatedServices = allServiceRecordIds.map(serviceId => {
                const serviceData = allServicesData.find(s => s.id === serviceId);
                if (!serviceData) return null;

                const albaran = selectedAlbarans.find(a => a.serviceRecordIds.includes(serviceId));
                return {
                    ...serviceData,
                    albaranNumber: albaran?.albaranNumber || 0
                };
            }).filter((s): s is ServiceRecord => s !== null);

            setServicesForInvoice(aggregatedServices);

        } catch (e) {
            console.error("Error fetching services for albarans:", e);
            toast({ variant: 'destructive', title: 'Error', description: "No s'han pogut carregar els detalls dels serveis." });
        }
    }, [selectedAlbaranIds, albarans, firestore, employees, toast]);

    useEffect(() => {
        importAlbarans();
    }, [importAlbarans]);

    const associatedCustomer = useMemo(() => {
        if (!selectedCustomerId || !customers || selectedCustomerId === 'none') return undefined;
        return customers.find(c => c.id === selectedCustomerId);
    }, [selectedCustomerId, customers]);

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
            
            const { laborCost, totalGeneral } = calculateTotalAmount(servicesForInvoice, employees, applyIva);

            const invoiceRef = doc(collection(firestore, "invoices"));
            const invoiceData: Omit<Invoice, 'id'> = {
                invoiceNumber: newInvoiceNumber,
                createdAt: new Date().toISOString(),
                customerId: associatedCustomer?.id || '',
                customerName: associatedCustomer?.name || 'N/A',
                projectName: projectName || 'Sense nom',
                items: [], 
                labor: { description: "Mà d'obra", cost: laborCost },
                totalAmount: totalGeneral,
                sourceId: selectedAlbaranIds.join(','),
                sourceType: 'albaran',
                status: 'pendent',
                applyIva: applyIva,
            };
            
            const batch = writeBatch(firestore);
            batch.set(invoiceRef, { ...invoiceData, id: invoiceRef.id });

            // Mark albarans as 'facturat'
            selectedAlbaranIds.forEach(id => {
                const albaranRef = doc(firestore, 'albarans', id);
                batch.update(albaranRef, { status: 'facturat' });
            });

            await batch.commit();

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

    return (
        <AdminGate pageTitle="Generador de Factures" pageDescription="Aquesta secció està protegida.">
            <div className="space-y-8 max-w-7xl mx-auto">
                 <Card>
                    <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-4">
                        <div>
                            <CardTitle>Generador de Factures</CardTitle>
                            <CardDescription>Crea una factura important dades d'un o més albarans.</CardDescription>
                        </div>
                         <Button onClick={() => router.push('/dashboard/invoices/history')}>
                            <FileArchive className="mr-2 h-4 w-4" /> Historial de Factures
                        </Button>
                    </CardHeader>
                    <CardContent className="space-y-6">
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

                        {selectedCustomerId !== 'none' && (
                            <div className="space-y-2">
                                <Label>Selecciona Albarans per Facturar</Label>
                                <div className="max-h-60 overflow-y-auto space-y-2 rounded-md border p-4">
                                    {availableAlbarans.length > 0 ? availableAlbarans.map(albaran => (
                                        <div key={albaran.id} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={`albaran-${albaran.id}`}
                                                checked={selectedAlbaranIds.includes(albaran.id)}
                                                onCheckedChange={(checked) => handleAlbaranSelection(albaran.id, !!checked)}
                                            />
                                            <label
                                                htmlFor={`albaran-${albaran.id}`}
                                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-grow"
                                            >
                                                Albarà #{albaran.albaranNumber} - {albaran.projectName} ({albaran.totalAmount.toFixed(2)}€)
                                            </label>
                                        </div>
                                    )) : <p className="text-sm text-muted-foreground">No hi ha albarans pendents de facturar per a aquest client.</p>}
                                </div>
                            </div>
                        )}
                        
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="apply-iva"
                                checked={applyIva}
                                onCheckedChange={(checked) => setApplyIva(!!checked)}
                            />
                            <label
                                htmlFor="apply-iva"
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                                Aplicar IGI (IVA) a la factura
                            </label>
                        </div>


                        <div className="flex justify-end pt-4 gap-2 flex-wrap">
                             <Button onClick={() => handleSaveInvoice(false)} disabled={isSaving || servicesForInvoice.length === 0}>
                                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                Guardar Factura
                            </Button>
                             <Button onClick={() => handleSaveInvoice(true)} disabled={isSaving || servicesForInvoice.length === 0}>
                                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
                                Guardar i Exportar
                            </Button>
                        </div>
                    </CardContent>
                </Card>
                
                {servicesForInvoice.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Previsualització de la Factura</CardTitle>
                        </CardHeader>
                        <CardContent>
                           <InvoicePreview
                             customer={associatedCustomer}
                             projectName={projectName}
                             services={servicesForInvoice}
                             employees={employees || []}
                             applyIva={applyIva}
                           />
                        </CardContent>
                    </Card>
                )}
            </div>
        </AdminGate>
    )
}

export default function InvoicesPage() {
    return (
        <Suspense fallback={<p>Carregant gerador de factures...</p>}>
            <InvoicesPageContent />
        </Suspense>
    )
}
