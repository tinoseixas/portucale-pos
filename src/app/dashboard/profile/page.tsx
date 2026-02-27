'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
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
import { Camera, Save, ArrowLeft, Phone, Euro, Mail } from 'lucide-react';


const profileSchema = z.object({
  firstName: z.string().min(1, 'El nom és obligatori'),
  lastName: z.string().min(1, 'El cognom és obligatori'),
  employeeId: z.string().min(1, "L'ID d'empleat és obligatori"),
  phoneNumber: z.string().optional(),
  hourlyRate: z.number().min(0, 'El preu ha de ser un número positiu').optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function ProfilePage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const employeeDocRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'employees', user.uid);
  }, [firestore, user]);

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
      hourlyRate: 0,
    },
  });

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/');
    }
  }, [isUserLoading, user, router]);

  useEffect(() => {
    if (employee) {
      reset({
        firstName: employee.firstName,
        lastName: employee.lastName,
        employeeId: employee.employeeId,
        phoneNumber: employee.phoneNumber || '',
        hourlyRate: employee.hourlyRate || 0,
      });
      if (employee.avatar) {
        setAvatarUrl(employee.avatar);
      }
    }
    if(user?.photoURL && !avatarUrl) {
      setAvatarUrl(user.photoURL);
    }
  }, [employee, reset, user, avatarUrl]);

  const onSubmit = (data: ProfileFormValues) => {
    if (!user || !employeeDocRef) return;
    
    updateDocumentNonBlocking(employeeDocRef, data);
    
    toast({
      title: 'Perfil actualitzat',
      description: 'Les teves dades han estat guardades correctament.',
    });
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user || !employeeDocRef) return;

    const reader = new FileReader();
    reader.onloadend = () => {
        const dataUrl = reader.result as string;
        try {
            // Update the avatar URL in the Firestore document only
            updateDocumentNonBlocking(employeeDocRef, { avatar: dataUrl });

            // Update local state to immediately reflect the change
            setAvatarUrl(dataUrl);
            
            toast({
                title: 'Foto de perfil actualitzada',
                description: 'La teva nova foto de perfil ha estat guardada.'
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
    return <p className="p-8 text-center">Carregant perfil...</p>;
  }

  if (!user) {
    return null; // Redirect is handled by the useEffect hook
  }
  
  const getInitials = (employee?: Employee | null) => {
    if (employee?.firstName && employee?.lastName) return `${employee.firstName[0]}${employee.lastName[0]}`.toUpperCase();
    if (employee?.firstName) return employee.firstName[0].toUpperCase();
    if (user?.email) return user.email[0].toUpperCase();
    return 'U';
  }
  
  const displayAvatar = avatarUrl || user?.photoURL;
  const isUserAdmin = employee?.role === 'admin';

  return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard')} className="-ml-4">
                <ArrowLeft className="mr-2 h-4 w-4"/>
                Tornar al Dashboard
            </Button>
        </div>

        <Card className="shadow-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">El Teu Perfil</CardTitle>
            <CardDescription>Edita les teves dades personals i la teva foto.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="flex flex-col items-center space-y-4 mb-8">
                <div className="relative group">
                  <Avatar className="h-28 w-28 cursor-pointer border-2 border-primary/20 transition-all group-hover:opacity-80" onClick={handleAvatarClick}>
                    <AvatarImage src={displayAvatar ?? undefined} alt="User avatar" key={displayAvatar} />
                    <AvatarFallback className="text-2xl bg-primary/10 text-primary">{getInitials(employee)}</AvatarFallback>
                  </Avatar>
                  <div className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-2 cursor-pointer shadow-lg hover:scale-110 transition-transform" onClick={handleAvatarClick}>
                      <Camera className="h-5 w-5" />
                  </div>
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
                />
                <p className='text-xs text-muted-foreground uppercase tracking-wider font-bold'>Clica a la imatge per canviar-la</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Label htmlFor="email" className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" /> Correu electrònic</Label>
                    <Input id="email" value={user.email || ''} readOnly disabled className="bg-muted cursor-not-allowed font-medium" />
                    <p className="text-[10px] text-muted-foreground italic">El correu no es pot canviar des d'aquí.</p>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="employeeId" className="flex items-center gap-2">ID d'Empleat</Label>
                    <Controller
                    name="employeeId"
                    control={control}
                    render={({ field }) => <Input id="employeeId" {...field} placeholder="Ex: TS-001" />}
                    />
                    {errors.employeeId && <p className="text-sm text-destructive">{errors.employeeId.message}</p>}
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
                    <Label htmlFor="phoneNumber" className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" /> Telemòbil</Label>
                    <Controller
                    name="phoneNumber"
                    control={control}
                    render={({ field }) => <Input id="phoneNumber" type="tel" placeholder="600123456" {...field} />}
                    />
                    {errors.phoneNumber && <p className="text-sm text-destructive">{errors.phoneNumber.message}</p>}
                </div>
                
                <div className="space-y-2">
                    <Label htmlFor="hourlyRate" className="flex items-center gap-2"><Euro className="h-4 w-4 text-muted-foreground" /> Preu per Hora (Opcional)</Label>
                    <Controller
                        name="hourlyRate"
                        control={control}
                        render={({ field }) => <Input 
                            id="hourlyRate" 
                            type="number" 
                            placeholder="Ex: 30.00" 
                            {...field} 
                            onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                            value={field.value || ''}
                            disabled={!isUserAdmin}
                        />}
                    />
                    {errors.hourlyRate && <p className="text-sm text-destructive">{errors.hourlyRate.message}</p>}
                    {!isUserAdmin && <p className="text-[10px] text-muted-foreground mt-1">Només els administradors poden modificar aquest camp.</p>}
                </div>
              </div>

              <div className="flex justify-end items-center pt-6 border-t">
                <Button type="submit" disabled={!isDirty} className="bg-accent hover:bg-accent/90 text-accent-foreground min-w-[150px]">
                  <Save className="mr-2 h-4 w-4"/>
                  Desar Canvis
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
  );
}
