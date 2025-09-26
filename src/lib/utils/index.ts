/**
 * Exportaciones principales de utilidades
 */

// Exportar las utilidades de cálculo
export { CalculationUtils } from './calculations';

// Re-exportar tipos importantes
export type {
  IVAGroup,
  TotalLine,
  TotalsResult,
  BudgetCalculationResult,
  CalculationOptions
} from '../helpers/calculation-types';

// Re-exportar constantes útiles
export {
  CALCULATION_PRESETS,
  IVA_RATES,
  CALCULATION_LIMITS
} from '../constants/calculations';

// Re-exportar helpers
export { CalculationHelpers } from '../helpers/calculation-helpers';

/**
 * Funciones de conveniencia para uso directo
 */

import { BudgetItem } from '../validators/csv-types';
import { CalculationUtils } from './calculations';
import { CalculationHelpers } from '../helpers/calculation-helpers';

/**
 * Calcula el amount de un item
 */
export function calculateItemAmount(quantity: string, pvp: string): string {
  return CalculationUtils.calculateItemAmount(quantity, pvp);
}

/**
 * Recalcula todo el presupuesto
 */
export function recalculateBudget(jsonData: BudgetItem[]) {
  return CalculationUtils.recalculateBudget(jsonData);
}

/**
 * Obtiene estadísticas del presupuesto
 */
export function getBudgetStats(jsonData: BudgetItem[]) {
  return CalculationHelpers.getBudgetStats(jsonData);
}

/**
 * Valida datos antes de cálculos
 */
export function validateCalculationData(jsonData: BudgetItem[]) {
  return CalculationUtils.validateCalculationData(jsonData);
}