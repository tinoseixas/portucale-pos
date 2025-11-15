'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Button } from '@/components/ui/button'
import { LogOut, User } from 'lucide-react'
import { useAuth, useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase'
import { signOut } from 'firebase/auth'
import { useRouter } from 'next/navigation'
import type { Employee } from '@/lib/types'
import { doc } from 'firebase/firestore'


export function Header() {
  const { user } = useUser()
  const auth = useAuth()
  const firestore = useFirestore()
  const router = useRouter()

  const employeeDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'employees', user.uid);
  }, [firestore, user]);

  const { data: employee } = useDoc<Employee>(employeeDocRef);

  const handleLogout = async () => {
    await signOut(auth)
    router.push('/')
  }
  
  const getInitials = (email: string | null | undefined, employee?: Employee | null) => {
    if (employee?.firstName) return employee.firstName[0].toUpperCase();
    if (!email) return 'U'
    return email[0].toUpperCase();
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2 font-bold text-lg">
          <Image src="/logo.svg" alt="Logotip" width={120} height={32} />
        </Link>
        
        {user && (
          <div className="flex items-center gap-4">
            <Avatar>
              <AvatarImage src={user.photoURL ?? employee?.avatar} alt={user.email ?? 'User'} />
              <AvatarFallback>{getInitials(user.email, employee)}</AvatarFallback>
            </Avatar>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                 <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.photoURL ?? employee?.avatar} alt={user.email ?? 'User'} />
                      <AvatarFallback>{getInitials(user.email, employee)}</AvatarFallback>
                    </Avatar>
                 </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>{employee?.firstName ? `${employee.firstName} ${employee.lastName}`: user.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push('/dashboard/profile')}>
                    <User className="mr-2 h-4 w-4" />
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
