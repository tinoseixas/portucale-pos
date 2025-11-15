'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { User, Lock, Briefcase } from 'lucide-react'
import { useToast } from "@/hooks/use-toast"

export default function Home() {
  const router = useRouter()
  const { toast } = useToast()
  const [employeeId, setEmployeeId] = useState('')
  const [password, setPassword] = useState('')
  
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    // Simple mock validation
    if (employeeId === 'usuari' && password === 'clau') {
      toast({
        title: "Sessió iniciada",
        description: "Benvingut de nou!",
      })
      router.push('/dashboard')
    } else {
      toast({
        variant: "destructive",
        title: "Error d'inici de sessió",
        description: "Credencials incorrectes. Intenta-ho de nou.",
      })
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-2xl">
          <CardHeader className="text-center">
            <div className="mx-auto bg-primary/20 text-primary p-3 rounded-full w-fit mb-4">
               <Briefcase size={32} />
            </div>
            <CardTitle className="text-3xl font-bold">Registre Diari de Treball</CardTitle>
            <CardDescription>Identifica't per registrar els teus serveis</CardDescription>
          </CardHeader>
          <form onSubmit={handleLogin}>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="employee-id">Nom d'usuari</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input 
                    id="employee-id" 
                    placeholder="Escriu 'usuari'" 
                    required 
                    className="pl-10"
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
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
                    placeholder="Escriu 'clau'"
                    required 
                    className="pl-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full">
                Entra
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </main>
  )
}
