
'use client'

import { useMemo, useRef, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useCollection, useUser, useFirestore, useMemoFirebase } from '@/firebase'
import { collection, query, orderBy, doc, runTransaction } from 'firebase/firestore'
import type { Customer, Quote as QuoteType } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Briefcase, FileDown, Loader2, Users, Plus, Trash2, ImagePlus, Euro, FileArchive, Save, FileText, LayoutList, Droplets } from 'lucide-react'
import { QuotePreview } from '@/components/QuotePreview'
import { useToast } from '@/hooks/use-toast'
import { AdminGate } from '@/components/AdminGate'
import { IVA_RATE } from '@/lib/calculations'
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates'
import { PERALBA_ITEMS, BUILDING_SUMMARY_ITEMS, HIDROSANITARIA_ITEMS, HIDROSANITARIA_NOTES, DEFAULT_NOTES, type QuoteItem } from '@/lib/peralba-offer'

export default function QuotesPage() {
    const firestore = useFirestore()
    const { user, isUserLoading } = useUser()
    const { toast } = useToast()
    const router = useRouter()
    const imageInputRef = useRef<HTMLInputElement>(null);

    const [selectedCustomerId, setSelectedCustomerId] = useState<string>('all');
    const [projectName, setProjectName] = useState<string>('')
    const [isSaving, setIsSaving] = useState(false)
    const [items, setItems] = useState<QuoteItem[]>([{ description: '', quantity: 1, unitPrice: 0, imageDataUrl: undefined, discount: 0 }]);
    const [labor, setLabor] = useState({ description: "Mà d'obra", cost: 0 });
    const [notes, setNotes] = useState<string>(DEFAULT_NOTES);
    const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(null);

    const customersQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'customers'), orderBy('name', 'asc')) : null, [firestore]);
    const { data: customers, isLoading: isLoadingCustomers } = useCollection<Customer>(customersQuery)

    const associatedCustomer = useMemo(() => {
        if (selectedCustomerId === 'all' || !customers) return undefined;
        return customers.find(c => c.id === selectedCustomerId);
    }, [selectedCustomerId, customers]);

    const safeNum = (v: any): number => {
        if (v === undefined || v === null || v === '') return 0;
        const n = typeof v === 'string' ? parseFloat(v.replace(',', '.')) : Number(v);
        return isNaN(n) ? 0 : n;
    };

    const handleItemChange = (index: number, field: keyof QuoteItem, value: string | number) => {
        const newItems = [...items];
        const item = { ...newItems[index] };
        
        if (field === 'description') {
            item.description = value as string;
        } else {
            const numValue = safeNum(value);
            if (field === 'quantity') item.quantity = numValue;
            if (field === 'unitPrice') item.unitPrice = numValue;
            if (field === 'discount') {
                item.discount = Math.min(Math.max(numValue, 0), 100);
            }
        }
        
        newItems[index] = item;
        setItems(newItems);
    };

    const addItem = () => {
        setItems([...items, { description: '', quantity: 1, unitPrice: 0, imageDataUrl: undefined, discount: 0 }]);
    };

    const removeItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const handleLoadPeralbaOffer = () => {
        setItems([...PERALBA_ITEMS]);
        if (!projectName) setProjectName("Oferta Tèrmic Peralba - Habitatges");
        setNotes(DEFAULT_NOTES);
        toast({ title: "Oferta Carregada", description: "Artigos da Casa C adicionados." });
    };

    const handleLoadBuildingSummary = () => {
        setItems([...BUILDING_SUMMARY_ITEMS]);
        setProjectName("Resum General d'Instal·lacions - Edifici");
        setNotes(DEFAULT_NOTES);
        toast({ title: "Resum Carregat", description: "Resumo de todas as casas e garagem adicionado." });
    };

    const handleLoadHidrosanitaria = () => {
        setItems([...HIDROSANITARIA_ITEMS]);
        setProjectName("Instal·lacions Hidrosanitàries - Edifici");
        setNotes(HIDROSANITARIA_NOTES);
        toast({ title: "Proposta Carregada", description: "Instal·lacions hidrosanitàries adicionades." });
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
    
    const handleSaveQuote = async (exportAfter: boolean) => {
        if (!firestore) return;
        setIsSaving(true);
        
        try {
            const counterRef = doc(firestore, "counters", "quotes");
            const newQuoteNumber = await runTransaction(firestore, async (transaction) => {
                const counterDoc = await transaction.get(counterRef);
                if (!counterDoc.exists()) {
                    transaction.set(counterRef, { lastNumber: 1 });
                    return 1;
                }
                const newNumber = (counterDoc.data().lastNumber || 0) + 1;
                transaction.update(counterRef, { lastNumber: newNumber });
                return newNumber;
            });
            
            const sanitizedItems = items.map(item => ({
                description: item.description || '',
                quantity: safeNum(item.quantity),
                unitPrice: safeNum(item.unitPrice),
                discount: safeNum(item.discount),
                imageDataUrl: item.imageDataUrl || null
            }));

            const filteredItems = sanitizedItems.filter(item => item.description.trim() !== '' || item.unitPrice > 0);

            const materialsSubtotal = filteredItems.reduce((acc, item) => {
                const itemTotal = item.quantity * item.unitPrice;
                const discountAmount = itemTotal * (item.discount / 100);
                return acc + (itemTotal - discountAmount);
            }, 0);
            
            const laborCostValue = safeNum(labor.cost);
            const subtotal = materialsSubtotal + laborCostValue;
            const totalAmount = subtotal * (1 + IVA_RATE);

            const quoteRef = doc(collection(firestore, "quotes"));
            const quoteData: Omit<QuoteType, 'id'> = {
                quoteNumber: newQuoteNumber,
                createdAt: new Date().toISOString(),
                customerId: associatedCustomer?.id || '',
                customerName: associatedCustomer?.name || 'N/A',
                projectName: projectName || 'Sense nom',
                items: filteredItems as any,
                labor: { description: labor.description || "Mà d'obra", cost: laborCostValue },
                totalAmount: isNaN(totalAmount) ? 0 : totalAmount,
                notes: notes,
            };

            setDocumentNonBlocking(quoteRef, { ...quoteData, id: quoteRef.id }, { merge: false });

            toast({
                title: "Pressupost Guardat",
                description: `El pressupost #${newQuoteNumber} ha estat guardat a l'historial.`,
            });
            
            if (exportAfter) {
                router.push(`/dashboard/quotes/${quoteRef.id}?export=true`);
            } else {
                router.push(`/dashboard/quotes/${quoteRef.id}`);
            }

        } catch (error) {
            console.error("Error generating quote:", error)
            toast({
                variant: 'destructive',
                title: 'Error',
                description: "Verifica os dados numéricos e tenta novamente.",
            });
        } finally {
            setIsSaving(false);
        }
    };


    const isLoading = isUserLoading || isLoadingCustomers;

    if (isLoading) {
        return <p>Carregant...</p>
    }

    return (
        <AdminGate pageTitle="Generador de Pressupostos" pageDescription="Aquesta secció està protegida.">
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
                            <CardTitle>Generador de Pressupostos</CardTitle>
                            <CardDescription>Crea um novo orçamento manualmente ou usa os modelos rápidos abaixo.</CardDescription>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                            <Button variant="outline" onClick={handleLoadHidrosanitaria} className="bg-cyan-500/10 text-cyan-700 hover:bg-cyan-500/20">
                                <Droplets className="mr-2 h-4 w-4" /> Hidrosanitària
                            </Button>
                            <Button variant="outline" onClick={handleLoadBuildingSummary} className="bg-blue-500/10 text-blue-700 hover:bg-blue-500/20">
                                <LayoutList className="mr-2 h-4 w-4" /> Resum Edifici
                            </Button>
                            <Button variant="outline" onClick={handleLoadPeralbaOffer} className="bg-primary/10">
                                <FileText className="mr-2 h-4 w-4" /> Oferta Peralba
                            </Button>
                            <Button onClick={() => router.push('/dashboard/quotes/history')} variant="ghost">
                                <FileArchive className="mr-2 h-4 w-4" /> Historial
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
                           <div className="flex justify-between items-center border-b pb-2">
                               <Label className="text-base font-semibold">Artigos do Pressuposto ({items.length})</Label>
                               <Button type="button" variant="ghost" size="sm" onClick={() => setItems([{ description: '', quantity: 1, unitPrice: 0, discount: 0 }])}>Netejar</Button>
                           </div>
                           <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                                {items.map((item, index) => (
                                    <div key={index} className="space-y-2 p-3 rounded-md bg-muted/30 border border-muted-foreground/10">
                                        <div className="flex gap-2 items-start">
                                            <div className="flex-grow space-y-2">
                                                <Input 
                                                    placeholder="Descripció do artigo"
                                                    value={item.description}
                                                    onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                                                    className="bg-background"
                                                />
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                                    <div className="space-y-1">
                                                        <Label className="text-[10px] uppercase text-muted-foreground">Quant.</Label>
                                                        <Input 
                                                            type="number"
                                                            value={item.quantity}
                                                            onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                                                            className="bg-background"
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <Label className="text-[10px] uppercase text-muted-foreground">PVP Unit.</Label>
                                                        <div className="relative">
                                                            <Input
                                                                type="number"
                                                                value={item.unitPrice}
                                                                onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)}
                                                                className="pl-7 bg-background"
                                                            />
                                                            <Euro className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                                                        </div>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <Label className="text-[10px] uppercase text-muted-foreground">Dte %</Label>
                                                        <div className="relative">
                                                            <Input
                                                                type="number"
                                                                value={item.discount}
                                                                onChange={(e) => handleItemChange(index, 'discount', e.target.value)}
                                                                className="pr-7 bg-background"
                                                            />
                                                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-end gap-1">
                                                        <Button type="button" variant="outline" size="icon" onClick={() => handleImageUploadClick(index)} className="h-10 w-10">
                                                            <ImagePlus className="h-4 w-4" />
                                                        </Button>
                                                        <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(index)} className="h-10 w-10 text-destructive">
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        {item.imageDataUrl && <img src={item.imageDataUrl} alt="Preview" className="h-20 w-20 rounded-md object-cover mt-2 border shadow-sm" />}
                                    </div>
                                ))}
                           </div>
                           <Button type="button" variant="outline" onClick={addItem} className="w-full border-dashed">
                               <Plus className="mr-2 h-4 w-4" /> Afegir Artigo Manualmente
                           </Button>
                        </div>
                        
                         <div className="space-y-2">
                            <Label>Mà d'obra</Label>
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
                                        onChange={(e) => setLabor({...labor, cost: safeNum(e.target.value)})}
                                        className="pl-7"
                                     />
                                     <Euro className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                </div>
                            </div>
                         </div>

                         <div className="space-y-2">
                            <Label>Condicions de Pagament i Notes</Label>
                            <Textarea 
                                placeholder="Escriu les condicions de pagament..."
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                rows={4}
                            />
                         </div>

                        <div className="flex justify-end pt-4 gap-2 flex-wrap">
                             <Button onClick={() => handleSaveQuote(false)} disabled={isSaving}>
                                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                Guardar Pressupost
                            </Button>
                            <Button
                                onClick={() => handleSaveQuote(true)}
                                disabled={isSaving}
                                className="bg-accent text-accent-foreground hover:bg-accent/90"
                            >
                                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
                                Guardar i Exportar PDF
                            </Button>
                        </div>
                    </CardContent>
                </Card>
                
                {items.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Previsualització del Pressupost</CardTitle>
                        </CardHeader>
                        <CardContent>
                           <QuotePreview
                             customer={associatedCustomer}
                             projectName={projectName}
                             items={items}
                             labor={labor}
                             notes={notes}
                           />
                        </CardContent>
                    </Card>
                )}
            </div>
        </AdminGate>
    )
}
