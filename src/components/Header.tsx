'use client'

import Link from 'next/link'
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Button } from '@/components/ui/button'
import { LogOut, User as UserIcon, Users, Building, FileText, FileArchive, FileSignature, Receipt } from 'lucide-react'
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
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-primary-foreground">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <div className="flex flex-col items-start">
            <span className="font-bold text-lg">TS Serveis</span>
            <span className="text-xs text-muted-foreground leading-tight">convertim les teves idees en realitat</span>
          </div>
        </Link>
        
        {/* Only render the user section once loading is complete */}
        {isUserLoading ? (
            <div className="flex items-center gap-4">
                <div className="h-8 w-24 rounded-md bg-muted animate-pulse" />
                <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
            </div>
        ) : user && (
          <div className="flex items-center gap-4">
             <div className="hidden sm:flex items-center gap-2 flex-wrap justify-end">
                {employee?.firstName && (
                    <span className="text-sm font-medium">
                    Bona feina, {employee.firstName}!
                    </span>
                )}
                <>
                    <Button variant="outline" size="sm" onClick={() => router.push('/dashboard/invoices/history')}>
                        <Receipt className="mr-2 h-4 w-4" />
                        Factures
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => router.push('/dashboard/quotes')}>
                        <FileSignature className="mr-2 h-4 w-4" />
                        Pressupostos
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => router.push('/dashboard/reports')}>
                        <FileText className="mr-2 h-4 w-4" />
                        Albarans
                    </Button>
                     <Button variant="outline" size="sm" onClick={() => router.push('/dashboard/albarans')}>
                        <FileArchive className="mr-2 h-4 w-4" />
                        Historial Albarans
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => router.push('/dashboard/customers')}>
                        <Building className="mr-2 h-4 w-4" />
                        Gestionar Clients
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => router.push('/dashboard/users')}>
                        <Users className="mr-2 h-4 w-4" />
                        Gestionar Usuaris
                    </Button>
                </>
              </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                 <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={employee?.avatar ?? user.photoURL ?? undefined} alt={user.email ?? 'User'} />
                      <AvatarFallback>{getInitials(user.email, employee)}</AvatarFallback>
                    </Avatar>
                 </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>{employee?.firstName ? `${employee.firstName} ${employee.lastName}`: user.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push('/dashboard/profile')}>
                    <UserIcon className="mr-2 h-4 w-4" />
                    <span>Perfil</span>
                </DropdownMenuItem>
                 <DropdownMenuItem onClick={handleLogout}>
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
