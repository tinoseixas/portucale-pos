'use client'

import Link from 'next/link'
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Button } from '@/components/ui/button'
import { LogOut, User as UserIcon, Users } from 'lucide-react'
import { useAuth, useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase'
import { signOut } from 'firebase/auth'
import { useRouter } from 'next/navigation'
import type { Employee } from '@/lib/types'
import { doc } from 'firebase/firestore'
import { ADMIN_EMAIL } from '@/lib/admin'
import { useMemo } from 'react'


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
  
  const isUserAdmin = useMemo(() => {
    if (isUserLoading || !user) return false;
    return user.email === ADMIN_EMAIL;
  }, [user, isUserLoading]);

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
        <Link href="/dashboard" className="flex flex-col items-start">
          <span className="font-bold text-lg">TS Serveis</span>
          <span className="text-xs text-muted-foreground leading-tight">convertim les teves idees en realitat</span>
        </Link>
        
        {user && (
          <div className="flex items-center gap-4">
             <div className="hidden sm:flex items-center gap-4">
                {employee?.firstName && (
                    <span className="text-sm font-medium">
                    Bona feina, {employee.firstName}!
                    </span>
                )}
                {isUserAdmin && (
                    <Button variant="outline" size="sm" onClick={() => router.push('/dashboard/users')}>
                        <Users className="mr-2 h-4 w-4" />
                        Gestionar Usuaris
                    </Button>
                )}
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
                <DropdownMenuSeparator />
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
