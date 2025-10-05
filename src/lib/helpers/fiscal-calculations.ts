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

/**
 * ========================================
 * RECARGO DE EQUIVALENCIA (RE)
 * ========================================
 */

/**
 * Item de presupuesto para cálculos
 */
export interface BudgetItem {
  level: string
  quantity?: string | number
  pvp?: string | number
  iva_percentage?: string | number
  [key: string]: any
}

/**
 * Parsea un valor numérico en formato español (coma decimal)
 */
function parseSpanishNumber(value: string | number): number {
  if (typeof value === 'number') return value

  const str = value.toString().trim()

  // Si tiene punto Y coma, asumir formato español (punto=miles, coma=decimal)
  if (str.includes('.') && str.includes(',')) {
    return parseFloat(str.replace(/\./g, '').replace(',', '.'))
  }

  // Si solo tiene coma, es formato español
  if (str.includes(',')) {
    return parseFloat(str.replace(',', '.'))
  }

  // Si solo tiene punto o ninguno, parseFloat directo
  return parseFloat(str) || 0
}

/**
 * Calcula el Recargo de Equivalencia por cada tipo de IVA
 *
 * @param items - Array de items del presupuesto
 * @param recargos - Mapa de IVA% → RE% (ej: {21: 5.2, 10: 1.4})
 * @returns Mapa de IVA% → importe RE calculado
 *
 * @example
 * const items = [{level: 'item', quantity: '10', pvp: '121', iva_percentage: '21'}]
 * const recargos = {21: 5.2}
 * calculateRecargo(items, recargos) // => {21: 52.00}
 *
 * Fórmula:
 * - PVP incluye IVA + RE
 * - Base = PVP / (1 + IVA% + RE%)
 * - Importe RE = Base × RE%
 */
export function calculateRecargo(
  items: BudgetItem[],
  recargos: Record<number, number>
): Record<number, number> {
  const reByIVA: Record<number, number> = {}

  items.forEach((item) => {
    if (item.level !== 'item') return

    const ivaPercentage = parseSpanishNumber(item.iva_percentage || 0)
    const rePercentage = recargos[ivaPercentage] || 0

    if (rePercentage > 0) {
      const pvp = parseSpanishNumber(item.pvp || 0)
      const quantity = parseSpanishNumber(item.quantity || 0)

      // Total de la partida (PVP × cantidad)
      const totalPartida = pvp * quantity

      // Base sin IVA ni RE
      // PVP = Base × (1 + IVA% + RE%)
      // Base = PVP / (1 + IVA% + RE%)
      const divisor = 1 + (ivaPercentage / 100) + (rePercentage / 100)
      const base = totalPartida / divisor

      // Importe RE para esta partida
      const importeRE = base * (rePercentage / 100)

      // Acumular por tipo de IVA
      if (!reByIVA[ivaPercentage]) {
        reByIVA[ivaPercentage] = 0
      }
      reByIVA[ivaPercentage] += importeRE
    }
  })

  // Redondear a 2 decimales
  Object.keys(reByIVA).forEach((iva) => {
    const ivaNum = parseFloat(iva)
    reByIVA[ivaNum] = Math.round(reByIVA[ivaNum] * 100) / 100
  })

  return reByIVA
}

/**
 * Calcula el total de RE sumando todos los tipos de IVA
 *
 * @param reByIVA - Mapa de IVA% → importe RE
 * @returns Total de RE
 *
 * @example
 * getTotalRecargo({21: 52.00, 10: 14.00}) // => 66.00
 */
export function getTotalRecargo(reByIVA: Record<number, number>): number {
  const total = Object.values(reByIVA).reduce((sum, amount) => sum + amount, 0)
  return Math.round(total * 100) / 100
}

/**
 * Valida que los porcentajes de RE estén en rango válido
 *
 * @param recargos - Mapa de IVA% → RE%
 * @returns true si todos están entre 0 y 100
 */
export function validateRecargosPercentages(
  recargos: Record<number, number>
): boolean {
  return Object.values(recargos).every((re) => re >= 0 && re <= 100)
}
