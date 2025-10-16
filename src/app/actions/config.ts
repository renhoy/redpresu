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

    // Superadmin puede editar TODO, incluso configs de sistema
    // Se elimina la restricción is_system

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

    // Revalidar rutas relevantes según la key modificada
    revalidatePath('/settings')

    // Si se modifican colores por defecto, revalidar páginas de tarifas
    if (key === 'default_colors' || key === 'default_primary_color' || key === 'default_secondary_color') {
      revalidatePath('/tariffs')
      revalidatePath('/tariffs/create')
    }

    // Si se modifica el nombre de la app, revalidar todas las páginas
    if (key === 'app_name') {
      revalidatePath('/', 'layout')
    }

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
      // Devolver valores por defecto si no existe en BD (formato con 2 decimales)
      return {
        success: true,
        data: {
          '21.00': 5.20,
          '10.00': 1.40,
          '4.00': 0.50
        }
      }
    }

    return { success: true, data: data.value as Record<string, number> }
  } catch (error) {
    console.error('[getIVAtoREEquivalencesAction] Error:', error)
    return { success: false, error: 'Error obteniendo equivalencias RE' }
  }
}

/**
 * Tipo para plantilla PDF
 */
export interface PDFTemplate {
  id: string
  name: string
  description: string
}

/**
 * Obtiene las plantillas PDF disponibles
 * Acción pública (no requiere superadmin)
 */
export async function getPDFTemplatesAction(): Promise<{
  success: boolean
  data?: PDFTemplate[]
  error?: string
}> {
  try {
    const { data, error } = await supabaseAdmin
      .from('config')
      .select('value')
      .eq('key', 'pdf_templates')
      .single()

    if (error || !data) {
      // Devolver plantillas por defecto si no existe en BD
      return {
        success: true,
        data: [
          { id: 'modern', name: 'Moderna', description: 'Diseño limpio y minimalista' },
          { id: 'classic', name: 'Clásica', description: 'Diseño tradicional profesional' },
          { id: 'elegant', name: 'Elegante', description: 'Diseño sofisticado con detalles' }
        ]
      }
    }

    return { success: true, data: data.value as PDFTemplate[] }
  } catch (error) {
    console.error('[getPDFTemplatesAction] Error:', error)
    return { success: false, error: 'Error obteniendo plantillas PDF' }
  }
}

/**
 * Interfaz para valores por defecto de tarifa
 */
export interface TariffDefaults {
  primary_color: string
  secondary_color: string
  template: string
}

/**
 * Obtiene los valores por defecto para crear una tarifa
 * Acción pública (no requiere superadmin)
 */
export async function getTariffDefaultsAction(): Promise<{
  success: boolean
  data?: TariffDefaults
  error?: string
}> {
  try {
    // Obtener colores y plantilla por defecto de configuración
    // Soportar tanto default_colors (objeto) como default_primary_color/default_secondary_color (separados)
    const { data, error } = await supabaseAdmin
      .from('config')
      .select('key, value')
      .in('key', ['default_colors', 'default_primary_color', 'default_secondary_color', 'default_pdf_template'])

    if (error) {
      console.error('[getTariffDefaultsAction] Error:', error)
    }

    // Construir objeto de valores por defecto
    const defaults: TariffDefaults = {
      primary_color: '#e8951c', // Valores por defecto fallback
      secondary_color: '#109c61',
      template: '41200-00001'
    }

    // Aplicar valores de configuración si existen
    if (data && Array.isArray(data)) {
      let defaultColorsObj: { primary?: string; secondary?: string } | null = null

      // Primera pasada: buscar default_colors (objeto)
      data.forEach((config) => {
        if (config.key === 'default_colors' && config.value) {
          defaultColorsObj = config.value as { primary?: string; secondary?: string }
        } else if (config.key === 'default_pdf_template' && config.value) {
          defaults.template = config.value as string
        }
      })

      // Si existe default_colors como objeto, usarlo
      if (defaultColorsObj) {
        if (defaultColorsObj.primary) {
          defaults.primary_color = defaultColorsObj.primary
        }
        if (defaultColorsObj.secondary) {
          defaults.secondary_color = defaultColorsObj.secondary
        }
      } else {
        // Si no, buscar valores separados (backward compatibility)
        data.forEach((config) => {
          if (config.key === 'default_primary_color' && config.value) {
            defaults.primary_color = config.value as string
          } else if (config.key === 'default_secondary_color' && config.value) {
            defaults.secondary_color = config.value as string
          }
        })
      }
    }

    console.log('[getTariffDefaultsAction] Defaults:', defaults)
    return { success: true, data: defaults }
  } catch (error) {
    console.error('[getTariffDefaultsAction] Error inesperado:', error)
    // Devolver valores por defecto aunque haya error
    return {
      success: true,
      data: {
        primary_color: '#e8951c',
        secondary_color: '#109c61',
        template: '41200-00001'
      }
    }
  }
}
