/**
 * Helper para generación de números únicos con manejo de race conditions
 * Elimina duplicación de lógica de generación de budget_number, invoice_number, etc.
 */

import { supabaseAdmin } from '@/lib/supabase/server'
import { log } from '@/lib/logger'

/**
 * Formatos soportados para números únicos
 */
export type NumberFormat =
  | 'YYYYMMDD-HHMMSS'       // 20251119-143025
  | 'YYYYMMDD-HHMMSS-MS'    // 20251119-143025-789
  | 'timestamp'              // 1700401825000
  | 'uuid'                   // UUID v4

/**
 * Opciones para generar número único
 */
export interface GenerateUniqueNumberOptions {
  /** Tabla donde verificar unicidad */
  table: string

  /** Columna que contiene el número único */
  column: string

  /** Company ID para scope por empresa */
  companyId: number

  /** Formato del número (default: 'YYYYMMDD-HHMMSS') */
  format?: NumberFormat

  /** Prefijo opcional (ej: 'PRES-', 'INV-') */
  prefix?: string

  /** Sufijo opcional */
  suffix?: string

  /** Máximo de intentos antes de fallar (default: 100) */
  maxAttempts?: number

  /** Incrementar segundos en cada intento (default: true) */
  incrementSeconds?: boolean
}

/**
 * Resultado de generación de número único
 */
export interface UniqueNumberResult {
  success: boolean
  number?: string
  attempts?: number
  error?: string
}

/**
 * Formatea fecha como número para IDs únicos
 * @internal
 */
function formatDateAsNumber(date: Date, format: NumberFormat): string {
  switch (format) {
    case 'YYYYMMDD-HHMMSS': {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const hour = String(date.getHours()).padStart(2, '0')
      const minute = String(date.getMinutes()).padStart(2, '0')
      const second = String(date.getSeconds()).padStart(2, '0')
      return `${year}${month}${day}-${hour}${minute}${second}`
    }

    case 'YYYYMMDD-HHMMSS-MS': {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const hour = String(date.getHours()).padStart(2, '0')
      const minute = String(date.getMinutes()).padStart(2, '0')
      const second = String(date.getSeconds()).padStart(2, '0')
      const ms = String(date.getMilliseconds()).padStart(3, '0')
      return `${year}${month}${day}-${hour}${minute}${second}-${ms}`
    }

    case 'timestamp':
      return String(date.getTime())

    case 'uuid':
      // UUID v4 (no usa fecha, pero está en el enum)
      return crypto.randomUUID()

    default:
      throw new Error(`Formato no soportado: ${format}`)
  }
}

/**
 * Verifica si un número ya existe en la base de datos
 * @internal
 */
async function checkNumberExists(
  table: string,
  column: string,
  number: string,
  companyId: number
): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from(table)
    .select('id')
    .eq(column, number)
    .eq('company_id', companyId)
    .maybeSingle()

  if (error) {
    log.error('[checkNumberExists] Error verificando:', { table, column, error })
    throw error
  }

  return !!data
}

/**
 * Genera un número único con manejo de race conditions
 *
 * @example
 * ```typescript
 * const result = await generateUniqueNumber({
 *   table: 'budgets',
 *   column: 'budget_number',
 *   companyId: 123,
 *   format: 'YYYYMMDD-HHMMSS',
 *   prefix: 'PRES-'
 * })
 *
 * if (result.success) {
 *   console.log('Número generado:', result.number)  // "PRES-20251119-143025"
 * }
 * ```
 */
