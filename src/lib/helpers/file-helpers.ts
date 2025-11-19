/**
 * Helpers para manejo de archivos y nombres de archivo
 * Elimina duplicación de lógica de sanitización
 */

import { formatDateToNumber } from './format'

/**
 * Opciones para sanitizar nombre de archivo
 */
export interface SanitizeFilenameOptions {
  /**
   * Máximo de caracteres permitidos (default: 100)
   */
  maxLength?: number

  /**
   * Preservar mayúsculas/minúsculas (default: false, convierte a minúsculas)
   */
  preserveCase?: boolean

  /**
   * Preservar extensión del archivo (default: true)
   */
  preserveExtension?: boolean

  /**
   * Eliminar acentos y caracteres especiales (default: true)
   */
  removeAccents?: boolean

  /**
   * Carácter de reemplazo para caracteres no permitidos (default: '_')
   */
  replacementChar?: string
}

/**
 * Sanitiza un nombre de archivo para uso seguro en filesystem
 *
 * Elimina caracteres peligrosos, acentos, espacios, y limita longitud.
 * Útil para prevenir inyección de rutas y problemas cross-platform.
 *
 * @param filename - Nombre de archivo a sanitizar
 * @param options - Opciones de sanitización
 * @returns Nombre de archivo sanitizado
 *
 * @example
 * sanitizeFilename('Mi Archivo#123.pdf')
 * // "mi_archivo_123.pdf"
 *
 * sanitizeFilename('Café & Té.jpg', { preserveCase: true })
 * // "Cafe_Te.jpg"
 *
 * sanitizeFilename('documento con espacios múltiples.docx')
 * // "documento_con_espacios_multiples.docx"
 */
export function sanitizeFilename(
  filename: string,
  options: SanitizeFilenameOptions = {}
): string {
  const {
    maxLength = 100,
    preserveCase = false,
    preserveExtension = true,
    removeAccents = true,
    replacementChar = '_'
  } = options

  if (!filename || typeof filename !== 'string') {
    return 'untitled'
  }

  let sanitized = filename.trim()

  // Separar nombre y extensión si se debe preservar
  let extension = ''
  if (preserveExtension) {
    const lastDotIndex = sanitized.lastIndexOf('.')
    if (lastDotIndex > 0) {
      extension = sanitized.substring(lastDotIndex)
      sanitized = sanitized.substring(0, lastDotIndex)
    }
  }

  // Convertir a minúsculas si no se preserva el case
  if (!preserveCase) {
    sanitized = sanitized.toLowerCase()
  }

  // Eliminar acentos
  if (removeAccents) {
    sanitized = sanitized
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Eliminar marcas diacríticas
  }

  // Reemplazar caracteres no permitidos con el carácter de reemplazo
  // Permitir solo: letras (a-z, A-Z), números (0-9), guiones (-), guiones bajos (_)
  const allowedPattern = preserveCase
    ? /[^a-zA-Z0-9_-]/g
    : /[^a-z0-9_-]/g

  sanitized = sanitized.replace(allowedPattern, replacementChar)

  // Eliminar múltiples caracteres de reemplazo consecutivos
  const multipleReplacementPattern = new RegExp(`${replacementChar}{2,}`, 'g')
  sanitized = sanitized.replace(multipleReplacementPattern, replacementChar)

  // Eliminar caracteres de reemplazo al inicio y final
  sanitized = sanitized.replace(new RegExp(`^${replacementChar}+|${replacementChar}+$`, 'g'), '')

  // Si quedó vacío después de sanitizar
  if (!sanitized) {
    sanitized = 'untitled'
  }

  // Aplicar límite de longitud (reservando espacio para extensión)
  const extensionLength = preserveExtension ? extension.length : 0
  const maxNameLength = maxLength - extensionLength
  if (sanitized.length > maxNameLength) {
    sanitized = sanitized.substring(0, maxNameLength)
  }

  // Recombinar con extensión
  return preserveExtension && extension
    ? sanitized + extension.toLowerCase()
    : sanitized
}

/**
 * Genera un nombre de archivo único agregando timestamp
 *
 * @param originalName - Nombre original del archivo
 * @param prefix - Prefijo opcional (default: '')
 * @param useMilliseconds - Incluir milisegundos en timestamp (default: false)
 * @returns Nombre de archivo único sanitizado
 *
 * @example
 * generateUniqueFilename('documento.pdf')
 * // "20251119-143025-documento.pdf"
 *
 * generateUniqueFilename('foto.jpg', 'avatar')
 * // "avatar-20251119-143025-foto.jpg"
 *
 * generateUniqueFilename('archivo.txt', '', true)
 * // "20251119-143025-789-archivo.txt"
 */
