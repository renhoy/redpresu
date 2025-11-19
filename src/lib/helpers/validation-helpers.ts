/**
 * Helpers centralizados de validaciones
 *
 * Consolida validaciones repetidas en múltiples archivos
 * y proporciona una API consistente para validación de datos.
 */

import { isValidNIF, getNIFErrorMessage } from './nif-validator'
import { validateEmail } from './email-validation'

/**
 * Resultado de validación genérico
 */
export interface ValidationResult {
  valid: boolean
  error?: string
  value?: any
}

/**
 * Valida email usando el helper existente
 *
 * @param email - Email a validar
 * @returns ValidationResult con valid y error
 *
 * @example
 * ```typescript
 * const result = validateEmailField('user@example.com')
 * if (!result.valid) {
 *   return { success: false, error: result.error }
 * }
 * ```
 */
export function validateEmailField(email: string | undefined | null): ValidationResult {
  if (!email || !email.trim()) {
    return {
      valid: false,
      error: 'El email es requerido'
    }
  }

  const emailValidation = validateEmail(email.trim())

  if (!emailValidation.valid) {
    return {
      valid: false,
      error: emailValidation.error || 'Email inválido'
    }
  }

  return {
    valid: true,
    value: email.trim().toLowerCase()
  }
}

/**
 * Valida NIF/CIF usando el helper existente
 *
 * @param nif - NIF/CIF a validar
 * @returns ValidationResult con valid y error
 *
 * @example
 * ```typescript
 * const result = validateNIFField('12345678Z')
 * if (!result.valid) {
 *   return { success: false, error: result.error }
 * }
 * ```
 */
export function validateNIFField(nif: string | undefined | null): ValidationResult {
  if (!nif || !nif.trim()) {
    return {
      valid: false,
      error: 'El NIF/CIF es requerido'
    }
  }

  const trimmedNIF = nif.trim().toUpperCase()

  if (!isValidNIF(trimmedNIF)) {
    const errorMessage = getNIFErrorMessage(trimmedNIF)
    return {
      valid: false,
      error: errorMessage
    }
  }

  return {
    valid: true,
    value: trimmedNIF
  }
}

/**
 * Valida que un string no esté vacío
 *
 * @param value - Valor a validar
 * @param fieldName - Nombre del campo (para mensaje de error)
 * @param minLength - Longitud mínima (opcional)
 * @returns ValidationResult
 */
export function validateRequiredString(
  value: string | undefined | null,
  fieldName: string,
  minLength?: number
): ValidationResult {
  if (!value || !value.trim()) {
    return {
      valid: false,
      error: `${fieldName} es requerido`
    }
  }

  const trimmedValue = value.trim()

  if (minLength && trimmedValue.length < minLength) {
    return {
      valid: false,
      error: `${fieldName} debe tener al menos ${minLength} caracteres`
    }
  }

  return {
    valid: true,
    value: trimmedValue
  }
}

/**
 * Valida un número positivo
 *
 * @param value - Valor a validar
 * @param fieldName - Nombre del campo
 * @param min - Valor mínimo permitido (default: 0)
 * @returns ValidationResult
 */
export function validatePositiveNumber(
  value: number | undefined | null,
  fieldName: string,
  min: number = 0
): ValidationResult {
  if (value === undefined || value === null) {
    return {
      valid: false,
      error: `${fieldName} es requerido`
    }
  }

  if (typeof value !== 'number' || isNaN(value)) {
    return {
      valid: false,
      error: `${fieldName} debe ser un número válido`
    }
  }

  if (value < min) {
    return {
      valid: false,
      error: `${fieldName} debe ser mayor o igual a ${min}`
    }
  }

  return {
    valid: true,
    value
  }
}

/**
 * Valida un teléfono español (básico)
 *
 * @param phone - Teléfono a validar
 * @returns ValidationResult
 */
export function validatePhoneField(phone: string | undefined | null): ValidationResult {
  if (!phone || !phone.trim()) {
    return {
      valid: false,
      error: 'El teléfono es requerido'
    }
  }

  const trimmedPhone = phone.trim()

  // Validación básica: solo números, espacios, +, -, (, )
  const phoneRegex = /^[0-9+\-() ]{9,20}$/

  if (!phoneRegex.test(trimmedPhone)) {
    return {
      valid: false,
      error: 'Formato de teléfono inválido'
    }
  }

  return {
    valid: true,
    value: trimmedPhone
  }
}

/**
 * Valida una URL (opcional)
 *
 * @param url - URL a validar
 * @returns ValidationResult
 */
export function validateURLField(url: string | undefined | null): ValidationResult {
  // URL es opcional, si está vacía es válido
  if (!url || !url.trim()) {
    return {
      valid: true,
      value: null
    }
  }

  const trimmedURL = url.trim()

  try {
    new URL(trimmedURL)
    return {
      valid: true,
      value: trimmedURL
    }
  } catch {
    return {
      valid: false,
      error: 'URL inválida. Debe comenzar con http:// o https://'
    }
  }
}

/**
 * Valida código postal español
 *
 * @param postalCode - Código postal a validar
 * @returns ValidationResult
 */
export function validatePostalCodeField(postalCode: string | undefined | null): ValidationResult {
  // Código postal es opcional
  if (!postalCode || !postalCode.trim()) {
    return {
      valid: true,
      value: null
    }
  }

  const trimmedCode = postalCode.trim()

  // Código postal español: 5 dígitos
  const postalCodeRegex = /^\d{5}$/

  if (!postalCodeRegex.test(trimmedCode)) {
    return {
      valid: false,
      error: 'Código postal debe tener 5 dígitos'
    }
  }

  return {
    valid: true,
    value: trimmedCode
  }
}

/**
 * Valida múltiples campos y retorna el primer error encontrado
 *
 * @param validations - Array de resultados de validación
 * @returns Primer error encontrado o null si todo es válido
 *
 * @example
 * ```typescript
 * const firstError = getFirstValidationError([
 *   validateEmailField(data.email),
 *   validateNIFField(data.nif),
 *   validateRequiredString(data.name, 'Nombre')
 * ])
 *
 * if (firstError) {
 *   return { success: false, error: firstError }
 * }
 * ```
 */
export function getFirstValidationError(validations: ValidationResult[]): string | null {
  for (const validation of validations) {
    if (!validation.valid) {
      return validation.error || 'Error de validación'
    }
  }
  return null
}

/**
 * Valida todos los campos y retorna todos los errores
 *
 * @param validations - Array de resultados de validación con nombres de campo
 * @returns Array de errores o array vacío si todo es válido
 *
 * @example
 * ```typescript
 * const errors = getAllValidationErrors([
 *   { field: 'email', result: validateEmailField(data.email) },
 *   { field: 'nif', result: validateNIFField(data.nif) }
 * ])
 *
 * if (errors.length > 0) {
 *   return { success: false, errors }
 * }
 * ```
 */
export function getAllValidationErrors(
  validations: Array<{ field: string; result: ValidationResult }>
): Array<{ field: string; error: string }> {
  return validations
    .filter(v => !v.result.valid)
    .map(v => ({
      field: v.field,
      error: v.result.error || 'Error de validación'
    }))
}
