import { Suspense } from 'react'
import { getServerUser } from '@/lib/auth/server'
import { redirect } from 'next/navigation'
import { TariffList } from '@/components/tariffs/TariffList'
import { getTariffs } from '@/app/actions/tariffs'
import { createClient } from '@/lib/supabase/server'

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

  // Obtener usuarios de la empresa (para filtro admin)
  let users = []
  if (['admin', 'superadmin'].includes(user.role)) {
    const supabase = await createClient()
    const { data } = await supabase
      .from('users')
      .select('id, nombre, apellidos')
      .eq('empresa_id', user.empresa_id)
      .eq('status', 'active')
      .order('nombre')

    users = data || []
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <Suspense fallback={
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      }>
        <TariffList
          empresaId={user.empresa_id}
          initialTariffs={initialTariffs}
          users={users}
          currentUserRole={user.role}
        />
      </Suspense>
    </div>
  )
}