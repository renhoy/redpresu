import { getTariffById } from '@/app/actions/tariffs'
import { getBudgetById } from '@/app/actions/budgets'
import { BudgetForm } from '@/components/budgets/BudgetForm'
import { redirect } from 'next/navigation'

interface PageProps {
  searchParams: Promise<{ tariff_id?: string; budget_id?: string }>
}

export default async function CreateBudgetPage({ searchParams }: PageProps) {
  const { tariff_id, budget_id } = await searchParams

  // Si no hay tariff_id, redirigir a tariffs
  if (!tariff_id) {
    redirect('/tariffs?message=select-tariff')
  }

  // Si hay budget_id, cargar borrador existente
  let existingBudget = null
  if (budget_id) {
    existingBudget = await getBudgetById(budget_id)

    // Validar que el borrador pertenece a la tarifa correcta
    if (existingBudget && existingBudget.tariff_id !== tariff_id) {
      redirect('/tariffs?message=budget-tariff-mismatch')
    }
  }

  // Cargar la tarifa específica
  const tariff = await getTariffById(tariff_id)

  // Si la tarifa no existe o está inactiva, redirigir
  if (!tariff) {
    redirect('/tariffs?message=tariff-not-found')
  }

  if (tariff.status !== 'Activa') {
    redirect('/tariffs?message=tariff-inactive')
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-6">
        {/* Formulario */}
        <BudgetForm tariff={tariff} existingBudget={existingBudget} />
      </div>
    </div>
  )
}