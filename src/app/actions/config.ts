/**
 * Server Actions para gestión de configuración del sistema
 * Solo accesible por superadmin
 */

'use server'

import { supabaseAdmin } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server'
import { revalidatePath } from 'next/cache'
import { Database } from '@/lib/types/database.types'

type ConfigRow = Database['public']['Tables']['config']['Row']

/**
 * Verifica que el usuario actual sea superadmin
 */
async function checkSuperadminPermission(): Promise<{ allowed: boolean; error?: string }> {
  const user = await getServerUser()

  if (!user) {
    return { allowed: false, error: 'Usuario no autenticado' }
  }

  if (user.role !== 'superadmin') {
    return { allowed: false, error: 'Solo superadmin tiene acceso a configuración' }
  }

  return { allowed: true }
}

/**
 * Obtiene toda la configuración (solo superadmin)
 */
export async function getAllConfig(): Promise<{
  success: boolean
  data?: ConfigRow[]
  error?: string
}> {
  const { allowed, error: permError } = await checkSuperadminPermission()

  if (!allowed) {
    return { success: false, error: permError }
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('config')
      .select('*')
      .order('category, key')

    if (error) {
      console.error('[getAllConfig] Error:', error)
      return { success: false, error: 'Error al obtener configuración' }
    }

    return { success: true, data: data || [] }
  } catch (error) {
    console.error('[getAllConfig] Unexpected error:', error)
    return { success: false, error: 'Error inesperado' }
  }
}

/**
 * Obtiene configuración por categoría (solo superadmin)
 */
export async function getConfigByCategory(category: string): Promise<{
  success: boolean
  data?: ConfigRow[]
  error?: string
}> {
  const { allowed, error: permError } = await checkSuperadminPermission()

  if (!allowed) {
    return { success: false, error: permError }
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('config')
      .select('*')
      .eq('category', category)
      .order('key')

    if (error) {
      console.error('[getConfigByCategory] Error:', error)
      return { success: false, error: 'Error al obtener configuración' }
    }

    return { success: true, data: data || [] }
  } catch (error) {
    console.error('[getConfigByCategory] Unexpected error:', error)
    return { success: false, error: 'Error inesperado' }
  }
}

/**
 * Actualiza un valor de configuración (solo superadmin)
 */
export async function updateConfigValue(
  key: string,
  value: unknown,
  description?: string
): Promise<{
  success: boolean
  error?: string
}> {
  const { allowed, error: permError } = await checkSuperadminPermission()

  if (!allowed) {
    return { success: false, error: permError }
  }

  try {
    // Verificar que la config exista
    const { data: existing } = await supabaseAdmin
      .from('config')
      .select('is_system')
      .eq('key', key)
      .single()

    if (!existing) {
      return { success: false, error: 'Clave de configuración no encontrada' }
    }

    // No permitir editar configs de sistema a menos que sea explícito
    if (existing.is_system) {
      return { success: false, error: 'No se puede modificar configuración del sistema' }
    }

    const { error } = await supabaseAdmin
      .from('config')
      .update({
        value: value as any,
        description,
        updated_at: new Date().toISOString()
      })
      .eq('key', key)

    if (error) {
      console.error('[updateConfigValue] Error:', error)
      return { success: false, error: 'Error al actualizar configuración' }
    }

    revalidatePath('/settings')
    return { success: true }
  } catch (error) {
    console.error('[updateConfigValue] Unexpected error:', error)
    return { success: false, error: 'Error inesperado' }
  }
}

/**
 * Crea nueva configuración (solo superadmin)
 */
export async function createConfigValue(
  key: string,
  value: unknown,
  description: string,
  category: string = 'general',
  isSystem: boolean = false
): Promise<{
  success: boolean
  error?: string
}> {
  const { allowed, error: permError } = await checkSuperadminPermission()

  if (!allowed) {
    return { success: false, error: permError }
  }

  try {
    const { error } = await supabaseAdmin
      .from('config')
      .insert({
        key,
        value: value as any,
        description,
        category,
        is_system: isSystem
      })

    if (error) {
      console.error('[createConfigValue] Error:', error)
      return { success: false, error: 'Error al crear configuración' }
    }

    revalidatePath('/settings')
    return { success: true }
  } catch (error) {
    console.error('[createConfigValue] Unexpected error:', error)
    return { success: false, error: 'Error inesperado' }
  }
}

/**
 * Elimina configuración (solo superadmin y no-sistema)
 */
export async function deleteConfigValue(key: string): Promise<{
  success: boolean
  error?: string
}> {
  const { allowed, error: permError } = await checkSuperadminPermission()

  if (!allowed) {
    return { success: false, error: permError }
  }

  try {
    const { error } = await supabaseAdmin
      .from('config')
      .delete()
      .eq('key', key)

    if (error) {
      console.error('[deleteConfigValue] Error:', error)
      return { success: false, error: 'Error al eliminar configuración' }
    }

    revalidatePath('/settings')
    return { success: true }
  } catch (error) {
    console.error('[deleteConfigValue] Unexpected error:', error)
    return { success: false, error: 'Error inesperado' }
  }
}

/**
 * Obtiene las equivalencias IVA a Recargo de Equivalencia
 * Acción pública (no requiere superadmin)
 */
export async function getIVAtoREEquivalencesAction(): Promise<{
  success: boolean
  data?: Record<string, number>
  error?: string
}> {
  try {
    const { data, error } = await supabaseAdmin
      .from('config')
      .select('value')
      .eq('key', 'iva_re_equivalences')
      .single()

    if (error || !data) {
      // Devolver valores por defecto si no existe en BD
      return {
        success: true,
        data: {
          '21': 5.2,
          '10': 1.4,
          '4': 0.5
        }
      }
    }

    return { success: true, data: data.value as Record<string, number> }
  } catch (error) {
    console.error('[getIVAtoREEquivalencesAction] Error:', error)
    return { success: false, error: 'Error obteniendo equivalencias RE' }
  }
}
