'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { User, Lock, Briefcase, Loader2 } from 'lucide-react'
import { useToast } from "@/hooks/use-toast"
import { useAuth, useUser, useFirestore } from '@/firebase'
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth'
import { doc, setDoc, getDoc } from 'firebase/firestore'

// E-mail de administrador padrão
const ADMIN_EMAIL = 'tinoseixas@gmail.com';

export default function Home() {
  const router = useRouter()
  const { toast } = useToast()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const auth = useAuth()
  const firestore = useFirestore()
  const { user, isUserLoading } = useUser()

  useEffect(() => {
    if (user && !isAuthenticating) {
      router.push('/dashboard')
    }
  }, [user, router, isAuthenticating])
  
  const handleSignIn = async () => {
    if (!auth || !firestore || !email || !password) return;
    setIsAuthenticating(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      const loggedInUser = userCredential.user;

      // Garante que o perfil de funcionário existe e tem o papel correto
      const employeeRef = doc(firestore, 'employees', loggedInUser.uid);
      const isInitialAdmin = loggedInUser.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
      
      const employeeSnap = await getDoc(employeeRef);

      // Sempre forçar admin para o email principal no login para garantir permissões
      await setDoc(employeeRef, {
          id: loggedInUser.uid,
          employeeId: employeeSnap.exists() ? (employeeSnap.data().employeeId || loggedInUser.uid.substring(0, 8)) : loggedInUser.uid.substring(0, 8),
          firstName: employeeSnap.exists() ? (employeeSnap.data().firstName || loggedInUser.email?.split('@')[0]) : (loggedInUser.email?.split('@')[0] || 'Usuari'),
          lastName: employeeSnap.exists() ? (employeeSnap.data().lastName || 'TS') : 'TS',
          email: loggedInUser.email,
          role: isInitialAdmin ? 'admin' : (employeeSnap.exists() ? (employeeSnap.data()?.role || 'user') : 'user'),
          hourlyRate: employeeSnap.exists() ? (employeeSnap.data()?.hourlyRate || (isInitialAdmin ? 30 : 27)) : (isInitialAdmin ? 30 : 27),
      }, { merge: true });

      toast({ title: "Sessió iniciada", description: "Benvingut de nou!" });
      router.push('/dashboard')
    } catch (error: any) {
       console.error("Login error:", error);
       toast({
          variant: "destructive",
          title: "Error d'inici de sessió",
          description: "Credencials incorrectes o l'usuari no existeix.",
        })
    } finally {
      setIsAuthenticating(false);
    }
  }

  const handleSignUp = async () => {
    if (!auth || !firestore || !email || !password) return;
    setIsAuthenticating(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const newUser = userCredential.user;
      
      const isInitialAdmin = newUser.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
      const employeeRef = doc(firestore, 'employees', newUser.uid);
      await setDoc(employeeRef, {
        id: newUser.uid,
        employeeId: newUser.uid.substring(0, 8),
        firstName: email.split('@')[0] || 'Nou',
        lastName: 'Usuari',
        email: newUser.email,
        phoneNumber: '',
        role: isInitialAdmin ? 'admin' : 'user',
        hourlyRate: isInitialAdmin ? 30 : 27,
      }, { merge: true });

      toast({ title: "Compte creat", description: "El teu nou conta ha estat creat." });
      router.push('/dashboard');
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error de registre",
        description: error.message || "No s'ha pogut crear o compte.",
      });
    } finally {
      setIsAuthenticating(false);
    }
  }

  if (isUserLoading || (user && !isAuthenticating)) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-2">Carregant...</p>
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
            <CardTitle className="text-3xl font-bold">TS Serveis</CardTitle>
            <CardDescription>Identifica't per registrar els serveis</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Correu electrònic</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input 
                  id="email"
                  type="email"
                  placeholder="usuari@exemple.com" 
                  className="pl-10"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isAuthenticating}
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
                  className="pl-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isAuthenticating}
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button onClick={handleSignIn} className="w-full" disabled={isAuthenticating}>
              {isAuthenticating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Entrar
            </Button>
            <Button onClick={handleSignUp} variant="outline" className="w-full" disabled={isAuthenticating}>
              Registar
            </Button>
          </CardFooter>
        </Card>
      </div>
    </main>
  )
}
