/**
 * Error Helpers - Sanitización de errores para producción
 *
 * SECURITY (VULN-013): Prevenir exposición de stack traces y detalles
 * internos en producción mientras se mantienen logs detallados en servidor.
 */

import { log } from '@/lib/logger'

/**
 * Determina si estamos en modo desarrollo
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development'
}

/**
 * Mensajes de error genéricos por categoría
 */
const GENERIC_ERROR_MESSAGES = {
  authentication: 'Error de autenticación. Por favor, inicia sesión nuevamente.',
  authorization: 'No tienes permisos para realizar esta acción.',
  validation: 'Los datos proporcionados no son válidos.',
  notFound: 'El recurso solicitado no existe.',
  database: 'Error al procesar la solicitud. Inténtalo de nuevo más tarde.',
  network: 'Error de conexión. Verifica tu conexión a internet.',
  timeout: 'La operación tardó demasiado tiempo. Inténtalo de nuevo.',
  rateLimit: 'Demasiadas solicitudes. Por favor, espera un momento.',
  unknown: 'Ocurrió un error inesperado. Inténtalo de nuevo más tarde.',
} as const

export type ErrorCategory = keyof typeof GENERIC_ERROR_MESSAGES

/**
 * Opciones para sanitización de errores
 */
interface SanitizeErrorOptions {
  /** Contexto del error (nombre de la función) */
  context?: string
  /** Categoría del error */
  category?: ErrorCategory
  /** Datos adicionales para logging (NO se envían al cliente) */
  metadata?: Record<string, unknown>
  /** Si es true, fuerza mensaje genérico incluso en desarrollo */
  forceGeneric?: boolean
}

/**
 * Resultado de sanitización de error
 */
interface SanitizedError {
  /** Mensaje seguro para mostrar al usuario */
  userMessage: string
  /** Si es true, el error fue logueado en servidor */
  logged: boolean
}

/**
 * Sanitiza un error para producción
 *
 * En desarrollo:
 * - Retorna mensaje de error original (útil para debugging)
 * - Loguea el error con stack trace completo
 *
 * En producción:
 * - Retorna mensaje genérico sin detalles internos
 * - Loguea el error completo en servidor (solo servidor tiene acceso)
 * - Previene exposición de paths, SQL queries, stack traces, etc.
 *
 * @param error - Error capturado
 * @param options - Opciones de sanitización
 * @returns Objeto con mensaje sanitizado
 *
 * @example
 * ```typescript
 * try {
 *   await supabase.from('table').insert(data)
 * } catch (error) {
 *   const sanitized = sanitizeError(error, {
 *     context: 'createUser',
 *     category: 'database',
 *     metadata: { userId: user.id }
 *   })
 *   return { success: false, error: sanitized.userMessage }
 * }
 * ```
 */
export function sanitizeError(
  error: unknown,
  options: SanitizeErrorOptions = {}
): SanitizedError {
  const {
    context = 'Unknown',
    category = 'unknown',
    metadata = {},
    forceGeneric = false
  } = options

  const isDev = isDevelopment()

  // Preparar información del error para logging
  const errorInfo = {
    context,
    category,
    metadata,
    timestamp: new Date().toISOString(),
    error: error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack,
    } : error
  }

  // SIEMPRE loguear el error completo en servidor (con stack trace)
  log.error(`[${context}] Error capturado`, errorInfo)

  // Determinar mensaje para el usuario
  let userMessage: string

  if (isDev && !forceGeneric) {
    // DESARROLLO: Mostrar mensaje de error original (útil para debugging)
    if (error instanceof Error) {
      userMessage = error.message
    } else if (typeof error === 'string') {
      userMessage = error
    } else {
      userMessage = 'Error desconocido'
    }
  } else {
    // PRODUCCIÓN: Mensaje genérico seguro
    userMessage = GENERIC_ERROR_MESSAGES[category]
  }

  return {
    userMessage,
    logged: true
  }
}

/**
 * Extrae mensaje de error de forma segura
 *
 * Útil cuando solo necesitas el mensaje sin logging completo.
 *
 * @param error - Error a procesar
 * @param fallback - Mensaje por defecto si no se puede extraer
 * @returns Mensaje de error
 */
export function getErrorMessage(error: unknown, fallback = 'Error desconocido'): string {
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === 'string') {
    return error
  }
  return fallback
}

/**
 * Determina la categoría de error automáticamente
 *
 * @param error - Error a categorizar
 * @returns Categoría del error
 */
export function categorizeError(error: unknown): ErrorCategory {
  const message = getErrorMessage(error).toLowerCase()

  // Patrones comunes de errores
  if (message.includes('not authenticated') || message.includes('unauthorized')) {
    return 'authentication'
  }
  if (message.includes('permission') || message.includes('forbidden')) {
    return 'authorization'
  }
  if (message.includes('invalid') || message.includes('validation')) {
    return 'validation'
  }
  if (message.includes('not found') || message.includes('does not exist')) {
    return 'notFound'
  }
  if (message.includes('database') || message.includes('sql') || message.includes('postgres')) {
    return 'database'
  }
  if (message.includes('network') || message.includes('fetch') || message.includes('econnrefused')) {
    return 'network'
  }
  if (message.includes('timeout') || message.includes('timed out')) {
    return 'timeout'
  }
  if (message.includes('rate limit') || message.includes('too many')) {
    return 'rateLimit'
  }

  return 'unknown'
}

/**
 * Sanitiza un error con categorización automática
 *
 * @param error - Error a sanitizar
 * @param context - Contexto del error
 * @param metadata - Metadata adicional
 * @returns Error sanitizado
 */
export function sanitizeErrorAuto(
  error: unknown,
  context: string,
  metadata?: Record<string, unknown>
): SanitizedError {
  const category = categorizeError(error)
  return sanitizeError(error, { context, category, metadata })
}

/**
 * Wrapper para try-catch con sanitización automática
 *
 * @example
 * ```typescript
 * const result = await tryCatch(
 *   async () => {
 *     return await supabase.from('users').insert(data)
 *   },
 *   'createUser',
 *   { userId: user.id }
 * )
 *
 * if (!result.success) {
 *   return { success: false, error: result.error }
 * }
 * ```
 */
export async function tryCatch<T>(
  fn: () => Promise<T>,
  context: string,
  metadata?: Record<string, unknown>
): Promise<{ success: true; data: T } | { success: false; error: string }> {
  try {
    const data = await fn()
    return { success: true, data }
  } catch (error) {
    const sanitized = sanitizeErrorAuto(error, context, metadata)
    return { success: false, error: sanitized.userMessage }
  }
}
