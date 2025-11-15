'use client';

import { useEffect, useState, useRef } from 'react';
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
import { updateProfile } from 'firebase/auth';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import type { Employee } from '@/lib/types';
import { Camera, Save } from 'lucide-react';
import { PlaceHolderImages } from '@/lib/placeholder-images';


const profileSchema = z.object({
  firstName: z.string().min(1, 'El nom és obligatori'),
  lastName: z.string().min(1, 'El cognom és obligatori'),
  employeeId: z.string().min(1, "L'ID d'empleat és obligatori"),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function ProfilePage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const employeeDocRef = useMemoFirebase(() => {
    if (!user) return null;
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
    },
  });

  useEffect(() => {
    if (employee) {
      reset({
        firstName: employee.firstName,
        lastName: employee.lastName,
        employeeId: employee.employeeId,
      });
    }
  }, [employee, reset]);

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

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;
    
    // NOTE: In a real app, we would upload this file to Firebase Storage
    // and get a download URL. For this demo, we'll use a placeholder.
    const photoURL = PlaceHolderImages.find(p => p.id === 'user_avatar')?.imageUrl || 'https://picsum.photos/seed/user-avatar/200';
    
    try {
        await updateProfile(user, { photoURL });
         if (employeeDocRef) {
            updateDocumentNonBlocking(employeeDocRef, { avatar: photoURL });
        }
        toast({
            title: 'Foto de perfil actualitzada',
        });
        // Force a re-render to show the new photo by re-fetching the user or simply reloading the page.
        // For a smoother UX, a state management solution would be better.
        router.refresh();
    } catch (error) {
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'No s\'ha pogut actualitzar la foto de perfil.',
        });
    }
  };


  if (isUserLoading || isEmployeeLoading) {
    return <p>Carregant perfil...</p>;
  }

  if (!user) {
    router.push('/');
    return null;
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>El Teu Perfil</CardTitle>
          <CardDescription>Edita les teves dades personals i la teva foto.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="flex flex-col items-center space-y-4">
              <div className="relative">
                <Avatar className="h-24 w-24 cursor-pointer" onClick={handleAvatarClick}>
                  <AvatarImage src={user.photoURL ?? employee?.avatar} alt="User avatar" />
                  <AvatarFallback>{(employee?.firstName?.[0] ?? 'U').toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-1.5" onClick={handleAvatarClick}>
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
  );
}
