import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { getBudgets } from '@/app/actions/budgets'
import { BudgetsTable } from '@/components/budgets/BudgetsTable'

export default async function BudgetsPage() {
  const budgets = await getBudgets()

  return (
    <div className="container mx-auto px-4 py-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold">Presupuestos</h1>
              <p className="text-sm text-muted-foreground">
                Gestiona tus presupuestos creados
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
      <BudgetsTable budgets={budgets} />
    </div>
  )
}