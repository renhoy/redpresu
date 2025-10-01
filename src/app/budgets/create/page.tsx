import { getTariffById } from '@/app/actions/tariffs'
import { BudgetForm } from '@/components/budgets/BudgetForm'
import { redirect } from 'next/navigation'

interface PageProps {
  searchParams: { tariff_id?: string }
}

export default async function CreateBudgetPage({ searchParams }: PageProps) {
  const { tariff_id } = searchParams

  // Si no hay tariff_id, redirigir a tariffs
  if (!tariff_id) {
    redirect('/tariffs?message=select-tariff')
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
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6">
        {/* Formulario */}
        <BudgetForm tariff={tariff} />
      </div>
    </div>
  )
}