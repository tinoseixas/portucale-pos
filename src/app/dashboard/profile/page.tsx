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
import { useUser, useFirestore, useDoc, useMemoFirebase, useAuth } from '@/firebase';
import { doc } from 'firebase/firestore';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import type { Employee } from '@/lib/types';
import { Camera, Save, ArrowLeft, Phone, Euro, Mail, LogOut } from 'lucide-react';
import { signOut } from 'firebase/auth';


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
  const auth = useAuth();
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

  const handleLogout = async () => {
    if (!auth) return;
    try {
        await signOut(auth);
        router.push('/');
    } catch (e) {
        toast({ variant: 'destructive', title: 'Error al tancar sessió' });
    }
  }

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
            updateDocumentNonBlocking(employeeDocRef, { avatar: dataUrl });
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
    return <p className="p-8 text-center font-bold">Carregant perfil...</p>;
  }

  if (!user) {
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
      <div className="max-w-2xl mx-auto space-y-6 pb-20 px-4">
        <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard')} className="-ml-4 font-bold">
                <ArrowLeft className="mr-2 h-4 w-4"/>
                Dashboard
            </Button>
        </div>

        <Card className="shadow-2xl border-none rounded-3xl overflow-hidden">
          <CardHeader className="bg-slate-900 text-white p-8">
            <CardTitle className="text-3xl font-black uppercase tracking-tight">El Teu Perfil</CardTitle>
            <CardDescription className="text-slate-400 font-medium">Gestiona les teves dades personals.</CardDescription>
          </CardHeader>
          <CardContent className="p-8 pt-10">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
              <div className="flex flex-col items-center space-y-4 mb-8">
                <div className="relative group">
                  <Avatar className="h-28 w-28 cursor-pointer border-4 border-slate-100 transition-all group-hover:opacity-80" onClick={handleAvatarClick}>
                    <AvatarImage src={displayAvatar ?? undefined} alt="User avatar" key={displayAvatar} />
                    <AvatarFallback className="text-2xl bg-primary/10 text-primary font-black">{getInitials(employee)}</AvatarFallback>
                  </Avatar>
                  <div className="absolute bottom-0 right-0 bg-primary text-white rounded-full p-2 cursor-pointer shadow-lg hover:scale-110 transition-transform" onClick={handleAvatarClick}>
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
                <p className='text-[10px] text-slate-400 uppercase tracking-widest font-black'>Clica per canviar la foto</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-xs font-black uppercase text-slate-400"><Mail className="h-4 w-4" /> Correu electrònic</Label>
                    <Input value={user.email || ''} readOnly disabled className="bg-slate-50 cursor-not-allowed font-bold h-12 rounded-xl" />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="employeeId" className="text-xs font-black uppercase text-slate-400">ID d'Empleat</Label>
                    <Controller
                    name="employeeId"
                    control={control}
                    render={({ field }) => <Input id="employeeId" {...field} className="h-12 rounded-xl font-bold border-2" placeholder="Ex: TS-001" />}
                    />
                    {errors.employeeId && <p className="text-xs text-destructive font-bold">{errors.employeeId.message}</p>}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="firstName" className="text-xs font-black uppercase text-slate-400">Nom</Label>
                    <Controller
                    name="firstName"
                    control={control}
                    render={({ field }) => <Input id="firstName" {...field} className="h-12 rounded-xl font-bold border-2" />}
                    />
                    {errors.firstName && <p className="text-xs text-destructive font-bold">{errors.firstName.message}</p>}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="lastName" className="text-xs font-black uppercase text-slate-400">Cognom</Label>
                    <Controller
                    name="lastName"
                    control={control}
                    render={({ field }) => <Input id="lastName" {...field} className="h-12 rounded-xl font-bold border-2" />}
                    />
                    {errors.lastName && <p className="text-xs text-destructive font-bold">{errors.lastName.message}</p>}
                </div>
                
                <div className="space-y-2">
                    <Label htmlFor="phoneNumber" className="text-xs font-black uppercase text-slate-400 flex items-center gap-2"><Phone className="h-4 w-4" /> Telèfon</Label>
                    <Controller
                    name="phoneNumber"
                    control={control}
                    render={({ field }) => <Input id="phoneNumber" type="tel" placeholder="600123456" {...field} className="h-12 rounded-xl font-bold border-2" />}
                    />
                    {errors.phoneNumber && <p className="text-xs text-destructive font-bold">{errors.phoneNumber.message}</p>}
                </div>
                
                <div className="space-y-2">
                    <Label htmlFor="hourlyRate" className="text-xs font-black uppercase text-slate-400 flex items-center gap-2"><Euro className="h-4 w-4" /> Preu per Hora</Label>
                    <Controller
                        name="hourlyRate"
                        control={control}
                        render={({ field }) => <Input 
                            id="hourlyRate" 
                            type="number" 
                            placeholder="Ex: 30.00" 
                            {...field} 
                            className="h-12 rounded-xl font-bold border-2"
                            onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                            value={field.value || ''}
                        />}
                    />
                    {errors.hourlyRate && <p className="text-xs text-destructive font-bold">{errors.hourlyRate.message}</p>}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-between items-center pt-8 border-t-2 gap-4">
                <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handleLogout} 
                    className="text-destructive border-destructive/20 hover:bg-destructive/5 font-black uppercase tracking-widest h-14 w-full sm:w-auto rounded-2xl"
                >
                    <LogOut className="mr-2 h-5 w-5" />
                    Tancar sessió
                </Button>
                <Button 
                    type="submit" 
                    disabled={!isDirty} 
                    className="bg-accent hover:bg-accent/90 text-accent-foreground font-black uppercase tracking-widest h-14 px-10 rounded-2xl shadow-xl w-full sm:w-auto"
                >
                  <Save className="mr-2 h-5 w-5"/>
                  Desar Canvis
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
  );
}
