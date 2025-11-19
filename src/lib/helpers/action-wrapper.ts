/**
 * Wrapper para Server Actions
 *
 * Simplifica el manejo de errores, logging y estructura de respuesta
 * en Server Actions, eliminando código boilerplate repetitivo.
 */

import { log } from '@/lib/logger'

/**
 * Resultado estándar de una Server Action
 */
export interface ActionResult<T = any> {
  success: boolean
  data?: T
  error?: string
}

/**
 * Opciones para el wrapper de actions
 */
export interface ActionWrapperOptions {
  /** Nombre de la acción (para logging) */
  actionName: string
  /** Mostrar logs de inicio (default: true) */
  logStart?: boolean
  /** Mostrar logs de éxito (default: true) */
  logSuccess?: boolean
  /** Mostrar logs de error (default: true) */
  logErrors?: boolean
}

/**
 * Wrapper que ejecuta una Server Action con manejo automático de errores y logging
 *
 * Elimina el patrón repetitivo de:
 * - try/catch
 * - logging de inicio/éxito/error
 * - estructura de respuesta {success, data, error}
 *
 * @param options - Opciones de configuración
 * @param fn - Función async a ejecutar
 * @returns Promise con ActionResult
 *
 * @example
 * ```typescript
 * export async function createBudget(data: BudgetData): Promise<ActionResult> {
 *   return withActionWrapper(
 *     { actionName: 'createBudget' },
 *     async () => {
 *       // Tu lógica aquí
 *       const budget = await supabase.from('budgets').insert(data)
 *       return { data: budget }
 *     }
 *   )
 * }
 * ```
 */
export async function withActionWrapper<T = any>(
  options: ActionWrapperOptions,
  fn: () => Promise<{ data?: T; error?: string }>
): Promise<ActionResult<T>> {
  const {
    actionName,
    logStart = true,
    logSuccess = true,
    logErrors = true
  } = options

  try {
    if (logStart) {
      log.info(`[${actionName}] Iniciando...`)
    }

    const result = await fn()

    if (result.error) {
      if (logErrors) {
        log.error(`[${actionName}] Error:`, result.error)
      }
      return {
        success: false,
        error: result.error
      }
    }

    if (logSuccess) {
      log.info(`[${actionName}] Éxito`)
    }

    return {
      success: true,
      data: result.data
    }

  } catch (error) {
    if (logErrors) {
      log.error(`[${actionName}] Error inesperado:`, error)
    }

    // Manejar redirects de Next.js (no son errores reales)
    if (error && typeof error === 'object' && 'digest' in error) {
      throw error
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error inesperado'
    }
  }
}

/**
 * Wrapper simplificado para actions que solo necesitan nombre
 *
 * @param actionName - Nombre de la acción
 * @param fn - Función a ejecutar
 * @returns Promise con ActionResult
 *
 * @example
 * ```typescript
 * export async function deleteBudget(id: string) {
 *   return executeAction('deleteBudget', async () => {
 *     await supabase.from('budgets').delete().eq('id', id)
 *     return {}
 *   })
 * }
 * ```
 */
export async function executeAction<T = any>(
  actionName: string,
  fn: () => Promise<{ data?: T; error?: string } | void>
): Promise<ActionResult<T>> {
  return withActionWrapper({ actionName }, async () => {
    const result = await fn()
    return result || {}
  })
}

/**
 * Helper para retornar error rápidamente
 *
 * @param error - Mensaje de error
 * @returns ActionResult con error
 *
 * @example
 * ```typescript
 * if (!user) {
 *   return actionError('No autenticado')
 * }
 * ```
 */
export function actionError(error: string): ActionResult {
  return {
    success: false,
    error
  }
}

/**
 * Helper para retornar éxito rápidamente
 *
 * @param data - Datos a retornar (opcional)
 * @returns ActionResult con éxito
 *
 * @example
 * ```typescript
 * return actionSuccess({ budget })
 * ```
 */
export function actionSuccess<T = any>(data?: T): ActionResult<T> {
  return {
    success: true,
    data
  }
}

/**
 * Wrapper para actions con autenticación requerida
 *
 * Combina verificación de autenticación + wrapper de error handling
 *
 * @param actionName - Nombre de la acción
 * @param fn - Función que recibe el usuario autenticado
 * @returns Promise con ActionResult
 *
 * @example
 * ```typescript
 * import { getAuthenticatedUser } from './auth-helpers'
 *
 * export async function createBudget(data: BudgetData) {
 *   return withAuthenticatedAction('createBudget', async (user) => {
 *     // user está garantizado que existe aquí
 *     const budget = await supabase
 *       .from('budgets')
 *       .insert({ ...data, company_id: user.companyId })
 *     return { data: budget }
 *   })
 * }
 * ```
 */
export async function withAuthenticatedAction<T = any>(
  actionName: string,
  fn: (user: any) => Promise<{ data?: T; error?: string }>
): Promise<ActionResult<T>> {
  return withActionWrapper({ actionName }, async () => {
    const { getAuthenticatedUser } = await import('./auth-helpers')
    const { success, user, error } = await getAuthenticatedUser(`[${actionName}]`)

    if (!success || !user) {
      return { error: error || 'No autenticado' }
    }

    return fn(user)
  })
}
