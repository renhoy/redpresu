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
 * @param tipoCliente - Tipo de cliente (opcional) para mensaje más específico
 * @returns Mensaje de error descriptivo
 */
export function getNIFErrorMessage(value: string, tipoCliente?: 'particular' | 'autonomo' | 'empresa'): string {
  if (!value || !value.trim()) {
    return 'El NIF/NIE/CIF es requerido'
  }

  const cleanValue = value.trim().toUpperCase()

  // Verificar longitud
  if (cleanValue.length < 8 || cleanValue.length > 9) {
    return 'El NIF/NIE/CIF debe tener 8 o 9 caracteres'
  }

  // Verificar formato básico
  const dniRegex = /^[0-9]{8}[A-Z]$/
  const nieRegex = /^[XYZ][0-9]{7}[A-Z]$/
  const cifRegex = /^[ABCDEFGHJNPQRSUVW][0-9]{7}[0-9A-J]$/

  // Detectar qué tipo de documento parece ser
  const pareceNIE = /^[XYZ]/.test(cleanValue)
  const pareceDNI = /^[0-9]/.test(cleanValue)
  const pareceCIF = /^[A-Z]/.test(cleanValue) && !pareceNIE

  // Si no coincide con ningún formato
  if (!dniRegex.test(cleanValue) && !nieRegex.test(cleanValue) && !cifRegex.test(cleanValue)) {
    // Mensaje específico según tipo de cliente
    if (tipoCliente === 'empresa') {
      return 'CIF inválido. Formatos admitidos: A12345678 o K1234567A'
    } else if (tipoCliente === 'particular' || tipoCliente === 'autonomo') {
      return 'DNI/NIE inválido. Formatos admitidos: 12345678Z o X1234567L'
    }

    // Mensaje genérico cuando no se especifica tipo
    if (pareceCIF) {
      return 'CIF inválido. Formatos admitidos: A12345678 o K1234567A'
    } else {
      return 'DNI/NIE inválido. Formatos admitidos: 12345678Z o X1234567L'
    }
  }

  // Si el formato es correcto pero la letra de control está mal
  if (tipoCliente === 'empresa') {
    return 'CIF inválido. Verifica el dígito/letra de control'
  } else if (tipoCliente === 'particular' || tipoCliente === 'autonomo') {
    return 'DNI/NIE inválido. Verifica la letra de control'
  }

  // Mensaje específico según qué parece ser
  if (pareceNIE) {
    return 'NIE inválido. Verifica la letra de control. Formato: X1234567L'
  } else if (pareceDNI) {
    return 'DNI inválido. Verifica la letra de control. Formato: 12345678Z'
  } else {
    return 'CIF inválido. Verifica el dígito/letra de control. Formatos: A12345678 o K1234567A'
  }
}
