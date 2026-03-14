
'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import type { Employee } from '@/lib/types';
import { Camera, Save, ArrowLeft, Phone, User as UserIcon, Shield, Euro } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AdminGate } from '@/components/AdminGate';


const profileSchema = z.object({
  firstName: z.string().min(1, 'El nom és obligatori'),
  lastName: z.string().min(1, 'El cognom és obligatori'),
  employeeId: z.string().min(1, "L'ID d'empleat és obligatori"),
  phoneNumber: z.string().optional(),
  role: z.enum(['admin', 'user']).optional(),
  hourlyRate: z.number().min(0, 'El preu ha de ser un número positiu').optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

const ADMIN_EMAILS = ['tinoseixas@gmail.com', 'tino@seixas.com'];

export default function EditUserPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;
  const { toast } = useToast();
  const { user: currentUser, isUserLoading } = useUser();
  const firestore = useFirestore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const employeeDocRef = useMemoFirebase(() => {
    if (!userId) return null;
    return doc(firestore, 'employees', userId);
  }, [firestore, userId]);

  const { data: employee, isLoading: isEmployeeLoading } = useDoc<Employee>(employeeDocRef);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      employeeId: '',
      phoneNumber: '',
      role: 'user',
      hourlyRate: 0,
    },
  });

  useEffect(() => {
    if (!isUserLoading && !currentUser) {
      toast({ variant: 'destructive', title: 'Accés no autoritzat' });
      router.push('/dashboard');
    }
  }, [isUserLoading, currentUser, router, toast]);

  useEffect(() => {
    if (employee) {
      reset({
        firstName: employee.firstName,
        lastName: employee.lastName,
        employeeId: employee.employeeId,
        phoneNumber: employee.phoneNumber || '',
        role: employee.role || 'user',
        hourlyRate: employee.hourlyRate || 0,
      });
      if (employee.avatar) {
        setAvatarUrl(employee.avatar);
      }
    }
  }, [employee, reset]);

  const onSubmit = (data: ProfileFormValues) => {
    if (!employeeDocRef) return;
    
    updateDocumentNonBlocking(employeeDocRef, data);
    
    toast({
      title: 'Perfil actualitzat',
      description: `Les dades de ${data.firstName} han estat guardades.`,
    });
    router.push('/dashboard/users');
  };

   const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !employeeDocRef) return;

    const reader = new FileReader();
    reader.onloadend = () => {
        const dataUrl = reader.result as string;
        try {
            updateDocumentNonBlocking(employeeDocRef, { avatar: dataUrl });
            setAvatarUrl(dataUrl);
            toast({
                title: 'Foto de perfil actualitzada',
            });
        } catch (error) {
            console.error("Error updating profile picture: ", error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'No s\'ha pogut actualitzar la foto de perfil.',
            });
        }
    };
    reader.readAsDataURL(file);
  };


  if (isUserLoading || isEmployeeLoading) {
    return <p>Carregant perfil d'usuari...</p>;
  }

  if (!currentUser) {
    return null; 
  }
  
  if (!employee) {
    return <p>No s'ha trobat l'usuari.</p>;
  }

  const getInitials = (employee?: Employee | null) => {
    if (employee?.firstName && employee?.lastName) return `${employee.firstName[0]}${employee.lastName[0]}`.toUpperCase();
    if (employee?.firstName) return employee.firstName[0].toUpperCase();
    if (employee?.email) return employee.email[0].toUpperCase();
    return 'U';
  }
  
  const canEditRole = ADMIN_EMAILS.includes(currentUser?.email || '');

  return (
    <AdminGate pageTitle="Edició d'Usuari" pageDescription="Aquesta secció està protegida.">
        <div className="max-w-2xl mx-auto">
        <Button variant="ghost" onClick={() => router.back()} className="mb-4 -ml-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Tornar a usuaris
        </Button>
        <Card>
            <CardHeader>
            <CardTitle>Editar Perfil d'Usuari</CardTitle>
            <CardDescription>Modifica les dades de {employee.firstName} {employee.lastName}.</CardDescription>
            </CardHeader>
            <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="flex flex-col items-center space-y-4">
                <div className="relative">
                    <Avatar className="h-24 w-24 cursor-pointer" onClick={handleAvatarClick}>
                    <AvatarImage src={avatarUrl ?? undefined} alt="User avatar" key={avatarUrl} />
                    <AvatarFallback>{getInitials(employee)}</AvatarFallback>
                    </Avatar>
                    <div className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-1.5 cursor-pointer" onClick={handleAvatarClick}>
                        <Camera className="h-4 w-4" />
                    </div>
                </div>
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    className="hidden"
                />
                <p className='text-sm text-muted-foreground'>Clica a la imatge per canviar-la</p>
                </div>

                <div className="space-y-2">
                <Label htmlFor="firstName">Nom</Label>
                <Controller
                    name="firstName"
                    control={control}
                    render={({ field }) => <Input id="firstName" {...field} />}
                />
                {errors.firstName && <p className="text-sm text-destructive">{errors.firstName.message}</p>}
                </div>

                <div className="space-y-2">
                <Label htmlFor="lastName">Cognom</Label>
                <Controller
                    name="lastName"
                    control={control}
                    render={({ field }) => <Input id="lastName" {...field} />}
                />
                {errors.lastName && <p className="text-sm text-destructive">{errors.lastName.message}</p>}
                </div>
                
                <div className="space-y-2">
                <Label htmlFor="employeeId">ID d'Empleat</Label>
                <Controller
                    name="employeeId"
                    control={control}
                    render={({ field }) => <Input id="employeeId" {...field} />}
                />
                {errors.employeeId && <p className="text-sm text-destructive">{errors.employeeId.message}</p>}
                </div>

                <div className="space-y-2">
                <Label htmlFor="phoneNumber" className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" /> Telemòbil</Label>
                <Controller
                    name="phoneNumber"
                    control={control}
                    render={({ field }) => <Input id="phoneNumber" type="tel" placeholder="600123456" {...field} />}
                />
                {errors.phoneNumber && <p className="text-sm text-destructive">{errors.phoneNumber.message}</p>}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="hourlyRate" className="flex items-center gap-2"><Euro className="h-4 w-4 text-muted-foreground" /> Preu per Hora</Label>
                    <Controller
                        name="hourlyRate"
                        control={control}
                        render={({ field }) => <Input 
                            id="hourlyRate" 
                            type="number" 
                            placeholder="Ex: 25.50" 
                            {...field} 
                            onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                            value={field.value || ''}
                        />}
                    />
                    {errors.hourlyRate && <p className="text-sm text-destructive">{errors.hourlyRate.message}</p>}
                </div>

                {canEditRole && (
                  <div className="space-y-2">
                      <Label htmlFor="role" className="flex items-center gap-2"><Shield className="h-4 w-4 text-muted-foreground" /> Rol</Label>
                      <Controller
                          name="role"
                          control={control}
                          render={({ field }) => (
                          <Select onValueChange={field.onChange} value={field.value}>
                              <SelectTrigger id="role">
                              <SelectValue placeholder="Selecciona un rol" />
                              </SelectTrigger>
                              <SelectContent>
                              <SelectItem value="user">Usuari</SelectItem>
                              <SelectItem value="admin">Administrador</SelectItem>
                              </SelectContent>
                          </Select>
                          )}
                      />
                      {errors.role && <p className="text-sm text-destructive">{errors.role.message}</p>}
                  </div>
                )}

                <div className="flex justify-end pt-4">
                <Button type="submit" disabled={!isDirty} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                    <Save className="mr-2 h-4 w-4"/>
                    Desa els Canvis
                </Button>
                </div>
            </form>
            </CardContent>
        </Card>
        </div>
    </AdminGate>
  );
}
