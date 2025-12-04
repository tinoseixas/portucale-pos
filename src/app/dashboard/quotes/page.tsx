'use client'

import { useMemo, useRef, useState, useEffect } from 'react'
import { useCollection, useUser, useFirestore, useMemoFirebase } from '@/firebase'
import { collection, query, orderBy } from 'firebase/firestore'
import type { Customer, Employee } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Briefcase, FileDown, Loader2, Users, Plus, Trash2, ImagePlus, Euro } from 'lucide-react'
import { QuotePreview } from '@/components/QuotePreview'
import { useToast } from '@/hooks/use-toast'
import { AdminGate } from '@/components/AdminGate'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

type QuoteItem = {
    description: string;
    quantity: number;
    unitPrice: number;
    imageDataUrl?: string;
}

export default function QuotesPage() {
    const firestore = useFirestore()
    const { user, isUserLoading } = useUser()
    const { toast } = useToast();
    const quoteRef = useRef<HTMLDivElement>(null)
    const imageInputRef = useRef<HTMLInputElement>(null);

    const [selectedCustomerId, setSelectedCustomerId] = useState<string>('all');
    const [projectName, setProjectName] = useState<string>('')
    const [isGenerating, setIsGenerating] = useState(false)
    const [items, setItems] = useState<QuoteItem[]>([{ description: '', quantity: 1, unitPrice: 0, imageDataUrl: undefined }]);
    const [labor, setLabor] = useState({ description: "Mão de obra", cost: 0 });
    const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(null);

    const customersQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'customers'), orderBy('name', 'asc')) : null, [firestore]);
    const { data: customers, isLoading: isLoadingCustomers } = useCollection<Customer>(customersQuery)

    const employeesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'employees')) : null, [firestore]);
    const { data: employees, isLoading: isLoadingEmployees } = useCollection<Employee>(employeesQuery);
    
    const associatedCustomer = useMemo(() => {
        if (selectedCustomerId === 'all' || !customers) return undefined;
        return customers.find(c => c.id === selectedCustomerId);
    }, [selectedCustomerId, customers]);

    // Handlers for quote items
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
            toast({ title: 'A processar imagem...' });
            const reader = new FileReader();
            reader.onload = () => {
                const newItems = [...items];
                newItems[selectedItemIndex].imageDataUrl = reader.result as string;
                setItems(newItems);
                toast({ title: 'Imagem adicionada!' });
            };
            reader.readAsDataURL(file);
          } catch (error) {
            console.error('Error processing image:', error);
            toast({ variant: 'destructive', title: 'Error', description: "Não foi possível processar a imagem." });
          } finally {
            e.target.value = '';
            setSelectedItemIndex(null);
          }
        }
    };

    const handleExportPDF = async () => {
        const quoteElement = quoteRef.current;
        if (!quoteElement) return;

        setIsGenerating(true);
        
        try {
            // Temporarily widen the element to ensure desktop layout is captured
            quoteElement.style.width = '1024px';
            quoteElement.style.maxWidth = 'none';

            const canvas = await html2canvas(quoteElement, {
                scale: 2,
                useCORS: true,
                logging: false,
                windowWidth: 1440
            });
            
            // Restore original styles
            quoteElement.style.width = '';
            quoteElement.style.maxWidth = '';

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4',
            });

            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            
            const imgProps = pdf.getImageProperties(imgData);
            const imgWidth = imgProps.width;
            const imgHeight = imgProps.height;

            const ratio = imgWidth / imgHeight;
            let finalWidth = pdfWidth - 20; 
            let finalHeight = finalWidth / ratio;

            if (finalHeight > pdfHeight - 20) {
                finalHeight = pdfHeight - 20;
                finalWidth = finalHeight * ratio;
            }

            const x = (pdfWidth - finalWidth) / 2;
            const y = 10;

            pdf.addImage(imgData, 'PNG', x, y, finalWidth, finalHeight);
            
            const projectNameStr = projectName || 'Orcamento';
            const customerNameStr = associatedCustomer?.name || 'Cliente';
            const fileName = `Orcamento_${projectNameStr}_${customerNameStr}.pdf`.replace(/ /g, '_');
            pdf.save(fileName);

        } catch (error) {
            console.error("Error generating PDF:", error);
            toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível gerar o PDF.' });
        } finally {
            // Ensure styles are restored even on error
            quoteElement.style.width = '';
            quoteElement.style.maxWidth = '';
            setIsGenerating(false);
        }
    };


    const isLoading = isUserLoading || isLoadingCustomers || isLoadingEmployees;

    if (isLoading) {
        return <p>A carregar...</p>
    }

    return (
        <AdminGate pageTitle="Gerador de Orçamentos" pageDescription="Esta seção está protegida.">
            <div className="space-y-8 max-w-5xl mx-auto">
                <input
                    type="file"
                    ref={imageInputRef}
                    onChange={handleImageFileChange}
                    accept="image/*"
                    className="hidden"
                />
                <Card>
                    <CardHeader>
                        <CardTitle>Gerador de Orçamentos</CardTitle>
                        <CardDescription>Crie um novo orçamento a partir do zero adicionando artigos manualmente.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2"><Users className="h-4 w-4" /> Cliente</Label>
                                <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione um cliente" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Nenhum cliente selecionado</SelectItem>
                                        {customers?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2"><Briefcase className="h-4 w-4" /> Obra</Label>
                                <Input 
                                    placeholder="Nome do projeto ou obra"
                                    value={projectName}
                                    onChange={(e) => setProjectName(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-4 rounded-lg border p-4">
                           <Label className="text-base font-semibold">Artigos do Orçamento</Label>
                           {items.map((item, index) => (
                               <div key={index} className="space-y-2 p-2 border-b">
                                   <Input 
                                       placeholder="Descrição do artigo"
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
                                                placeholder="Preço/Unit."
                                                value={item.unitPrice}
                                                onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)}
                                                className="pl-7"
                                            />
                                            <Euro className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        </div>
                                       <Button type="button" variant="outline" onClick={() => handleImageUploadClick(index)}>
                                           <ImagePlus className="mr-2 h-4 w-4" /> Imagem
                                       </Button>
                                       <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(index)}>
                                           <Trash2 className="h-4 w-4 text-destructive" />
                                       </Button>
                                   </div>
                                   {item.imageDataUrl && <img src={item.imageDataUrl} alt="Preview" className="h-20 w-20 rounded-md object-cover mt-2" />}
                               </div>
                           ))}
                           <Button type="button" variant="outline" onClick={addItem}>
                               <Plus className="mr-2 h-4 w-4" /> Adicionar Artigo
                           </Button>
                        </div>
                        
                         <div className="space-y-2">
                            <Label>Custo da Mão de Obra</Label>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                 <Input 
                                    placeholder="Descrição (ex: Mão de obra)"
                                    value={labor.description}
                                    onChange={(e) => setLabor({...labor, description: e.target.value})}
                                 />
                                <div className="relative">
                                     <Input
                                        type="number"
                                        placeholder="Custo Total"
                                        value={labor.cost}
                                        onChange={(e) => setLabor({...labor, cost: Number(e.target.value) || 0})}
                                        className="pl-7"
                                     />
                                     <Euro className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                </div>
                            </div>
                         </div>


                        <div className="flex justify-end pt-4">
                            <Button
                                onClick={handleExportPDF}
                                disabled={isGenerating}
                            >
                                {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
                                Exportar Orçamento em PDF
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Pré-visualização do Orçamento</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <QuotePreview
                            ref={quoteRef}
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
