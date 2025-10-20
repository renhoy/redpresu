/**
 * File Validation Helpers
 *
 * SECURITY (VULN-015): Validar tamaño y tipo de archivos en uploads
 * Previene ataques DoS por archivos grandes y validación de tipos MIME
 *
 * Referencias:
 * - OWASP File Upload: https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html
 * - MIME Types: https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types
 */

// ============================================
// CONSTANTES DE LÍMITES DE TAMAÑO
// ============================================

/**
 * Límites de tamaño de archivo en bytes
 * SECURITY (VULN-015): Prevenir DoS por archivos grandes
 */
export const FILE_SIZE_LIMITS = {
  // Imágenes (logos, avatares)
  IMAGE_MAX: 2 * 1024 * 1024,      // 2 MB

  // Documentos JSON (tarifas, presupuestos)
  JSON_MAX: 5 * 1024 * 1024,       // 5 MB

  // Archivos CSV (importaciones)
  CSV_MAX: 10 * 1024 * 1024,       // 10 MB

  // PDFs (presupuestos generados)
  PDF_MAX: 5 * 1024 * 1024,        // 5 MB

  // Límite general para cualquier archivo
  GENERAL_MAX: 10 * 1024 * 1024    // 10 MB
} as const

/**
 * MIME types permitidos por categoría
 * SECURITY (VULN-015): Validar tipo de archivo por MIME type
 */
export const ALLOWED_MIME_TYPES = {
  // Imágenes
  IMAGES: [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/svg+xml',
    'image/webp'
  ],

  // Documentos
  JSON: ['application/json'],
  CSV: ['text/csv', 'application/csv'],
  PDF: ['application/pdf'],

  // Texto plano (para fallback de CSV)
  TEXT: ['text/plain']
} as const

/**
 * Extensiones de archivo permitidas
 * SECURITY: Doble validación (MIME + extensión)
 */
export const ALLOWED_EXTENSIONS = {
  IMAGES: ['.jpg', '.jpeg', '.png', '.svg', '.webp'],
  JSON: ['.json'],
  CSV: ['.csv'],
  PDF: ['.pdf']
} as const

// ============================================
// TIPOS
// ============================================

export type FileType = 'image' | 'json' | 'csv' | 'pdf' | 'general'

export interface FileValidationResult {
  valid: boolean
  error?: string
  file?: File
  size?: number
  type?: string
  extension?: string
}

export interface FileValidationOptions {
  maxSize?: number
  allowedMimeTypes?: string[]
  allowedExtensions?: string[]
  customErrorMessages?: {
    sizeExceeded?: string
    invalidType?: string
    invalidExtension?: string
    empty?: string
  }
}

// ============================================
// HELPERS
// ============================================

/**
 * Formatea bytes a formato legible (KB, MB, GB)
 *
 * @param bytes - Tamaño en bytes
 * @param decimals - Número de decimales (por defecto 2)
 * @returns String formateado (ej: "2.5 MB")
 */
