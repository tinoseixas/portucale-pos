'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase'
import { collection, query, orderBy, addDoc, doc } from 'firebase/firestore'
import type { Customer, ServiceRecord, Employee } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { FileUp, Loader2, Sparkles, CheckCircle2, AlertCircle, ArrowRight, Building, Briefcase, Calendar as CalendarIcon, FileText } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { AdminGate } from '@/components/AdminGate'
import { extractDataFromDocument, type ExtractedDocumentData } from '@/ai/flows/extract-document-data'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { format, parseISO, isValid } from 'date-fns'

export default function ImportLegacyPage() {
  const { user } = useUser()
  const firestore = useFirestore()
  const router = useRouter()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [isScanning, setIsScanning] = useState(false)
  const [extractedData, setExtractedData] = useState<ExtractedDocumentData | null>(null)
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('none')
  const [isSaving, setIsSaving] = useState(false)

  const customersQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'customers'), orderBy('name', 'asc')) : null, [firestore])
  const { data: customers } = useCollection<Customer>(customersQuery)

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsScanning(true)
    setExtractedData(null)
    toast({ title: "Escanejant document...", description: "L'IA està analitzant el contingut del fitxer." })

    try {
      const reader = new FileReader()
      reader.onload = async () => {
        const dataUri = reader.result as string
        const result = await extractDataFromDocument(dataUri)
        
        if (result) {
          setExtractedData(result)
          // Intentar pre-seleccionar el client si el nom coincideix
          if (result.customerName && customers) {
            const match = customers.find(c => 
              c.name.toLowerCase().includes(result.customerName!.toLowerCase()) ||
              result.customerName!.toLowerCase().includes(c.name.toLowerCase())
            )
            if (match) setSelectedCustomerId(match.id)
          }
          toast({ title: "Escaneig completat", description: "Revisa les dades extretes abans de guardar." })
        } else {
          toast({ variant: "destructive", title: "Error en l'anàlisi", description: "No s'han pogut extreure dades vàlides." })
        }
        setIsScanning(false)
      }
      reader.readAsDataURL(file)
    } catch (err) {
      console.error(err)
      setIsScanning(false)
      toast({ variant: "destructive", title: "Error", description: "No s'ha pogut processar el fitxer." })
    }
  }

  const handleSaveAsRecord = async () => {
    if (!firestore || !user || !extractedData) return
    setIsSaving(true)

    try {
      const customer = customers?.find(c => c.id === selectedCustomerId)
      const now = new Date().toISOString()
      
      const serviceData: Omit<ServiceRecord, 'id'> = {
        employeeId: user.uid,
        employeeName: user.displayName || user.email?.split('@')[0] || 'Tècnic',
        arrivalDateTime: extractedData.date || now,
        departureDateTime: extractedData.date || now,
        description: extractedData.description || "Importat de document antic",
        projectName: extractedData.projectName || "Obra Importada",
        customerId: selectedCustomerId !== 'none' ? selectedCustomerId : '',
        customerName: customer?.name || extractedData.customerName || '',
        serviceHourlyRate: 30,
        media: [],
        albarans: [],
        materials: extractedData.materials || [],
        createdAt: now,
        isLunchSubtracted: true
      }

      const docRef = await addDoc(collection(firestore, `employees/${user.uid}/serviceRecords`), serviceData)
      toast({ title: "Registre creat", description: "S'ha afegit correctament a la base de dades." })
      router.push(`/dashboard/edit/${docRef.id}?ownerId=${user.uid}`)
    } catch (e) {
      toast({ variant: "destructive", title: "Error en desar" })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <AdminGate pageTitle="Scanner de Documents" pageDescription="Converteix documents antics en registres digitals.">
      <div className="max-w-4xl mx-auto space-y-8 pb-20">
        <div className="space-y-1">
          <h1 className="text-4xl font-black uppercase tracking-tight flex items-center gap-3 text-primary">
            <Sparkles className="h-10 w-10 text-accent" /> Scanner IA
          </h1>
          <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest pl-1">Puja fotos o PDFs per registrar-los automàticament.</p>
        </div>

        {!extractedData ? (
          <Card className="border-4 border-dashed border-primary/20 bg-primary/5 rounded-[2.5rem] p-12 text-center space-y-6">
            <div className="bg-white w-24 h-24 rounded-3xl shadow-xl flex items-center justify-center mx-auto">
              {isScanning ? <Loader2 className="h-12 w-12 animate-spin text-primary" /> : <FileUp className="h-12 w-12 text-primary" />}
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black uppercase text-slate-900">{isScanning ? 'Analitzant Document...' : 'Puja el teu document'}</h2>
              <p className="text-slate-500 font-medium">L'IA llegirà el text i crearà el registre per tu.</p>
            </div>
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*,application/pdf" className="hidden" />
            <Button 
              onClick={() => fileInputRef.current?.click()} 
              disabled={isScanning}
              className="bg-primary hover:bg-primary/90 h-16 px-10 text-lg font-black uppercase rounded-2xl shadow-2xl"
            >
              Seleccionar PDF o Foto
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in zoom-in-95 duration-300">
            <div className="lg:col-span-2 space-y-6">
              <Card className="border-none shadow-2xl rounded-3xl overflow-hidden">
                <CardHeader className="bg-slate-900 text-white p-8">
                  <CardTitle className="text-xl font-black uppercase tracking-widest flex items-center gap-2">
                    <CheckCircle2 className="h-6 w-6 text-green-400" /> Dades Detectades
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-8 space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2"><CalendarIcon className="h-3 w-3" /> Data</Label>
                      <p className="font-bold text-lg">{extractedData.date || 'No detectada'}</p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2"><Briefcase className="h-3 w-3" /> Obra / Projecte</Label>
                      <p className="font-bold text-lg uppercase text-primary">{extractedData.projectName || 'General'}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2"><FileText className="h-3 w-3" /> Descripció dels Treballs</Label>
                    <div className="bg-slate-50 p-6 rounded-2xl border-2 border-slate-100 font-medium italic text-slate-700 leading-relaxed">
                      {extractedData.description}
                    </div>
                  </div>

                  {extractedData.materials && extractedData.materials.length > 0 && (
                    <div className="space-y-4">
                      <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Materials Extrets</Label>
                      <div className="space-y-2">
                        {extractedData.materials.map((m, i) => (
                          <div key={i} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border">
                            <span className="font-bold text-sm">{m.description}</span>
                            <span className="font-black text-primary">{m.quantity} x {m.unitPrice}€</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="border-none shadow-2xl bg-accent/10 rounded-3xl p-8 border-2 border-accent/20">
                <CardHeader className="p-0 mb-6">
                  <CardTitle className="text-sm font-black uppercase tracking-[0.2em] text-accent-foreground">Assignació Final</CardTitle>
                </CardHeader>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label className="font-black text-xs uppercase text-slate-500">Confirmar Client</Label>
                    <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                      <SelectTrigger className="h-14 bg-white border-2 rounded-2xl font-bold">
                        <SelectValue placeholder="Selecciona un client" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Cap client assignat</SelectItem>
                        {customers?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {extractedData.customerName && (
                      <p className="text-[10px] font-bold text-amber-600 uppercase mt-1 italic">Detectat: {extractedData.customerName}</p>
                    )}
                  </div>

                  <Button 
                    onClick={handleSaveAsRecord} 
                    disabled={isSaving}
                    className="w-full h-20 bg-accent hover:bg-accent/90 text-accent-foreground font-black uppercase tracking-tighter text-lg rounded-3xl shadow-xl hover:scale-[1.02] transition-all"
                  >
                    {isSaving ? <Loader2 className="animate-spin mr-3 h-6 w-6" /> : <ArrowRight className="mr-3 h-6 w-6" />}
                    Convertir en Registre
                  </Button>

                  <Button variant="ghost" onClick={() => setExtractedData(null)} className="w-full text-slate-400 font-bold uppercase text-[10px] tracking-widest">
                    Cancel·lar i Escanejar un altre
                  </Button>
                </div>
              </Card>

              <div className="bg-slate-900 p-6 rounded-3xl text-white space-y-2 shadow-xl border-4 border-primary/20">
                <div className="flex items-center gap-2 text-primary font-black uppercase text-[10px]">
                  <AlertCircle className="h-4 w-4" /> Consell de l'IA
                </div>
                <p className="text-xs text-slate-400 font-medium leading-relaxed">
                  L'IA és intel·ligent però pot cometre errors en lletra manuscrita difícil. Revisa sempre les quantitats de material abans de guardar.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminGate>
  )
}
