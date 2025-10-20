import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth/server'
import { getDashboardStats } from '@/app/actions/dashboard'
import { userHasBudgets } from '@/app/actions/budgets'
import { getAllHelpArticles, filterArticlesByRole } from '@/lib/helpers/markdown-helpers'
import { DashboardClient } from '@/components/dashboard/DashboardClient'

export default async function DashboardPage() {
  const user = await getServerUser()

  if (!user) {
    redirect('/login')
  }

  // Obtener estadísticas iniciales (mes actual)
  const stats = await getDashboardStats('mes')

  if (!stats) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-red-600">Error al cargar estadísticas</p>
        </div>
      </div>
    )
  }

  // Verificar si el usuario tiene presupuestos
  const hasBudgets = await userHasBudgets()

  // Obtener artículos de ayuda de "Primeros pasos" filtrados por rol
  const allArticles = await getAllHelpArticles()
  const userArticles = filterArticlesByRole(allArticles, user.role)
  const primerosPasosArticles = userArticles.filter(a => a.category === 'Primeros pasos')

  return (
    <DashboardClient
      initialStats={stats}
      userRole={user.role}
      hasBudgets={hasBudgets}
      helpArticles={primerosPasosArticles}
    />
  )
}
