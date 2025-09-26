import { BudgetItem } from '../validators/csv-types';

/**
 * Grupo de IVA agrupado por porcentaje
 */
export interface IVAGroup {
  name: string; // "21,00% IVA"
  amount: string; // "1.234,56 €"
  percentage: number; // 21.00
  baseAmount: number; // valor base sin formatear
}

/**
 * Línea de total (base, IVA, total)
 */
export interface TotalLine {
  name: string; // "Base", "Total Presupuesto"
  amount: string; // "4.922,50 €"
}

/**
 * Resultado de cálculo de totales
 */
export interface TotalsResult {
  base: TotalLine;
  ivas: IVAGroup[];
  total: TotalLine;
}

/**
 * Resultado completo de recálculo de presupuesto
 */
export interface BudgetCalculationResult {
  data: BudgetItem[];
  totals: TotalsResult;
}

/**
 * Opciones para cálculos
 */
export interface CalculationOptions {
  /** Número de decimales para importes (default: 2) */
  decimals?: number;
  /** Símbolo de moneda (default: "€") */
  currency?: string;
  /** Usar coma como separador decimal (default: true) */
  useCommaSeparator?: boolean;
  /** Validar valores negativos (default: true) */
  validateNegative?: boolean;
}

/**
 * Resultado de validación de cálculo
 */
export interface CalculationValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Métricas de cálculo para debugging
 */
export interface CalculationMetrics {
  totalItems: number;
  itemsWithAmount: number;
  totalCalculations: number;
  executionTime: number;
  errors: string[];
}