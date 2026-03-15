
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

const ADMIN_EMAILS = ['tinoseixas@gmail.com', 'tino@seixas.com'];

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

      const isMasterAdmin = ADMIN_EMAILS.includes(loggedInUser.email?.toLowerCase() || '');

      await setDoc(employeeRef, {
          id: loggedInUser.uid,
          employeeId: employeeSnap.exists() ? (employeeSnap.data().employeeId || loggedInUser.uid.substring(0, 8)) : loggedInUser.uid.substring(0, 8),
          firstName: employeeSnap.exists() ? (employeeSnap.data().firstName || loggedInUser.email?.split('@')[0]) : (loggedInUser.email?.split('@')[0] || 'Usuari'),
          lastName: employeeSnap.exists() ? (employeeSnap.data().lastName || 'TS') : 'TS',
          email: loggedInUser.email?.toLowerCase(),
          role: isMasterAdmin ? 'admin' : (employeeSnap.exists() ? employeeSnap.data().role : 'user'), 
          hourlyRate: employeeSnap.exists() ? (employeeSnap.data()?.hourlyRate || 30) : 30,
      }, { merge: true });

      toast({ title: "Sessió iniciada", description: "Benvingut de nou!" });
      router.push('/dashboard')
    } catch (error: any) {
       console.error("Login error:", error);
       toast({
          variant: "destructive",
          title: "Error d'accés",
          description: "Verifica el correu i la contrasenya i torna-ho a provar.",
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
      
      const isMasterAdmin = ADMIN_EMAILS.includes(cleanEmail);
      
      const employeeRef = doc(firestore, 'employees', newUser.uid);
      await setDoc(employeeRef, {
        id: newUser.uid,
        employeeId: newUser.uid.substring(0, 8),
        firstName: cleanEmail.split('@')[0] || 'Nou',
        lastName: 'Usuari',
        email: cleanEmail,
        phoneNumber: '',
        role: isMasterAdmin ? 'admin' : 'user',
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
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-primary font-bold tracking-tight animate-pulse">Iniciant {BRANDING.companyName}...</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-primary via-destructive/20 to-slate-900 p-4 md:p-8">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8 md:mb-12 scale-110">
            <Logo className="h-24 md:h-32 w-auto drop-shadow-2xl" variant="light" />
        </div>
        <Card className="shadow-2xl border-none overflow-hidden rounded-[2rem] md:rounded-[2.5rem] bg-white/95 backdrop-blur-xl">
          <CardHeader className="text-center space-y-2 bg-slate-900 text-white p-6 md:p-10">
            <CardTitle className="text-2xl md:text-3xl font-black tracking-tight">Portal corporatiu</CardTitle>
            <CardDescription className="text-slate-400 font-medium">{BRANDING.companyName} - Gestió de serveis</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-8 md:pt-12 px-6 md:px-10">
            <div className="space-y-3">
              <Label htmlFor="email" className="flex items-center gap-2 font-bold text-xs text-slate-400 tracking-tight">
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
              <Label htmlFor="password" className="flex items-center gap-2 font-bold text-xs text-slate-400 tracking-tight">
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
          <CardFooter className="flex flex-col gap-4 pb-8 md:pb-12 px-6 md:px-10">
            <Button onClick={handleSignIn} className="w-full h-16 text-lg font-black tracking-tight shadow-xl bg-primary hover:bg-primary/90 rounded-2xl hover:scale-[1.02] transition-transform" disabled={isAuthenticating}>
              {isAuthenticating ? <Loader2 className="mr-3 h-6 w-6 animate-spin" /> : null}
              Entrar al sistema
            </Button>
            <div className="relative w-full py-4">
                <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-slate-100"></span>
                </div>
                <div className="relative flex justify-center text-[10px] font-bold tracking-tight">
                    <span className="bg-white/95 px-4 text-slate-300 italic">Accés restringit a l'equip</span>
                </div>
            </div>
            <Button onClick={handleSignUp} variant="outline" className="w-full h-14 border-2 font-bold rounded-2xl text-slate-500 hover:bg-slate-50 border-destructive/20 hover:border-destructive" disabled={isAuthenticating}>
              Sol·licitar nou compte
            </Button>
          </CardFooter>
        </Card>
        <p className="text-center mt-10 text-[10px] text-white/40 font-bold tracking-widest">{BRANDING.companyName} © 2024</p>
      </div>
    </main>
  )
}
