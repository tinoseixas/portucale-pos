
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="relative flex min-h-screen w-full flex-col">
      <main className="flex-1 container py-8 pb-24 md:pb-8">
        {children}
      </main>
    </div>
  )
}
