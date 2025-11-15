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
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

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
    // Set initial avatar URL from user or employee data
    setAvatarUrl(user?.photoURL ?? null);
  }, [employee, reset, user]);

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
    
    // Find the placeholder image for the user avatar.
    const userAvatarPlaceholder = PlaceHolderImages.find(p => p.id === 'user_avatar');
    // If not found, use a consistent fallback based on user ID.
    const photoURL = userAvatarPlaceholder?.imageUrl || `https://picsum.photos/seed/${user.uid}/200`;
    
    try {
        // Update Firebase Auth user profile
        await updateProfile(user, { photoURL });

        // Update the avatar URL in the Firestore document
        if (employeeDocRef) {
            updateDocumentNonBlocking(employeeDocRef, { avatar: photoURL });
        }

        // Update local state to immediately reflect the change
        setAvatarUrl(photoURL);
        
        toast({
            title: 'Foto de perfil actualitzada',
            description: 'La teva foto ha estat actualitzada. Pot ser que hagis de refrescar la pàgina per veure els canvis a tot arreu.'
        });

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
  
  const getInitials = (employee?: Employee | null) => {
    if (employee?.firstName && employee?.lastName) return `${employee.firstName[0]}${employee.lastName[0]}`.toUpperCase();
    if (employee?.firstName) return employee.firstName[0].toUpperCase();
    if (user?.email) return user.email[0].toUpperCase();
    return 'U';
  }
  
  const displayAvatar = avatarUrl || user?.photoURL;

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
                  <AvatarImage src={displayAvatar ?? undefined} alt="User avatar" key={displayAvatar} />
                  <AvatarFallback>{getInitials(employee)}</AvatarFallback>
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
