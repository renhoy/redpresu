/**
 * Helpers para gestionar el modo de operación de la aplicación
 * Modo multiempresa (SaaS) vs monoempresa (on-premise)
 */

import { getConfigValue } from './config-helpers'

// Cache simple para evitar múltiples queries a BD
let cachedMultiempresa: boolean | null = null
let cacheTimestamp: number = 0
const CACHE_TTL = 60 * 1000 // 1 minuto

/**
 * Verifica si la aplicación está en modo multiempresa (SaaS)
 * @returns true si está en modo multiempresa, false si es monoempresa
 */
export async function isMultiEmpresa(): Promise<boolean> {
  // Verificar cache
  const now = Date.now()
  if (cachedMultiempresa !== null && now - cacheTimestamp < CACHE_TTL) {
    return cachedMultiempresa
  }

  try {
    const value = await getConfigValue<boolean>('multiempresa')

    // Por defecto, asumir modo multiempresa si no existe la config
    const result = value !== null ? value : true

    // Actualizar cache
    cachedMultiempresa = result
    cacheTimestamp = now

    console.log('[isMultiEmpresa] Modo actual:', result ? 'MULTIEMPRESA' : 'MONOEMPRESA')
    return result
  } catch (error) {
    console.error('[isMultiEmpresa] Error:', error)
    // En caso de error, asumir modo multiempresa (más restrictivo)
    return true
  }
}

/**
 * Obtiene el ID de la empresa por defecto en modo monoempresa
 * @returns ID de la empresa (siempre 1 en modo mono)
 */
export function getDefaultEmpresaId(): number {
  return 1
}

/**
 * Invalida el cache del modo (útil para testing o cambios de config)
 */
export function invalidateAppModeCache(): void {
  cachedMultiempresa = null
  cacheTimestamp = 0
  console.log('[invalidateAppModeCache] Cache invalidado')
}
