'use client';

import { useEffect, useState } from 'react';
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
import { doc, addDoc, collection } from 'firebase/firestore';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import type { Customer } from '@/lib/types';
import { Save, ArrowLeft, Building, MapPin, Phone, Mail, Hash, Loader2 } from 'lucide-react';
import { AdminGate } from '@/components/AdminGate';

const customerSchema = z.object({
  name: z.string().min(1, 'El nom és obligatori'),
  nrt: z.string().optional(),
  street: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  contact: z.string().optional(),
  email: z.string().email('Format de correu invàlid').optional().or(z.literal('')),
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
      nrt: '',
      street: '',
      city: '',
      postalCode: '',
      contact: '',
      email: '',
    },
  });

  useEffect(() => {
    if (customer && !isNew) {
      reset({
        name: customer.name || '',
        nrt: customer.nrt || '',
        street: customer.street || '',
        city: customer.city || '',
        postalCode: customer.postalCode || '',
        contact: customer.contact || '',
        email: customer.email || '',
      });
    }
  }, [customer, isNew, reset]);

  const onSubmit = async (data: CustomerFormValues) => {
    if (!firestore) return;
    
    try {
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
             description: `Les dades de ${data.name} han estat desades.`,
           });
        }
        router.push('/dashboard/customers');
    } catch (e) {
        toast({ variant: 'destructive', title: 'Error al desar' });
    }
  };

  if (isUserLoading || (!isNew && isCustomerLoading)) {
    return (
        <div className="p-12 text-center flex flex-col items-center justify-center h-[60vh]">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="mt-4 font-bold">Carregant dades del client...</p>
        </div>
    );
  }

  return (
    <AdminGate pageTitle="Edició de Client" pageDescription="Gestió de dades de facturació i contacte.">
        <div className="max-w-3xl mx-auto space-y-6 pb-20 px-4">
            <Button variant="ghost" onClick={() => router.back()} className="font-bold -ml-4">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Tornar a llista de clients
            </Button>
            
            <Card className="border-none shadow-2xl rounded-3xl overflow-hidden">
                <CardHeader className="bg-slate-900 text-white p-8">
                    <CardTitle className="text-3xl font-black uppercase tracking-tight">
                        {isNew ? 'Nou Client' : 'Editar Client'}
                    </CardTitle>
                    <CardDescription className="text-slate-400 font-medium">
                        Segueix l'ordre oficial de 7 camps per evitar errors de sincronització.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-8 pt-10">
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                        
                        {/* 1. NOME */}
                        <div className="space-y-3">
                            <Label htmlFor="name" className="flex items-center gap-2 font-black uppercase text-xs text-primary tracking-widest pl-1">
                                <Building className="h-4 w-4" /> 1. Nom del Client
                            </Label>
                            <Controller
                                name="name"
                                control={control}
                                render={({ field }) => (
                                    <Input id="name" placeholder="Ex: Alimentària UNIÓ" className="h-14 rounded-2xl font-bold border-2 bg-slate-50 text-lg focus:border-primary" {...field} />
                                )}
                            />
                            {errors.name && <p className="text-xs text-destructive font-bold">{errors.name.message}</p>}
                        </div>

                        {/* 2. NRT */}
                        <div className="space-y-3">
                            <Label htmlFor="nrt" className="flex items-center gap-2 font-black uppercase text-xs text-primary tracking-widest pl-1">
                                <Hash className="h-4 w-4" /> 2. NIF / NRT
                            </Label>
                            <Controller
                                name="nrt"
                                control={control}
                                render={({ field }) => (
                                    <Input id="nrt" placeholder="Ex: L-123456-X" className="h-14 rounded-2xl font-bold border-2 bg-slate-50 text-lg focus:border-primary" {...field} />
                                )}
                            />
                        </div>

                        {/* BLOCO MORADA (3, 4, 5) */}
                        <div className="bg-slate-50 p-8 rounded-[2rem] border-2 border-dashed border-slate-200 space-y-6">
                            <p className="font-black uppercase text-[10px] text-slate-400 tracking-[0.2em] flex items-center gap-2 mb-2">
                                <MapPin className="h-4 w-4" /> LOCALITZACIÓ
                            </p>
                            
                            {/* 3. RUA */}
                            <div className="space-y-2">
                                <Label htmlFor="street" className="text-xs font-black text-slate-600 uppercase">3. Carrer i Número (Rua)</Label>
                                <Controller
                                    name="street"
                                    control={control}
                                    render={({ field }) => (
                                        <Input id="street" placeholder="Ex: Av. Carlemany, 100" className="h-14 rounded-2xl font-bold border-2 bg-white text-lg focus:border-primary" {...field} />
                                    )}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* 4. CIDADE */}
                                <div className="space-y-2">
                                    <Label htmlFor="city" className="text-xs font-black text-slate-600 uppercase">4. Ciutat / Parròquia</Label>
                                    <Controller
                                        name="city"
                                        control={control}
                                        render={({ field }) => (
                                            <Input id="city" placeholder="Ex: Encamp" className="h-14 rounded-2xl font-bold border-2 bg-white text-lg focus:border-primary" {...field} />
                                        )}
                                    />
                                </div>
                                {/* 5. CP */}
                                <div className="space-y-2">
                                    <Label htmlFor="postalCode" className="text-xs font-black text-slate-600 uppercase">5. Codi Postal</Label>
                                    <Controller
                                        name="postalCode"
                                        control={control}
                                        render={({ field }) => (
                                            <Input id="postalCode" placeholder="Ex: AD200" className="h-14 rounded-2xl font-bold border-2 bg-white text-lg focus:border-primary" {...field} />
                                        )}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* BLOCO CONTACTO (6, 7) */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* 6. TELEFONE */}
                            <div className="space-y-3">
                                <Label htmlFor="contact" className="flex items-center gap-2 font-black uppercase text-xs text-primary tracking-widest pl-1">
                                    <Phone className="h-4 w-4" /> 6. Telèfon
                                </Label>
                                <Controller
                                    name="contact"
                                    control={control}
                                    render={({ field }) => (
                                        <Input id="contact" type="tel" placeholder="Ex: 376 123 456" className="h-14 rounded-2xl font-bold border-2 bg-slate-50 text-lg focus:border-primary" {...field} />
                                    )}
                                />
                            </div>

                            {/* 7. EMAIL */}
                            <div className="space-y-3">
                                <Label htmlFor="email" className="flex items-center gap-2 font-black uppercase text-xs text-primary tracking-widest pl-1">
                                    <Mail className="h-4 w-4" /> 7. E-mail
                                </Label>
                                <Controller
                                    name="email"
                                    control={control}
                                    render={({ field }) => (
                                        <Input id="email" type="email" placeholder="Ex: client@empresa.ad" className="h-14 rounded-2xl font-bold border-2 bg-slate-50 text-lg focus:border-primary" {...field} />
                                    )}
                                />
                                {errors.email && <p className="text-xs text-destructive font-bold">{errors.email.message}</p>}
                            </div>
                        </div>

                        <div className="flex justify-end pt-10 border-t-2 border-slate-100">
                            <Button 
                                type="submit" 
                                disabled={!isDirty && !isNew} 
                                className="h-20 px-12 bg-accent hover:bg-accent/90 text-accent-foreground font-black uppercase tracking-widest rounded-3xl shadow-2xl hover:scale-[1.02] transition-transform text-lg"
                            >
                                <Save className="mr-3 h-6 w-6"/>
                                {isNew ? 'CREAR CLIENT' : 'DESAR CANVIS'}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    </AdminGate>
  );
}
