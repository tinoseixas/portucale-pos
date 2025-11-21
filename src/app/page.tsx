'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { User, Lock, Briefcase } from 'lucide-react'
import { useToast } from "@/hooks/use-toast"
import { useAuth, useUser, useFirestore } from '@/firebase'
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth'
import { doc, setDoc, getDoc } from 'firebase/firestore'

export default function Home() {
  const router = useRouter()
  const { toast } = useToast()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const auth = useAuth()
  const firestore = useFirestore()
  const { user, isUserLoading } = useUser()

  useEffect(() => {
    if (user) {
      router.push('/dashboard')
    }
  }, [user, router])
  
  const handleSignIn = async () => {
    if (!auth || !firestore) return;

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      const loggedInUser = userCredential.user;

      // Ensure employee profile exists
      const employeeRef = doc(firestore, 'employees', loggedInUser.uid);
      const employeeSnap = await getDoc(employeeRef);

      if (!employeeSnap.exists()) {
        await setDoc(employeeRef, {
            id: loggedInUser.uid,
            employeeId: loggedInUser.uid.substring(0, 8),
            firstName: loggedInUser.email?.split('@')[0] || 'Nou',
            lastName: 'Usuari',
            email: loggedInUser.email,
            phoneNumber: '',
            role: loggedInUser.email === 'tino@seixas.com' ? 'admin' : 'user',
        }, { merge: true });
      }

      toast({
        title: "Sessió iniciada",
        description: "Benvingut de nou!",
      })
      router.push('/dashboard')
    } catch (error: any) {
       toast({
          variant: "destructive",
          title: "Error d'inici de sessió",
          description: "Credencials incorrectes o l'usuari no existeix. Intenta-ho de nou o registra't.",
        })
    }
  }

  const handleSignUp = async () => {
    if (!auth || !firestore) return;

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const newUser = userCredential.user;
      
      const employeeRef = doc(firestore, 'employees', newUser.uid);
      await setDoc(employeeRef, {
        id: newUser.uid,
        employeeId: newUser.uid.substring(0, 8),
        firstName: email.split('@')[0] || 'Nou',
        lastName: 'Usuari',
        email: newUser.email,
        phoneNumber: '',
        role: newUser.email === 'tino@seixas.com' ? 'admin' : 'user',
      }, { merge: true });

      toast({
        title: "Compte creat",
        description: "El teu nou compte ha estat creat correctament.",
      });
      router.push('/dashboard');
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        toast({
            variant: "destructive",
            title: "Error de registre",
            description: "Aquest correu electrònic ja està en ús. Prova d'iniciar sessió.",
          });
      } else {
        toast({
            variant: "destructive",
            title: "Error de registre",
            description: error.message || "No s'ha pogut crear el compte.",
          });
      }
    }
  }

  if (isUserLoading || user) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <p>Carregant...</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-2xl">
          <CardHeader className="text-center">
            <div className="mx-auto bg-primary/20 text-primary p-3 rounded-full w-fit mb-4">
               <Briefcase size={32} />
            </div>
            <CardTitle className="text-3xl font-bold">Registre de Serveis</CardTitle>
            <CardDescription>Identifica't per registrar els serveis</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="employee-id">Correu electrònic</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input 
                  id="email"
                  type="email"
                  placeholder="usuari@exemple.com" 
                  required 
                  className="pl-10"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contrasenya</Label>
               <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input 
                  id="password" 
                  type="password" 
                  placeholder="Escriu la teva contrasenya"
                  required 
                  className="pl-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button onClick={handleSignIn} className="w-full">
              Entrar
            </Button>
            <Button onClick={handleSignUp} variant="outline" className="w-full">
              Registar
            </Button>
          </CardFooter>
        </Card>
      </div>
    </main>
  )
}
