'use client'

import { useMemo, useRef, useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useCollection, useUser, useFirestore, useMemoFirebase, useDoc } from '@/firebase'
import { collection, query, orderBy, doc, updateDoc } from 'firebase/firestore'
import type { Customer, Quote as QuoteType } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Briefcase, FileArchive, Loader2, Users, Plus, Trash2, ImagePlus, Euro, Save, ArrowLeft } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { AdminGate } from '@/components/AdminGate'
import { IVA_RATE } from '@/lib/calculations'
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates'

type QuoteItem = {
    description: string;
    quantity: number;
    unitPrice: number;
    imageDataUrl?: string;
}

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
    const [items, setItems] = useState<QuoteItem[]>([{ description: '', quantity: 1, unitPrice: 0, imageDataUrl: undefined }]);
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
            setItems(quote.items || [{ description: '', quantity: 1, unitPrice: 0, imageDataUrl: undefined }]);
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
            if (!isNaN(numValue) && numValue >= 0) {
                if (field === 'quantity') item.quantity = numValue;
                if (field === 'unitPrice') item.unitPrice = numValue;
            }
        }
        setItems(newItems);
    };

    const addItem = () => {
        setItems([...items, { description: '', quantity: 1, unitPrice: 0, imageDataUrl: undefined }]);
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
    
    const handleUpdateQuote = async () => {
        if (!firestore || !quoteDocRef) return;
        setIsSaving(true);
        
        try {
            const filteredItems = items.filter(item => item.description.trim() !== '');
            const materialsSubtotal = filteredItems.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
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

            await updateDoc(quoteDocRef, updatedQuoteData);

            toast({
                title: "Pressupost Actualitzat",
                description: `El pressupost #${quote?.quoteNumber} ha estat actualitzat.`,
            });
            
            router.push(`/dashboard/quotes/${quoteId}`);

        } catch (error) {
            console.error("Error updating quote:", error)
            toast({
                variant: 'destructive',
                title: 'Error',
                description: "No s'ha pogut actualitzar el pressupost.",
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
                         <Button variant="ghost" onClick={() => router.back()}>
                            <ArrowLeft className="mr-2 h-4 w-4" /> Tornar
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
                                   <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
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
