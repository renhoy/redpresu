import { getActiveTariffs } from '@/app/actions/budgets'
import { BudgetForm } from '@/components/budgets/BudgetForm'
import { redirect } from 'next/navigation'

export default async function CreateBudgetPage() {
  // Cargar tarifas activas
  const activeTariffs = await getActiveTariffs()

  // Si no hay tarifas activas, redirigir con mensaje
  if (!activeTariffs || activeTariffs.length === 0) {
    // TODO: Implementar sistema de mensajes/notificaciones
    redirect('/tariffs?message=no-active-tariffs')
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Crear Presupuesto</h1>
          <p className="text-muted-foreground">
            Selecciona una tarifa y completa los datos del cliente
          </p>
        </div>

        {/* Formulario */}
        <BudgetForm activeTariffs={activeTariffs} />
      </div>
    </div>
  )
}