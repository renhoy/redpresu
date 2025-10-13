import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { getBudgets } from '@/app/actions/budgets'
import { BudgetsTable } from '@/components/budgets/BudgetsTable'

interface PageProps {
  searchParams: Promise<{ budget_id?: string; tariff_id?: string }>
}

export default async function BudgetsPage({ searchParams }: PageProps) {
  const { budget_id, tariff_id } = await searchParams
  const budgets = await getBudgets()

  // Filtrar por budget_id si se proporciona
  let filteredBudgets = budgets
  if (budget_id) {
    // Encontrar el presupuesto específico y todos sus descendientes
    const findBudgetAndChildren = (id: string, list: typeof budgets): typeof budgets => {
      const budget = list.find(b => b.id === id)
      if (!budget) return []

      const result = [budget]

      // Si tiene children, incluirlos recursivamente
      if (budget.children && budget.children.length > 0) {
        budget.children.forEach(child => {
          result.push(...findBudgetAndChildren(child.id, list))
        })
      }

      return result
    }

    filteredBudgets = findBudgetAndChildren(budget_id, budgets)
  }

  // Filtrar por tariff_id si se proporciona
  if (tariff_id) {
    filteredBudgets = filteredBudgets.filter(b => b.tariff_id === tariff_id)
  }

  return (
    <div className="min-h-screen bg-lime-50">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-lime-700">Presupuestos</h1>
          <p className="text-sm text-lime-600">
            {budget_id
              ? 'Mostrando presupuesto y sus versiones'
              : tariff_id
                ? 'Presupuestos generados con esta tarifa'
                : 'Gestiona tus presupuestos creados'}
          </p>
        </div>

        {/* Filtro activo por tariff_id */}
        {tariff_id && (
          <div className="mb-4 flex items-center gap-2">
            <p className="text-sm text-muted-foreground">
              Mostrando presupuestos de esta tarifa
            </p>
            <Button
              variant="outline"
              size="sm"
              asChild
            >
              <Link href="/budgets">
                Ver todos los presupuestos
              </Link>
            </Button>
          </div>
        )}

        {/* Tabla de presupuestos */}
        <BudgetsTable budgets={filteredBudgets} budgetId={budget_id} />
      </div>
    </div>
  )
}