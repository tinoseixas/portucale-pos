
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, User as UserIcon, Users, Building, FileArchive, FileSignature, Receipt, LineChart, Briefcase } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUser } from '@/firebase'

export function BottomNav() {
  const pathname = usePathname()
  const { user, isUserLoading } = useUser()

  const navItems = [
    { href: '/dashboard', icon: LayoutDashboard, label: 'Serveis' },
    { href: '/dashboard/activity-report', icon: LineChart, label: 'Hores' },
    { href: '/dashboard/projects', icon: Briefcase, label: 'Obres' },
    { href: '/dashboard/quotes', icon: FileSignature, label: 'Presu.' },
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
                {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-8 w-8 bg-slate-100 rounded-full animate-pulse mx-auto"></div>)}
            </div>
        </nav>
      )
  }
  
  if (!user) {
    return null;
  }


  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-white/95 backdrop-blur-xl supports-[backdrop-filter]:bg-white/60 md:hidden shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
      <div className="container flex h-20 w-full items-center justify-between overflow-x-auto gap-1 px-4 scrollbar-hide">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href) && (item.href !== '/dashboard' || pathname === '/dashboard');
           
           if (item.href === '/dashboard/quotes' && (pathname.startsWith('/dashboard/quotes/history') || pathname.startsWith('/dashboard/quotes/edit') || /^\/dashboard\/quotes\/[^/]+$/.test(pathname))) {
             return null;
           }
           
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center gap-1.5 transition-all p-2 rounded-2xl min-w-[65px] h-16',
                isActive 
                  ? 'text-primary bg-primary/10 font-black scale-105 shadow-inner' 
                  : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
              )}
            >
              <item.icon className={cn("h-6 w-6 transition-transform", isActive && "scale-110")} />
              <span className="text-[9px] font-black text-center leading-none uppercase tracking-tighter">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
