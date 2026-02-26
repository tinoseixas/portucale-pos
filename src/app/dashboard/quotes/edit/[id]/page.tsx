'use client'

import { useMemo, useRef, useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useCollection, useUser, useFirestore, useMemoFirebase, useDoc } from '@/firebase'
import { collection, query, orderBy, doc } from 'firebase/firestore'
import type { Customer, Quote as QuoteType } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Briefcase, FileArchive, Loader2, Users, Plus, Trash2, ImagePlus, Euro, Save, ArrowLeft, FileText } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { AdminGate } from '@/components/AdminGate'
import { IVA_RATE } from '@/lib/calculations'
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates'

type QuoteItem = {
    description: string;
    quantity: number;
    unitPrice: number;
    imageDataUrl?: string;
    discount?: number;
}

const PERALBA_ITEMS: QuoteItem[] = [
    { description: "HABITATGE CASA A - 416mts2 terra radiant", quantity: 1, unitPrice: 0, discount: 10 },
    { description: "HABITATGE CASA B - 382mts2 terra radiant", quantity: 1, unitPrice: 0, discount: 10 },
    { description: "AEROTERMIA MONOBLOC 40kw calefaccio", quantity: 1, unitPrice: 0, discount: 10 },
    { description: "MSHMEHPIBG0740Y MITSUBISHI - REFREDADORA BOMBA DE CALOR MEHP-iB-G07 40Y", quantity: 1, unitPrice: 23761, discount: 10 },
    { description: "CLT20036000 ACC. FRED - BROOKLYN BASE SUPORT SBR TERRA 600X95X130 500KG (2U)", quantity: 1, unitPrice: 67.5, discount: 10 },
    { description: "GNB283008 GENEBRE - MANEGUET ANTIVIBRATORI ROSCA 1 1/2\"", quantity: 2, unitPrice: 32.42, discount: 10 },
    { description: "BAX7504412 BAXI - QUANTUM ECO 32H CIRCULADOR CALEFACCIO RACORDS 1 1/4\" MONOF.", quantity: 1, unitPrice: 1310, discount: 10 },
    { description: "TUC0201827A TMM - M-200 VALVULA ESFERA F-F 1 1/2\" PALANCA BLAVA", quantity: 2, unitPrice: 46.98, discount: 10 },
    { description: "GNB10307 GENEBRE - YORK VALVULA RETENCIO 1 1/2\"", quantity: 1, unitPrice: 28.59, discount: 10 },
    { description: "BAX7841698 BAXI - VALVULA ANTIGEL PER BOMBES DE CALOR MONOBLOC 1.1/2\"", quantity: 1, unitPrice: 242, discount: 10 },
    { description: "DIPOSIT INERCIA", quantity: 1, unitPrice: 0, discount: 10 },
    { description: "SUIDI050X06RG SUICALSA - DIPOSIT INERCIA INOXIDABLE 6BAR DE 500LTS", quantity: 1, unitPrice: 2606, discount: 10 },
    { description: "BAX950053011 BAXI - VASOFLEX VAS EXP. MEM/FIXA CALEFACCIO 80LTS 1BAR", quantity: 1, unitPrice: 267, discount: 10 },
    { description: "BAX195230003 BAXI - PRESCOMANO VALVULA SEGURETAT 3/4\" 3BAR A/MANOMETRE", quantity: 1, unitPrice: 46.9, discount: 10 },
    { description: "TUC0201827A TMM - M-200 VALVULA ESFERA F-F 1 1/2\" PALANCA BLAVA", quantity: 4, unitPrice: 46.98, discount: 10 },
    { description: "DIPOSIT ACS 390lts", quantity: 1, unitPrice: 0, discount: 10 },
    { description: "MITSUBISHI - VAL. 3 VIES 1 1/4 ACS/CALEFACCIO", quantity: 1, unitPrice: 356, discount: 10 },
    { description: "MITSUBISHI - KIT 2 SONDES ACS I INERCIA", quantity: 1, unitPrice: 70, discount: 10 },
    { description: "VSMZ026497 VIESSMANN - INTERACUMULADOR VITOCELL 100-V CVWB 390 L", quantity: 1, unitPrice: 3761, discount: 10 },
    { description: "BAX195200005 BAXI - VASOFLEX/S ACS VAS EXP. MEM/FIXA ACS 25LTS 4BAR", quantity: 1, unitPrice: 158, discount: 10 },
    { description: "BAX195230007 BAXI - FLEXBRANE GRUP SEGURETAT 1\"", quantity: 1, unitPrice: 117, discount: 10 },
    { description: "RECIRCULACIO ACS", quantity: 1, unitPrice: 0, discount: 10 },
    { description: "BAX953035021 BAXI - SB-50XA CIRCULADOR ACS RACORDS 1\" MONOF.", quantity: 1, unitPrice: 554, discount: 10 },
    { description: "TMM0201825A TMM - M-200 VALVULA ESFERA F-F 1\" PALANCA BLAVA", quantity: 2, unitPrice: 20.41, discount: 10 },
    { description: "GNB10305 GENEBRE - YORK VALVULA RETENCIO 1\"", quantity: 1, unitPrice: 12.86, discount: 10 },
    { description: "AQUAFLEX - COLECTOR 5M3/H 5 SORTIDES LONG.2MTS", quantity: 1, unitPrice: 747, discount: 10 },
    { description: "AQUAFLEX - ANCLATGE PARET COLECTOR", quantity: 1, unitPrice: 78, discount: 10 },
    { description: "AQU20355RP8 AQUAFLEX - 20355R-P8 GRUP HIDRAULIC IMPULSIO DIRECTE DN25", quantity: 5, unitPrice: 442, discount: 10 }
];

