import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="relative flex min-h-screen w-full flex-col bg-background">
      <Header />
      <main className="flex-1 w-full px-4 md:px-0 py-6 md:py-10 pb-24 md:pb-12">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