export function formatFileSize(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']

  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

/**
 * Obtiene la extensión de un archivo
 *
 * @param filename - Nombre del archivo
 * @returns Extensión en minúsculas (ej: ".jpg")
 */
export function getFileExtension(filename: string): string {
  const parts = filename.toLowerCase().split('.')
  return parts.length > 1 ? '.' + parts[parts.length - 1] : ''
}

/**
 * Verifica si un archivo está vacío
 *
 * @param file - Archivo a verificar
 * @returns true si el archivo está vacío
 */
export function isFileEmpty(file: File): boolean {
  return file.size === 0
}

// ============================================
// VALIDACIÓN PRINCIPAL
// ============================================

/**
 * Valida un archivo según tipo, tamaño y extensión
 *
 * SECURITY (VULN-015): Validación completa de archivos
 *
 * @param file - Archivo a validar
 * @param fileType - Tipo de archivo esperado
 * @param options - Opciones de validación personalizadas
 * @returns Resultado de validación
 *
 * @example
 * ```typescript
 * const result = validateFile(file, 'image')
 * if (!result.valid) {
 *   toast.error(result.error)
 *   return
 * }
 * // Proceder con upload
 * ```
 */
export function validateFile(
  file: File | null | undefined,
  fileType: FileType = 'general',
  options?: FileValidationOptions
): FileValidationResult {
  // 1. Verificar que existe un archivo
  if (!file) {
    return {
      valid: false,
      error: 'No se seleccionó ningún archivo'
    }
  }

  // 2. Verificar que no esté vacío
  if (isFileEmpty(file)) {
    return {
      valid: false,
      error: options?.customErrorMessages?.empty || 'El archivo está vacío'
    }
  }

  const extension = getFileExtension(file.name)

  // 3. Determinar límites según tipo de archivo
  let maxSize = options?.maxSize
  let allowedMimeTypes = options?.allowedMimeTypes
  let allowedExtensions = options?.allowedExtensions

  if (!maxSize || !allowedMimeTypes || !allowedExtensions) {
    switch (fileType) {
      case 'image':
        maxSize = maxSize || FILE_SIZE_LIMITS.IMAGE_MAX
        allowedMimeTypes = allowedMimeTypes || ALLOWED_MIME_TYPES.IMAGES
        allowedExtensions = allowedExtensions || ALLOWED_EXTENSIONS.IMAGES
        break
      case 'json':
        maxSize = maxSize || FILE_SIZE_LIMITS.JSON_MAX
        allowedMimeTypes = allowedMimeTypes || ALLOWED_MIME_TYPES.JSON
        allowedExtensions = allowedExtensions || ALLOWED_EXTENSIONS.JSON
        break
      case 'csv':
        maxSize = maxSize || FILE_SIZE_LIMITS.CSV_MAX
        allowedMimeTypes = allowedMimeTypes || [...ALLOWED_MIME_TYPES.CSV, ...ALLOWED_MIME_TYPES.TEXT]
        allowedExtensions = allowedExtensions || ALLOWED_EXTENSIONS.CSV
        break
      case 'pdf':
        maxSize = maxSize || FILE_SIZE_LIMITS.PDF_MAX
        allowedMimeTypes = allowedMimeTypes || ALLOWED_MIME_TYPES.PDF
        allowedExtensions = allowedExtensions || ALLOWED_EXTENSIONS.PDF
        break
      default:
        maxSize = maxSize || FILE_SIZE_LIMITS.GENERAL_MAX
        allowedMimeTypes = allowedMimeTypes || []
        allowedExtensions = allowedExtensions || []
    }
  }

  // 4. VALIDAR TAMAÑO (CRÍTICO para prevenir DoS)
  if (file.size > maxSize) {
    const currentSize = formatFileSize(file.size)
    const maxSizeFormatted = formatFileSize(maxSize)

    return {
      valid: false,
      error: options?.customErrorMessages?.sizeExceeded ||
        `El archivo es demasiado grande (${currentSize}). Tamaño máximo: ${maxSizeFormatted}`,
      file,
      size: file.size,
      type: file.type,
      extension
    }
  }

  // 5. VALIDAR MIME TYPE (si hay tipos permitidos)
  if (allowedMimeTypes.length > 0) {
    // Algunos navegadores pueden no enviar MIME type correcto para CSV
    // Permitir validación solo por extensión en ese caso
    const hasValidMimeType = allowedMimeTypes.includes(file.type)
    const isEmptyMimeType = !file.type || file.type === ''

    if (!hasValidMimeType && !isEmptyMimeType) {
      const allowedTypesStr = allowedMimeTypes.join(', ')

      return {
        valid: false,
        error: options?.customErrorMessages?.invalidType ||
          `Tipo de archivo no permitido (${file.type}). Tipos permitidos: ${allowedTypesStr}`,
        file,
        size: file.size,
        type: file.type,
        extension
      }
    }
  }

  // 6. VALIDAR EXTENSIÓN (defensa en profundidad)
  if (allowedExtensions.length > 0) {
    if (!allowedExtensions.includes(extension)) {
      const allowedExtStr = allowedExtensions.join(', ')

      return {
        valid: false,
        error: options?.customErrorMessages?.invalidExtension ||
          `Extensión de archivo no permitida (${extension}). Extensiones permitidas: ${allowedExtStr}`,
        file,
        size: file.size,
        type: file.type,
        extension
      }
    }
  }

  // 7. VALIDACIÓN EXITOSA
  return {
    valid: true,
    file,
    size: file.size,
    type: file.type,
    extension
  }
}

/**
 * Valida un archivo de imagen
 *
 * @param file - Archivo de imagen
 * @param maxSize - Tamaño máximo (por defecto 2 MB)
 * @returns Resultado de validación
 */
export function validateImageFile(
  file: File | null | undefined,
  maxSize: number = FILE_SIZE_LIMITS.IMAGE_MAX
): FileValidationResult {
  return validateFile(file, 'image', { maxSize })
}

/**
 * Valida un archivo JSON
 *
 * @param file - Archivo JSON
 * @param maxSize - Tamaño máximo (por defecto 5 MB)
 * @returns Resultado de validación
 */
export function validateJSONFile(
  file: File | null | undefined,
  maxSize: number = FILE_SIZE_LIMITS.JSON_MAX
): FileValidationResult {
  return validateFile(file, 'json', { maxSize })
}

/**
 * Valida un archivo CSV
 *
 * @param file - Archivo CSV
 * @param maxSize - Tamaño máximo (por defecto 10 MB)
 * @returns Resultado de validación
 */
export function validateCSVFile(
  file: File | null | undefined,
  maxSize: number = FILE_SIZE_LIMITS.CSV_MAX
): FileValidationResult {
  return validateFile(file, 'csv', { maxSize })
}

/**
 * Valida un archivo PDF
 *
 * @param file - Archivo PDF
 * @param maxSize - Tamaño máximo (por defecto 5 MB)
 * @returns Resultado de validación
 */
export function validatePDFFile(
  file: File | null | undefined,
  maxSize: number = FILE_SIZE_LIMITS.PDF_MAX
): FileValidationResult {
  return validateFile(file, 'pdf', { maxSize })
}

/**
 * Valida múltiples archivos
 *
 * @param files - Lista de archivos
 * @param fileType - Tipo de archivo esperado
 * @param options - Opciones de validación
 * @returns Array de resultados (uno por archivo)
 */
export function validateMultipleFiles(
  files: FileList | File[],
  fileType: FileType = 'general',
  options?: FileValidationOptions
): FileValidationResult[] {
  const fileArray = Array.from(files)
  return fileArray.map(file => validateFile(file, fileType, options))
}

/**
 * Verifica si todos los archivos son válidos
 *
 * @param validationResults - Array de resultados de validación
 * @returns true si todos son válidos
 */
export function areAllFilesValid(validationResults: FileValidationResult[]): boolean {
  return validationResults.every(result => result.valid)
}

/**
 * Obtiene todos los errores de validación
 *
 * @param validationResults - Array de resultados de validación
 * @returns Array de mensajes de error
 */
export function getValidationErrors(validationResults: FileValidationResult[]): string[] {
  return validationResults
    .filter(result => !result.valid && result.error)
    .map(result => result.error!)
}
