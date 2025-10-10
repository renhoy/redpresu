import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth/server'
import { Header } from '@/components/layout/Header'

export default async function UsersLayout({
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
      <Header userRole={user.role} userName={user.nombre} />
      <main>
        {children}
      </main>
    </div>
  )
}
