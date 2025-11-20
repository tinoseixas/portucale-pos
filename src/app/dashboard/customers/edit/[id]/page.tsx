'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, setDoc, addDoc, collection } from 'firebase/firestore';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import type { Customer } from '@/lib/types';
import { Save, ArrowLeft, Building, MapPin, Phone, Mail, Hash } from 'lucide-react';


const customerSchema = z.object({
  name: z.string().min(1, 'El nom és obligatori'),
  address: z.string().optional(),
  contact: z.string().optional(),
  email: z.string().email('Format de correu invàlid').optional().or(z.literal('')),
  nrt: z.string().optional(),
});

type CustomerFormValues = z.infer<typeof customerSchema>;

export default function EditCustomerPage() {
  const router = useRouter();
  const params = useParams();
  const customerId = params.id as string;
  const isNew = customerId === 'new';
  const { toast } = useToast();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const customerDocRef = useMemoFirebase(() => {
    if (isNew || !firestore || !customerId) return null;
    return doc(firestore, 'customers', customerId);
  }, [firestore, customerId, isNew]);

  const { data: customer, isLoading: isCustomerLoading } = useDoc<Customer>(customerDocRef);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: '',
      address: '',
      contact: '',
      email: '',
      nrt: '',
    },
  });

  useEffect(() => {
    if (!isUserLoading && !user) {
      toast({ variant: 'destructive', title: 'Accés no autoritzat' });
      router.push('/');
    }
  }, [isUserLoading, user, router, toast]);

  useEffect(() => {
    if (customer && !isNew) {
      reset({
        name: customer.name,
        address: customer.address || '',
        contact: customer.contact || '',
        email: customer.email || '',
        nrt: customer.nrt || '',
      });
    }
  }, [customer, isNew, reset]);

  const onSubmit = async (data: CustomerFormValues) => {
    if (!firestore) return;
    
    if (isNew) {
        const customersCollection = collection(firestore, 'customers');
        await addDoc(customersCollection, data);
        toast({
            title: 'Client Creat',
            description: `El client ${data.name} ha estat afegit correctament.`,
        });
    } else {
       if (!customerDocRef) return;
       updateDocumentNonBlocking(customerDocRef, data);
       toast({
         title: 'Client Actualitzat',
         description: `Les dades de ${data.name} han estat guardades.`,
       });
    }
    router.push('/dashboard/customers');
  };

  if (isUserLoading || (!isNew && isCustomerLoading)) {
    return <p>Carregant dades del client...</p>;
  }

  if (!user) {
    return null; // Redirect is handled by useEffect
  }
  
  if (!isNew && !customer) {
    return <p>No s'ha trobat el client.</p>;
  }


  return (
    <div className="max-w-2xl mx-auto">
       <Button variant="ghost" onClick={() => router.back()} className="mb-4 -ml-4">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Tornar a clients
      </Button>
      <Card>
        <CardHeader>
          <CardTitle>{isNew ? 'Nou Client' : 'Editar Client'}</CardTitle>
          <CardDescription>
            {isNew ? "Afegeix un nou client a la teva base de dades." : `Modifica les dades de ${customer?.name}.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            
            <div className="space-y-2">
              <Label htmlFor="name" className="flex items-center gap-2"><Building className="h-4 w-4 text-muted-foreground" /> Nom del Client</Label>
              <Controller
                name="name"
                control={control}
                render={({ field }) => <Input id="name" placeholder="Nom complet o de l'empresa" {...field} />}
              />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>
            
             <div className="space-y-2">
              <Label htmlFor="nrt" className="flex items-center gap-2"><Hash className="h-4 w-4 text-muted-foreground" /> NIF / NRT</Label>
              <Controller
                name="nrt"
                control={control}
                render={({ field }) => <Input id="nrt" placeholder="Número d'identificació fiscal" {...field} />}
              />
              {errors.nrt && <p className="text-sm text-destructive">{errors.nrt.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="address" className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground" /> Adreça</Label>
              <Controller
                name="address"
                control={control}
                render={({ field }) => <Input id="address" placeholder="Adreça completa" {...field} />}
              />
              {errors.address && <p className="text-sm text-destructive">{errors.address.message}</p>}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="contact" className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" /> Telèfon de Contacte</Label>
              <Controller
                name="contact"
                control={control}
                render={({ field }) => <Input id="contact" type="tel" placeholder="600123456" {...field} />}
              />
              {errors.contact && <p className="text-sm text-destructive">{errors.contact.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" /> Correu electrònic</Label>
              <Controller
                name="email"
                control={control}
                render={({ field }) => <Input id="email" type="email" placeholder="client@exemple.com" {...field} />}
              />
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>

            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={!isDirty && !isNew} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                <Save className="mr-2 h-4 w-4"/>
                {isNew ? 'Crear Client' : 'Desa els Canvis'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
