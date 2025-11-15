'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, PlusCircle, FileText, User as UserIcon, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUser } from '@/firebase'
import { ADMIN_EMAIL } from '@/lib/admin'

export function BottomNav() {
  const pathname = usePathname()
  const { user, isUserLoading } = useUser()

  const isUserAdmin = user?.email === ADMIN_EMAIL;

  const navItems = [
    { href: '/dashboard', icon: LayoutDashboard, label: 'Serveis' },
    { href: '/dashboard/new', icon: PlusCircle, label: 'Nou' },
    { href: '/dashboard/report', icon: FileText, label: 'Informe' },
  ];

  if (isUserAdmin) {
    navItems.push({ href: '/dashboard/users', icon: Users, label: 'Usuaris' });
  }
  
  navItems.push({ href: '/dashboard/profile', icon: UserIcon, label: 'Perfil' });

  if (isUserLoading) {
      return (
         <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden">
            <div className="container grid h-16 w-full grid-flow-col auto-cols-fr items-center">
                {/* Render a placeholder or nothing while loading */}
            </div>
        </nav>
      )
  }


  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden">
      <div className="container grid h-16 w-full grid-flow-col auto-cols-fr items-center">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center gap-1 transition-colors p-1 rounded-lg',
                isActive ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <item.icon className="h-6 w-6" />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
