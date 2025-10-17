import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth/server'
import { getAppName } from '@/lib/helpers/config-helpers'
import { Header } from '@/components/layout/Header'
import { userHasBudgets } from '@/app/actions/budgets'

export default async function BudgetsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getServerUser()

  if (!user) {
    redirect('/login')
  }

  const hasBudgets = await userHasBudgets()
  const appName = await getAppName()

  return (
    <div className="min-h-screen bg-background">
      <Header userRole={user.role} userName={user.name} hasBudgets={hasBudgets} appName={appName} />
      <main>
        {children}
      </main>
    </div>
  )
}