
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, User as UserIcon, Users, Building, FileArchive, FileSignature, Receipt, LineChart } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUser } from '@/firebase'

export function BottomNav() {
  const pathname = usePathname()
  const { user, isUserLoading } = useUser()

  const navItems = [
    { href: '/dashboard', icon: LayoutDashboard, label: 'Serveis' },
    { href: '/dashboard/activity-report', icon: LineChart, label: 'Informes' },
    { href: '/dashboard/quotes', icon: FileSignature, label: 'Pressupostos' },
    { href: '/dashboard/invoices/history', icon: Receipt, label: 'Factures' },
    { href: '/dashboard/albarans', icon: FileArchive, label: 'Albarans' },
    { href: '/dashboard/customers', icon: Building, label: 'Clients' },
    { href: '/dashboard/users', icon: Users, label: 'Usuaris' },
    { href: '/dashboard/profile', icon: UserIcon, label: 'Perfil' },
  ];

  if (isUserLoading) {
      return (
         <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden">
            <div className="container grid h-16 w-full grid-flow-col auto-cols-fr items-center">
                {Array.from({ length: 5 }).map((_, i) => <div key={i}></div>)}
            </div>
        </nav>
      )
  }
  
  if (!user) {
    return null;
  }


  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden">
      <div className="container flex h-16 w-full items-center justify-between overflow-x-auto gap-1 px-2">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href) && (item.href !== '/dashboard' || pathname === '/dashboard');
           
           // Hide sub-navigation items to keep the bar clean
           if (item.href === '/dashboard/quotes' && (pathname.startsWith('/dashboard/quotes/history') || pathname.startsWith('/dashboard/quotes/edit') || /^\/dashboard\/quotes\/[^/]+$/.test(pathname))) {
             return null;
           }
           
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center gap-1 transition-colors p-1 rounded-lg flex-1 min-w-[64px]',
                isActive ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-[10px] font-bold text-center leading-tight">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
