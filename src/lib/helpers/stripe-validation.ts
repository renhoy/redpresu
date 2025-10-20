/**
 * Stripe Webhook Metadata Validation Helpers
 * VULN-011: Prevención de inyección y manipulación de metadata
 */

import { log } from '@/lib/logger'

/**
 * Planes permitidos
 */
export const ALLOWED_PLANS = ['free', 'pro', 'enterprise'] as const
export type AllowedPlan = typeof ALLOWED_PLANS[number]

/**
 * Resultado de validación
 */
export interface ValidationResult<T = void> {
  valid: boolean
  data?: T
  error?: string
}

/**
 * Valida que company_id sea un número entero positivo válido
 * @param companyIdStr - String del company_id desde metadata
 * @returns ValidationResult con companyId parseado
 */
export function validateCompanyId(companyIdStr: string | undefined): ValidationResult<number> {
  if (!companyIdStr) {
    return { valid: false, error: 'Missing company_id in metadata' }
  }

  // Verificar que sea string numérica
  if (!/^\d+$/.test(companyIdStr)) {
    log.error('[validateCompanyId] Invalid format', { companyIdStr })
    return { valid: false, error: 'Invalid company_id format (must be numeric)' }
  }

  const companyId = parseInt(companyIdStr, 10)

  // Verificar que sea entero positivo
  if (isNaN(companyId) || companyId <= 0 || !Number.isInteger(companyId)) {
    log.error('[validateCompanyId] Invalid value', { companyId })
    return { valid: false, error: 'Invalid company_id value (must be positive integer)' }
  }

  // Verificar rango razonable (prevenir DoS con IDs enormes)
  if (companyId > Number.MAX_SAFE_INTEGER) {
    log.error('[validateCompanyId] Value too large', { companyId })
    return { valid: false, error: 'company_id too large' }
  }

  return { valid: true, data: companyId }
}

/**
 * Valida que plan_id sea uno de los planes permitidos
 * @param planId - String del plan desde metadata
 * @returns ValidationResult con plan validado
 */
export function validatePlanId(planId: string | undefined): ValidationResult<AllowedPlan> {
  if (!planId) {
    return { valid: false, error: 'Missing plan_id in metadata' }
  }

  // Verificar que sea uno de los planes permitidos
  if (!ALLOWED_PLANS.includes(planId as AllowedPlan)) {
    log.error('[validatePlanId] Invalid plan', { planId, allowed: ALLOWED_PLANS })
    return {
      valid: false,
      error: `Invalid plan_id (must be one of: ${ALLOWED_PLANS.join(', ')})`
    }
  }

  return { valid: true, data: planId as AllowedPlan }
}

/**
 * Valida metadata completa de Stripe Checkout Session
 * @param metadata - Metadata del checkout session
 * @returns ValidationResult con datos validados
 */
export function validateCheckoutMetadata(metadata: Record<string, string> | null | undefined): ValidationResult<{
  companyId: number
  planId: AllowedPlan
}> {
  if (!metadata) {
    return { valid: false, error: 'Missing metadata in checkout session' }
  }

  // Validar company_id
  const companyResult = validateCompanyId(metadata.company_id)
  if (!companyResult.valid) {
    return { valid: false, error: companyResult.error }
  }

  // Validar plan_id
  const planResult = validatePlanId(metadata.plan_id)
  if (!planResult.valid) {
    return { valid: false, error: planResult.error }
  }

  return {
    valid: true,
    data: {
      companyId: companyResult.data!,
      planId: planResult.data!
    }
  }
}

/**
 * Valida metadata de Stripe Subscription
 * @param metadata - Metadata de la suscripción
 * @returns ValidationResult con company_id validado
 */
export function validateSubscriptionMetadata(metadata: Record<string, string> | null | undefined): ValidationResult<{
  companyId: number
}> {
  if (!metadata) {
    return { valid: false, error: 'Missing metadata in subscription' }
  }

  // Validar company_id
  const companyResult = validateCompanyId(metadata.company_id)
  if (!companyResult.valid) {
    return { valid: false, error: companyResult.error }
  }

  return {
    valid: true,
    data: { companyId: companyResult.data! }
  }
}

/**
 * Valida que una empresa existe en la base de datos
 * @param supabase - Cliente Supabase admin
 * @param companyId - ID de la empresa a validar
 * @returns ValidationResult indicando si existe
 */
export async function validateCompanyExists(
  supabase: any,
  companyId: number
): Promise<ValidationResult> {
  try {
    const { data, error } = await supabase
      .from('redpresu_issuers')
      .select('id')
      .eq('id', companyId)
      .eq('deleted_at', null) // Solo empresas activas
      .single()

    if (error || !data) {
      log.error('[validateCompanyExists] Company not found', { companyId, error })
      return { valid: false, error: `Company ${companyId} not found or deleted` }
    }

    return { valid: true }
  } catch (error) {
    log.error('[validateCompanyExists] Database error', { companyId, error })
    return { valid: false, error: 'Database error validating company' }
  }
}

/**
 * Valida que una suscripción pertenece a la empresa indicada
 * Previene que se actualice la suscripción de otra empresa
 * @param supabase - Cliente Supabase admin
 * @param stripeSubscriptionId - ID de suscripción en Stripe
 * @param expectedCompanyId - ID esperado de la empresa
 * @returns ValidationResult indicando si coincide
 */
export async function validateSubscriptionOwnership(
  supabase: any,
  stripeSubscriptionId: string,
  expectedCompanyId: number
): Promise<ValidationResult> {
  try {
    const { data, error } = await supabase
      .from('redpresu_subscriptions')
      .select('company_id')
      .eq('stripe_subscription_id', stripeSubscriptionId)
      .single()

    if (error || !data) {
      log.error('[validateSubscriptionOwnership] Subscription not found', {
        stripeSubscriptionId,
        error
      })
      return { valid: false, error: 'Subscription not found in database' }
    }

    if (data.company_id !== expectedCompanyId) {
      log.error('[validateSubscriptionOwnership] Company mismatch', {
        stripeSubscriptionId,
        expectedCompanyId,
        actualCompanyId: data.company_id
      })
      return {
        valid: false,
        error: `Subscription belongs to different company (expected: ${expectedCompanyId}, actual: ${data.company_id})`
      }
    }

    return { valid: true }
  } catch (error) {
    log.error('[validateSubscriptionOwnership] Database error', {
      stripeSubscriptionId,
      expectedCompanyId,
      error
    })
    return { valid: false, error: 'Database error validating ownership' }
  }
}
