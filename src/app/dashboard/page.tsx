
'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { PlusCircle, Calendar as CalendarIcon, User, Edit, Trash2, Briefcase, Info, ArrowRight } from 'lucide-react'
import type { ServiceRecord, Employee, Albaran } from '@/lib/types'
import { useCollection, useUser, useFirestore, useMemoFirebase, deleteDocumentNonBlocking } from '@/firebase';
import { collection, query, orderBy, getDocs, collectionGroup, doc, where } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardHeader, CardContent, CardDescription, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { format, parseISO, isSameDay, startOfDay } from 'date-fns'
import { ca } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { Checkbox } from "@/components/ui/checkbox"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

const userColors = [
  '#3b82f6', '#ef4444', '#10b981', '#f97316', '#8b5cf6', '#ec4899', '#f59e0b', '#14b8a6'
];

const getUserColor = (userId: string) => {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return userColors[Math.abs(hash) % userColors.length];
};

type ServiceWithRowColor = ServiceRecord & { rowColor: string };

export default function DashboardPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [allServices, setAllServices] = useState<ServiceRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);

  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedProject, setSelectedProject] = useState<string>('all');

  // Consulta de albarans pendentes - Sem restrições de permissão
  const pendingAlbaransQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'albarans'), where('status', '==', 'pendent'));
  }, [firestore, user]);
  
  const { data: pendingAlbarans } = useCollection<Albaran>(pendingAlbaransQuery);

  useEffect(() => {
    if (isUserLoading || !firestore || !user) {
      if (!isUserLoading && !user) setIsLoadingData(false);
      return;
    }
    
    const fetchData = async () => {
        setIsLoadingData(true);
        try {
            const employeeSnapshot = await getDocs(query(collection(firestore, 'employees')));
            const employeesData = employeeSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Employee));
            setEmployees(employeesData);

            const servicesQuery = query(collectionGroup(firestore, 'serviceRecords'), orderBy('arrivalDateTime', 'desc'));
            const serviceSnapshot = await getDocs(servicesQuery);
            const servicesData = serviceSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ServiceRecord));
            setAllServices(servicesData);

        } catch (error) {
            console.error("Erro ao carregar dados:", error);
        } finally {
            setIsLoadingData(false);
        }
    };
    
    fetchData();
  }, [firestore, isUserLoading, user]);
  
  const projectNames = useMemo(() => {
    const names = allServices.map(service => service.projectName).filter(Boolean);
    return [...new Set(names)];
  }, [allServices]);

  const filteredServices = useMemo(() => {
    let filtered = allServices.filter(service => {
        const userMatch = selectedUser === 'all' || service.employeeId === selectedUser;
        const dateMatch = !selectedDate || isSameDay(parseISO(service.arrivalDateTime), selectedDate);
        const projectMatch = selectedProject === 'all' || service.projectName === selectedProject;
        return userMatch && dateMatch && projectMatch;
    });

    const dayColors = ['bg-white', 'bg-slate-50'];
    let currentColorIndex = 0;
    let lastDate: string | null = null;
    
    const colored = filtered.slice().reverse().map(service => {
        const serviceDay = format(startOfDay(parseISO(service.arrivalDateTime)), 'yyyy-MM-dd');
        if (lastDate === null) {
            lastDate = serviceDay;
        } else if (serviceDay !== lastDate) {
            lastDate = serviceDay;
            currentColorIndex = (currentColorIndex + 1) % dayColors.length;
        }
        return {
            ...service,
            rowColor: dayColors[currentColorIndex],
        } as ServiceWithRowColor;
    });
    return colored.reverse();

  }, [allServices, selectedUser, selectedDate, selectedProject]);
  
  const getEmployeeName = (employeeId: string) => {
    const employee = employees.find(e => e.id === employeeId);
    return employee ? `${employee.firstName} ${employee.lastName}` : 'Desconhecido';
  };

  const handleDeleteSelected = () => {
    if (!firestore) return;
    
    selectedRows.forEach(serviceId => {
      const service = allServices.find(s => s.id === serviceId);
      if (service) {
        const docRef = doc(firestore, `employees/${service.employeeId}/serviceRecords`, serviceId);
        deleteDocumentNonBlocking(docRef);
      }
    });

    toast({
      title: `${selectedRows.length} registos eliminados`,
      description: 'Os registos selecionados foram removidos com sucesso.',
    });

    setAllServices(allServices.filter(s => !selectedRows.includes(s.id)));
    setSelectedRows([]);
  };
  
  if (isUserLoading) {
    return (
      <div className="space-y-8 p-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }
  
  if (!user) {
    router.push('/');
    return null;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Resumo de Serviços</h1>
          <p className="text-muted-foreground">Painel de controlo central.</p>
        </div>
        <div className="hidden md:flex items-center gap-2">
            <Button asChild className="bg-accent hover:bg-accent/90 text-accent-foreground">
                <Link href="/dashboard/new">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Novo Serviço
                </Link>
            </Button>
        </div>
      </div>

      {pendingAlbarans && pendingAlbarans.length > 0 && (
        <Alert variant="default" className="bg-primary/5 border-primary/20 text-primary-foreground shadow-sm">
          <Info className="h-5 w-5 text-primary" />
          <AlertTitle className="font-bold text-primary">Albarãs por Facturar</AlertTitle>
          <AlertDescription className="flex items-center justify-between flex-wrap gap-4 mt-2">
            <span className="text-muted-foreground">Existem <strong>{pendingAlbarans.length}</strong> albarãs prontos para serem convertidos em fatura.</span>
            <Button size="sm" variant="outline" className="border-primary text-primary hover:bg-primary/10" asChild>
              <Link href="/dashboard/albarans/pending">
                Ver Lista <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </AlertDescription>
        </Alert>
      )}
      
      {isLoadingData ? (
        <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-40 w-full" />
        </div>
      ) : (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-start flex-wrap gap-4">
                    <div>
                        <CardTitle>Todos os Registos</CardTitle>
                        <CardDescription>Visualize todos os serviços da equipa sem restrições.</CardDescription>
                    </div>
                    {selectedRows.length > 0 && (
                        <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive">
                            <Trash2 className="mr-2 h-4 w-4" /> Eliminar ({selectedRows.length})
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                            <AlertDialogTitle>Confirmar eliminação</AlertDialogTitle>
                            <AlertDialogDescription>Esta ação irá eliminar permanentemente {selectedRows.length} registos.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDeleteSelected} className="bg-destructive">Eliminar</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                        </AlertDialog>
                    )}
                </div>
                <div className="flex flex-col sm:flex-row gap-4 pt-4 flex-wrap">
                    <Select value={selectedUser} onValueChange={setSelectedUser}>
                    <SelectTrigger className="w-full sm:w-[200px]">
                        <User className="mr-2 h-4 w-4" />
                        <SelectValue placeholder="Funcionário" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos os Técnicos</SelectItem>
                        {employees.map(emp => (
                        <SelectItem key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</SelectItem>
                        ))}
                    </SelectContent>
                    </Select>

                    <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full sm:w-[240px] justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedDate ? format(selectedDate, "PPP", { locale: ca }) : <span>Filtrar por data</span>}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                        <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} initialFocus locale={ca} />
                    </PopoverContent>
                    </Popover>

                    <Select value={selectedProject} onValueChange={setSelectedProject}>
                    <SelectTrigger className="w-full sm:w-[200px]">
                        <Briefcase className="mr-2 h-4 w-4" />
                        <SelectValue placeholder="Obra" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todas as Obras</SelectItem>
                        {projectNames.map(name => (
                        <SelectItem key={name} value={name}>{name}</SelectItem>
                        ))}
                    </SelectContent>
                    </Select>
                    
                    {(selectedUser !== 'all' || selectedDate || selectedProject !== 'all') && (
                    <Button variant="ghost" onClick={() => { setSelectedUser('all'); setSelectedDate(undefined); setSelectedProject('all'); }}>
                        Limpar Filtros
                    </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                    <Table>
                    <TableHeader>
                        <TableRow>
                        <TableHead className="w-[40px] px-2">
                            <Checkbox
                                checked={selectedRows.length > 0 && filteredServices.length > 0 && selectedRows.length === filteredServices.length}
                                onCheckedChange={(checked) => setSelectedRows(checked ? filteredServices.map(s => s.id) : [])}
                            />
                        </TableHead>
                        <TableHead className="w-[10px]"></TableHead>
                        <TableHead>Técnico</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Obra</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredServices.length > 0 ? filteredServices.map(service => (
                        <TableRow key={service.id} className={(service as any).rowColor}>
                            <TableCell className="px-2">
                                <Checkbox
                                    checked={selectedRows.includes(service.id)}
                                    onCheckedChange={(checked) => {
                                        setSelectedRows(checked ? [...selectedRows, service.id] : selectedRows.filter(id => id !== service.id));
                                    }}
                                />
                            </TableCell>
                            <TableCell>
                                <div className="h-full w-1 rounded-full" style={{ backgroundColor: getUserColor(service.employeeId), minHeight: '20px' }} />
                            </TableCell>
                            <TableCell className="font-medium">{getEmployeeName(service.employeeId)}</TableCell>
                            <TableCell>{format(parseISO(service.arrivalDateTime), 'dd/MM/yyyy HH:mm')}</TableCell>
                            <TableCell className="max-w-[200px] truncate">{service.projectName}</TableCell>
                            <TableCell className="max-w-[300px] truncate">{service.description}</TableCell>
                            <TableCell className="text-right">
                            <Button variant="outline" size="sm" asChild>
                                <Link href={`/dashboard/edit/${service.id}?ownerId=${service.employeeId}`}>Detalhes</Link>
                            </Button>
                            </TableCell>
                        </TableRow>
                        )) : (
                        <TableRow>
                            <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">Nenhum serviço encontrado.</TableCell>
                        </TableRow>
                        )}
                    </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
      )}
    </div>
  );
}
