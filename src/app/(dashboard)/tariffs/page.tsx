import { Suspense } from 'react'
import { getServerUser } from '@/lib/auth/server'
import { redirect } from 'next/navigation'
import { TariffList } from '@/components/tariffs/TariffList'
import { getTariffs } from '@/app/actions/tariffs'

export default async function TariffsPage() {
  // El layout ya maneja la autenticación, solo obtenemos el usuario
  const user = await getServerUser()

  if (!user || !user.empresa_id) {
    redirect('/login')
  }

  // Cargar tarifas iniciales
  let initialTariffs = []
  try {
    initialTariffs = await getTariffs(user.empresa_id)
  } catch (error) {
    console.error('Error loading initial tariffs:', error)
  }

  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    }>
      <TariffList
        empresaId={user.empresa_id}
        initialTariffs={initialTariffs}
      />
    </Suspense>
  )
}