
'use client'

import { useState, useRef, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { useDoc, useUser, useFirestore, useMemoFirebase, useCollection, updateDocumentNonBlocking } from '@/firebase'
import { collection, query, getDocs, doc, collectionGroup, getDoc } from 'firebase/firestore'
import type { Customer, ServiceRecord, Albaran, Employee } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FileDown, Loader2, ArrowLeft, Briefcase, Mail, Send, Edit } from 'lucide-react'
import { ReportPreview } from '@/components/ReportPreview'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useToast } from '@/hooks/use-toast'
import { AdminGate } from '@/components/AdminGate'
import { Badge } from '@/components/ui/badge'
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { sendDocumentEmail } from '@/ai/flows/send-email'

function AlbaranDetailContent() {
    const firestore = useFirestore()
    const router = useRouter()
    const params = useParams()
    const searchParams = useSearchParams()
    const { toast } = useToast()
    const albaranId = params.id as string

    const { user, isUserLoading } = useUser()
    const [isGenerating, setIsGenerating] = useState(false)
    const reportRef = useRef<HTMLDivElement>(null)
    const [services, setServices] = useState<ServiceRecord[]>([])
    const [customer, setCustomer] = useState<Customer | undefined>()
    const [isLoadingData, setIsLoadingData] = useState(false)
    const [hasLoaded, setHasLoaded] = useState(false)
    
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
    const [editProjectName, setEditProjectName] = useState('')

    // Email states
    const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false)
    const [recipientEmail, setRecipientEmail] = useState('')
    const [isSendingEmail, setIsSendingEmail] = useState(false)

    const albaranDocRef = useMemoFirebase(() => firestore && albaranId ? doc(firestore, 'albarans', albaranId) : null, [firestore, albaranId])
    const { data: albaran, isLoading: isLoadingAlbaran } = useDoc<Albaran>(albaranDocRef)

    const employeeDocRef = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return doc(firestore, 'employees', user.uid);
    }, [firestore, user]);
    const { data: currentEmployee } = useDoc<Employee>(employeeDocRef);

    const employeesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'employees')) : null, [firestore]);
    const { data: employees } = useCollection<Employee>(employeesQuery);
    
    const shouldExport = searchParams.get('export') === 'true';

    useEffect(() => {
        if (albaran) {
            setEditProjectName(albaran.projectName);
        }
    }, [albaran]);

    const fetchData = useCallback(async () => {
        if (!firestore || !albaran || !employees || currentEmployee === undefined || hasLoaded) return

        setIsLoadingData(true)
        
        try {
            if (albaran.customerId) {
                const customerSnap = await getDoc(doc(firestore, 'customers', albaran.customerId));
                if (customerSnap.exists()) {
                    const cData = { id: customerSnap.id, ...customerSnap.data() } as Customer;
                    setCustomer(cData)
                    if (cData.email) setRecipientEmail(cData.email);
                }
            }
            
            if (albaran.serviceRecordIds && albaran.serviceRecordIds.length > 0) {
                const servicesSnapshot = await getDocs(collectionGroup(firestore, 'serviceRecords'));
                const fetchedServices = servicesSnapshot.docs
                    .map(doc => ({ id: doc.id, ...doc.data() } as ServiceRecord))
                    .filter(s => albaran.serviceRecordIds.includes(s.id))
                    .map(serviceData => {
                        const employee = employees.find(e => e.id === serviceData.employeeId);
                        if (employee) {
                            serviceData.employeeName = `${employee.firstName} ${employee.lastName}`;
                        }
                        return serviceData;
                    });
                setServices(fetchedServices);
            }
            setHasLoaded(true);
        } catch (e) {
            console.error("Error carregant dades:", e);
            toast({ variant: 'destructive', title: 'Error', description: 'No s\'han pogut carregar els detalls de l\'albarà.' });
        } finally {
            setIsLoadingData(false)
        }
    }, [albaran, firestore, employees, user, currentEmployee, toast, hasLoaded]);

    useEffect(() => {
        if (albaran && employees && currentEmployee !== undefined && !hasLoaded) fetchData();
    }, [albaran, employees, currentEmployee, fetchData, hasLoaded]);

    const generatePDF = async () => {
        const reportElement = reportRef.current;
        if (!reportElement) return null;

        // Capturar a 794px d'amplada exacta per a proporció A4 @ 96dpi
        const canvas = await html2canvas(reportElement, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff',
            width: 794, 
            windowWidth: 800
        });
        
        const imgData = canvas.toDataURL('image/jpeg', 0.95); 
        const pdf = new jsPDF('p', 'mm', 'a4', true);
        
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const imgWidth = pdfWidth;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        let heightLeft = imgHeight;
        let position = 0;

        // Primera pàgina
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
        heightLeft -= pdfHeight;

        // Pàgines addicionals
        while (heightLeft > 0) {
            position = heightLeft - imgHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
            heightLeft -= pdfHeight;
        }
        
        return pdf;
    };

    const handleExportPDF = async () => {
        setIsGenerating(true);
        toast({ title: 'Generant Albarà...', description: 'Ajustant pàgines i títols.' });
        try {
            const pdf = await generatePDF();
            if (pdf) {
                pdf.save(`Albara-${albaran?.albaranNumber}-${albaran?.projectName.replace(/\s+/g, '-')}.pdf`);
                toast({ title: 'Document llest!' });
            }
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error PDF' });
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSendEmail = async () => {
        if (!recipientEmail.trim() || !recipientEmail.includes('@')) {
            toast({ variant: 'destructive', title: 'E-mail invàlid' });
            return;
        }
        setIsSendingEmail(true);
        try {
            const pdf = await generatePDF();
            if (!pdf) throw new Error("No s'ha pogut generar el PDF");
            const pdfBase64 = pdf.output('datauristring');
            const result = await sendDocumentEmail({
                to: recipientEmail.trim(),
                subject: `Albarà TS Serveis: ${albaran?.projectName}`,
                html: `<div style="font-family: sans-serif;"><h2>Bon dia,</h2><p>Adjuntem l'albarà corresponent als treballs de: <strong>${albaran?.projectName}</strong>.</p><p>Gràcies per la seva confiança.</p><br/><p><strong>TS Serveis</strong></p></div>`,
                attachments: [{ filename: `Albara-${albaran?.albaranNumber}.pdf`, content: pdfBase64 }]
            });
            if (result.success) {
                toast({ title: 'Enviat correctament!' });
                setIsEmailDialogOpen(false);
            } else {
                toast({ variant: 'destructive', title: 'Error enviament', description: result.error });
            }
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error' });
        } finally {
            setIsSendingEmail(false);
        }
    };
    
    if (isUserLoading || isLoadingAlbaran || currentEmployee === undefined || (isLoadingData && !hasLoaded)) {
        return <div className="text-center p-12 h-[60vh] flex flex-col items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /><p className="mt-4 font-black uppercase tracking-widest text-slate-400">Preparant Albarà...</p></div>
    }
    
    return (
        <AdminGate pageTitle="Detall de l'Albarà" pageDescription="Control de treballs agrupats.">
            <div className="space-y-8 max-w-5xl mx-auto pb-20">
                <div className="flex justify-between items-center flex-wrap gap-4">
                    <Button variant="ghost" onClick={() => router.push('/dashboard/albarans')} className="font-bold uppercase text-xs">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Enrere
                    </Button>
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                            <DialogTrigger asChild><Button variant="outline" className="font-bold h-12 rounded-xl border-2"><Edit className="mr-2 h-4 w-4" /> Editar títol</Button></DialogTrigger>
                            <DialogContent className="rounded-3xl">
                                <DialogHeader><DialogTitle>Renomenar projecte</DialogTitle></DialogHeader>
                                <div className="py-4 space-y-2">
                                    <Label>Nom de l'obra</Label>
                                    <Input value={editProjectName} onChange={(e) => setEditProjectName(e.target.value)} className="h-12 rounded-xl font-bold" />
                                </div>
                                <DialogFooter><Button onClick={() => { updateDocumentNonBlocking(albaranDocRef!, { projectName: editProjectName }); setIsEditDialogOpen(false); toast({ title: 'Actualitzat' }); }} className="bg-primary font-bold h-12 px-8">Guardar</Button></DialogFooter>
                            </DialogContent>
                        </Dialog>

                        <Dialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
                            <DialogTrigger asChild><Button variant="outline" className="font-bold h-12 rounded-xl border-2 text-primary border-primary/20"><Mail className="mr-2 h-4 w-4" /> Enviar PDF</Button></DialogTrigger>
                            <DialogContent className="rounded-3xl">
                                <DialogHeader><DialogTitle>Enviar per correu</DialogTitle></DialogHeader>
                                <div className="py-4 space-y-4">
                                    <Label>E-mail del client</Label>
                                    <Input type="email" value={recipientEmail} onChange={(e) => setRecipientEmail(e.target.value)} className="h-12 rounded-xl font-bold" />
                                </div>
                                <DialogFooter><Button onClick={handleSendEmail} disabled={isSendingEmail} className="bg-primary font-bold h-12 w-full">{isSendingEmail ? <Loader2 className="animate-spin mr-2" /> : <Send className="mr-2 h-4 w-4" />} Enviar ara</Button></DialogFooter>
                            </DialogContent>
                        </Dialog>

                        <Button onClick={handleExportPDF} disabled={isGenerating} className="bg-slate-900 h-12 px-8 rounded-xl font-black uppercase text-xs text-white shadow-xl">
                            {isGenerating ? <Loader2 className="animate-spin mr-2" /> : <FileDown className="mr-2 h-4 w-4" />} Exportar PDF
                        </Button>
                    </div>
                </div>
                
                <Card className="shadow-2xl border-none rounded-[2rem] overflow-hidden">
                    <CardHeader className="bg-slate-900 text-white p-8">
                        <div className="flex justify-between items-start">
                            <div>
                                <CardTitle className="text-3xl font-black uppercase tracking-tight flex items-center gap-3">
                                    <Briefcase className="h-8 w-8 text-primary" />
                                    Albarà #{String(albaran?.albaranNumber).padStart(4, '0')}
                                </CardTitle>
                                <CardDescription className="text-slate-400 font-medium mt-1 uppercase text-xs tracking-widest">{albaran?.projectName}</CardDescription>
                            </div>
                            <Badge className="bg-primary text-white font-black uppercase px-4 py-1">{albaran?.status}</Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0 bg-slate-100 flex justify-center py-10">
                        <div className="shadow-2xl bg-white">
                            <ReportPreview
                                ref={reportRef}
                                customer={customer}
                                projectName={albaran?.projectName || ''}
                                services={services}
                                showPricing={true}
                                albaranNumber={albaran?.albaranNumber}
                                employees={employees || []}
                            />
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AdminGate>
    )
}

export default function AlbaranDetailPage() {
    return (
        <Suspense fallback={<div className="text-center p-12 h-[60vh] flex flex-col items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /><p className="mt-4 font-black uppercase tracking-widest text-slate-400">Carregant...</p></div>}>
            <AlbaranDetailContent />
        </Suspense>
    )
}
