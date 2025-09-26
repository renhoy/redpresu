import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth/server'

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
      <main className="container mx-auto py-6 px-4">
        {children}
      </main>
    </div>
  )
}