export async function generateUniqueNumber(
  options: GenerateUniqueNumberOptions
): Promise<UniqueNumberResult> {
  const {
    table,
    column,
    companyId,
    format = 'YYYYMMDD-HHMMSS',
    prefix = '',
    suffix = '',
    maxAttempts = 100,
    incrementSeconds = true
  } = options

  log.info('[generateUniqueNumber] Iniciando generación:', {
    table,
    column,
    companyId,
    format
  })

  let attempt = 0
  let baseDate = new Date()

  while (attempt < maxAttempts) {
    attempt++

    // Generar número candidato
    let candidateNumber: string

    if (format === 'uuid') {
      // UUID siempre es único, no necesita retry
      candidateNumber = `${prefix}${crypto.randomUUID()}${suffix}`
    } else {
      // Incrementar fecha para siguientes intentos
      const currentDate = incrementSeconds && attempt > 1
        ? new Date(baseDate.getTime() + (attempt - 1) * 1000)
        : baseDate

      const numberPart = formatDateAsNumber(currentDate, format)
      candidateNumber = `${prefix}${numberPart}${suffix}`
    }

    log.info(`[generateUniqueNumber] Intento ${attempt}/${maxAttempts}: ${candidateNumber}`)

    // Verificar unicidad
    try {
      const exists = await checkNumberExists(table, column, candidateNumber, companyId)

      if (!exists) {
        log.info(`[generateUniqueNumber] Número único encontrado en intento ${attempt}: ${candidateNumber}`)
        return {
          success: true,
          number: candidateNumber,
          attempts: attempt
        }
      }

      log.warn(`[generateUniqueNumber] Número duplicado encontrado (intento ${attempt}): ${candidateNumber}`)

      // Si es UUID y existe, hay un problema serio
      if (format === 'uuid') {
        return {
          success: false,
          error: 'UUID duplicado encontrado - esto no debería ocurrir',
          attempts: attempt
        }
      }

    } catch (error) {
      log.error('[generateUniqueNumber] Error verificando unicidad:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error verificando unicidad',
        attempts: attempt
      }
    }
  }

  // Máximo de intentos alcanzado
  log.error(`[generateUniqueNumber] Máximo de intentos alcanzado (${maxAttempts})`)
  return {
    success: false,
    error: `No se pudo generar un número único después de ${maxAttempts} intentos`,
    attempts: maxAttempts
  }
}

/**
 * Genera un número único de presupuesto
 * Helper de conveniencia para budgets
 */
export async function generateBudgetNumber(companyId: number): Promise<UniqueNumberResult> {
  return generateUniqueNumber({
    table: 'budgets',
    column: 'budget_number',
    companyId,
    format: 'YYYYMMDD-HHMMSS'
  })
}

/**
 * Genera un número único de factura
 * Helper de conveniencia para invoices
 */
export async function generateInvoiceNumber(
  companyId: number,
  prefix: string = 'INV-'
): Promise<UniqueNumberResult> {
  return generateUniqueNumber({
    table: 'invoices',
    column: 'invoice_number',
    companyId,
    format: 'YYYYMMDD-HHMMSS',
    prefix
  })
}

/**
 * Parsea un número en formato YYYYMMDD-HHMMSS a Date
 * Útil para extraer fecha de números generados
 *
 * @example
 * ```typescript
 * const date = parseDateFromNumber('20251119-143025')
 * // Date: 2025-11-19 14:30:25
 * ```
 */
export function parseDateFromNumber(numberStr: string): Date | null {
  // Eliminar prefijos/sufijos comunes
  const cleaned = numberStr.replace(/^[A-Z]+-/, '').replace(/-[A-Z]+$/, '')

  // Detectar formato YYYYMMDD-HHMMSS o YYYYMMDD-HHMMSS-MS
  const match = cleaned.match(/^(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})(?:-(\d{3}))?$/)

  if (!match) {
    return null
  }

  const [, year, month, day, hour, minute, second, ms] = match

  const date = new Date(
    parseInt(year),
    parseInt(month) - 1, // Mes es 0-indexed
    parseInt(day),
    parseInt(hour),
    parseInt(minute),
    parseInt(second),
    ms ? parseInt(ms) : 0
  )

  return isNaN(date.getTime()) ? null : date
}
