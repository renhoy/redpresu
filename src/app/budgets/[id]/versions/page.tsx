import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { getBudgetVersions } from '@/app/actions/budget-versions'
import { VersionTimeline } from '@/components/budgets/VersionTimeline'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface PageProps {
  params: Promise<{
    id: string
  }>
}

export default async function BudgetVersionsPage({ params }: PageProps) {
  const { id } = await params

  // Verificar autenticación
  const user = await getServerUser()
  if (!user) {
    redirect('/login')
  }

  // Obtener el presupuesto para verificar permisos y mostrar info
  const { data: budget, error: budgetError } = await supabaseAdmin
    .from('budgets')
    .select(`
      *,
      tariffs (
        title
      ),
      users (
        name,
        empresa_id
      )
    `)
    .eq('id', id)
    .single()

  if (budgetError || !budget) {
    redirect('/budgets')
  }

  // Verificar que el usuario pertenece a la misma empresa
  const budgetUser = Array.isArray(budget.users) ? budget.users[0] : budget.users
  if (budgetUser && budgetUser.empresa_id !== user.empresa_id) {
    redirect('/budgets')
  }

  // Obtener versiones del presupuesto
  const versionsResult = await getBudgetVersions(id)
  const versions = versionsResult.success ? versionsResult.data || [] : []

  const tariffTitle = budget.tariffs
    ? (Array.isArray(budget.tariffs) ? budget.tariffs[0]?.title : budget.tariffs.title)
    : 'Sin tarifa'

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Link href={`/budgets/${id}/edit`}>
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Volver al presupuesto
                </Button>
              </Link>
            </div>
            <h1 className="text-3xl font-bold">Versiones del Presupuesto</h1>
            <p className="text-muted-foreground mt-1">
              Cliente: <span className="font-semibold">{budget.client_name}</span> •
              Tarifa: <span className="font-semibold">{tariffTitle}</span>
            </p>
          </div>
        </div>

        {/* Información */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-900">
            <strong>💡 Historial de versiones:</strong> Aquí puedes ver todas las versiones guardadas de este presupuesto.
            Cada versión es un snapshot completo que incluye datos del cliente y del presupuesto en un momento específico.
          </p>
          <p className="text-sm text-blue-900 mt-2">
            <strong>Restaurar:</strong> Al restaurar una versión, el estado actual se guardará automáticamente
            como una nueva versión, por lo que no perderás ningún dato.
          </p>
        </div>

        {/* Timeline de versiones */}
        <VersionTimeline
          versions={versions}
          currentUserId={user.id}
          currentUserRole={user.role}
        />

        {/* Botón volver (inferior) */}
        <div className="flex justify-center pt-4">
          <Link href={`/budgets/${id}/edit`}>
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver al presupuesto
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
