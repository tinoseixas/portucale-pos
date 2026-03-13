
'use client'

import { useMemo, useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCollection, useUser, useFirestore, useMemoFirebase } from '@/firebase'
import { collection, query, orderBy, doc, runTransaction, getDocs, collectionGroup, where, writeBatch } from 'firebase/firestore'
import type { Customer, Albaran, Employee, ServiceRecord, Invoice } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Briefcase, FileDown, Loader2, Users, FileArchive, Save, AlertCircle } from 'lucide-react'
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

    const uniqueCustomers = useMemo(() => {
        if (!customers) return [];
        const seen = new Set();
        return customers.filter(c => {
            const nameKey = c.name.toLowerCase().trim();
            if (seen.has(nameKey)) return false;
            seen.add(nameKey);
            return true;
        });
    }, [customers]);

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
        if (selectedAlbarans.length === 0) return;

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
            console.error("Error important serveis:", e);
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

            selectedAlbaranIds.forEach(id => {
                const albaranRef = doc(firestore, 'albarans', id);
                batch.update(albaranRef, { status: 'facturat' });
            });

            await batch.commit();

            toast({
                title: "Factura generada",
                description: `L'obra ha estat facturada correctament.`,
            });
            
            if (exportAfter) {
                router.push(`/dashboard/invoices/${invoiceRef.id}?export=true`);
            } else {
                 router.push(`/dashboard/invoices/${invoiceRef.id}`);
            }

        } catch (error) {
            console.error("Error guardant factura:", error)
            toast({ variant: 'destructive', title: 'Error', description: "No s'ha pogut generar la factura." });
        } finally {
            setIsSaving(false);
        }
    };

    const isLoading = isUserLoading || isLoadingCustomers || isLoadingAlbarans || isLoadingEmployees;

    if (isLoading) {
        return <div className="p-12 text-center"><Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" /><p className="mt-4">Preparant dades de facturació...</p></div>
    }

    return (
        <AdminGate pageTitle="Generador de factures" pageDescription="Crea factures oficials a partir d'albarans d'obra.">
            <div className="space-y-8 max-w-7xl mx-auto">
                 <Card className="shadow-lg">
                    <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-4 border-b bg-slate-50/50">
                        <div>
                            <CardTitle className="text-2xl font-bold">Generador de factures</CardTitle>
                            <CardDescription>Selecciona un client i els albarans pendents.</CardDescription>
                        </div>
                         <Button variant="outline" onClick={() => router.push('/dashboard/invoices/history')} className="font-bold">
                            <FileArchive className="mr-2 h-4 w-4" /> Historial de factures
                        </Button>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2 font-bold"><Users className="h-4 w-4 text-primary" /> Client</Label>
                                <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                                    <SelectTrigger className="h-12 bg-white">
                                        <SelectValue placeholder="Selecciona un client" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">Cap client seleccionat</SelectItem>
                                        {uniqueCustomers?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2 font-bold"><Briefcase className="h-4 w-4 text-primary" /> Nom de l'obra</Label>
                                <Input 
                                    placeholder="Nom del projecte"
                                    value={projectName}
                                    onChange={(e) => setProjectName(e.target.value)}
                                    className="h-12 bg-white"
                                />
                            </div>
                        </div>

                        {selectedCustomerId !== 'none' && (
                            <div className="space-y-3">
                                <Label className="font-bold">Albarans pendents del client:</Label>
                                <div className="max-h-60 overflow-y-auto space-y-2 rounded-xl border p-4 bg-slate-50 shadow-inner">
                                    {availableAlbarans.length > 0 ? availableAlbarans.map(albaran => (
                                        <div key={albaran.id} className="flex items-center space-x-3 p-2 bg-white rounded-lg border border-slate-200">
                                            <Checkbox
                                                id={`albaran-${albaran.id}`}
                                                checked={selectedAlbaranIds.includes(albaran.id)}
                                                onCheckedChange={(checked) => handleAlbaranSelection(albaran.id, !!checked)}
                                            />
                                            <label
                                                htmlFor={`albaran-${albaran.id}`}
                                                className="text-sm font-bold leading-none cursor-pointer flex-grow"
                                            >
                                                Albarà #{String(albaran.albaranNumber).padStart(4, '0')} - {albaran.projectName} 
                                                <span className="ml-2 text-primary font-black">({albaran.totalAmount.toFixed(2)}€)</span>
                                            </label>
                                        </div>
                                    )) : (
                                        <div className="text-center py-4 text-muted-foreground flex flex-col items-center gap-2">
                                            <AlertCircle className="h-5 w-5 opacity-20" />
                                            <p className="text-sm italic">No s'han trobat albarans pendents per a aquest client.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                        
                        <div className="flex items-center space-x-2 bg-slate-100 p-3 rounded-lg w-fit">
                            <Checkbox
                                id="apply-iva"
                                checked={applyIva}
                                onCheckedChange={(checked) => setApplyIva(!!checked)}
                            />
                            <label
                                htmlFor="apply-iva"
                                className="text-sm font-bold cursor-pointer select-none"
                            >
                                Aplicar IGI (4.5%)
                            </label>
                        </div>


                        <div className="flex justify-end pt-4 gap-3 flex-wrap">
                             <Button onClick={() => handleSaveInvoice(false)} disabled={isSaving || servicesForInvoice.length === 0} variant="outline" className="h-12 px-6 font-bold">
                                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                Desar factura
                            </Button>
                             <Button onClick={() => handleSaveInvoice(true)} disabled={isSaving || servicesForInvoice.length === 0} className="bg-primary hover:bg-primary/90 h-12 px-8 font-bold shadow-lg">
                                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
                                Generar i exportar PDF
                            </Button>
                        </div>
                    </CardContent>
                </Card>
                
                {servicesForInvoice.length > 0 && (
                    <Card className="border-2 border-primary/10 shadow-xl overflow-hidden">
                        <CardHeader className="bg-slate-900 text-white">
                            <CardTitle className="text-lg">Previsualització del document</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0 bg-slate-100">
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
        <Suspense fallback={<div className="p-12 text-center"><Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" /></div>}>
            <InvoicesPageContent />
        </Suspense>
    )
}
