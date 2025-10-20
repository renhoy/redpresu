/**
 * Email Validation Helpers
 *
 * SECURITY (VULN-019): Validar emails en cliente para prevenir inyecciones
 * y mejorar UX con feedback inmediato
 *
 * Referencias:
 * - OWASP Email Validation: https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html
 * - RFC 5322: https://datatracker.ietf.org/doc/html/rfc5322
 * - HTML5 Email Pattern: https://html.spec.whatwg.org/multipage/input.html#valid-e-mail-address
 */

// ============================================
// REGEX PATTERNS
// ============================================

/**
 * Patrón de email básico (HTML5 compatible)
 * Basado en el estándar HTML5 para input type="email"
 *
 * Permite:
 * - Letras, números, puntos, guiones, guiones bajos en parte local
 * - Dominios con letras, números, guiones
 * - TLDs de 2+ caracteres
 *
 * Rechaza:
 * - Espacios
 * - Caracteres especiales peligrosos
 * - Puntos consecutivos
 * - Inicio/fin con punto
 */
const EMAIL_PATTERN = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/

/**
 * Patrón estricto de email (más seguro)
 *
 * Validaciones adicionales:
 * - No permite puntos consecutivos (..)
 * - No permite guiones consecutivos (--)
 * - No permite inicio/fin de parte local con punto
 * - Dominio debe tener al menos un punto
 * - TLD de 2-6 caracteres (cubre .com, .museum, etc.)
 */
const EMAIL_PATTERN_STRICT = /^(?!.*\.\.)(?!.*--)(?!.*\.-)(?!.*-\.)[a-zA-Z0-9][a-zA-Z0-9._%+-]{0,63}@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,6}$/

/**
 * Lista de dominios comunes sospechosos o desechables
 * (expandible según necesidades)
 */
const DISPOSABLE_EMAIL_DOMAINS = [
  'tempmail.com',
  'guerrillamail.com',
  'mailinator.com',
  '10minutemail.com',
  'throwaway.email',
  'temp-mail.org',
  'fakeinbox.com',
  'dispostable.com',
  'yopmail.com',
  'trashmail.com'
]

// ============================================
// TIPOS
// ============================================

export interface EmailValidationResult {
  valid: boolean
  error?: string
  email?: string
  normalized?: string
  warnings?: string[]
}

export interface EmailValidationOptions {
  strict?: boolean
  allowDisposable?: boolean
  requireTLD?: boolean
  maxLength?: number
  customPattern?: RegExp
  customErrorMessages?: {
    invalid?: string
    tooLong?: string
    disposable?: string
    empty?: string
  }
}

// ============================================
// VALIDACIÓN PRINCIPAL
// ============================================

/**
 * Valida un email con múltiples criterios
 *
 * SECURITY (VULN-019): Previene inyecciones y valida formato
 *
 * @param email - Email a validar
 * @param options - Opciones de validación
 * @returns Resultado de validación
 *
 * @example
 * ```typescript
 * const result = validateEmail('user@example.com')
 * if (!result.valid) {
 *   setError(result.error)
 *   return
 * }
 * // Usar email validado
 * ```
 */
export function validateEmail(
  email: string | null | undefined,
  options?: EmailValidationOptions
): EmailValidationResult {
  const {
    strict = false,
    allowDisposable = true,
    requireTLD = true,
    maxLength = 254, // RFC 5321 max length
    customPattern,
    customErrorMessages = {}
  } = options || {}

  // 1. Verificar que existe
  if (!email || email.trim() === '') {
    return {
      valid: false,
      error: customErrorMessages.empty || 'El email es requerido'
    }
  }

  // 2. Normalizar (trim y lowercase)
  const normalizedEmail = email.trim().toLowerCase()

  // 3. Validar longitud
  if (normalizedEmail.length > maxLength) {
    return {
      valid: false,
      error: customErrorMessages.tooLong ||
        `El email es demasiado largo (máximo ${maxLength} caracteres)`,
      email: normalizedEmail
    }
  }

  // 4. Validar con regex
  const pattern = customPattern || (strict ? EMAIL_PATTERN_STRICT : EMAIL_PATTERN)

  if (!pattern.test(normalizedEmail)) {
    return {
      valid: false,
      error: customErrorMessages.invalid || 'Email no válido',
      email: normalizedEmail
    }
  }

  // 5. Extraer dominio
  const [localPart, domain] = normalizedEmail.split('@')

  // 6. Validaciones adicionales
  const warnings: string[] = []

  // Validar TLD si es requerido
  if (requireTLD && domain) {
    const parts = domain.split('.')
    if (parts.length < 2) {
      return {
        valid: false,
        error: 'Email debe incluir un dominio válido (ej: ejemplo.com)',
        email: normalizedEmail
      }
    }
  }

  // Validar si es email desechable
  if (!allowDisposable && domain && DISPOSABLE_EMAIL_DOMAINS.includes(domain)) {
    return {
      valid: false,
      error: customErrorMessages.disposable ||
        'No se permiten emails desechables o temporales',
      email: normalizedEmail
    }
  }

  // Advertencias (no bloquean validación)
  if (localPart && localPart.length > 64) {
    warnings.push('La parte local del email es muy larga')
  }

  if (domain && domain.includes('..')) {
    warnings.push('El dominio contiene puntos consecutivos')
  }

  // 7. Email válido
  return {
    valid: true,
    email: normalizedEmail,
    normalized: normalizedEmail,
    warnings: warnings.length > 0 ? warnings : undefined
  }
}

