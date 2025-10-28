import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { getBudgets } from '@/app/actions/budgets'
import { getTariffs } from '@/app/actions/tariffs'
import { BudgetsTable } from '@/components/budgets/BudgetsTable'

interface PageProps {
  searchParams: Promise<{ budget_id?: string; tariff_id?: string }>
}

export default async function BudgetsPage({ searchParams }: PageProps) {
  const { tariff_id } = await searchParams
  const budgets = await getBudgets()

  // Obtener tarifas activas para el selector
  const allTariffs = await getTariffs()
  const activeTariffs = allTariffs.filter(t => t.status === 'Activa')

  // Filtrar por tariff_id si se proporciona
  let filteredBudgets = budgets
  if (tariff_id) {
    filteredBudgets = filteredBudgets.filter(b => b.tariff_id === tariff_id)
  }

  return (
    <div className="min-h-screen bg-lime-50">
      <div className="container mx-auto px-4 py-6">
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
        <BudgetsTable budgets={filteredBudgets} activeTariffs={activeTariffs} />
      </div>
    </div>
  )
}