import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth/server'
import { getAppName } from '@/lib/helpers/config-helpers'
import { Header } from '@/components/layout/Header'
import { userHasBudgets } from '@/app/actions/budgets'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getServerUser()

  if (!user) {
    redirect('/login')
  }

  // Verificar si el usuario tiene presupuestos
  const hasBudgets = await userHasBudgets()

  // Obtener nombre de la aplicación
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
