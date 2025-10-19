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
      .from('redpresu_config')
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
      .from('redpresu_config')
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
      .from('redpresu_config')
      .select('is_system')
      .eq('key', key)
      .single()

    if (!existing) {
      return { success: false, error: 'Clave de configuración no encontrada' }
    }

    // Superadmin puede editar TODO, incluso configs de sistema
    // Se elimina la restricción is_system

    const { error } = await supabaseAdmin
      .from('redpresu_config')
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

    // Si se modifica default_tariff, revalidar páginas de tarifas
    if (key === 'default_tariff') {
      revalidatePath('/tariffs')
      revalidatePath('/tariffs/create')
    }

    // Si se modifican plantillas PDF, revalidar páginas de tarifas
    if (key === 'pdf_templates' || key === 'default_pdf_template') {
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
      .from('redpresu_config')
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
      .from('redpresu_config')
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
      .from('redpresu_config')
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
 * Tipo para sección de plantilla PDF
 */
export interface PDFTemplateSection {
  [key: string]: {
    title: string
    description: string
    preview_url: string
  }
}

/**
 * Tipo para plantilla PDF
 */
export interface PDFTemplate {
  id: string
  name: string
  description: string
  default?: boolean
  sections?: PDFTemplateSection[]
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
      .from('redpresu_config')
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
  // Datos Tarifa
  validity: number
  status: 'Activa' | 'Inactiva'
  // Datos Empresa
  logo_url: string
  name: string
  nif: string
  address: string
  contact: string
  // Configuración Visual
  primary_color: string
  secondary_color: string
  template: string
  // Notas PDF
  summary_note: string
  conditions_note: string
  // Notas Formulario
  legal_note: string
}

/**
 * Obtiene los valores por defecto para crear una tarifa
 * Acción pública (no requiere superadmin)
 *
 * Prioridad:
 * 1. Si existe tarifa con is_template=true de la empresa especificada, usar sus valores
 * 2. Si no, usar valores de default_tariff en config
 * 3. Si no existe default_tariff, usar fallbacks hardcodeados
 *
 * @param empresaId - ID de la empresa para buscar plantilla específica (opcional)
 */
export async function getTariffDefaultsAction(empresaId?: number): Promise<{
  success: boolean
  data?: TariffDefaults
  error?: string
}> {
  try {
    // Paso 1: Buscar tarifa plantilla (is_template = true) de la empresa especificada
    let query = supabaseAdmin
      .from('redpresu_tariffs')
      .select('*')
      .eq('is_template', true)

    // Si se especifica empresa, buscar solo de esa empresa
    if (empresaId) {
      console.log('[getTariffDefaultsAction] Buscando plantilla de empresa:', empresaId)
      query = query.eq('company_id', empresaId)
    }

    const { data: templateTariff } = await query.maybeSingle()

    if (templateTariff) {
      console.log('[getTariffDefaultsAction] Usando tarifa plantilla:', templateTariff.id)
      return {
        success: true,
        data: {
          validity: templateTariff.validity || 30,
          status: templateTariff.status as 'Activa' | 'Inactiva' || 'Inactiva',
          logo_url: templateTariff.logo_url || '',
          name: templateTariff.name || '',
          nif: templateTariff.nif || '',
          address: templateTariff.address || '',
          contact: templateTariff.contact || '',
          primary_color: templateTariff.primary_color || '#84cc16',
          secondary_color: templateTariff.secondary_color || '#0891b2',
          template: templateTariff.template || '',
          summary_note: templateTariff.summary_note || '',
          conditions_note: templateTariff.conditions_note || '',
          legal_note: templateTariff.legal_note || ''
        }
      }
    }

    // Paso 2: Si no hay plantilla, buscar default_tariff en config
    const { data: configData, error: configError } = await supabaseAdmin
      .from('redpresu_config')
      .select('value')
      .eq('key', 'default_tariff')
      .single()

    if (!configError && configData) {
      const defaultTariff = configData.value as any
      console.log('[getTariffDefaultsAction] Usando default_tariff de config')

      // Buscar plantilla con default: true en pdf_templates
      const { data: templatesData } = await supabaseAdmin
        .from('redpresu_config')
        .select('value')
        .eq('key', 'pdf_templates')
        .single()

      let templateId = defaultTariff.visual_config?.template || ''
      if (templatesData) {
        const templates = templatesData.value as PDFTemplate[]
        const defaultTemplate = templates.find((t: PDFTemplate) => t.default === true)
        if (defaultTemplate) {
          templateId = defaultTemplate.id
        }
      }

      return {
        success: true,
        data: {
          validity: parseInt(defaultTariff.tariff_data?.validity || '30'),
          status: defaultTariff.tariff_data?.status || 'Inactiva',
          logo_url: defaultTariff.data_company?.logo_url || '',
          name: defaultTariff.data_company?.name || '',
          nif: defaultTariff.data_company?.nif || '',
          address: defaultTariff.data_company?.address || '',
          contact: defaultTariff.data_company?.contact || '',
          primary_color: defaultTariff.visual_config?.primary_color || '#84cc16',
          secondary_color: defaultTariff.visual_config?.secondary_color || '#0891b2',
          template: templateId,
          summary_note: defaultTariff.pdf_notes?.summary_note || '',
          conditions_note: defaultTariff.pdf_notes?.conditions_note || '',
          legal_note: defaultTariff.legal_note || ''
        }
      }
    }

    // Paso 3: Fallback hardcodeado
    console.log('[getTariffDefaultsAction] Usando valores fallback hardcodeados')
    return {
      success: true,
      data: {
        validity: 30,
        status: 'Inactiva',
        logo_url: '',
        name: '',
        nif: '',
        address: '',
        contact: '',
        primary_color: '#84cc16',
        secondary_color: '#0891b2',
        template: '',
        summary_note: '',
        conditions_note: '',
        legal_note: ''
      }
    }
  } catch (error) {
    console.error('[getTariffDefaultsAction] Error inesperado:', error)
    return {
      success: true,
      data: {
        validity: 30,
        status: 'Inactiva',
        logo_url: '',
        name: '',
        nif: '',
        address: '',
        contact: '',
        primary_color: '#84cc16',
        secondary_color: '#0891b2',
        template: '',
        summary_note: '',
        conditions_note: '',
        legal_note: ''
      }
    }
  }
}

/**
 * Obtiene la empresa por defecto del sistema
 * Usada cuando el usuario no tiene company_id asignada (ej: superadmin)
 * Acción pública (no requiere superadmin)
 */
export async function getDefaultEmpresaId(): Promise<number> {
  try {
    const { data, error } = await supabaseAdmin
      .from('redpresu_config')
      .select('value')
      .eq('key', 'default_empresa_id')
      .single()

    if (error || !data) {
      console.log('[getDefaultEmpresaId] No existe default_empresa_id, usando fallback: 1')
      return 1 // Fallback hardcodeado
    }

    const empresaId = typeof data.value === 'number' ? data.value : parseInt(String(data.value))
    console.log('[getDefaultEmpresaId] Usando empresa por defecto:', empresaId)
    return empresaId

  } catch (error) {
    console.error('[getDefaultEmpresaId] Error inesperado:', error)
    return 1 // Fallback hardcodeado
  }
}

/**
 * Obtiene el nombre de la aplicación desde configuración
 * Acción pública (no requiere autenticación)
 */
export async function getAppNameAction(): Promise<{
  success: boolean
  data?: string
  error?: string
}> {
  try {
    const { data, error } = await supabaseAdmin
      .from('redpresu_config')
      .select('value')
      .eq('key', 'app_name')
      .single()

    if (error || !data) {
      // Devolver nombre por defecto si no existe en BD
      return {
        success: true,
        data: 'Redpresu'
      }
    }

    return { success: true, data: data.value as string }
  } catch (error) {
    console.error('[getAppNameAction] Error:', error)
    // En caso de error, devolver default en lugar de fallar
    return { success: true, data: 'Redpresu' }
  }
}

/**
 * Interfaz para datos del issuer
 */
export interface IssuerData {
  name: string
  nif_nie: string
  type: 'empresa' | 'autonomo'
  address: string
  postal_code: string
  locality: string
  province: string
  phone: string
  email: string
  web: string | null
}

/**
 * Obtiene los datos del issuer por company_id (company_id en tabla issuers)
 * Solo superadmin puede acceder
 */
export async function getIssuerByEmpresaId(empresaId: number): Promise<{
  success: boolean
  data?: IssuerData
  error?: string
}> {
  const { allowed, error: permError } = await checkSuperadminPermission()

  if (!allowed) {
    return { success: false, error: permError }
  }

  try {
    // Nota: La tabla issuers usa "company_id" no "company_id"
    const { data, error } = await supabaseAdmin
      .from('redpresu_issuers')
      .select('name, nif_nie: nif, type, address, postal_code, locality, province, phone, email, web')
      .eq('company_id', empresaId)
      .single()

    if (error || !data) {
      console.error('[getIssuerByEmpresaId] Error:', error)
      return { success: false, error: 'No se encontró issuer para esta empresa' }
    }

    return { success: true, data: data as IssuerData }
  } catch (error) {
    console.error('[getIssuerByEmpresaId] Error inesperado:', error)
    return { success: false, error: 'Error inesperado al obtener issuer' }
  }
}
