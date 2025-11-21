import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth/server'
import { getDashboardStats } from '@/app/actions/dashboard'
import { userHasBudgets } from '@/app/actions/budgets'
import { getAllHelpArticles, filterArticlesByRole } from '@/lib/helpers/markdown-helpers'
import { getConfigValue } from '@/lib/helpers/config-helpers'
import { DashboardClient } from '@/components/dashboard/DashboardClient'

export default async function DashboardPage() {
  const user = await getServerUser()

  if (!user) {
    redirect('/login')
  }

  // Verificar si el usuario tiene perfil incompleto (issuer_id IS NULL)
  const hasIncompleteProfile = !user.issuer_id

  // Obtener aviso legal para el modal
  const legalNoticeResult = await getConfigValue('forms_legal_notice')
  const legalNotice = legalNoticeResult.success
    ? (legalNoticeResult.value as string)
    : ''

  // Si el usuario tiene perfil incompleto, no cargar estadísticas (fallarían por company_id null)
  let stats = null
  let hasBudgets = false
  let primerosPasosArticles: any[] = []

  if (!hasIncompleteProfile) {
    // Obtener estadísticas iniciales (mes actual)
    stats = await getDashboardStats('mes')

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
    hasBudgets = await userHasBudgets()

    // Obtener artículos de ayuda de "Primeros pasos" filtrados por rol
    const allArticles = await getAllHelpArticles()
    const userArticles = filterArticlesByRole(allArticles, user.role)
    primerosPasosArticles = userArticles.filter(a => a.category === 'Primeros pasos')
  }

  return (
    <DashboardClient
      initialStats={stats}
      userRole={user.role}
      hasBudgets={hasBudgets}
      helpArticles={primerosPasosArticles}
      hasIncompleteProfile={hasIncompleteProfile}
      userName={user.name}
      userEmail={user.email}
      legalNotice={legalNotice}
    />
  )
}
