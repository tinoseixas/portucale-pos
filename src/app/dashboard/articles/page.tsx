
'use client'

import { useMemo, useState } from 'react'
import { useCollection, useUser, useFirestore, useMemoFirebase, deleteDocumentNonBlocking } from '@/firebase'
import { collection, query, orderBy, doc, setDoc } from 'firebase/firestore'
import type { Article } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Package, Trash2, Edit, Plus, Search, Loader2, Euro, Save, X } from 'lucide-react'
import { AdminGate } from '@/components/AdminGate'
import { useToast } from '@/hooks/use-toast'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'

export default function ArticlesPage() {
  const { toast } = useToast()
  const { user, isUserLoading } = useUser()
  const firestore = useFirestore()
  const [searchTerm, setSearchTerm] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingArticle, setEditingArticle] = useState<Partial<Article> | null>(null)
  const [isSaving, setIsSaving] = useState(false)

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
        
        toast({ title: editingArticle.id ? "Article actualitzat" : "Article creat" });
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

  if (isUserLoading || isLoadingArticles) return <div className="p-12 text-center h-[60vh] flex flex-col items-center justify-center"><Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" /><p className="mt-4 font-bold text-slate-400">Carregant catàleg...</p></div>

  return (
    <AdminGate pageTitle="Catàleg d'Articles" pageDescription="Gestió de productes i preus mestre.">
      <div className="max-w-5xl mx-auto space-y-8 pb-20">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
            <div className="space-y-1">
                <h1 className="text-3xl font-black tracking-tight text-primary flex items-center gap-3">
                    <Package className="h-8 w-8" /> Catàleg d'articles
                </h1>
                <p className="text-slate-400 font-medium">Llista de materials i preus unitaris per a pressupostos i serveis.</p>
            </div>
            <Button onClick={() => handleOpenDialog()} className="bg-primary hover:bg-primary/90 font-bold h-12 rounded-2xl px-8 shadow-xl">
                <Plus className="mr-2 h-5 w-5" /> Nou article
            </Button>
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

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="rounded-[2.5rem] p-8">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-black">{editingArticle?.id ? 'Editar article' : 'Nou article'}</DialogTitle>
                    <DialogDescription>Aquest article es podrà seleccionar ràpidament als formularis.</DialogDescription>
                </DialogHeader>
                <div className="space-y-6 py-4">
                    <div className="space-y-2">
                        <Label className="font-bold text-xs text-slate-400 pl-1 uppercase">Descripció del material</Label>
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
                    <Button onClick={handleSaveArticle} disabled={isSaving || !editingArticle?.description} className="bg-primary h-12 px-8 rounded-xl font-black">
                        {isSaving ? <Loader2 className="animate-spin h-5 w-5" /> : <Save className="mr-2 h-5 w-5" />}
                        Guardar article
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      </div>
    </AdminGate>
  )
}
