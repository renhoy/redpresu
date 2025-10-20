/**
 * Helpers para validación de company_id
 * SECURITY: Asegurar que usuarios siempre tengan company_id válido
 */

import { log } from '@/lib/logger';

export interface CompanyValidationResult {
  valid: boolean;
  companyId: number | null;
  error?: string;
}

/**
 * Valida que un usuario tenga company_id asignado
 *
 * @param userData - Datos del usuario con company_id
 * @param context - Contexto para logging (ej: '[getActiveTariffs]')
 * @returns Resultado de validación con company_id o error
 */
export function validateUserCompanyId(
  userData: { company_id?: number | null; role?: string; id?: string } | null,
  context: string = '[validateCompanyId]'
): CompanyValidationResult {
  // Caso 1: Usuario no existe
  if (!userData) {
    log.error(`${context} Usuario no existe`);
    return {
      valid: false,
      companyId: null,
      error: 'Usuario no autenticado'
    };
  }

  // Caso 2: Usuario sin company_id
  if (!userData.company_id && userData.company_id !== 0) {
    log.error(`${context} Usuario sin company_id`, {
      userId: userData.id,
      role: userData.role
    });
    return {
      valid: false,
      companyId: null,
      error: 'Usuario sin empresa asignada'
    };
  }

  // Caso 3: company_id inválido (negativo o no numérico)
  if (typeof userData.company_id !== 'number' || userData.company_id < 0) {
    log.error(`${context} company_id inválido`, {
      userId: userData.id,
      companyId: userData.company_id
    });
    return {
      valid: false,
      companyId: null,
      error: 'ID de empresa inválido'
    };
  }

  // Caso 4: Valid company_id
  return {
    valid: true,
    companyId: userData.company_id
  };
}

/**
 * Obtiene company_id del usuario o lanza error si no es válido
 * Útil para Server Actions donde queremos fallar rápido
 *
 * @param userData - Datos del usuario
 * @param context - Contexto para logging
 * @returns company_id válido
 * @throws Error si company_id no es válido
 */
export function requireValidCompanyId(
  userData: { company_id?: number | null; role?: string; id?: string } | null,
  context: string = '[requireCompanyId]'
): number {
  const result = validateUserCompanyId(userData, context);

  if (!result.valid || result.companyId === null) {
    throw new Error(result.error || 'ID de empresa no válido');
  }

  return result.companyId;
}

/**
 * Valida que un company_id sea un número positivo válido
 * Útil para validar parámetros recibidos
 *
 * @param companyId - ID a validar
 * @returns true si es válido
 */
export function isValidCompanyId(companyId: any): companyId is number {
  return (
    typeof companyId === 'number' &&
    Number.isInteger(companyId) &&
    companyId > 0
  );
}