/**
 * Validación rápida de email (solo formato básico)
 *
 * @param email - Email a validar
 * @returns true si el email es válido
 */
export function isValidEmail(email: string | null | undefined): boolean {
  return validateEmail(email).valid
}

/**
 * Normaliza un email (trim + lowercase)
 *
 * @param email - Email a normalizar
 * @returns Email normalizado o null si es inválido
 */
export function normalizeEmail(email: string | null | undefined): string | null {
  if (!email || email.trim() === '') return null
  return email.trim().toLowerCase()
}

/**
 * Extrae el dominio de un email
 *
 * @param email - Email del que extraer dominio
 * @returns Dominio o null si el email es inválido
 */
export function getEmailDomain(email: string | null | undefined): string | null {
  const normalized = normalizeEmail(email)
  if (!normalized) return null

  const parts = normalized.split('@')
  return parts.length === 2 ? parts[1] : null
}

/**
 * Valida múltiples emails
 *
 * @param emails - Array de emails
 * @param options - Opciones de validación
 * @returns Array de resultados
 */
export function validateMultipleEmails(
  emails: string[],
  options?: EmailValidationOptions
): EmailValidationResult[] {
  return emails.map(email => validateEmail(email, options))
}

/**
 * Verifica si todos los emails son válidos
 *
 * @param emails - Array de emails
 * @param options - Opciones de validación
 * @returns true si todos son válidos
 */
export function areAllEmailsValid(
  emails: string[],
  options?: EmailValidationOptions
): boolean {
  return validateMultipleEmails(emails, options).every(result => result.valid)
}

/**
 * Obtiene todos los errores de validación de emails
 *
 * @param emails - Array de emails
 * @param options - Opciones de validación
 * @returns Array de mensajes de error
 */
export function getEmailValidationErrors(
  emails: string[],
  options?: EmailValidationOptions
): string[] {
  return validateMultipleEmails(emails, options)
    .filter(result => !result.valid && result.error)
    .map(result => result.error!)
}

/**
 * Verifica si un email es de un dominio desechable
 *
 * @param email - Email a verificar
 * @returns true si es desechable
 */
export function isDisposableEmail(email: string | null | undefined): boolean {
  const domain = getEmailDomain(email)
  if (!domain) return false
  return DISPOSABLE_EMAIL_DOMAINS.includes(domain)
}

/**
 * Sugiere correcciones para emails con errores comunes
 *
 * @param email - Email a corregir
 * @returns Email sugerido o null si no hay sugerencias
 */
export function suggestEmailCorrection(email: string | null | undefined): string | null {
  if (!email) return null

  const normalized = email.trim().toLowerCase()

  // Correcciones comunes de dominios
  const commonMistakes: Record<string, string> = {
    'gmail.con': 'gmail.com',
    'gmail.co': 'gmail.com',
    'gmial.com': 'gmail.com',
    'gmai.com': 'gmail.com',
    'hotmail.con': 'hotmail.com',
    'hotmail.co': 'hotmail.com',
    'hotmai.com': 'hotmail.com',
    'outlook.con': 'outlook.com',
    'outlook.co': 'outlook.com',
    'yahoo.con': 'yahoo.com',
    'yahoo.co': 'yahoo.com',
    'yhoo.com': 'yahoo.com'
  }

  const domain = getEmailDomain(normalized)
  if (!domain) return null

  const correction = commonMistakes[domain]
  if (correction) {
    const localPart = normalized.split('@')[0]
    return `${localPart}@${correction}`
  }

  return null
}

/**
 * Oculta parcialmente un email para privacidad
 *
 * @param email - Email a ocultar
 * @param showChars - Caracteres a mostrar del inicio (por defecto 3)
 * @returns Email parcialmente oculto
 * @example
 * ```typescript
 * maskEmail('usuario@example.com') // "usu***@example.com"
 * maskEmail('usuario@example.com', 2) // "us***@example.com"
 * ```
 */
export function maskEmail(email: string | null | undefined, showChars: number = 3): string {
  if (!email) return ''

  const normalized = normalizeEmail(email)
  if (!normalized) return ''

  const [localPart, domain] = normalized.split('@')

  if (!localPart || !domain) return email

  const visibleChars = Math.min(showChars, localPart.length - 1)
  const masked = localPart.substring(0, visibleChars) + '***'

  return `${masked}@${domain}`
}

/**
 * Hook de React para validación de email en tiempo real
 *
 * @param initialEmail - Email inicial
 * @param options - Opciones de validación
 * @returns Estado y funciones de validación
 */
export function useEmailValidation(
  initialEmail: string = '',
  options?: EmailValidationOptions
) {
  const [email, setEmail] = React.useState(initialEmail)
  const [error, setError] = React.useState<string | undefined>()
  const [touched, setTouched] = React.useState(false)

  const validate = React.useCallback((value: string) => {
    const result = validateEmail(value, options)
    setError(result.valid ? undefined : result.error)
    return result.valid
  }, [options])

  const handleChange = React.useCallback((value: string) => {
    setEmail(value)
    if (touched) {
      validate(value)
    }
  }, [touched, validate])

  const handleBlur = React.useCallback(() => {
    setTouched(true)
    validate(email)
  }, [email, validate])

  return {
    email,
    error,
    touched,
    isValid: !error && touched,
    setEmail: handleChange,
    handleBlur,
    validate: () => validate(email)
  }
}

// Para compatibilidad con el hook
import * as React from 'react'
