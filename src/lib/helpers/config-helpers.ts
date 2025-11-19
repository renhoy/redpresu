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
  return '<p><strong>Información legal</strong></p><ul class="list-disc pl-4"><li class="ml-2"><p><strong>Responsable de los datos</strong>: REDPRESU.</p></li><li class="ml-2"><p><strong>Finalidad de los datos</strong>: recabar información sobre nuestros servicios, gestionar el envío de información y prospección comercial.</p></li><li class="ml-2"><p><strong>Destinatarios</strong>: Empresas proveedoras nacionales y encargados de tratamiento acogidos a privacy shield y personal de <a target="_blank" rel="noopener noreferrer" class="text-lime-600 underline cursor-pointer hover:text-lime-700" href="https://redpresu.com">redpresu.com</a>.</p></li><li class="ml-2"><p><strong>Información adicional</strong>: En el <a target="_blank" rel="noopener noreferrer" class="text-lime-600 underline cursor-pointer hover:text-lime-700" href="/legal">aviso legal y política de privacidad</a> de <a target="_blank" rel="noopener noreferrer" class="text-lime-600 underline cursor-pointer hover:text-lime-700" href="https://redpresu.com">redpresu.com</a> encontrarás información adicional sobre la recopilación y el uso de su información personal, incluida información sobre acceso, conservación, rectificación, eliminación, seguridad y otros temas.</p></li></ul><p></p>'
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

  // Fallback por defecto (página legal completa)
  return `
<h1>Aviso Legal y Política de Privacidad</h1>

<p class="text-gray-600 text-lg mb-8">Última actualización: ${new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

<h2>1. Información General</h2>

<p>En cumplimiento de la Ley 34/2002, de 11 de julio, de Servicios de la Sociedad de la Información y de Comercio Electrónico (LSSI-CE), se informa de los siguientes datos:</p>

<ul>
  <li><strong>Titular del sitio web:</strong> REDPRESU</li>
  <li><strong>Sitio web:</strong> <a href="https://redpresu.com">https://redpresu.com</a></li>
  <li><strong>Email de contacto:</strong> <a href="mailto:legal@redpresu.com">legal@redpresu.com</a></li>
</ul>

<p>Para ejercer tus derechos o solicitar información adicional sobre el responsable del tratamiento de datos, puedes contactar a través del email indicado.</p>

<h2>2. Política de Privacidad y Protección de Datos</h2>

<h3>2.1. Responsable del tratamiento</h3>

<p>El responsable del tratamiento de los datos personales recogidos en <a href="https://redpresu.com">redpresu.com</a> es REDPRESU. Para cualquier consulta relacionada con el tratamiento de tus datos personales, puedes dirigirte a <a href="mailto:legal@redpresu.com">legal@redpresu.com</a>.</p>

<h3>2.2. Finalidad del tratamiento</h3>

<p>Los datos personales que se recogen a través de este sitio web se utilizan para las siguientes finalidades:</p>

<ul>
  <li><strong>Registro de usuarios:</strong> Creación y gestión de cuentas de usuario para acceder a los servicios de la plataforma.</li>
  <li><strong>Gestión de presupuestos:</strong> Creación, edición y envío de presupuestos a clientes.</li>
  <li><strong>Comunicaciones:</strong> Envío de notificaciones relacionadas con el servicio, respuesta a consultas a través del formulario de contacto.</li>
  <li><strong>Gestión de suscripciones:</strong> Procesamiento de pagos y gestión de planes de suscripción (si aplica).</li>
  <li><strong>Mejora del servicio:</strong> Análisis de uso para mejorar la funcionalidad y experiencia del usuario.</li>
</ul>

<h3>2.3. Base legal</h3>

<p>El tratamiento de tus datos personales se basa en:</p>

<ul>
  <li><strong>Ejecución de un contrato:</strong> El registro y uso de la plataforma implica la aceptación de un contrato de prestación de servicios.</li>
  <li><strong>Consentimiento:</strong> Para el envío de comunicaciones comerciales (si las hubiera), se solicita el consentimiento expreso del usuario.</li>
  <li><strong>Interés legítimo:</strong> Para la mejora del servicio y prevención de fraudes.</li>
  <li><strong>Cumplimiento de obligaciones legales:</strong> Conservación de datos fiscales y contables según la normativa vigente.</li>
</ul>

<h3>2.4. Destinatarios de los datos</h3>

<p>Tus datos personales podrán ser comunicados a:</p>

<ul>
  <li><strong>Proveedores de servicios tecnológicos:</strong> Empresas que prestan servicios de hosting, almacenamiento en la nube y procesamiento de pagos (Vercel, Supabase, Stripe).</li>
  <li><strong>Autoridades públicas:</strong> Cuando sea requerido por ley o para el cumplimiento de obligaciones legales.</li>
</ul>

<p>Todos los proveedores de servicios cumplen con la normativa de protección de datos aplicable y han suscrito acuerdos de confidencialidad.</p>

<h3>2.5. Transferencias internacionales</h3>

<p>Algunos de nuestros proveedores de servicios pueden estar ubicados fuera del Espacio Económico Europeo (EEE). En estos casos, nos aseguramos de que existan garantías adecuadas, como cláusulas contractuales tipo aprobadas por la Comisión Europea o certificaciones de adecuación.</p>

<h3>2.6. Conservación de datos</h3>

<p>Tus datos personales serán conservados durante el tiempo necesario para cumplir con las finalidades para las que fueron recogidos:</p>

<ul>
  <li><strong>Datos de usuario:</strong> Mientras la cuenta esté activa y hasta 5 años después de su cancelación para cumplir con obligaciones legales.</li>
  <li><strong>Datos de contacto:</strong> Hasta que se atienda la consulta y durante el plazo de prescripción de posibles responsabilidades.</li>
  <li><strong>Datos de facturación:</strong> Durante el plazo legalmente establecido (actualmente 6 años según la normativa fiscal).</li>
</ul>

<h3>2.7. Derechos de los usuarios</h3>

<p>En cualquier momento puedes ejercer los siguientes derechos:</p>

<ul>
  <li><strong>Acceso:</strong> Conocer qué datos personales tenemos sobre ti.</li>
  <li><strong>Rectificación:</strong> Solicitar la corrección de datos inexactos o incompletos.</li>
  <li><strong>Supresión:</strong> Solicitar la eliminación de tus datos personales cuando ya no sean necesarios.</li>
  <li><strong>Oposición:</strong> Oponerte al tratamiento de tus datos para determinadas finalidades.</li>
  <li><strong>Limitación:</strong> Solicitar la limitación del tratamiento en determinadas circunstancias.</li>
  <li><strong>Portabilidad:</strong> Recibir tus datos en un formato estructurado y de uso común.</li>
  <li><strong>Revocación del consentimiento:</strong> Retirar el consentimiento otorgado en cualquier momento.</li>
</ul>

<p>Para ejercer estos derechos, envía un email a <a href="mailto:legal@redpresu.com">legal@redpresu.com</a> indicando el derecho que deseas ejercer y adjuntando copia de tu DNI o documento equivalente.</p>

<p>También tienes derecho a presentar una reclamación ante la <strong>Agencia Española de Protección de Datos (AEPD)</strong> si consideras que el tratamiento de tus datos personales no cumple con la normativa vigente.</p>

<h2>3. Política de Cookies</h2>

<h3>3.1. ¿Qué son las cookies?</h3>

<p>Las cookies son pequeños archivos de texto que se almacenan en tu dispositivo cuando visitas un sitio web. Se utilizan para mejorar la experiencia del usuario, recordar preferencias y analizar el uso del sitio.</p>

<h3>3.2. Tipos de cookies que utilizamos</h3>

<ul>
  <li><strong>Cookies técnicas:</strong> Necesarias para el funcionamiento básico del sitio web (gestión de sesiones, autenticación).</li>
  <li><strong>Cookies de preferencias:</strong> Permiten recordar tus configuraciones y preferencias.</li>
  <li><strong>Cookies analíticas:</strong> Utilizadas para analizar el uso del sitio y mejorar la experiencia (si están habilitadas).</li>
</ul>

<h3>3.3. Gestión de cookies</h3>

<p>Puedes configurar tu navegador para rechazar las cookies o para que te avise cuando se envíe una cookie. Sin embargo, algunas funcionalidades del sitio pueden no funcionar correctamente si desactivas las cookies técnicas.</p>

<p>Para más información sobre cómo gestionar las cookies en los navegadores más comunes:</p>

<ul>
  <li><a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer">Google Chrome</a></li>
  <li><a href="https://support.mozilla.org/es/kb/habilitar-y-deshabilitar-cookies-sitios-web-rastrear-preferencias" target="_blank" rel="noopener noreferrer">Mozilla Firefox</a></li>
  <li><a href="https://support.apple.com/es-es/guide/safari/sfri11471/mac" target="_blank" rel="noopener noreferrer">Safari</a></li>
  <li><a href="https://support.microsoft.com/es-es/microsoft-edge/eliminar-las-cookies-en-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09" target="_blank" rel="noopener noreferrer">Microsoft Edge</a></li>
</ul>

<h2>4. Condiciones de Uso</h2>

<h3>4.1. Aceptación de las condiciones</h3>

<p>El acceso y uso de este sitio web implica la aceptación de las presentes condiciones de uso. Si no estás de acuerdo con estas condiciones, te rogamos que no utilices este sitio web.</p>

<h3>4.2. Uso del servicio</h3>

<p>El usuario se compromete a:</p>

<ul>
  <li>Utilizar el servicio de forma lícita y conforme a la legislación vigente.</li>
  <li>No utilizar el servicio para fines fraudulentos o que puedan causar daños a terceros.</li>
  <li>Proporcionar información veraz y actualizada en el registro.</li>
  <li>Mantener la confidencialidad de sus credenciales de acceso.</li>
  <li>No intentar acceder a áreas restringidas del sitio web o realizar actividades que puedan dañar el sistema.</li>
</ul>

<h3>4.3. Propiedad intelectual</h3>

<p>Todos los contenidos de este sitio web, incluyendo textos, gráficos, logotipos, iconos, imágenes, archivos de audio y vídeo, software y cualquier otro material, están protegidos por derechos de propiedad intelectual e industrial.</p>

<p>Queda prohibida la reproducción, distribución, modificación o comunicación pública de los contenidos sin la autorización expresa del titular.</p>

<h3>4.4. Responsabilidad</h3>

<p>REDPRESU no se hace responsable de:</p>

<ul>
  <li>Interrupciones o errores en el acceso al sitio web.</li>
  <li>Contenidos introducidos por los usuarios en la plataforma.</li>
  <li>Daños derivados del uso indebido del servicio por parte de los usuarios.</li>
  <li>Virus u otros elementos dañinos que puedan afectar al dispositivo del usuario.</li>
</ul>

<h3>4.5. Modificaciones</h3>

<p>REDPRESU se reserva el derecho de modificar estas condiciones de uso y la política de privacidad en cualquier momento. Las modificaciones serán comunicadas a través del sitio web y entrarán en vigor desde su publicación.</p>

<h3>4.6. Legislación aplicable y jurisdicción</h3>

<p>Estas condiciones se rigen por la legislación española. Para la resolución de cualquier controversia, las partes se someten a los Juzgados y Tribunales del domicilio del usuario.</p>

<h2>5. Contacto</h2>

<p>Para cualquier consulta, duda o sugerencia relacionada con este Aviso Legal, la Política de Privacidad o las Condiciones de Uso, puedes contactar con nosotros a través de:</p>

<ul>
  <li><strong>Email:</strong> <a href="mailto:legal@redpresu.com">legal@redpresu.com</a></li>
  <li><strong>Formulario de contacto:</strong> <a href="https://redpresu.com/contact">https://redpresu.com/contact</a></li>
</ul>

<hr class="my-8 border-gray-300">

<p class="text-sm text-gray-500 text-center">Este documento ha sido actualizado por última vez el ${new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })} y puede estar sujeto a modificaciones.</p>
`.trim()
}
