import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { TariffList } from '@/components/tariffs/TariffList'
import { getTariffs } from '@/app/actions/tariffs'

export default async function TariffsPage() {
  const supabase = createClient()

  // Verificar autenticación
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    redirect('/login')
  }

  // Obtener datos del usuario y empresa
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('empresa_id, role')
    .eq('id', user.id)
    .single()

  if (userError || !userData || !userData.empresa_id) {
    redirect('/login')
  }

  // Cargar tarifas iniciales
  let initialTariffs = []
  try {
    initialTariffs = await getTariffs(userData.empresa_id)
  } catch (error) {
    console.error('Error loading initial tariffs:', error)
  }

  return (
    <div className="container mx-auto py-6 px-4">
      <Suspense fallback={
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      }>
        <TariffList
          empresaId={userData.empresa_id}
          initialTariffs={initialTariffs}
        />
      </Suspense>
    </div>
  )
}