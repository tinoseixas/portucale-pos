
'use client'

import Link from 'next/link'
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Button } from '@/components/ui/button'
import { LogOut, User as UserIcon, Users, Building, FileArchive, FileSignature, Receipt, LineChart, Briefcase, Package } from 'lucide-react'
import { useAuth, useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase'
import { signOut } from 'firebase/auth'
import { useRouter } from 'next/navigation'
import type { Employee } from '@/lib/types'
import { doc } from 'firebase/firestore'
import { Logo } from '@/components/Logo'


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
      <div className="max-w-7xl mx-auto px-4 md:px-8 flex h-16 items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-3">
          <Logo className="h-10 w-auto" />
        </Link>
        
        {isUserLoading ? (
            <div className="flex items-center gap-4">
                <div className="h-8 w-24 rounded-md bg-muted animate-pulse" />
                <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
            </div>
        ) : user && (
          <div className="flex items-center gap-2 md:gap-4">
             <div className="hidden lg:flex items-center gap-2 flex-wrap justify-end">
                <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/activity-report')} className="font-bold">
                    <LineChart className="mr-2 h-4 w-4" />
                    Hores
                </Button>
                <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/projects')} className="font-bold text-primary">
                    <Briefcase className="mr-2 h-4 w-4" />
                    Obres
                </Button>
                <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/invoices/history')} className="font-bold">
                    <Receipt className="mr-2 h-4 w-4" />
                    Factures
                </Button>
                <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/quotes/history')} className="font-bold">
                    <FileSignature className="mr-2 h-4 w-4" />
                    Pressupostos
                </Button>
                <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/articles')} className="font-bold">
                    <Package className="mr-2 h-4 w-4" />
                    Articles
                </Button>
                <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/albarans')} className="font-bold">
                    <FileArchive className="mr-2 h-4 w-4" />
                    Albarans
                </Button>
                <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/customers')} className="font-bold">
                    <Building className="mr-2 h-4 w-4" />
                    Clients
                </Button>
                <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/users')} className="font-bold">
                    <Users className="mr-2 h-4 w-4" />
                    Gestió
                </Button>
              </div>

            <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleLogout} 
                className="font-bold text-destructive hover:bg-destructive/5 rounded-xl h-10 px-3 transition-colors"
            >
                <LogOut className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Tancar sessió</span>
            </Button>

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
                <DropdownMenuItem onClick={() => router.push('/dashboard/articles')}>
                    <Package className="mr-2 h-4 w-4" />
                    <span>Catàleg d'articles</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/dashboard/users')}>
                    <Users className="mr-2 h-4 w-4" />
                    <span>Gestió</span>
                </DropdownMenuItem>
                 <DropdownMenuSeparator />
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
