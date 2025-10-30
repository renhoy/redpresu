/**
 * Helpers para acceder a la configuración del sistema
 * Tabla: public.redpresu_config
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
      .from('redpresu_config')
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
      .from('redpresu_config')
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

/**
 * Obtiene el modo de generación de PDF
 * @returns 'development' o 'production' (por defecto 'production')
 */
export async function getRapidPDFMode(): Promise<'development' | 'production'> {
  const mode = await getConfigValue<string>('rapid_pdf_mode')
  return (mode === 'development' ? 'development' : 'production') as 'development' | 'production'
}

/**
 * Verifica si el módulo de suscripciones está habilitado
 * Solo disponible en modo multiempresa
 * @returns true si las suscripciones están habilitadas
 */
export async function getSubscriptionsEnabled(): Promise<boolean> {
  const enabled = await getConfigValue<boolean>('subscriptions_enabled')
  return enabled === true
}

/**
 * Tipo para planes de suscripción
 */
export type PlanType = 'free' | 'pro' | 'enterprise'

export interface PlanFeatures {
  tariffs_limit: string
  budgets_limit: string
  users_limit: string
  storage: string
  support: string
  custom_templates: boolean
  priority_support: boolean
  remove_watermark: boolean
  multi_company: boolean
  api_access: boolean
  custom_branding: boolean
}

export interface SubscriptionPlan {
  id: PlanType
  name: string
  description: string
  price: number
  priceId: string
  position: number
  limits: {
    tariffs: number
    budgets: number
    users: number
    storage_mb: number
  }
  features: PlanFeatures
}

/**
 * Obtiene todos los planes de suscripción desde config
 * @returns Record con todos los planes o null si no existe config
 */
export async function getSubscriptionPlans(): Promise<Record<PlanType, SubscriptionPlan> | null> {
  const plans = await getConfigValue<Record<PlanType, SubscriptionPlan>>('subscription_plans')
  return plans
}

/**
 * Obtiene un plan específico por su ID
 * @param planId - ID del plan (free, pro, enterprise)
 * @returns Plan específico o null si no existe
 */
export async function getSubscriptionPlan(planId: PlanType): Promise<SubscriptionPlan | null> {
  const plans = await getSubscriptionPlans()
  return plans?.[planId] || null
}

/**
 * Obtiene planes desde configuración de BD con fallback a valores hardcoded
 * Esta función es server-only y debe usarse en Server Components/Actions
 * @param includeFree - Incluir plan free (default: true)
 * @returns Promise<Record<PlanType, SubscriptionPlan>>
 */
