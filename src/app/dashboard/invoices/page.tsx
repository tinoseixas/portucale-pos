'use client'

import { useMemo, useRef, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useCollection, useUser, useFirestore, useMemoFirebase } from '@/firebase'
import { collection, query, orderBy, doc, runTransaction, setDoc, getDocs, collectionGroup } from 'firebase/firestore'
import type { Customer, Quote, Albaran, InvoiceItem, Employee, ServiceRecord } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Briefcase, FileDown, Loader2, Users, Plus, Trash2, ImagePlus, Euro, FileArchive, Save, Receipt, Copy } from 'lucide-react'
import { InvoicePreview } from '@/components/InvoicePreview'
import { useToast } from '@/hooks/use-toast'
import { AdminGate } from '@/components/AdminGate'
import { IVA_RATE, calculateTotalAmount } from '@/lib/calculations'
import { format } from 'date-fns'
import { ca } from 'date-fns/locale'

export default function InvoicesPage() {
    const firestore = useFirestore()
    const { user, isUserLoading } = useUser()
    const { toast } = useToast()
    const router = useRouter()
    const imageInputRef = useRef<HTMLInputElement>(null);

    const [selectedAlbaranId, setSelectedAlbaranId] = useState<string>('none');
    const [selectedQuoteId, setSelectedQuoteId] = useState<string>('none');
    const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
    const [projectName, setProjectName] = useState<string>('');
    const [isSaving, setIsSaving] = useState(false);
    const [items, setItems] = useState<InvoiceItem[]>([{ description: '', quantity: 1, unitPrice: 0, imageDataUrl: undefined, discount: 0 }]);
    const [labor, setLabor] = useState({ description: "Mà d'obra", cost: 0 });
    const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(null);
    const [sourceInfo, setSourceInfo] = useState<{ id: string, type: 'albaran' | 'quote' } | null>(null);

    // Data fetching
    const customersQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'customers'), orderBy('name', 'asc')) : null, [firestore]);
    const { data: customers, isLoading: isLoadingCustomers } = useCollection<Customer>(customersQuery);

    const albaransQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'albarans'), orderBy('albaranNumber', 'desc')) : null, [firestore]);
    const { data: albarans, isLoading: isLoadingAlbarans } = useCollection<Albaran>(albaransQuery);

    const quotesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'quotes'), orderBy('quoteNumber', 'desc')) : null, [firestore]);
    const { data: quotes, isLoading: isLoadingQuotes } = useCollection<Quote>(quotesQuery);
    
    const employeesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'employees')) : null, [firestore]);
    const { data: employees, isLoading: isLoadingEmployees } = useCollection<Employee>(employeesQuery);

    // Effect to import data from a selected Albaran
    useEffect(() => {
        const importFromAlbaran = async () => {
            if (selectedAlbaranId === 'none' || !albarans || !firestore || !employees) return;
            
            const albaran = albarans.find(a => a.id === selectedAlbaranId);
            if (!albaran) return;
            
            toast({ title: "Important dades de l'albarà..." });
            
            setSelectedQuoteId('none');
            setSourceInfo({ id: albaran.id, type: 'albaran' });
            setSelectedCustomerId(albaran.customerId);
            setProjectName(albaran.projectName);

            try {
                const allServicesSnapshot = await getDocs(collectionGroup(firestore, 'serviceRecords'));
                const associatedServices = albaran.serviceRecordIds.map(serviceId => {
                    const serviceDoc = allServicesSnapshot.docs.find(doc => doc.id === serviceId);
                    return serviceDoc ? { id: serviceDoc.id, ...serviceDoc.data() } as ServiceRecord : null;
                }).filter(Boolean) as ServiceRecord[];

                const { laborCost } = calculateTotalAmount(associatedServices, employees);
                setLabor({ description: "Mà d'obra", cost: laborCost });

                const materials = associatedServices.flatMap(s => s.materials || [])
                    .filter(m => m.description.trim() !== '' && !m.description.toLowerCase().includes('traball'))
                    .map(m => ({...m, discount: 0}));

                setItems(materials.length > 0 ? materials : [{ description: '', quantity: 1, unitPrice: 0, imageDataUrl: undefined, discount: 0 }]);
            } catch (e) {
                console.error("Error fetching services for albaran:", e);
                toast({ variant: 'destructive', title: 'Error', description: "No s'han pogut carregar els detalls de l'albarà." });
            }
        };
        importFromAlbaran();
    }, [selectedAlbaranId, albarans, firestore, toast, employees]);

    // Effect to import data from a selected Quote
    useEffect(() => {
        if (selectedQuoteId === 'none' || !quotes) return;

        const quote = quotes.find(q => q.id === selectedQuoteId);
        if (!quote) return;

        toast({ title: "Important dades del pressupost..." });

        setSelectedAlbaranId('none');
        setSourceInfo({ id: quote.id, type: 'quote' });
        setSelectedCustomerId(quote.customerId);
        setProjectName(quote.projectName);
        setItems(quote.items.map(item => ({...item, discount: item.discount || 0})));
        setLabor(quote.labor);

    }, [selectedQuoteId, quotes, toast]);

    const associatedCustomer = useMemo(() => {
        if (!selectedCustomerId || !customers) return undefined;
        return customers.find(c => c.id === selectedCustomerId);
    }, [selectedCustomerId, customers]);

    // --- Item Handlers ---
    const handleItemChange = (index: number, field: keyof InvoiceItem, value: string | number) => {
        const newItems = [...items];
        const item = newItems[index];
        if (field === 'description') {
            item.description = value as string;
        } else {
            const numValue = Number(value);
            if (!isNaN(numValue)) {
                 if (field === 'quantity') item.quantity = numValue >= 0 ? numValue : 0;
                 if (field === 'unitPrice') item.unitPrice = numValue >= 0 ? numValue : 0;
                 if (field === 'discount') item.discount = numValue >= 0 && numValue <= 100 ? numValue : 0;
            }
        }
        setItems(newItems);
    };

    const addItem = () => {
        setItems([...items, { description: '', quantity: 1, unitPrice: 0, imageDataUrl: undefined, discount: 0 }]);
    };

    const removeItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };

     const handleImageUploadClick = (index: number) => {
        setSelectedItemIndex(index);
        imageInputRef.current?.click();
    };

     const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0] && selectedItemIndex !== null) {
          const file = e.target.files[0];
          try {
            toast({ title: 'Processant imatge...' });
            const reader = new FileReader();
            reader.onload = () => {
                const newItems = [...items];
                newItems[selectedItemIndex].imageDataUrl = reader.result as string;
                setItems(newItems);
                toast({ title: 'Imatge afegida!' });
            };
            reader.readAsDataURL(file);
          } catch (error) {
            console.error('Error processing image:', error);
            toast({ variant: 'destructive', title: 'Error', description: "No s'ha pogut processar la imatge." });
          } finally {
            e.target.value = '';
            setSelectedItemIndex(null);
          }
        }
    };
    
    // --- Save and Export Logic ---
    const handleSaveInvoice = async (exportAfter: boolean) => {
        if (!firestore) return;
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
            
            const filteredItems = items.filter(item => item.description.trim() !== '');
            const materialsSubtotal = filteredItems.reduce((acc, item) => {
                const itemTotal = item.quantity * item.unitPrice;
                const discountAmount = itemTotal * ((item.discount || 0) / 100);
                return acc + (itemTotal - discountAmount);
            }, 0);
            const subtotal = materialsSubtotal + labor.cost;
            const totalAmount = subtotal * (1 + IVA_RATE);

            const invoiceRef = doc(collection(firestore, "invoices"));
            const invoiceData = {
                id: invoiceRef.id,
                invoiceNumber: newInvoiceNumber,
                createdAt: new Date().toISOString(),
                customerId: associatedCustomer?.id || '',
                customerName: associatedCustomer?.name || 'N/A',
                projectName: projectName || 'Sense nom',
                items: filteredItems,
                labor: labor,
                totalAmount: totalAmount,
                sourceId: sourceInfo?.id || '',
                sourceType: sourceInfo?.type || undefined,
                status: 'pendent',
            };

            await setDoc(invoiceRef, invoiceData);

            toast({
                title: "Factura Guardada",
                description: `La factura #${newInvoiceNumber} ha estat guardada a l'historial.`,
            });
            
            // TODO: Implement navigation to invoice detail page
            router.push(`/dashboard/invoices/history`);

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

    const isLoading = isUserLoading || isLoadingCustomers || isLoadingAlbarans || isLoadingQuotes || isLoadingEmployees;

    if (isLoading) {
        return <p>Carregant...</p>
    }

    return (
        <AdminGate pageTitle="Generador de Factures" pageDescription="Aquesta secció està protegida.">
            <div className="space-y-8 max-w-5xl mx-auto">
                 <input
                    type="file"
                    ref={imageInputRef}
                    onChange={handleImageFileChange}
                    accept="image/*"
                    className="hidden"
                />
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
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2"><Copy className="h-4 w-4"/> Importar des d'Albarà</Label>
                                <Select value={selectedAlbaranId} onValueChange={setSelectedAlbaranId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecciona un albarà..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">No importar</SelectItem>
                                        {albarans?.map(a => <SelectItem key={a.id} value={a.id}>Albarà #{String(a.albaranNumber).padStart(4, '0')} - {a.customerName}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                             <div className="space-y-2">
                                <Label className="flex items-center gap-2"><Copy className="h-4 w-4"/> Importar des de Pressupost</Label>
                                <Select value={selectedQuoteId} onValueChange={setSelectedQuoteId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecciona un pressupost..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">No importar</SelectItem>
                                        {quotes?.map(q => <SelectItem key={q.id} value={q.id}>Pressupost #{String(q.quoteNumber).padStart(4, '0')} - {q.customerName}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2"><Users className="h-4 w-4" /> Client</Label>
                                <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecciona un client" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Cap client seleccionat</SelectItem>
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

                        {/* --- Items Editor --- */}
                        <div className="space-y-4 rounded-lg border p-4">
                           <Label className="text-base font-semibold">Articles de la Factura</Label>
                           {items.map((item, index) => (
                               <div key={index} className="space-y-2 p-2 border-b">
                                   <Input 
                                       placeholder="Descripció de l'article"
                                       value={item.description}
                                       onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                                   />
                                   <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                                       <Input 
                                           type="number"
                                           placeholder="Quant."
                                           value={item.quantity}
                                           onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                                       />
                                       <div className="relative">
                                            <Input
                                                type="number"
                                                placeholder="Preu/Unit."
                                                value={item.unitPrice}
                                                onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)}
                                                className="pl-7"
                                            />
                                            <Euro className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        </div>
                                       <div className="relative">
                                            <Input
                                                type="number"
                                                placeholder="Desc. %"
                                                value={item.discount || ''}
                                                onChange={(e) => handleItemChange(index, 'discount', e.target.value)}
                                                className="pl-2 pr-7"
                                            />
                                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
                                        </div>
                                       <Button type="button" variant="outline" onClick={() => handleImageUploadClick(index)}>
                                           <ImagePlus className="mr-2 h-4 w-4" /> Imatge
                                       </Button>
                                       <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(index)}>
                                           <Trash2 className="h-4 w-4 text-destructive" />
                                       </Button>
                                   </div>
                                   {item.imageDataUrl && <img src={item.imageDataUrl} alt="Preview" className="h-20 w-20 rounded-md object-cover mt-2" />}
                               </div>
                           ))}
                           <Button type="button" variant="outline" onClick={addItem}>
                               <Plus className="mr-2 h-4 w-4" /> Afegir Article
                           </Button>
                        </div>
                        
                        {/* --- Labor Editor --- */}
                         <div className="space-y-2">
                            <Label>Cost de la Mà d'Obra</Label>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                 <Input 
                                    placeholder="Descripció (ex: Mà d'obra)"
                                    value={labor.description}
                                    onChange={(e) => setLabor({...labor, description: e.target.value})}
                                 />
                                <div className="relative">
                                     <Input
                                        type="number"
                                        placeholder="Cost Total"
                                        value={labor.cost}
                                        onChange={(e) => setLabor({...labor, cost: Number(e.target.value) || 0})}
                                        className="pl-7"
                                     />
                                     <Euro className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                </div>
                            </div>
                         </div>

                        <div className="flex justify-end pt-4 gap-2 flex-wrap">
                             <Button onClick={() => handleSaveInvoice(false)} disabled={isSaving}>
                                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                Guardar Factura
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
                         items={items}
                         labor={labor}
                       />
                    </CardContent>
                </Card>
            </div>
        </AdminGate>
    )
}
