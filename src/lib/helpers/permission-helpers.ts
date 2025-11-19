/**
 * Helpers centralizados de permisos y autorización
 *
 * Consolida validaciones de permisos repetidas en múltiples archivos
 * y proporciona una API consistente para verificación de autorización.
 */

import { AuthenticatedUser } from './auth-helpers'

/**
 * Tipo de roles del sistema
 */
export type UserRole = 'admin' | 'comercial' | 'superadmin'

/**
 * Resultado de verificación de permisos
 */
export interface PermissionResult {
  allowed: boolean
  error?: string
}

/**
 * Verifica si el usuario tiene al menos uno de los roles especificados
 *
 * @param user - Usuario autenticado
 * @param allowedRoles - Roles permitidos
 * @returns PermissionResult
 *
 * @example
 * ```typescript
 * const permCheck = requireRole(user, ['admin', 'superadmin'])
 * if (!permCheck.allowed) {
 *   return { success: false, error: permCheck.error }
 * }
 * ```
 */
export function requireRole(
  user: AuthenticatedUser | null,
  allowedRoles: UserRole[]
): PermissionResult {
  if (!user) {
    return {
      allowed: false,
      error: 'No autenticado'
    }
  }

  if (!allowedRoles.includes(user.role as UserRole)) {
    return {
      allowed: false,
      error: 'No tienes permisos para realizar esta acción'
    }
  }

  return {
    allowed: true
  }
}

/**
 * Verifica que el usuario sea superadmin
 *
 * @param user - Usuario autenticado
 * @returns PermissionResult
 */
export function requireSuperAdmin(user: AuthenticatedUser | null): PermissionResult {
  return requireRole(user, ['superadmin'])
}

/**
 * Verifica que el usuario sea admin o superadmin
 *
 * @param user - Usuario autenticado
 * @returns PermissionResult
 */
export function requireAdmin(user: AuthenticatedUser | null): PermissionResult {
  return requireRole(user, ['admin', 'superadmin'])
}

/**
 * Verifica que el usuario esté activo
 *
 * @param user - Usuario autenticado
 * @returns PermissionResult
 */
export function requireActiveUser(user: AuthenticatedUser | null): PermissionResult {
  if (!user) {
    return {
      allowed: false,
      error: 'No autenticado'
    }
  }

  if (user.status !== 'active') {
    return {
      allowed: false,
      error: 'Tu cuenta no está activa. Contacta con soporte.'
    }
  }

  return {
    allowed: true
  }
}

/**
 * Verifica que el usuario pertenezca a una empresa específica
 *
 * @param user - Usuario autenticado
 * @param companyId - ID de la empresa requerida
 * @returns PermissionResult
 */
export function requireCompany(
  user: AuthenticatedUser | null,
  companyId: number
): PermissionResult {
  if (!user) {
    return {
      allowed: false,
      error: 'No autenticado'
    }
  }

  // Superadmin puede acceder a cualquier empresa
  if (user.role === 'superadmin') {
    return {
      allowed: true
    }
  }

  if (user.companyId !== companyId) {
    return {
      allowed: false,
      error: 'No tienes permisos para acceder a datos de esta empresa'
    }
  }

  return {
    allowed: true
  }
}

/**
 * Verifica si el usuario puede modificar datos de otro usuario
 *
 * @param currentUser - Usuario que intenta modificar
 * @param targetUserId - ID del usuario a modificar
 * @param targetUserCompanyId - Company ID del usuario a modificar
 * @returns PermissionResult
 */
export function canModifyUser(
  currentUser: AuthenticatedUser | null,
  targetUserId: string,
  targetUserCompanyId?: number
): PermissionResult {
  if (!currentUser) {
    return {
      allowed: false,
      error: 'No autenticado'
    }
  }

  // Comercial no puede modificar usuarios
  if (currentUser.role === 'comercial') {
    // Solo puede modificarse a sí mismo
    if (currentUser.id === targetUserId) {
      return { allowed: true }
    }
    return {
      allowed: false,
      error: 'No tienes permisos para modificar usuarios'
    }
  }

  // Superadmin puede modificar cualquier usuario
  if (currentUser.role === 'superadmin') {
    return { allowed: true }
  }

  // Admin solo puede modificar usuarios de su empresa
  if (currentUser.role === 'admin') {
    if (!targetUserCompanyId) {
      return {
        allowed: false,
        error: 'No se pudo verificar la empresa del usuario'
      }
    }

    if (targetUserCompanyId !== currentUser.companyId) {
      return {
        allowed: false,
        error: 'No puedes modificar usuarios de otra empresa'
      }
    }

    return { allowed: true }
  }

  return {
    allowed: false,
    error: 'Permisos insuficientes'
  }
}

/**
 * Verifica si el usuario puede eliminar recursos de una empresa
 *
 * @param user - Usuario autenticado
 * @param resourceCompanyId - Company ID del recurso
 * @returns PermissionResult
 */
export function canDeleteFromCompany(
  user: AuthenticatedUser | null,
  resourceCompanyId: number
): PermissionResult {
  if (!user) {
    return {
      allowed: false,
      error: 'No autenticado'
    }
  }

  // Comercial no puede eliminar
  if (user.role === 'comercial') {
    return {
      allowed: false,
      error: 'No tienes permisos para eliminar recursos'
    }
  }

  // Superadmin puede eliminar de cualquier empresa
  if (user.role === 'superadmin') {
    return { allowed: true }
  }

  // Admin solo puede eliminar de su empresa
  if (user.role === 'admin' && user.companyId === resourceCompanyId) {
    return { allowed: true }
  }

  return {
    allowed: false,
    error: 'No tienes permisos para eliminar este recurso'
  }
}

/**
 * Combina múltiples verificaciones de permisos con lógica AND
 *
 * @param checks - Array de resultados de verificación
 * @returns Primer error encontrado o allowed: true si todo OK
 *
 * @example
 * ```typescript
 * const permCheck = combinePermissionChecks([
 *   requireAdmin(user),
 *   requireActiveUser(user),
 *   requireCompany(user, companyId)
 * ])
 *
 * if (!permCheck.allowed) {
 *   return { success: false, error: permCheck.error }
 * }
 * ```
 */
export function combinePermissionChecks(checks: PermissionResult[]): PermissionResult {
  for (const check of checks) {
    if (!check.allowed) {
      return check
    }
  }

  return { allowed: true }
}
