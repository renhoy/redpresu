/**
 * URL Helpers - Server Only Functions
 *
 * Este módulo contiene funciones que SOLO pueden usarse en Server Components
 * o Server Actions porque usan 'next/headers'.
 *
 * Para Client Components, usa las funciones en url-helpers.ts
 */

import { headers } from 'next/headers'

/**
 * Obtiene la URL base de la aplicación (Solo Server Components/Actions)
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
 * Construye una URL absoluta a partir de un path relativo (Solo Server)
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
