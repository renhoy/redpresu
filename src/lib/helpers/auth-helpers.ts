/**
 * Helpers centralizados para autenticación y autorización
 *
 * Estos helpers eliminan código duplicado que se repetía en 14+ archivos
 * y centralizan la lógica de obtención de usuario autenticado.
 */

import { createServerActionClient } from '@/lib/supabase/helpers'
import { supabaseAdmin } from '@/lib/supabase/server'
import { log } from '@/lib/logger'

/**
 * Resultado de autenticación con datos del usuario
 */
export interface AuthenticatedUser {
  id: string
  email: string
  companyId: number
  role: 'admin' | 'comercial' | 'superadmin'
  name: string
  lastName: string
  status: 'active' | 'inactive' | 'pending'
}

/**
 * Resultado de la función getAuthenticatedUser
 */
export interface AuthResult {
  success: boolean
  user: AuthenticatedUser | null
  error?: string
}

/**
 * Obtiene el usuario autenticado con sus datos completos
 *
 * Esta función centraliza el patrón repetitivo de:
 * 1. Obtener usuario de Supabase Auth
 * 2. Obtener datos del usuario de la tabla users
 * 3. Validar company_id
 * 4. Retornar datos estructurados
 *
 * @param context - Contexto de la llamada (para logging)
 * @returns AuthResult con usuario o error
 *
 * @example
 * ```typescript
 * const { success, user, error } = await getAuthenticatedUser('[createBudget]')
 * if (!success || !user) {
 *   return { success: false, error }
 * }
 * // Usa user.id, user.companyId, user.role
 * ```
 */
export async function getAuthenticatedUser(
  context: string = '[getAuthenticatedUser]'
): Promise<AuthResult> {
  try {
    // 1. Obtener cliente de Supabase
    const supabase = await createServerActionClient()

    // 2. Obtener usuario autenticado
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()

    if (authError) {
      log.error(`${context} Error de autenticación:`, authError)
      return {
        success: false,
        user: null,
        error: 'Error de autenticación'
      }
    }

    if (!authUser) {
      log.warn(`${context} Usuario no autenticado`)
      return {
        success: false,
        user: null,
        error: 'No autenticado'
      }
    }

    // 3. Obtener datos completos del usuario de la BD
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email, name, last_name, company_id, role, status')
      .eq('id', authUser.id)
      .single()

    if (userError || !userData) {
      log.error(`${context} Error al obtener datos del usuario:`, userError)
      return {
        success: false,
        user: null,
        error: 'Error al obtener datos del usuario'
      }
    }

    // 4. Validar company_id
    if (userData.company_id === null || userData.company_id === undefined) {
      log.error(`${context} Usuario sin company_id asignado:`, authUser.id)
      return {
        success: false,
        user: null,
        error: 'Usuario sin empresa asignada'
      }
    }

    // 5. Validar que company_id sea un número válido
    const companyId = typeof userData.company_id === 'number'
      ? userData.company_id
      : parseInt(String(userData.company_id), 10)

    if (isNaN(companyId) || companyId <= 0) {
      log.error(`${context} company_id inválido:`, userData.company_id)
      return {
        success: false,
        user: null,
        error: 'ID de empresa inválido'
      }
    }

    // 6. Retornar usuario autenticado con datos completos
    return {
      success: true,
      user: {
        id: userData.id,
        email: userData.email,
        companyId,
        role: userData.role as 'admin' | 'comercial' | 'superadmin',
        name: userData.name,
        lastName: userData.last_name,
        status: userData.status as 'active' | 'inactive' | 'pending'
      }
    }

  } catch (error) {
    log.error(`${context} Error inesperado:`, error)
    return {
      success: false,
      user: null,
      error: error instanceof Error ? error.message : 'Error inesperado'
    }
  }
}

/**
 * Verifica si el usuario tiene uno de los roles permitidos
 *
 * @param user - Usuario autenticado
 * @param allowedRoles - Roles permitidos
 * @returns true si el usuario tiene uno de los roles
 *
 * @example
 * ```typescript
 * const { success, user } = await getAuthenticatedUser()
 * if (!success || !user) return { success: false }
 *
 * if (!hasRole(user, ['admin', 'superadmin'])) {
 *   return { success: false, error: 'Sin permisos' }
 * }
 * ```
 */
export function hasRole(
  user: AuthenticatedUser,
  allowedRoles: Array<'admin' | 'comercial' | 'superadmin'>
): boolean {
  return allowedRoles.includes(user.role)
}

/**
 * Verifica si el usuario es superadmin
 *
 * @param user - Usuario autenticado
 * @returns true si es superadmin
 */
export function isSuperAdmin(user: AuthenticatedUser): boolean {
  return user.role === 'superadmin'
}

/**
 * Verifica si el usuario es admin o superadmin
 *
 * @param user - Usuario autenticado
 * @returns true si es admin o superadmin
 */
export function isAdmin(user: AuthenticatedUser): boolean {
  return user.role === 'admin' || user.role === 'superadmin'
}

/**
 * Verifica si el usuario está activo
 *
 * @param user - Usuario autenticado
 * @returns true si el usuario está activo
 */
export function isActiveUser(user: AuthenticatedUser): boolean {
  return user.status === 'active'
}
