'use client'

import Link from 'next/navigation'
import Image from 'next/image'
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Button } from '@/components/ui/button'
import { LogOut, User as UserIcon, Users, Building, FileText, FileArchive, FileSignature, Receipt, LineChart } from 'lucide-react'
import { useAuth, useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase'
import { signOut } from 'firebase/auth'
import { useRouter } from 'next/navigation'
import type { Employee } from '@/lib/types'
import { doc } from 'firebase/firestore'


export function Header() {
  const { user, isUserLoading } = useUser()
  const auth = useAuth()
  const firestore = useFirestore()
  const router = useRouter()

  const employeeDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'employees', user.uid);
  }, [firestore, user]);

  const { data: employee } = useDoc<Employee>(employeeDocRef);
  
  const handleLogout = async () => {
    if (!auth) return;
    await signOut(auth)
    router.push('/')
  }
  
  const getInitials = (email: string | null | undefined, employee?: Employee | null) => {
    if (employee?.firstName && employee?.lastName) return `${employee.firstName[0]}${employee.lastName[0]}`.toUpperCase();
    if (employee?.firstName) return employee.firstName[0].toUpperCase();
    if (!email) return 'U'
    return email[0].toUpperCase();
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <a href="/dashboard" className="flex items-center gap-3">
          <div className="relative h-10 w-32 md:w-40">
            <Image 
              src="/logo.png" 
              alt="TS Serveis Logo" 
              fill 
              style={{ objectFit: 'contain' }}
              priority
            />
          </div>
        </a>
        
        {isUserLoading ? (
            <div className="flex items-center gap-4">
                <div className="h-8 w-24 rounded-md bg-muted animate-pulse" />
                <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
            </div>
        ) : user && (
          <div className="flex items-center gap-4">
             <div className="hidden lg:flex items-center gap-2 flex-wrap justify-end">
                <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/activity-report')} className="font-bold">
                    <LineChart className="mr-2 h-4 w-4" />
                    Informes
                </Button>
                <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/invoices/history')} className="font-bold">
                    <Receipt className="mr-2 h-4 w-4" />
                    Factures
                </Button>
                <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/quotes/history')} className="font-bold">
                    <FileSignature className="mr-2 h-4 w-4" />
                    Pressupostos
                </Button>
                <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/albarans')} className="font-bold">
                    <FileArchive className="mr-2 h-4 w-4" />
                    Albarans
                </Button>
                <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/customers')} className="font-bold">
                    <Building className="mr-2 h-4 w-4" />
                    Clients
                </Button>
              </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                 <Button variant="ghost" className="relative h-10 w-10 rounded-full border-2 border-primary/20">
                    <Avatar className="h-full w-full">
                      <AvatarImage src={employee?.avatar ?? user.photoURL ?? undefined} alt={user.email ?? 'User'} />
                      <AvatarFallback>{getInitials(user.email, employee)}</AvatarFallback>
                    </Avatar>
                 </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-black">{employee?.firstName ? `${employee.firstName} ${employee.lastName}`: user.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push('/dashboard/profile')}>
                    <UserIcon className="mr-2 h-4 w-4" />
                    <span>Perfil</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="lg:hidden" onClick={() => router.push('/dashboard/users')}>
                    <Users className="mr-2 h-4 w-4" />
                    <span>Gestió Usuaris</span>
                </DropdownMenuItem>
                 <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:bg-destructive focus:text-destructive-foreground">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Tanca la sessió</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    </header>
  )
}