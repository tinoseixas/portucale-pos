import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Portucale - Restaurante',
  description: 'Gestão de Restaurante Portucale - Sabors de Portugal',
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="relative flex min-h-screen w-full flex-col bg-background">
      <Header />
      <main className="flex-1 w-full max-w-7xl mx-auto py-6 md:py-10 pb-24 md:pb-12 px-4 md:px-8">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
