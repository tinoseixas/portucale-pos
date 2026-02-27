'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Briefcase, Loader2, Lock, Mail } from 'lucide-react'
import { useToast } from "@/hooks/use-toast"
import { useAuth, useUser, useFirestore } from '@/firebase'
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth'
import { doc, setDoc, getDoc } from 'firebase/firestore'

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
      const userCredential = await signInWithEmailAndPassword(auth, email.toLowerCase().trim(), password)
      const loggedInUser = userCredential.user;

      const employeeRef = doc(firestore, 'employees', loggedInUser.uid);
      const employeeSnap = await getDoc(employeeRef);

      await setDoc(employeeRef, {
          id: loggedInUser.uid,
          employeeId: employeeSnap.exists() ? (employeeSnap.data().employeeId || loggedInUser.uid.substring(0, 8)) : loggedInUser.uid.substring(0, 8),
          firstName: employeeSnap.exists() ? (employeeSnap.data().firstName || loggedInUser.email?.split('@')[0]) : (loggedInUser.email?.split('@')[0] || 'Usuari'),
          lastName: employeeSnap.exists() ? (employeeSnap.data().lastName || 'TS') : 'TS',
          email: loggedInUser.email?.toLowerCase(),
          role: 'admin', 
          hourlyRate: employeeSnap.exists() ? (employeeSnap.data()?.hourlyRate || 30) : 30,
      }, { merge: true });

      toast({ title: "Sessió iniciada", description: "Benvingut de nou!" });
      router.push('/dashboard')
    } catch (error: any) {
       console.error("Login error:", error);
       toast({
          variant: "destructive",
          title: "Error d'accés",
          description: "Verifica el correu i la contrasenya i torna-ho a intentar.",
        })
    } finally {
      setIsAuthenticating(false);
    }
  }

  const handleSignUp = async () => {
    if (!auth || !firestore || !email || !password) return;
    setIsAuthenticating(true);

    try {
      const cleanEmail = email.toLowerCase().trim();
      const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
      const newUser = userCredential.user;
      
      const employeeRef = doc(firestore, 'employees', newUser.uid);
      await setDoc(employeeRef, {
        id: newUser.uid,
        employeeId: newUser.uid.substring(0, 8),
        firstName: cleanEmail.split('@')[0] || 'Nou',
        lastName: 'Usuari',
        email: cleanEmail,
        phoneNumber: '',
        role: 'admin',
        hourlyRate: 30,
      }, { merge: true });

      toast({ title: "Compte creat", description: "El teu perfil s'ha configurat correctament." });
      router.push('/dashboard');
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error en registrar-se",
        description: error.message || "No s'ha pogut crear el compte.",
      });
    } finally {
      setIsAuthenticating(false);
    }
  }

  if (isUserLoading || (user && !isAuthenticating)) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-2 text-muted-foreground">Preparant el teu espai de treball...</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-2xl border-none">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto bg-primary text-primary-foreground p-4 rounded-2xl w-fit shadow-lg">
               <Briefcase size={40} />
            </div>
            <div>
                <CardTitle className="text-4xl font-black tracking-tight text-slate-900">TS SERVEIS</CardTitle>
                <CardDescription className="text-base">Gestió de Serveis i Facturació</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 pt-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" /> Correu electrònic
              </Label>
              <Input 
                id="email"
                type="email"
                placeholder="exemple@gmail.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isAuthenticating}
                className="h-12"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-muted-foreground" /> Contrasenya
              </Label>
              <Input 
                id="password" 
                type="password" 
                placeholder="Introdueix la teva contrasenya"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isAuthenticating}
                className="h-12"
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3 pb-8">
            <Button onClick={handleSignIn} className="w-full h-12 text-lg font-bold shadow-md" disabled={isAuthenticating}>
              {isAuthenticating ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
              Entrar al Sistema
            </Button>
            <div className="relative w-full py-4">
                <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-slate-200"></span>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-muted-foreground">Primer accés?</span>
                </div>
            </div>
            <Button onClick={handleSignUp} variant="outline" className="w-full h-12 border-2" disabled={isAuthenticating}>
              Registrar Nou Compte
            </Button>
          </CardFooter>
        </Card>
        <p className="text-center mt-8 text-xs text-slate-400 uppercase tracking-widest">TS Serveis © 2024</p>
      </div>
    </main>
  )
}
