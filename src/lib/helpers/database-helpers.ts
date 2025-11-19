/**
 * Helpers para operaciones de base de datos con manejo de race conditions
 * Elimina duplicación de retry logic en inserts con constraints únicos
 */

import { log } from '@/lib/logger'

/**
 * Opciones para retry de insert con detección de duplicados
 */
export interface RetryInsertOptions<T> {
  /**
   * Función que ejecuta el insert
   * Debe retornar { data, error } como Supabase
   */
  insertFn: () => Promise<{ data: T | null; error: any }>

  /**
   * Callback que se ejecuta cuando se detecta duplicado
   * Permite regenerar el valor único antes del retry
   * @param retryCount - Número del intento actual (0-indexed)
   */
  onDuplicate: (retryCount: number) => Promise<void> | void

  /**
   * Máximo número de reintentos (default: 10)
   */
  maxRetries?: number

  /**
   * Códigos de error de Postgres que indican duplicado
   * Default: ['23505'] (unique_violation)
   */
  duplicateErrorCodes?: string[]

  /**
   * Palabras clave en mensaje de error que indican duplicado
   * Default: ['duplicate', 'unique', 'already exists']
   */
  duplicateKeywords?: string[]

  /**
   * Nombre para logging (default: 'retryInsert')
   */
  logContext?: string
}

/**
 * Resultado del insert con retry
 */
export interface RetryInsertResult<T> {
  success: boolean
  data?: T
  attempts?: number
  error?: string
}

/**
 * Detecta si un error de Supabase es por violación de constraint único
 * @internal
 */
function isDuplicateError(
  error: any,
  errorCodes: string[],
  keywords: string[]
): boolean {
  if (!error) return false

  // Verificar código de error de Postgres
  if (error.code && errorCodes.includes(error.code)) {
    return true
  }

  // Verificar mensaje de error
  if (error.message && typeof error.message === 'string') {
    const messageLower = error.message.toLowerCase()
    return keywords.some(keyword => messageLower.includes(keyword.toLowerCase()))
  }

  return false
}

/**
 * Ejecuta un insert con retry automático en caso de duplicados
 *
 * Este helper es útil cuando se inserta un registro con un valor único generado
 * (como budget_number, invoice_number) y puede haber race conditions con otros
 * requests concurrentes.
 *
 * @example
 * ```typescript
 * let budgetNumber = '20251119-143025'
 *
 * const result = await retryInsertOnDuplicate({
 *   insertFn: async () => {
 *     return await supabaseAdmin
 *       .from('budgets')
 *       .insert({ budget_number: budgetNumber, ... })
 *       .select()
 *       .single()
 *   },
 *   onDuplicate: async (retryCount) => {
 *     // Regenerar número único
 *     budgetNumber = await generateNewNumber()
 *   },
 *   maxRetries: 10,
 *   logContext: 'createBudget'
 * })
 *
 * if (result.success) {
 *   console.log('Budget creado:', result.data)
 * }
 * ```
 */