export function generateUniqueFilename(
  originalName: string,
  prefix: string = '',
  useMilliseconds: boolean = false
): string {
  // Sanitizar el nombre original
  const sanitized = sanitizeFilename(originalName, {
    maxLength: 80, // Dejar espacio para timestamp
    preserveExtension: true
  })

  // Separar nombre y extensión
  const lastDotIndex = sanitized.lastIndexOf('.')
  const basename = lastDotIndex > 0
    ? sanitized.substring(0, lastDotIndex)
    : sanitized
  const extension = lastDotIndex > 0
    ? sanitized.substring(lastDotIndex)
    : ''

  // Generar timestamp
  const timestamp = useMilliseconds
    ? formatDateToNumber(new Date(), 'YYYYMMDD-HHMMSS-MS')
    : formatDateToNumber(new Date(), 'YYYYMMDD-HHMMSS')

  // Construir nombre completo
  const parts = [
    prefix,
    timestamp,
    basename
  ].filter(Boolean) // Eliminar partes vacías

  return parts.join('-') + extension
}

/**
 * Genera un nombre de archivo usando solo timestamp (sin nombre original)
 *
 * @param extension - Extensión del archivo (ej: '.pdf', '.jpg')
 * @param prefix - Prefijo opcional
 * @returns Nombre de archivo basado en timestamp
 *
 * @example
 * generateTimestampFilename('.pdf', 'budget')
 * // "budget-20251119-143025.pdf"
 */
export function generateTimestampFilename(
  extension: string,
  prefix: string = ''
): string {
  const timestamp = formatDateToNumber(new Date(), 'YYYYMMDD-HHMMSS')

  // Asegurar que la extensión empiece con punto
  const ext = extension.startsWith('.') ? extension : `.${extension}`

  return prefix
    ? `${prefix}-${timestamp}${ext}`
    : `${timestamp}${ext}`
}

/**
 * Valida que un nombre de archivo sea seguro
 *
 * @param filename - Nombre de archivo a validar
 * @returns true si es seguro, false si contiene caracteres peligrosos
 *
 * @example
 * isSecureFilename('documento.pdf') // true
 * isSecureFilename('../../../etc/passwd') // false
 * isSecureFilename('archivo<script>.exe') // false
 */
export function isSecureFilename(filename: string): boolean {
  if (!filename || typeof filename !== 'string') {
    return false
  }

  // Patrones peligrosos
  const dangerousPatterns = [
    /\.\./,           // Path traversal (..)
    /\//,             // Slash
    /\\/,             // Backslash
    /</,              // HTML tag
    />/,              // HTML tag
    /\|/,             // Pipe
    /:/,              // Colon (Windows drive)
    /"/,              // Quote
    /\*/,             // Wildcard
    /\?/,             // Question mark
    /\0/,             // Null byte
    /[\x00-\x1f]/,    // Control characters
  ]

  return !dangerousPatterns.some(pattern => pattern.test(filename))
}

/**
 * Extrae la extensión de un nombre de archivo
 *
 * @param filename - Nombre de archivo
 * @returns Extensión (con punto) o string vacío si no tiene
 *
 * @example
 * getFileExtension('documento.pdf') // '.pdf'
 * getFileExtension('archivo.tar.gz') // '.gz'
 * getFileExtension('sin-extension') // ''
 */
export function getFileExtension(filename: string): string {
  if (!filename || typeof filename !== 'string') {
    return ''
  }

  const lastDotIndex = filename.lastIndexOf('.')
  if (lastDotIndex <= 0) {
    return ''
  }

  return filename.substring(lastDotIndex)
}

/**
 * Valida el tamaño de un archivo
 *
 * @param sizeInBytes - Tamaño del archivo en bytes
 * @param maxSizeMB - Tamaño máximo permitido en MB
 * @returns Objeto con resultado de validación
 *
 * @example
 * validateFileSize(1048576, 2) // { valid: true }
 * validateFileSize(3145728, 2) // { valid: false, error: 'Archivo excede 2 MB' }
 */
export function validateFileSize(
  sizeInBytes: number,
  maxSizeMB: number
): { valid: boolean; error?: string } {
  const maxSizeBytes = maxSizeMB * 1024 * 1024

  if (sizeInBytes > maxSizeBytes) {
    return {
      valid: false,
      error: `El archivo excede el tamaño máximo de ${maxSizeMB} MB`
    }
  }

  return { valid: true }
}

/**
 * Formatea tamaño de archivo en formato legible
 *
 * @param bytes - Tamaño en bytes
 * @returns String formateado (ej: "1.5 MB", "500 KB")
 *
 * @example
 * formatFileSize(1536) // "1.5 KB"
 * formatFileSize(1048576) // "1 MB"
 * formatFileSize(524288000) // "500 MB"
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  if (bytes < 0) return 'Invalid size'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  const size = bytes / Math.pow(k, i)
  const formatted = i === 0
    ? size.toString()
    : size.toFixed(1)

  return `${formatted} ${sizes[i]}`
}
