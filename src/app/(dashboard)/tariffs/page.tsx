import { Suspense } from 'react'
import { getServerUser } from '@/lib/auth/server'
import { redirect } from 'next/navigation'
import { TariffList } from '@/components/tariffs/TariffList'
import { getTariffs } from '@/app/actions/tariffs'
import { supabaseAdmin } from '@/lib/supabase/server'
import { checkSubscriptionStatus } from '@/lib/helpers/subscription-status-checker'

interface PageProps {
  searchParams: Promise<{ tariff_id?: string }>
}

export default async function TariffsPage({ searchParams }: PageProps) {
  const { tariff_id } = await searchParams

  // El layout ya maneja la autenticación, solo obtenemos el usuario
  const user = await getServerUser()

  if (!user || !user.company_id) {
    redirect('/login')
  }

  // Cargar tarifas iniciales
  let initialTariffs = []
  try {
    initialTariffs = await getTariffs(user.company_id)
  } catch (error) {
    console.error('Error loading initial tariffs:', error)
  }

  // Obtener usuarios de la empresa (para filtro admin)
  let users = []
  if (['admin', 'superadmin'].includes(user.role)) {
    const { data } = await supabaseAdmin
      .from('users')
      .select('id, nombre, apellidos')
      .eq('company_id', user.company_id)
      .eq('status', 'active')
      .order('name')

    users = data || []
  }

  // Obtener estado de suscripción para determinar límites
  const subscriptionStatus = await checkSubscriptionStatus()
  const currentPlan = subscriptionStatus.currentPlan

  return (
    <div className="min-h-screen bg-lime-50">
      <div className="container mx-auto px-4 py-6">
        <Suspense fallback={
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        }>
          <TariffList
            empresaId={user.company_id}
            initialTariffs={initialTariffs}
            users={users}
            currentUserRole={user.role}
            tariffId={tariff_id}
            currentPlan={currentPlan}
          />
        </Suspense>
      </div>
    </div>
  )
}