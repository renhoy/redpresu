import { getBudgets } from '@/app/actions/budgets'
import { BudgetsTable } from '@/components/budgets/BudgetsTable'

interface PageProps {
  searchParams: Promise<{ budget_id?: string; tariff_id?: string }>
}

export default async function BudgetsPage({ searchParams }: PageProps) {
  const { tariff_id } = await searchParams
  const allBudgets = await getBudgets()

  // Filtrar por tariff_id si se proporciona
  let filteredBudgets = allBudgets
  if (tariff_id) {
    filteredBudgets = filteredBudgets.filter(b => b.tariff_id === tariff_id)
  }

  return (
    <div className="min-h-screen bg-lime-50">
      <div className="container mx-auto px-4 py-6">
        {/* Tabla de presupuestos */}
        <BudgetsTable
          budgets={filteredBudgets}
          allBudgets={allBudgets}
          tariffId={tariff_id}
        />
      </div>
    </div>
  )
}