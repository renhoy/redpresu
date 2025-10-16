/**
 * Helpers para acceder a la configuración del sistema
 * Tabla: public.config
 */

import { supabaseAdmin } from '@/lib/supabase/server'

/**
 * Obtiene un valor de configuración por su clave
 * @param key - Clave de configuración
 * @returns Valor parseado del JSON o null si no existe
 */
export async function getConfigValue<T = unknown>(key: string): Promise<T | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('config')
      .select('value')
      .eq('key', key)
      .single()

    if (error || !data) {
      console.warn(`[getConfigValue] Key "${key}" not found:`, error?.message)
      return null
    }

    // El valor ya es un objeto JSON (jsonb en Postgres)
    return data.value as T
  } catch (error) {
    console.error(`[getConfigValue] Error fetching key "${key}":`, error)
    return null
  }
}

/**
 * Establece un valor de configuración (solo superadmin)
 * @param key - Clave de configuración
 * @param value - Valor a guardar (se convertirá a JSON)
 * @param description - Descripción opcional
 * @param category - Categoría opcional
 */
export async function setConfigValue(
  key: string,
  value: unknown,
  description?: string,
  category?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabaseAdmin
      .from('config')
      .upsert({
        key,
        value: value as any, // Supabase manejará la conversión a jsonb
        description,
        category: category || 'general',
        updated_at: new Date().toISOString()
      })

    if (error) {
      console.error(`[setConfigValue] Error setting key "${key}":`, error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error(`[setConfigValue] Unexpected error for key "${key}":`, error)
    return { success: false, error: 'Error inesperado' }
  }
}

/**
 * Tipo para las equivalencias IVA-RE
 */
export interface IVAtoREEquivalences {
  [ivaPercent: string]: number // ej: "21": 5.2, "10": 1.4, "4": 0.5
}

/**
 * Obtiene las equivalencias IVA a Recargo de Equivalencia
 * @returns Objeto con las equivalencias o valores por defecto
 */
export async function getIVAtoREEquivalences(): Promise<IVAtoREEquivalences> {
  const equivalences = await getConfigValue<IVAtoREEquivalences>('iva_re_equivalences')

  // Valores por defecto según normativa española
  return equivalences || {
    '21': 5.2,
    '10': 1.4,
    '4': 0.5
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
 * @returns Array de plantillas disponibles
 */
export async function getPDFTemplates(): Promise<PDFTemplate[]> {
  const templates = await getConfigValue<PDFTemplate[]>('pdf_templates')

  // Plantillas por defecto
  return templates || [
    { id: 'modern', name: 'Moderna', description: 'Diseño limpio y minimalista' },
    { id: 'classic', name: 'Clásica', description: 'Diseño tradicional profesional' },
    { id: 'elegant', name: 'Elegante', description: 'Diseño sofisticado con detalles' }
  ]
}

/**
 * Obtiene la plantilla PDF por defecto
 * @returns ID de la plantilla por defecto
 */
export async function getDefaultPDFTemplate(): Promise<string> {
  const template = await getConfigValue<string>('pdf_template_default')
  return template || 'modern'
}


/**
 * Tipo para colores por defecto
 */
export interface DefaultColors {
  primary: string
  secondary: string
}

/**
 * Obtiene los colores por defecto
 * @returns Objeto con colores primario y secundario
 */
export async function getDefaultColors(): Promise<DefaultColors> {
  const colors = await getConfigValue<DefaultColors>('default_colors')
  return colors || { primary: '#000000', secondary: '#666666' }
}


/**
 * Obtiene toda la configuración de una categoría
 * @param category - Categoría a filtrar
 * @returns Array de configuraciones
 */
export async function getConfigByCategory(category: string): Promise<Array<{
  key: string
  value: unknown
  description: string | null
}>> {
  try {
    const { data, error } = await supabaseAdmin
      .from('config')
      .select('key, value, description')
      .eq('category', category)
      .order('key')

    if (error) {
      console.error(`[getConfigByCategory] Error for category "${category}":`, error)
      return []
    }

    return data || []
  } catch (error) {
    console.error(`[getConfigByCategory] Unexpected error:`, error)
    return []
  }
}

/**
 * Obtiene el modo de aplicación (development/production)
 * @returns 'development' o 'production'
 */
export async function getAppMode(): Promise<'development' | 'production'> {
  const mode = await getConfigValue<string>('app_mode')
  return (mode === 'production' ? 'production' : 'development') as 'development' | 'production'
}

/**
 * Verifica si la aplicación está en modo desarrollo
 * @returns true si está en desarrollo
 */
export async function isDevelopmentMode(): Promise<boolean> {
  const mode = await getAppMode()
  return mode === 'development'
}

/**
 * Verifica si el registro público está habilitado
 * @returns true si el registro público está habilitado
 */
export async function isPublicRegistrationEnabled(): Promise<boolean> {
  const enabled = await getConfigValue<boolean>('public_registration_enabled')
  return enabled ?? true // Por defecto está habilitado
}

/**
 * Obtiene el nombre de la aplicación
 * @returns Nombre de la aplicación (por defecto 'Redpresu')
 */
export async function getAppName(): Promise<string> {
  const name = await getConfigValue<string>('app_name')
  return name || 'Redpresu'
}
