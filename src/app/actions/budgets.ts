'use server'

import { cookies } from 'next/headers'
import { createServerActionClient } from '@supabase/auth-helpers-nextjs'
import { supabaseAdmin } from '@/lib/supabase/server'
import { Tariff } from '@/lib/types/database'

/**
 * Obtiene las tarifas activas de la empresa del usuario actual
 */
export async function getActiveTariffs(): Promise<Tariff[]> {
  try {
    console.log('[getActiveTariffs] Obteniendo tarifas activas...')

    const cookieStore = await cookies()
    const supabase = createServerActionClient({ cookies: () => cookieStore })

    // Obtener usuario actual
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.error('[getActiveTariffs] Error de autenticación:', authError)
      return []
    }

    // Obtener empresa_id del usuario
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('empresa_id')
      .eq('id', user.id)
      .single()

    if (userError || !userData?.empresa_id) {
      console.error('[getActiveTariffs] Error obteniendo empresa:', userError)
      return []
    }

    console.log('[getActiveTariffs] Empresa ID:', userData.empresa_id)

    // Obtener tarifas activas de la empresa
    const { data: tariffs, error: tariffsError } = await supabaseAdmin
      .from('tariffs')
      .select('*')
      .eq('empresa_id', userData.empresa_id)
      .eq('status', 'Activa')
      .order('title')

    if (tariffsError) {
      console.error('[getActiveTariffs] Error obteniendo tarifas:', tariffsError)
      return []
    }

    console.log('[getActiveTariffs] Tarifas encontradas:', tariffs?.length || 0)
    return tariffs || []

  } catch (error) {
    console.error('[getActiveTariffs] Error crítico:', error)
    return []
  }
}

/**
 * Placeholder para crear presupuesto (próxima tarea)
 */
export async function createBudget(budgetData: unknown): Promise<{
  success: boolean
  budgetId?: string
  error?: string
}> {
  // TODO: Implementar en próxima tarea
  console.log('[createBudget] Placeholder - datos recibidos:', budgetData)
  return {
    success: false,
    error: 'Función no implementada - próxima tarea'
  }
}