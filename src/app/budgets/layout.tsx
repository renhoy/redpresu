import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth/server'

export default async function BudgetsLayout({
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
      <main>
        {children}
      </main>
    </div>
  )
}