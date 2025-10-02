import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth/server'
import { Header } from '@/components/layout/Header'

export default async function TariffsLayout({
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
      <Header />
      <main>
        {children}
      </main>
    </div>
  )
}