export async function retryInsertOnDuplicate<T>(
  options: RetryInsertOptions<T>
): Promise<RetryInsertResult<T>> {
  const {
    insertFn,
    onDuplicate,
    maxRetries = 10,
    duplicateErrorCodes = ['23505'], // unique_violation en Postgres
    duplicateKeywords = ['duplicate', 'unique', 'already exists'],
    logContext = 'retryInsertOnDuplicate'
  } = options

  log.info(`[${logContext}] Iniciando insert con retry (max: ${maxRetries})`)

  let attempt = 0

  while (attempt <= maxRetries) {
    log.info(`[${logContext}] Intento ${attempt + 1}/${maxRetries + 1}`)

    try {
      // Ejecutar insert
      const { data, error } = await insertFn()

      // Éxito - retornar inmediatamente
      if (data && !error) {
        log.info(`[${logContext}] Insert exitoso en intento ${attempt + 1}`)
        return {
          success: true,
          data,
          attempts: attempt + 1
        }
      }

      // Error
      if (error) {
        const isDuplicate = isDuplicateError(error, duplicateErrorCodes, duplicateKeywords)

        if (isDuplicate) {
          log.warn(`[${logContext}] Duplicado detectado en intento ${attempt + 1}:`, {
            errorCode: error.code,
            errorMessage: error.message
          })

          // Si es el último intento, fallar
          if (attempt >= maxRetries) {
            log.error(`[${logContext}] Máximo de reintentos alcanzado`)
            return {
              success: false,
              error: `No se pudo completar el insert después de ${maxRetries + 1} intentos (duplicados detectados)`,
              attempts: maxRetries + 1
            }
          }

          // Ejecutar callback de duplicado para regenerar valor
          log.info(`[${logContext}] Ejecutando onDuplicate callback...`)
          await onDuplicate(attempt)

          // Incrementar contador y reintentar
          attempt++
          continue

        } else {
          // Error que NO es duplicado - fallar inmediatamente
          log.error(`[${logContext}] Error de insert (no es duplicado):`, {
            errorCode: error.code,
            errorMessage: error.message,
            errorDetails: error.details
          })

          return {
            success: false,
            error: error.message || 'Error desconocido al insertar',
            attempts: attempt + 1
          }
        }
      }

      // Caso inesperado: no hay data ni error
      log.error(`[${logContext}] Insert retornó sin data ni error`)
      return {
        success: false,
        error: 'Insert retornó respuesta vacía',
        attempts: attempt + 1
      }

    } catch (exception) {
      log.error(`[${logContext}] Excepción durante insert:`, exception)
      return {
        success: false,
        error: exception instanceof Error ? exception.message : 'Excepción desconocida',
        attempts: attempt + 1
      }
    }
  }

  // No debería llegar aquí, pero por si acaso
  return {
    success: false,
    error: 'Error inesperado en retry logic',
    attempts: attempt
  }
}

/**
 * Retorna objeto con timestamp de actualización
 * Helper de conveniencia para updates
 *
 * @example
 * ```typescript
 * await supabaseAdmin
 *   .from('users')
 *   .update({ name: 'Juan', ...getUpdateTimestamp() })
 *   .eq('id', userId)
 * ```
 */
export function getUpdateTimestamp(): { updated_at: string } {
  return {
    updated_at: new Date().toISOString()
  }
}

/**
 * Retorna objeto con timestamps de creación y actualización
 * Helper de conveniencia para inserts
 *
 * @example
 * ```typescript
 * await supabaseAdmin
 *   .from('users')
 *   .insert({ name: 'Juan', ...getCreateTimestamps() })
 * ```
 */
export function getCreateTimestamps(): { created_at: string; updated_at: string } {
  const now = new Date().toISOString()
  return {
    created_at: now,
    updated_at: now
  }
}

/**
 * Ejecuta una transacción con retry en caso de deadlocks o serialization failures
 *
 * @experimental Esta función está en desarrollo
 */
export async function retryTransaction<T>(
  transactionFn: () => Promise<T>,
  maxRetries: number = 3
): Promise<{ success: boolean; data?: T; error?: string }> {
  const serializationErrorCodes = ['40001', '40P01'] // serialization_failure, deadlock_detected

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await transactionFn()
      return { success: true, data: result }
    } catch (error: any) {
      const isSerializationError = error?.code && serializationErrorCodes.includes(error.code)

      if (isSerializationError && attempt < maxRetries) {
        log.warn(`[retryTransaction] Deadlock/serialization error, reintentando... (${attempt + 1}/${maxRetries})`)
        // Espera exponencial: 100ms, 200ms, 400ms
        await new Promise(resolve => setTimeout(resolve, 100 * Math.pow(2, attempt)))
        continue
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error en transacción'
      }
    }
  }

  return {
    success: false,
    error: 'Máximo de reintentos alcanzado'
  }
}
