'use client'

import { useMemo, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useCollection, useUser, useFirestore, useMemoFirebase, deleteDocumentNonBlocking } from '@/firebase'
import { collection, query, addDoc, doc, writeBatch, orderBy } from 'firebase/firestore'
import type { Customer } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Edit, Trash2, PlusCircle, Building, Mail, Phone, Hash, Upload } from 'lucide-react'
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
import { useToast } from '@/hooks/use-toast'
import { AdminGate } from '@/components/AdminGate'

// Dades de client de mostra per importar, agora ordenadas alfabeticamente.
const mockCustomers: Omit<Customer, 'id'>[] = [
  { name: 'Adiel Serveis', nrt: 'F333016-C', address: 'Cami de engolasters 2', email: '', contact: '' },
  { name: 'ADVOCADA EVA LOPEZ HERRERO', nrt: 'F-216873-R', address: 'C/LES CANALS N°5 1°18', email: '', contact: '' },
  { name: 'Albertina Almeida', nrt: 'F-173750-T', address: 'Avinguda Joan Marti nº44', email: '', contact: '' },
  { name: 'Àlex Terés', nrt: '', address: 'Pleta d’Ordino 38A', email: '', contact: '390500' },
  { name: 'Alimentària UNIÓ la verema', nrt: 'L-706700-X', address: 'AV. SALOU, 54 LOCAL 8', email: 'administracio@alimentariaunio.com', contact: '' },
  { name: 'Alona Yan', nrt: 'F311495x', address: 'Escaldes', email: '', contact: '' },
  { name: 'Amtrade SL', nrt: 'L713046a', address: 'Escaldes', email: '', contact: '' },
  { name: 'AndBnB S.L', nrt: 'L716427', address: 'Cortals ,Piso Font del Ferro, -3 5', email: '', contact: '' },
  { name: 'Andre Andre', nrt: '', address: 'Cal diumenge 56', email: '', contact: '' },
  { name: 'Art i Ofici', nrt: 'F-091192-C', address: 'Carrer Esteve Dolsa 10-12 4rtB', email: '', contact: '' },
  { name: 'BDR Informàtica i Comunicacions. SLU', nrt: 'L-707599-R', address: 'BDR Informàtica i Comunicacions. SLU', email: 'tbenjumea@bdrinformatica.com', contact: '' },
  { name: 'Belem Encamp', nrt: '', address: 'Encamp', email: '', contact: '372209' },
  { name: 'Blue&Blue, slu', nrt: 'L-703322-J', address: 'antic cami ral, 22 Baixos Andorra la Vella Andorra', email: 'welcomebluemoreblue@gmail.com', contact: '' },
  { name: 'Carlos Bala', nrt: '', address: 'Carretera de les Riberigues 16 5', email: '', contact: '' },
  { name: 'Carolina Cerqueda Santacreu', nrt: '', address: 'Ctra. De la Peguera s/n, residencial la Corruga B5', email: '', contact: '+376 340 007' },
  { name: 'Carracedo', nrt: '', address: 'Avinguda Fiter y Rossell,70 1er 2a', email: 'info@carracedo-and.com', contact: '' },
  { name: 'Celso Garcia', nrt: '', address: 'Encamp', email: '', contact: '' },
  { name: 'Centre Tao', nrt: '042739 S', address: 'C/ Ciutat de Consuegra,10,1er2ona', email: '', contact: '' },
  { name: 'Certes Ventures SLU', nrt: 'B25851882', address: 'Ctra. d’Argolell núm. 1', email: 'mvilaporte@gmail.com,eduard.sanchez@nomadingcamp.com', contact: '' },
  { name: 'Cliente', nrt: '', address: '', email: '', contact: '' },
  { name: 'Cliente Sergio -Llorts 324656', nrt: '', address: 'Andorra', email: '', contact: '' },
  { name: 'Clínica dental Diet Kahn', nrt: 'C802450z', address: 'Carrer Josep Rossel Calva 13', email: 'Clinicadietkahn@andorra.ad', contact: '803020' },
  { name: 'Comunicacio i Televisors SLU', nrt: 'L704166D', address: 'Camí de la Grau 20', email: 'i.buezas@comtv.ad', contact: '' },
  { name: 'construcciones Andre de Sousa SL', nrt: 'B25804410', address: 'La seu', email: 'obra@andredesousa.eu', contact: '' },
  { name: 'Construluso, SLU', nrt: 'L-717525-K', address: 'Carrer Sant Miquel No. 2 baixos', email: 'construccionesluso2020@gmail.com', contact: '' },
  { name: 'Dirgest', nrt: 'L711805D', address: 'Carre Bonaventura Riberaigua, 25, 5 B', email: 'amorchon@dirgest.eu', contact: '' },
  { name: 'Efhys Factory Service', nrt: 'F255528V', address: 'Carrer dels Barrers Nau Espot Nave 3', email: '', contact: '' },
  { name: 'EKD, S.L.', nrt: 'L-718623-K', address: 'Av. Consell de la Terra, núm. 10 local comercial núm. 1', email: 'administracio@ekdandorra.com', contact: '' },
  { name: 'EVA BRANCA VALE DA SERRA SEIXAS', nrt: '', address: 'CARRER DE LOS CORTALS', email: 'evaseixas35@gmail.com', contact: '615590' },
  { name: 'Expo-Mobil SLU', nrt: 'L700265J', address: 'Prada motxilla 4 baixos', email: 'joan@kars.ad,info@kars.ad', contact: '' },
  { name: 'Eyidi Ndoumbè', nrt: '', address: 'Avinguda de Rouillac n°3, segundo ,1r puerta', email: '', contact: '' },
  { name: 'Familia Mesas Andorra la Vella', nrt: '', address: 'Andorra', email: '', contact: '' },
  { name: 'Farmacia el Cedre', nrt: '', address: 'Av. d*Enclar 32', email: '', contact: '623383' },
  { name: 'Felix-La Massana', nrt: '', address: 'Andorra', email: '', contact: '' },
  { name: 'Finques del Pirineu', nrt: '', address: 'C/ Ciutat Consuegra, 10-12 Edifici Orió , 2n 3a', email: 'comptafinques@andorra.ad', contact: '820554' },
  { name: 'Gaiä Health Center', nrt: 'C-802650-C', address: 'Av Carlemany N67 4rta Planta 2nd puerta', email: '', contact: '' },
  { name: 'Granja PACIFIC” de l’Edifici GILTOR', nrt: '', address: 'Av. del Pessebre, núm. 34-36', email: '', contact: '' },
  { name: 'Guillem Malbec', nrt: '', address: 'Andorra', email: '', contact: '' },
  { name: 'GUIRO PATRIMONIA, SLU', nrt: 'L-718454-N', address: 'AV. DR. MITJAVILA, 13 (2-1)', email: 'guiropatrimonia@gmail.com', contact: '' },
  { name: 'HGE - Hidráulica, Gás e Energia, S.A.', nrt: '509216889', address: 'Rua do Vinagreiro, no 206', email: 'americomartins@hge.solutions', contact: '' },
  { name: 'Hotel Mila', nrt: 'L-701621-K', address: 'Ctra.dels Cortals', email: '', contact: '' },
  { name: 'Hotel Ransol-serveis la coma', nrt: 'L-704530-J', address: 'Els Plans n´29', email: 'direcciohotelransol@gruppirot.com', contact: '' },
  { name: 'Hotelers RM SL.', nrt: 'L-712224-A', address: 'Urbanitzacio ribagrossa, 13', email: 'evaseixas35@gmail.com', contact: '' },
  { name: 'I.M.R. IVÁN MORANTE PROJECTES, S.L.U', nrt: 'L-713671-Y', address: 'Plaça Coprínceps 1, Despatx 3 - 4', email: 'imr@andorra.ad', contact: '800899' },
  { name: 'Indif', nrt: '', address: 'Andorra', email: '', contact: '' },
  { name: 'Intra groupe Facilities, SLU', nrt: 'F720404F', address: 'Carrer Can Diumenge, 43', email: 'ana.ximeno@intra-groupe.com', contact: '' },
  { name: 'Ivan Fernandez Garceran', nrt: '', address: 'Passeig de l’Arnaldeta de Caboet, 1-A Edifici Santure II', email: 'ifgandorra@outlook.com', contact: '+376 333430' },
  { name: 'Joan Armengol Armengol', nrt: 'F-001395-F', address: 'Urb. Rutllan 26', email: '', contact: '' },
  { name: 'JOAN SALA GÓMEZ', nrt: '006894-W', address: 'Prat de la Creu , 16 Escala Canòlich 1-4', email: '', contact: '' },
  { name: 'Joao Vitor Marracho Rodrigues', nrt: 'L-718454-N', address: 'Av.Dr.Mitjavila 13 2-1 Edifici Montnegre', email: 'guiropatrimonia@gmail.com', contact: '' },
  { name: 'Jordi Pérez Miquel Pérez', nrt: '', address: 'Avinguda francois Mitterrand 66 1-1', email: '', contact: '' },
  { name: 'Jordi Sansa', nrt: '', address: 'Av. Meritxell, 42 4t', email: 'jordicoletes@gmail.com', contact: '326013' },
  { name: 'JORGE CASTELLS TEIXIDO', nrt: '', address: 'Andorra la Vella', email: '', contact: '' },
  { name: 'Josep Baro', nrt: '', address: 'S.Julian', email: '', contact: '332650' },
  { name: 'Josep Garcia Fernandez', nrt: 'F-012972-X', address: 'Carretera General d’Escàs, Xalet Daniela, 57', email: 'info@carracedo-and.com', contact: '' },
  { name: 'Jphb estudis de contruccio, Slu', nrt: 'L-714982J', address: 'Avinguda Joan Marti 104 Bloco B 5E Porta 12', email: 'jphb@andorra.ad', contact: '' },
  { name: 'KARS SL', nrt: 'L707959-D', address: 'Baixada del Moli 39 Prada Motxilla 2', email: 'joan@kars.ad,info@kars.ad', contact: '' },
  { name: 'L,Obaga Blanca S.l.', nrt: 'L-706236-C', address: 'Carretera del Forn 10', email: 'info@obagablanca.com', contact: '' },
  { name: 'Life Booster s.l (La cúpula)', nrt: 'L-716917-V', address: 'C/ Esteve Dolsa Pujal n48', email: 'lacupulaandorra@gmail.com', contact: '00376640093' },
  { name: 'Llosats d envalira sl', nrt: 'L-715673-N', address: 'C/ del Mirador núm. 16 Edif. Anyò, Pis PB, Local núm. 1', email: '', contact: '' },
  { name: 'Ludovic Albos', nrt: 'F036037n', address: 'Casa Toni 7', email: '', contact: '' },
  { name: 'Luso Shopping', nrt: 'L708167M', address: 'Andorra', email: '', contact: '' },
  { name: 'M Madalena Machado Ramos', nrt: 'F-149413-G', address: 'Carrer Passatge de La Arena 5 EDF Perot Esc A 2-2', email: '', contact: '' },
  { name: 'MANTENIMENTS PRESTIGI', nrt: 'F207443U', address: 'C/ JOAN MARTI Nº106 1º 3', email: 'Mantenimentsprestigi@gmail.com', contact: '' },
  { name: 'Maria Bacardi', nrt: '', address: 'Ctra. Prats, 43, 2o 2a', email: 'bacardimaria@gmail.com', contact: '' },
  { name: 'Marina Ubach Filba', nrt: '', address: 'Escaldes Engordany', email: '', contact: '' },
  { name: 'Mascotes CF SLU', nrt: 'L712669V', address: 'Av.Pricep Benlloch 30 Local1', email: 'andorra@bymascota.com', contact: '' },
  { name: 'Mesas Trigo sl', nrt: '', address: 'Avinguda Meritxell, 75 3ª planta despatx 8-10 Edifici Quars', email: 'eva.seixas@mesastrigo.com,c.mesas@mesastrigo.com', contact: '887007' },
  { name: 'Milgauss capital ASF, SA', nrt: 'A 718250 P', address: 'Escaldes-Engordany', email: 'info@milgausscapital.com', contact: '' },
  { name: 'Monsalon', nrt: 'L719466F', address: 'PLAÇA COPRINCEPS 001 4 DESPATX7', email: '', contact: '' },
  { name: 'Navàs design,NAVAS CECILIA, PATRICIA', nrt: 'F056394g', address: 'C. ROUREDA DE SANSA 015 3 1', email: '', contact: '' },
  { name: 'Oak More Holding Slu', nrt: 'L719572K', address: 'Av.de Sant Antoni 69 3 1', email: 'jserna.borja@gmail.com', contact: '' },
  { name: 'Orlando José Ferreira Nunes', nrt: 'F281056Y', address: 'Avinguda Françoise Mitterrand 66 1-2', email: '', contact: '' },
  { name: 'Parador de canolich S.L', nrt: 'L-706073-W', address: 'Parador de canolich s/n', email: 'canolich@hotelparadordecanolich.com', contact: '' },
  { name: 'Patricia Navas Cecilia', nrt: '', address: 'Carrer Roureda de Sansa n.15 3.1', email: '', contact: '+376360867' },
  { name: 'PERICAPITAL, S.L', nrt: '714302-M', address: 'Les Bons, C. Ciutat Pubilla, 25', email: '', contact: '' },
  { name: 'Pol Fortunity Fillo', nrt: '', address: 'Ordino', email: '', contact: '' },
  { name: 'Policlinica Dental Roge', nrt: 'L144354s', address: 'Av.Rocaford 30', email: 'recepcio@dentalroge.com', contact: '844500' },
  { name: 'Rafa Vilella', nrt: '', address: 'Andorra', email: '', contact: '' },
  { name: 'Regina Alexandra Bento Chaves', nrt: '', address: 'Residencial camp de perot bloc L 2-2', email: '', contact: '' },
  { name: 'Reina Tunes SL', nrt: '', address: 'Pas la casa', email: '', contact: '' },
  { name: 'Residència Clara Rabassa', nrt: 'U-126 896-N', address: 'Avda. Princep Benlloch, 26-30', email: 'direccio@clararabassa.com', contact: '805960' },
  { name: 'Roberto Bautista Agut', nrt: '394975C', address: 'Avinguda del Fener 12,6 1A', email: 'aboditortosa@gmail.com', contact: '0034650396501' },
  { name: 'Rut de los sabores', nrt: '', address: 'Andorra', email: '', contact: '' },
  { name: 'Santiago García cortes', nrt: '', address: 'Avenida Françua miterrand Num : 68 porta 202 -1', email: '', contact: '' },
  { name: 'Sílvia Cristina Teixeira Cachurreiro Costa', nrt: '275275T', address: 'Av.Joan Marti Edifici la Molina n’72 74 bloco b 3’1', email: '', contact: '' },
  { name: 'Soraya', nrt: '', address: 'Escaldes', email: '', contact: '365883' },
  { name: 'TB Trial Team SLU', nrt: 'L710399T', address: 'Urb. els Oriosos 32B', email: '', contact: '' },
  { name: 'Termic Peralba-Pedidos', nrt: '', address: 'Andorra', email: '', contact: '' },
  { name: 'The Lodge At Ribasol', nrt: 'L-713202P', address: 'Ctra.D,Arinsal n´5 Edificio Ribasol Park Bloc 8 Planta 0 Porta 1', email: 'direccio@thelodgearinsal.com,joao_esmifro@hotmail.com', contact: '' },
  { name: 'Tom Pidcock', nrt: '', address: 'canillo', email: '', contact: '' },
  { name: 'Undergroud Bar', nrt: '', address: 'Pas de la casa', email: '', contact: '' },
  { name: 'VILADOMAT, SAU', nrt: 'A-700966-G', address: 'Carrer Roureda de Sansa, 10', email: 'immasopena@viladomat.com', contact: '' },
  { name: 'WW REAL ESTATE SL', nrt: 'L716982b', address: 'c. de l\'aigüeta 22, 1', email: '', contact: '' }
].sort((a, b) => a.name.localeCompare(b.name, 'ca', { sensitivity: 'base' }));


