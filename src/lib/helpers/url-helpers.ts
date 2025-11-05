/**
 * URL Helpers - Utilidades para construir URLs absolutas
 *
 * Este módulo proporciona funciones para obtener la URL base de la aplicación
 * de manera consistente en todos los entornos (desarrollo, producción).
 */

import { headers } from 'next/headers'

/**
 * Obtiene la URL base de la aplicación
 *
 * La URL se determina en el siguiente orden de prioridad:
 * 1. Variable de entorno NEXT_PUBLIC_APP_URL (configurada manualmente)
 * 2. Detección automática desde headers HTTP (host + protocol)
 * 3. Fallback a localhost:3000 (solo en desarrollo)
 *
 * @returns URL base de la aplicación (ej: 'http://example.com:3000')
 *
 * @example
 * ```typescript
 * // En Server Component o Server Action
 * const baseUrl = await getAppUrl()
 * const invitationLink = `${baseUrl}/accept-invitation?token=${token}`
 * ```
 */
export async function getAppUrl(): Promise<string> {
  // 1. Prioridad: Variable de entorno configurada
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '') // Eliminar trailing slash
  }

  // 2. Detección automática desde headers HTTP
  // Solo funciona en Server Components/Actions
  try {
    const headersList = await headers()
    const host = headersList.get('host')
    const protocol = headersList.get('x-forwarded-proto') || 'http'

    if (host) {
      return `${protocol}://${host}`
    }
  } catch (error) {
    console.warn('[getAppUrl] No se pudieron obtener headers (posible uso en Client Component)')
  }

  // 3. Fallback: localhost en desarrollo
  // En producción, SIEMPRE debes configurar NEXT_PUBLIC_APP_URL
  console.warn('[getAppUrl] Usando fallback localhost - configura NEXT_PUBLIC_APP_URL en producción')
  return 'http://localhost:3000'
}

/**
 * Construye una URL absoluta a partir de un path relativo
 *
 * @param path - Path relativo (ej: '/accept-invitation?token=abc')
 * @returns URL absoluta (ej: 'http://example.com/accept-invitation?token=abc')
 *
 * @example
 * ```typescript
 * const invitationUrl = await buildAbsoluteUrl('/accept-invitation?token=abc123')
 * // Resultado: 'http://example.com:3000/accept-invitation?token=abc123'
 * ```
 */
export async function buildAbsoluteUrl(path: string): Promise<string> {
  const baseUrl = await getAppUrl()
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  return `${baseUrl}${cleanPath}`
}

/**
 * Versión síncrona de getAppUrl() para casos donde no se pueden usar async
 *
 * ADVERTENCIA: Solo usa la variable de entorno, no detecta automáticamente.
 * Úsala solo cuando sea estrictamente necesario.
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

  console.warn('[getAppUrlSync] Usando fallback localhost - configura NEXT_PUBLIC_APP_URL en producción')
  return 'http://localhost:3000'
}