export default function EditQuotePage() {
    const firestore = useFirestore()
    const { user, isUserLoading } = useUser()
    const { toast } = useToast()
    const router = useRouter()
    const params = useParams()
    const quoteId = params.id as string
    const imageInputRef = useRef<HTMLInputElement>(null);

    const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
    const [projectName, setProjectName] = useState<string>('')
    const [isSaving, setIsSaving] = useState(false)
    const [items, setItems] = useState<QuoteItem[]>([{ description: '', quantity: 1, unitPrice: 0, imageDataUrl: undefined, discount: 0 }]);
    const [labor, setLabor] = useState({ description: "Mà d'obra", cost: 0 });
    const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(null);

    const quoteDocRef = useMemoFirebase(() => (firestore && quoteId ? doc(firestore, 'quotes', quoteId) : null), [firestore, quoteId]);
    const { data: quote, isLoading: isLoadingQuote } = useDoc<QuoteType>(quoteDocRef);
    
    const customersQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'customers'), orderBy('name', 'asc')) : null, [firestore]);
    const { data: customers, isLoading: isLoadingCustomers } = useCollection<Customer>(customersQuery)

    useEffect(() => {
        if (quote) {
            setSelectedCustomerId(quote.customerId || 'all');
            setProjectName(quote.projectName || '');
            setItems(quote.items.map(item => ({
                description: item.description,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                imageDataUrl: item.imageDataUrl,
                discount: item.discount !== undefined ? item.discount : 0
            })) || [{ description: '', quantity: 1, unitPrice: 0, imageDataUrl: undefined, discount: 0 }]);
            setLabor(quote.labor || { description: "Mà d'obra", cost: 0 });
        }
    }, [quote]);

    const associatedCustomer = useMemo(() => {
        if (selectedCustomerId === 'all' || !customers) return undefined;
        return customers.find(c => c.id === selectedCustomerId);
    }, [selectedCustomerId, customers]);

    const handleItemChange = (index: number, field: keyof QuoteItem, value: string | number) => {
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

    const handleLoadPeralbaOffer = () => {
        setItems(PERALBA_ITEMS);
        toast({ title: "Oferta Carregada", description: "Els articles han estat substituïts per l'oferta Peralba amb 10% de descompte." });
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
    
    const handleUpdateQuote = async () => {
        if (!firestore || !quoteDocRef) return;
        setIsSaving(true);
        
        try {
            const filteredItems = items.filter(item => item.description.trim() !== '');
            const materialsSubtotal = filteredItems.reduce((acc, item) => {
                const itemTotal = item.quantity * item.unitPrice;
                const discountAmount = itemTotal * ((item.discount || 0) / 100);
                return acc + (itemTotal - discountAmount);
            }, 0);
            const subtotal = materialsSubtotal + labor.cost;
            const totalAmount = subtotal * (1 + IVA_RATE);

            const updatedQuoteData: Partial<QuoteType> = {
                customerId: associatedCustomer?.id || '',
                customerName: associatedCustomer?.name || 'N/A',
                projectName: projectName || 'Sense nom',
                items: filteredItems,
                labor: labor,
                totalAmount: totalAmount,
            };

            updateDocumentNonBlocking(quoteDocRef, updatedQuoteData);

            toast({
                title: "Pressupost Actualitzat",
                description: `El pressupost #${quote?.quoteNumber} ha estat actualitzat correctament.`,
            });
            
            router.push(`/dashboard/quotes/${quoteId}`);

        } catch (error) {
            console.error("Error updating quote:", error)
            toast({
                variant: 'destructive',
                title: 'Error',
                description: "No s'ha pogut actualitzar o pressuposto.",
            });
        } finally {
            setIsSaving(false);
        }
    };


    const isLoading = isUserLoading || isLoadingCustomers || isLoadingQuote;

    if (isLoading) {
        return <p>Carregant editor de pressupostos...</p>
    }

    if (!quote) {
        return <p>No s'ha trobat el pressupost.</p>
    }

    return (
        <AdminGate pageTitle="Editor de Pressupostos" pageDescription="Aquesta secció està protegida.">
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
                            <CardTitle>Editar Pressupost #{String(quote.quoteNumber).padStart(4, '0')}</CardTitle>
                            <CardDescription>Modifica els detalls del pressupost.</CardDescription>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                            <Button variant="outline" onClick={handleLoadPeralbaOffer}>
                                <FileText className="mr-2 h-4 w-4" /> Carregar Oferta Peralba
                            </Button>
                            <Button variant="ghost" onClick={() => router.back()}>
                                <ArrowLeft className="mr-2 h-4 w-4" /> Tornar
                            </Button>
                        </div>
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

                        <div className="space-y-4 rounded-lg border p-4">
                           <Label className="text-base font-semibold">Articles del Pressupost</Label>
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
                                                value={item.discount !== undefined ? item.discount : 0}
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
                             <Button onClick={handleUpdateQuote} disabled={isSaving}>
                                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                Desar Canvis
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AdminGate>
    )
}
