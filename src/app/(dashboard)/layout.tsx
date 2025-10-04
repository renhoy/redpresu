import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth/server'
import { Header } from '@/components/layout/Header'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getServerUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-background">
      <Header userRole={user.role} />
      <main className="pt-16">
        {children}
      </main>
    </div>
  )
}