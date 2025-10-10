/**
 * Helper para validación de NIF, NIE y CIF españoles
 * Usa la librería nif-dni-nie-cif-validation
 */

import { isValidNif } from 'nif-dni-nie-cif-validation'

/**
 * Valida un NIF/NIE/CIF español
 *
 * @param value - Valor a validar (NIF, NIE o CIF)
 * @returns true si es válido, false si no
 */
export function isValidNIF(value: string): boolean {
  if (!value || typeof value !== 'string') {
    return false
  }

  // Limpiar espacios y convertir a mayúsculas
  const cleanValue = value.trim().toUpperCase()

  // Validar usando la librería
  // isValidNif valida DNI, NIE y CIF automáticamente
  return isValidNif(cleanValue)
}

/**
 * Formatea un NIF/NIE/CIF eliminando espacios y convirtiendo a mayúsculas
 *
 * @param value - Valor a formatear
 * @returns Valor formateado
 */
export function formatNIF(value: string): string {
  if (!value || typeof value !== 'string') {
    return ''
  }

  return value.trim().toUpperCase()
}

/**
 * Obtiene un mensaje de error personalizado para NIF/NIE/CIF inválido
 *
 * @param value - Valor que falló la validación
 * @returns Mensaje de error descriptivo
 */
export function getNIFErrorMessage(value: string): string {
  if (!value || !value.trim()) {
    return 'El NIF/NIE/CIF es requerido'
  }

  const cleanValue = value.trim().toUpperCase()

  // Verificar longitud
  if (cleanValue.length < 8 || cleanValue.length > 9) {
    return 'El NIF/NIE/CIF debe tener 8 o 9 caracteres'
  }

  // Verificar formato básico
  const nifRegex = /^[0-9]{8}[A-Z]$/
  const nieRegex = /^[XYZ][0-9]{7}[A-Z]$/
  const cifRegex = /^[ABCDEFGHJNPQRSUVW][0-9]{7}[0-9A-J]$/

  if (!nifRegex.test(cleanValue) && !nieRegex.test(cleanValue) && !cifRegex.test(cleanValue)) {
    return 'Formato de NIF/NIE/CIF inválido'
  }

  return 'NIF/NIE/CIF inválido. Verifica la letra de control'
}