export default function CustomersPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { user, isUserLoading } = useUser()
  const firestore = useFirestore()
  const [isImporting, setIsImporting] = useState(false)

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/');
    }
  }, [isUserLoading, user, router]);

  const customersQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'customers'), orderBy('name', 'asc'));
  }, [firestore, user])

  const { data: customers, isLoading: isLoadingCustomers } = useCollection<Customer>(customersQuery)
  
  const handleImportMockData = async () => {
    if (!firestore) return;
    setIsImporting(true);

    try {
      const batch = writeBatch(firestore);
      const customersCollection = collection(firestore, 'customers');
      
      mockCustomers.forEach(customerData => {
        const docRef = doc(customersCollection); // Create a new doc with a random ID
        batch.set(docRef, customerData);
      });

      await batch.commit();

      toast({
        title: 'Importació Completa',
        description: `${mockCustomers.length} clients de mostra han estat afegits.`,
      });
    } catch (error) {
      console.error("Error en importar clients:", error);
      toast({
        variant: 'destructive',
        title: 'Error en la importació',
        description: 'No s\'han pogut afegir els clients de mostra.',
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleDeleteCustomer = (customerId: string, customerName: string) => {
    if (!firestore) return;
    const customerDocRef = doc(firestore, 'customers', customerId);
    
    deleteDocumentNonBlocking(customerDocRef);
    
    toast({
      title: 'Client Eliminat',
      description: `El client ${customerName} ha estat eliminat correctament.`,
    });
  };
  
  const isLoading = isUserLoading || isLoadingCustomers;

  if (isLoading) {
    return <p>Carregant clients...</p>
  }
  
  if (!user) {
     return null; // Redirect is handled by the useEffect hook
  }

  return (
    <AdminGate pageTitle="Gestió de Clients" pageDescription="Visualitza, afegeix i gestiona tots els clients registrats.">
        <div className="max-w-6xl mx-auto">
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
            <div>
                <CardTitle>Gestió de Clients</CardTitle>
                <CardDescription>Visualitza, afegeix i gestiona tots els clients registrats.</CardDescription>
            </div>
            <div className="flex gap-2">
                <Button variant="outline" onClick={handleImportMockData} disabled={isImporting}>
                <Upload className="mr-2 h-4 w-4" />
                {isImporting ? 'Important...' : 'Importar Dades de Mostra'}
                </Button>
                <Button onClick={() => router.push('/dashboard/customers/edit/new')}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Nou Client
                </Button>
            </div>
            </CardHeader>
            <CardContent>
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>NIF</TableHead>
                    <TableHead>Correu electrònic</TableHead>
                    <TableHead>Telèfon</TableHead>
                    <TableHead className="text-right">Accions</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {customers && customers.length > 0 ? customers.map(customer => (
                    <TableRow key={customer.id}>
                    <TableCell>
                        <div className="font-medium flex items-center gap-2">
                            <Building className="h-4 w-4 text-muted-foreground" />
                            {customer.name}
                        </div>
                        <div className="text-sm text-muted-foreground">{customer.address}</div>
                    </TableCell>
                    <TableCell>
                        <div className="flex items-center gap-2">
                            <Hash className="h-4 w-4 text-muted-foreground" />
                            {customer.nrt || 'N/A'}
                        </div>
                    </TableCell>
                    <TableCell>
                        <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            {customer.email || 'N/A'}
                        </div>
                    </TableCell>
                    <TableCell>
                        <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            {customer.contact || 'N/A'}
                        </div>
                    </TableCell>
                    <TableCell className="text-right flex justify-end items-center gap-2">
                        <Button asChild variant="outline" size="sm" onClick={() => router.push(`/dashboard/customers/edit/${customer.id}`)}>
                            <Edit className="h-4 w-4" />
                        </Button>
                    
                        <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm">
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                            <AlertDialogTitle>Estàs segur?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Aquesta acció no es pot desfer. Això eliminarà permanentment el client <strong>{customer.name}</strong>.
                            </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                            <AlertDialogCancel>Cancel·lar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteCustomer(customer.id, customer.name)} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                        </AlertDialog>
                    
                    </TableCell>
                    </TableRow>
                )) : (
                    <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center">
                            No s'han trobat clients. Comença afegint-ne un o important dades de mostra.
                        </TableCell>
                    </TableRow>
                )}
                </TableBody>
            </Table>
            </CardContent>
        </Card>
        </div>
    </AdminGate>
  )
}