export async function getSubscriptionPlansFromConfig(
  includeFree = true
): Promise<Record<PlanType, SubscriptionPlan>> {
  try {
    const plansConfig = await getConfigValue<Record<PlanType, SubscriptionPlan>>(
      'subscription_plans'
    )

    if (plansConfig) {
      // Filtrar plan free si no se requiere
      if (!includeFree) {
        const { free, ...rest } = plansConfig
        return rest as Record<PlanType, SubscriptionPlan>
      }
      return plansConfig
    }

    // Fallback a valores por defecto (importar dinámicamente para evitar ciclos)
    console.warn(
      '[getSubscriptionPlansFromConfig] Config no encontrada, usando valores por defecto'
    )

    // Valores por defecto hardcoded
    const defaultPlans: Record<PlanType, SubscriptionPlan> = {
      free: {
        id: 'free',
        name: 'Free',
        description: 'Plan gratuito para comenzar',
        price: 0,
        priceId: '',
        position: 1,
        limits: {
          tariffs: 3,
          budgets: 10,
          users: 1,
          storage_mb: 100
        },
        features: {
          tariffs_limit: 'Hasta 3 tarifas',
          budgets_limit: 'Hasta 10 presupuestos',
          users_limit: '1 usuario',
          storage: '100 MB almacenamiento',
          support: 'Soporte por email',
          custom_templates: false,
          priority_support: false,
          remove_watermark: false,
          multi_company: false,
          api_access: false,
          custom_branding: false
        }
      },
      pro: {
        id: 'pro',
        name: 'Pro',
        description: 'Plan profesional para negocios',
        price: 29,
        priceId: 'price_REPLACE_WITH_REAL_PRICE_ID',
        position: 2,
        limits: {
          tariffs: 50,
          budgets: 500,
          users: 5,
          storage_mb: 5000
        },
        features: {
          tariffs_limit: 'Hasta 50 tarifas',
          budgets_limit: 'Hasta 500 presupuestos',
          users_limit: 'Hasta 5 usuarios',
          storage: '5 GB almacenamiento',
          support: 'Soporte prioritario',
          custom_templates: true,
          priority_support: true,
          remove_watermark: true,
          multi_company: false,
          api_access: false,
          custom_branding: false
        }
      },
      enterprise: {
        id: 'enterprise',
        name: 'Enterprise',
        description: 'Plan empresarial sin límites',
        price: 99,
        priceId: 'price_REPLACE_WITH_REAL_PRICE_ID',
        position: 3,
        limits: {
          tariffs: 9999,
          budgets: 9999,
          users: 50,
          storage_mb: 50000
        },
        features: {
          tariffs_limit: 'Tarifas ilimitadas',
          budgets_limit: 'Presupuestos ilimitados',
          users_limit: 'Hasta 50 usuarios',
          storage: '50 GB almacenamiento',
          support: 'Soporte dedicado 24/7',
          custom_templates: true,
          priority_support: true,
          remove_watermark: true,
          multi_company: true,
          api_access: true,
          custom_branding: true
        }
      }
    }

    if (!includeFree) {
      const { free, ...rest } = defaultPlans
      return rest as Record<PlanType, SubscriptionPlan>
    }
    return defaultPlans
  } catch (error) {
    console.error('[getSubscriptionPlansFromConfig] Error:', error)
    // Fallback en caso de error crítico
    throw new Error('No se pudieron cargar los planes de suscripción')
  }
}

/**
 * Obtiene el texto de información legal para formularios
 * @returns HTML string con la información legal o texto por defecto
 */
export async function getFormsLegalNotice(): Promise<string> {
  const notice = await getConfigValue<string>('forms_legal_notice')

  if (notice) {
    return notice
  }

  // Fallback por defecto
  return '<p><strong>Información legal</strong></p><ul class="list-disc pl-4"><li class="ml-2"><p><strong>Responsable de los datos</strong>: REDPRESU.</p></li><li class="ml-2"><p><strong>Finalidad de los datos</strong>: recabar información sobre nuestros servicios, gestionar el envío de información y prospección comercial.</p></li><li class="ml-2"><p><strong>Destinatarios</strong>: Empresas proveedoras nacionales y encargados de tratamiento acogidos a privacy shield y personal de Jeyca.</p></li><li class="ml-2"><p><strong>Información adicional</strong>: En la política de privacidad de <a target="_blank" rel="noopener noreferrer" class="text-cyan-600 underline cursor-pointer hover:text-cyan-700" href="http://JEYCA.NET">JEYCA.NET</a> encontrarás información adicional sobre la recopilación y el uso de su información personal por parte de <a target="_blank" rel="noopener noreferrer" class="text-cyan-600 underline cursor-pointer hover:text-cyan-700" href="http://JEYCA.NET">JEYCA.NET</a>, incluida información sobre acceso, conservación, rectificación, eliminación, seguridad y otros temas.</p></li></ul><p></p>'
}

/**
 * Obtiene el contenido HTML completo de la página legal
 * @returns HTML string con el contenido legal completo
 */
export async function getLegalPageContent(): Promise<string> {
  const content = await getConfigValue<string>('legal_page_content')

  if (content) {
    return content
  }

  // Fallback por defecto (página legal básica)
  return '<h1>Aviso Legal</h1><p>En cumplimiento de la Ley 34/2002, de 11 de julio, de Servicios de la Sociedad de la Información y de Comercio Electrónico (LSSI-CE), REDPRESU informa que es titular del sitio web.</p><p>Para más información, contacte con el administrador del sitio.</p>'
}
