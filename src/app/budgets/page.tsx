import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { getBudgets } from '@/app/actions/budgets'
import { BudgetsTable } from '@/components/budgets/BudgetsTable'

interface PageProps {
  searchParams: Promise<{ budget_id?: string }>
}

export default async function BudgetsPage({ searchParams }: PageProps) {
  const { budget_id } = await searchParams
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

  return (
    <div className="container mx-auto px-4 py-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-lime-700">Presupuestos</h1>
              <p className="text-sm text-lime-600">
                {budget_id ? 'Mostrando presupuesto y sus versiones' : 'Gestiona tus presupuestos creados'}
              </p>
            </div>
            <Link href="/tariffs">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Presupuesto
              </Button>
            </Link>
          </div>

      {/* Tabla de presupuestos */}
      <BudgetsTable budgets={filteredBudgets} budgetId={budget_id} />
    </div>
  )
}