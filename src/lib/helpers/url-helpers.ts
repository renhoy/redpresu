/**
 * URL Helpers - Utilidades para construir URLs absolutas
 *
 * Este módulo proporciona funciones para obtener la URL base de la aplicación
 * de manera consistente en todos los entornos (desarrollo, producción).
 *
 * IMPORTANTE: Este archivo NO debe importar 'next/headers' para ser compatible
 * con Client Components. Las funciones async que usan headers están en url-helpers-server.ts
 */

/**
 * Versión síncrona de getAppUrl() - SAFE para Client y Server Components
 *
 * ADVERTENCIA: Solo usa la variable de entorno, no detecta automáticamente.
 *
 * @returns URL base de la aplicación
 *
 * @example
 * ```typescript
 * // En constantes o configuraciones estáticas
 * const baseUrl = getAppUrlSync()
 * ```
 */
export function getAppUrlSync(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')
  }

  // Fallback diferente según el entorno
  if (typeof window !== 'undefined') {
    // En el cliente: usar window.location
    return `${window.location.protocol}//${window.location.host}`
  }

  // En servidor sin config: fallback a localhost (solo desarrollo)
  console.warn('[getAppUrlSync] Usando fallback localhost - configura NEXT_PUBLIC_APP_URL en producción')
  return 'http://localhost:3000'
}

/**
 * Construye una URL absoluta a partir de un path relativo (versión síncrona)
 *
 * @param path - Path relativo (ej: '/accept-invitation?token=abc')
 * @returns URL absoluta (ej: 'http://example.com/accept-invitation?token=abc')
 */
export function buildAbsoluteUrlSync(path: string): string {
  const baseUrl = getAppUrlSync()
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  return `${baseUrl}${cleanPath}`
}
