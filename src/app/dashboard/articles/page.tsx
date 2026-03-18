'use client'

import { useMemo, useState, useRef } from 'react'
import { useCollection, useUser, useFirestore, useMemoFirebase, deleteDocumentNonBlocking } from '@/firebase'
import { collection, query, orderBy, doc, setDoc, writeBatch } from 'firebase/firestore'
import type { Article } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Package, Trash2, Edit, Plus, Search, Loader2, Euro, Save, FileText, Upload, CheckCircle2, AlertCircle, X, Info } from 'lucide-react'
import { AdminGate } from '@/components/AdminGate'
import { useToast } from '@/hooks/use-toast'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { extractMaterialsFromFile } from '@/ai/flows/extract-materials'

export default function ArticlesPage() {
  const { toast } = useToast()
  const { user, isUserLoading } = useUser()
  const firestore = useFirestore()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [searchTerm, setSearchTerm] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingArticle, setEditingArticle] = useState<Partial<Article> | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // AI Import states
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  const [isProcessingFile, setIsProcessingFile] = useState(false)
  const [extractedItems, setExtractedItems] = useState<{description: string, unitPrice: number, quantity: number}[]>([])

  const articlesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'articles'), orderBy('description', 'asc'));
  }, [firestore])

  const { data: articles, isLoading: isLoadingArticles } = useCollection<Article>(articlesQuery)

  const filteredArticles = useMemo(() => {
    if (!articles) return [];
    return articles.filter(a => 
      a.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [articles, searchTerm]);

  const handleOpenDialog = (article?: Article) => {
    setEditingArticle(article || { description: '', unitPrice: 0 });
    setIsDialogOpen(true);
  }

  const handleSaveArticle = async () => {
    if (!firestore || !editingArticle?.description) return;
    setIsSaving(true);
    try {
        const id = editingArticle.id || doc(collection(firestore, 'articles')).id;
        const docRef = doc(firestore, 'articles', id);
        await setDoc(docRef, {
            ...editingArticle,
            id,
            updatedAt: new Date().toISOString()
        }, { merge: true });
        
        toast({ title: "Article actualitzat" });
        setIsDialogOpen(false);
    } catch (e) {
        toast({ variant: 'destructive', title: "Error al desar" });
    } finally {
        setIsSaving(false);
    }
  }

  const handleDelete = (id: string) => {
    if (!firestore) return;
    deleteDocumentNonBlocking(doc(firestore, 'articles', id));
    toast({ title: "Article eliminat" });
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !firestore) return;

    // Límits de seguretat (Gemini Pro suporta fins a 20MB, deixem 10MB per seguretat del servidor)
    if (file.size > 10 * 1024 * 1024) {
        toast({ variant: 'destructive', title: "Fitxer massa gran", description: "El límit és de 10MB per document." });
        return;
    }

    setIsProcessingFile(true);
    setExtractedItems([]);
    
    toast({ title: "Processant fitxer...", description: "L'IA Pro està analitzant el document." });

    const reader = new FileReader();
    reader.onload = async (evt) => {
        try {
            const base64 = evt.target?.result as string;
            if (!base64) throw new Error("Error al llegir el contingut del fitxer.");

            console.log("Iniciant extracció IA per al fitxer:", file.name);
            const result = await extractMaterialsFromFile({ fileDataUri: base64 });
            
            if (result && result.materials && result.materials.length > 0) {
                setExtractedItems(result.materials);
                toast({ title: "Document llegit", description: `S'han trobat ${result.materials.length} articles.` });
            } else {
                toast({ 
                    variant: 'destructive', 
                    title: "No s'han trobat articles", 
                    description: "Revisa que el document sigui una factura o tiquet amb articles detallats." 
                });
            }
        } catch (err) {
            console.error("Error durant l'extracció:", err);
            toast({ variant: 'destructive', title: "Error de l'IA", description: "No s'ha pogut processar el document. Prova amb una foto més nítida o un PDF menys pesat." });
        } finally {
            setIsProcessingFile(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };
    reader.onerror = () => {
        toast({ variant: 'destructive', title: "Error de lectura local", description: "No s'ha pogut carregar el fitxer des del dispositiu." });
        setIsProcessingFile(false);
    };
    reader.readAsDataURL(file);
  };

  const handleConfirmImport = async () => {
    if (!firestore || extractedItems.length === 0) return;
    setIsSaving(true);
    try {
        const batch = writeBatch(firestore);
        let addedCount = 0;

        for (const item of extractedItems) {
            const desc = item.description.trim();
            if (!desc) continue;

            const artRef = doc(collection(firestore, 'articles'));
            batch.set(artRef, {
                id: artRef.id,
                description: desc,
                unitPrice: item.unitPrice,
                updatedAt: new Date().toISOString()
            });
            addedCount++;
        }

        await batch.commit();
        toast({ title: "Catàleg actualitzat", description: `S'han afegit ${addedCount} articles nous.` });
        setIsImportDialogOpen(false);
        setExtractedItems([]);
    } catch (e) {
        toast({ variant: 'destructive', title: "Error en desar" });
    } finally {
        setIsSaving(false);
    }
  };

  if (isUserLoading || isLoadingArticles) return <div className="p-12 text-center h-[60vh] flex flex-col items-center justify-center"><Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" /><p className="mt-4 font-bold text-slate-400">Carregant catàleg...</p></div>

  return (
    <AdminGate pageTitle="Catàleg d'Articles" pageDescription="Gestió de productes i preus mestre.">
      <div className="max-w-5xl mx-auto space-y-8 pb-20">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
            <div className="space-y-1">
                <h1 className="text-3xl font-black tracking-tight text-primary flex items-center gap-3">
                    <Package className="h-8 w-8" /> Catàleg d'articles
                </h1>
                <p className="text-slate-400 font-medium">Llista de materials i preus unitaris mestre.</p>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
                <Button variant="outline" onClick={() => setIsImportDialogOpen(true)} className="flex-1 sm:flex-none border-2 border-primary text-primary font-bold h-12 rounded-2xl px-6 hover:bg-primary hover:text-white transition-all">
                    <FileText className="mr-2 h-5 w-5" /> Importar PDF/Foto
                </Button>
                <Button onClick={() => handleOpenDialog()} className="flex-1 sm:flex-none bg-primary hover:bg-primary/90 font-bold h-12 rounded-2xl px-8 shadow-xl">
                    <Plus className="mr-2 h-5 w-5" /> Nou article
                </Button>
            </div>
        </div>

        <Card className="border-none shadow-2xl rounded-3xl overflow-hidden bg-white">
            <CardHeader className="bg-slate-50/50 p-6 border-b border-slate-100">
                <div className="relative max-w-md">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input 
                        placeholder="Buscar per descripció..." 
                        value={searchTerm} 
                        onChange={(e) => setSearchTerm(e.target.value)} 
                        className="pl-10 h-12 rounded-xl border-2 font-bold" 
                    />
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50/30">
                                <TableHead className="px-8 py-4 font-black uppercase text-[10px] tracking-widest text-slate-400">Descripció</TableHead>
                                <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-400 w-40">Preu unitari</TableHead>
                                <TableHead className="text-right px-8 font-black uppercase text-[10px] tracking-widest text-slate-400">Accions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredArticles.map(article => (
                                <TableRow key={article.id} className="hover:bg-primary/5 transition-colors border-b border-slate-50">
                                    <TableCell className="px-8 py-4 font-bold text-slate-700">{article.description}</TableCell>
                                    <TableCell className="font-black text-primary text-lg">
                                        {article.unitPrice.toFixed(2)} <span className="text-sm">€</span>
                                    </TableCell>
                                    <TableCell className="text-right px-8">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="outline" size="icon" onClick={() => handleOpenDialog(article)} className="h-9 w-9 border-2 rounded-xl text-primary border-primary/20">
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleDelete(article.id)} className="h-9 w-9 text-red-300 hover:text-red-600 hover:bg-red-50 rounded-xl">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {filteredArticles.length === 0 && (
                                <TableRow><TableCell colSpan={3} className="h-48 text-center text-slate-400 italic">No s'han trobat articles.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>

        {/* Dialog Edició Manual */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="rounded-[2.5rem] p-8">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-black">{editingArticle?.id ? 'Editar article' : 'Nou article'}</DialogTitle>
                    <DialogDescription>Aquest material estarà disponible per a la selecció ràpida.</DialogDescription>
                </DialogHeader>
                <div className="space-y-6 py-4">
                    <div className="space-y-2">
                        <Label className="font-bold text-xs text-slate-400 pl-1 uppercase">Descripció</Label>
                        <Input 
                            value={editingArticle?.description} 
                            onChange={(e) => setEditingArticle(prev => ({...prev, description: e.target.value}))} 
                            placeholder="Ex: Tub multicapa 16mm" 
                            className="h-14 rounded-2xl border-2 font-bold text-lg"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="font-bold text-xs text-slate-400 pl-1 uppercase">Preu unitari (€)</Label>
                        <div className="relative">
                            <Input 
                                type="number" 
                                value={editingArticle?.unitPrice} 
                                onChange={(e) => setEditingArticle(prev => ({...prev, unitPrice: Number(e.target.value)}))} 
                                className="h-14 pl-10 rounded-2xl border-2 font-bold text-lg"
                            />
                            <Euro className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300" />
                        </div>
                    </div>
                </div>
                <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="h-12 rounded-xl font-bold">Cancel·lar</Button>
                    <Button onClick={handleSaveArticle} disabled={isSaving || !editingArticle?.description} className="bg-primary h-12 px-8 rounded-xl font-black text-white">
                        {isSaving ? <Loader2 className="animate-spin h-5 w-5" /> : <Save className="mr-2 h-5 w-5" />}
                        Guardar article
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        {/* Dialog Importació AI */}
        <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
            <DialogContent className="rounded-[2.5rem] p-8 max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-black flex items-center gap-2">
                        <FileText className="h-6 w-6 text-primary" /> Importació avançada
                    </DialogTitle>
                    <DialogDescription>Puja un PDF o una foto per extreure els materials amb IA Pro.</DialogDescription>
                </DialogHeader>
                
                <div className="py-6 space-y-6">
                    {extractedItems.length > 0 ? (
                        <div className="space-y-4">
                            <div className="bg-green-50 border-2 border-green-200 p-4 rounded-2xl flex items-center gap-3">
                                <CheckCircle2 className="h-6 w-6 text-green-600" />
                                <p className="text-green-800 font-bold text-sm">S'han extret {extractedItems.length} articles correctament.</p>
                            </div>
                            <div className="max-h-64 overflow-y-auto border rounded-xl bg-slate-50">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="font-bold text-[10px] uppercase">Descripció</TableHead>
                                            <TableHead className="font-bold text-[10px] uppercase text-right">Unitats</TableHead>
                                            <TableHead className="font-bold text-[10px] uppercase text-right">PVP Net</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {extractedItems.map((item, idx) => (
                                            <TableRow key={idx}>
                                                <TableCell className="text-xs font-medium">{item.description}</TableCell>
                                                <TableCell className="text-xs font-bold text-right text-slate-400">{item.quantity}</TableCell>
                                                <TableCell className="text-xs font-bold text-right text-primary">{item.unitPrice.toFixed(2)} €</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    ) : (
                        <div className="border-4 border-dashed border-primary/20 rounded-[2rem] p-10 text-center space-y-4 bg-primary/5">
                            {isProcessingFile ? (
                                <div className="space-y-4 py-4">
                                    <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
                                    <div className="space-y-1">
                                        <p className="font-black text-primary uppercase tracking-widest text-xs animate-pulse">L'IA Pro està analitzant la factura...</p>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase italic">Això pot trigar fins a 15-20 segons per a documents densos.</p>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <Upload className="h-12 w-12 mx-auto text-primary opacity-50" />
                                    <div className="space-y-1">
                                        <p className="font-black text-slate-600 uppercase text-xs">Selecciona un PDF o Imatge</p>
                                        <p className="text-[10px] text-slate-400 font-bold">Màxim 10MB per arxiu</p>
                                    </div>
                                    <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="application/pdf,image/*" className="hidden" />
                                    <Button onClick={() => fileInputRef.current?.click()} className="bg-primary font-black h-12 px-8 rounded-xl shadow-lg hover:scale-105 transition-transform">
                                        Escollir arxiu
                                    </Button>
                                    <div className="mt-4 flex items-center justify-center gap-2 text-slate-400">
                                        <Info className="h-3 w-3" />
                                        <p className="text-[9px] font-bold uppercase">Consell: Assegura't que les dades de preu són llegibles.</p>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>

                <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={() => { setIsImportDialogOpen(false); setExtractedItems([]); }} className="h-12 rounded-xl font-bold">Tancar</Button>
                    {extractedItems.length > 0 && (
                        <Button onClick={handleConfirmImport} disabled={isSaving} className="bg-primary h-12 px-8 rounded-xl font-black text-white shadow-xl">
                            {isSaving ? <Loader2 className="animate-spin h-5 w-5 mr-2" /> : <Save className="mr-2 h-5 w-5" />}
                            Afegir al catàleg
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
      </div>
    </AdminGate>
  )
}
