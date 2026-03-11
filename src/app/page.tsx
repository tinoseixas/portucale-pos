
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Lock, Mail } from 'lucide-react'
import { useToast } from "@/hooks/use-toast"
import { useAuth, useUser, useFirestore } from '@/firebase'
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth'
import { doc, setDoc, getDoc } from 'firebase/firestore'
import { Logo } from '@/components/Logo'
import { BRANDING } from '@/lib/branding'

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
          description: "Verifica o correu i a contrasenya e torna a tentar.",
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

      toast({ title: "Compte creat", description: "O teu perfil foi configurado com sucesso." });
      router.push('/dashboard');
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error en registrar-se",
        description: error.message || "No s'ha pogut crear o compte.",
      });
    } finally {
      setIsAuthenticating(false);
    }
  }

  if (isUserLoading || (user && !isAuthenticating)) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-primary font-black uppercase tracking-widest animate-pulse">Iniciant {BRANDING.companyName}...</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-primary via-primary/90 to-slate-900 p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-10 scale-110">
            <Logo className="h-32 w-auto drop-shadow-2xl" variant="light" />
        </div>
        <Card className="shadow-2xl border-none overflow-hidden rounded-[2.5rem] bg-white/95 backdrop-blur-xl">
          <CardHeader className="text-center space-y-2 bg-slate-900 text-white p-10">
            <CardTitle className="text-3xl font-black tracking-tight uppercase">Portal Corporatiu</CardTitle>
            <CardDescription className="text-slate-400 font-medium">{BRANDING.companyName} - Gestió de Serveis</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-12 px-10">
            <div className="space-y-3">
              <Label htmlFor="email" className="flex items-center gap-2 font-black uppercase text-[10px] text-slate-400 tracking-widest">
                <Mail className="h-3 w-3" /> Correu electrònic
              </Label>
              <Input 
                id="email"
                type="email"
                placeholder="exemple@gmail.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isAuthenticating}
                className="h-14 rounded-2xl border-2 focus:border-primary font-bold bg-slate-50"
              />
            </div>
            <div className="space-y-3">
              <Label htmlFor="password" className="flex items-center gap-2 font-black uppercase text-[10px] text-slate-400 tracking-widest">
                <Lock className="h-3 w-3" /> Contrasenya
              </Label>
              <Input 
                id="password" 
                type="password" 
                placeholder="Introdueix la teva contrasenya"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isAuthenticating}
                className="h-14 rounded-2xl border-2 focus:border-primary font-bold bg-slate-50"
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4 pb-12 px-10">
            <Button onClick={handleSignIn} className="w-full h-16 text-lg font-black uppercase tracking-tight shadow-xl bg-primary hover:bg-primary/90 rounded-2xl hover:scale-[1.02] transition-transform" disabled={isAuthenticating}>
              {isAuthenticating ? <Loader2 className="mr-3 h-6 w-6 animate-spin" /> : null}
              Entrar al Sistema
            </Button>
            <div className="relative w-full py-4">
                <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-slate-100"></span>
                </div>
                <div className="relative flex justify-center text-[10px] uppercase font-black tracking-widest">
                    <span className="bg-white/95 px-4 text-slate-300 italic">Accés restringit a l'equip</span>
                </div>
            </div>
            <Button onClick={handleSignUp} variant="outline" className="w-full h-14 border-2 font-bold rounded-2xl text-slate-500 hover:bg-slate-50 border-accent/20 hover:border-accent" disabled={isAuthenticating}>
              Sol·licitar nou compte
            </Button>
          </CardFooter>
        </Card>
        <p className="text-center mt-10 text-[10px] text-white/40 uppercase font-black tracking-[0.4em]">{BRANDING.companyName} © 2024</p>
      </div>
    </main>
  )
}
