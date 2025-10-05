/**
 * Helpers para cálculos fiscales: IRPF y Recargo de Equivalencia
 * Bloque 4: IRPF y RE
 * Fecha: 2025-01-05
 */

import type { Issuer } from '@/lib/types/database'

/**
 * Tipos de cliente posibles
 */
export type ClientType = 'particular' | 'autonomo' | 'empresa'

/**
 * Matriz de aplicación IRPF
 *
 * IRPF se aplica cuando:
 * - Emisor es autónomo (issuers_type = 'autonomo')
 * - Cliente es empresa O autónomo
 *
 * NO se aplica cuando:
 * - Emisor es empresa
 * - Cliente es particular
 */
export function shouldApplyIRPF(
  issuerType: 'empresa' | 'autonomo',
  clientType: ClientType
): boolean {
  // Si el emisor es empresa, nunca aplica IRPF
  if (issuerType === 'empresa') {
    return false
  }

  // Si el emisor es autónomo, aplica IRPF solo si el cliente es empresa o autónomo
  if (issuerType === 'autonomo') {
    return clientType === 'empresa' || clientType === 'autonomo'
  }

  return false
}

/**
 * Calcula el importe de IRPF a retener
 *
 * @param baseImponible - Base imponible (sin IVA)
 * @param irpfPercentage - Porcentaje de IRPF (típicamente 15%)
 * @returns Importe de IRPF a retener (valor positivo)
 *
 * @example
 * calculateIRPF(1000, 15) // => 150
 */
export function calculateIRPF(
  baseImponible: number,
  irpfPercentage: number
): number {
  if (irpfPercentage === 0 || baseImponible === 0) {
    return 0
  }

  return baseImponible * (irpfPercentage / 100)
}

/**
 * Obtiene el porcentaje de IRPF por defecto según el tipo de emisor
 *
 * @param issuerType - Tipo de emisor ('empresa' | 'autonomo')
 * @returns Porcentaje de IRPF por defecto
 */
export function getDefaultIRPFPercentage(
  issuerType: 'empresa' | 'autonomo'
): number {
  return issuerType === 'autonomo' ? 15 : 0
}

/**
 * Calcula el total a pagar considerando IRPF
 *
 * @param totalConIVA - Total con IVA incluido
 * @param irpfAmount - Importe de IRPF a retener
 * @returns Total a pagar (totalConIVA - IRPF)
 *
 * @example
 * calculateTotalWithIRPF(1210, 150) // => 1060
 */
export function calculateTotalWithIRPF(
  totalConIVA: number,
  irpfAmount: number
): number {
  return totalConIVA - irpfAmount
}

/**
 * Valida que el porcentaje de IRPF esté en rango válido
 *
 * @param percentage - Porcentaje a validar
 * @returns true si está entre 0 y 100
 */
export function isValidIRPFPercentage(percentage: number): boolean {
  return percentage >= 0 && percentage <= 100
}
