import { BudgetItem } from '../validators/csv-types';
import { CSVUtils } from '../helpers/csv-utils';
import {
  IVAGroup,
  TotalLine,
  TotalsResult,
  BudgetCalculationResult,
  CalculationOptions,
  CalculationValidation,
  CalculationMetrics
} from '../helpers/calculation-types';

/**
 * Utilidades de cálculo para presupuestos con precisión decimal
 */
export class CalculationUtils {
  private static readonly DEFAULT_OPTIONS: Required<CalculationOptions> = {
    decimals: 2,
    currency: '€',
    useCommaSeparator: true,
    validateNegative: true
  };

  /**
   * Calcula el amount de un item: amount = quantity × pvp
   */
  static calculateItemAmount(
    quantity: string,
    pvp: string,
    options: CalculationOptions = {}
  ): string {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };

    try {
      // Convertir y validar valores
      const quantityNum = this.parseDecimal(quantity);
      const pvpNum = this.parseDecimal(pvp);

      // Validaciones
      if (opts.validateNegative && (quantityNum < 0 || pvpNum < 0)) {
        return this.formatAmount(0, opts);
      }

      if (isNaN(quantityNum) || isNaN(pvpNum)) {
        return this.formatAmount(0, opts);
      }

      // Cálculo con precisión decimal
      const amount = this.multiplyDecimal(quantityNum, pvpNum);

      return this.formatAmount(amount, opts);
    } catch (error) {
      return this.formatAmount(0, opts);
    }
  }

  /**
   * Propaga totales a ancestros en la jerarquía
   */
  static propagateTotalsToAncestors(
    jsonData: BudgetItem[],
    options: CalculationOptions = {}
  ): BudgetItem[] {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };
    const data = [...jsonData]; // Copia para evitar mutación

    // Crear mapa de items por ID para acceso rápido
    const itemMap = new Map<string, BudgetItem>();
    data.forEach(item => itemMap.set(item.id, item));

    // Primero, calcular amounts de items
    data.forEach(item => {
      if (item.level === 'item') {
        item.amount = this.calculateItemAmount(
          item.quantity || '0',
          item.pvp || '0',
          opts
        );
      }
    });

    // Calcular totales por contenedor
    const containerTotals = new Map<string, number>();

    // Procesar items para sumar a sus ancestros
    data.forEach(item => {
      if (item.level === 'item') {
        const amount = this.parseDecimal(item.amount);
        const ancestors = this.getAncestorIds(item.id);

        ancestors.forEach(ancestorId => {
          const current = containerTotals.get(ancestorId) || 0;
          containerTotals.set(ancestorId, current + amount);
        });
      }
    });

    // Aplicar totales calculados a contenedores
    data.forEach(item => {
      if (item.level !== 'item') {
        const total = containerTotals.get(item.id) || 0;
        item.amount = this.formatAmount(total, opts);
      }
    });

    return data;
  }

  /**
   * Calcula IVA agrupado por porcentaje
   */
  static calculateGroupedIVA(
    items: BudgetItem[],
    options: CalculationOptions = {}
  ): IVAGroup[] {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };

    // Filtrar solo items y agrupar por porcentaje de IVA
    const itemsOnly = items.filter(item => item.level === 'item');
    const ivaGroups = new Map<string, { items: BudgetItem[]; percentage: number }>();

    itemsOnly.forEach(item => {
      const ivaPercentage = this.parseDecimal(item.iva_percentage || '0');
      const key = ivaPercentage.toFixed(2);

      if (!ivaGroups.has(key)) {
        ivaGroups.set(key, { items: [], percentage: ivaPercentage });
      }
      ivaGroups.get(key)!.items.push(item);
    });

    // Calcular IVA para cada grupo
    const result: IVAGroup[] = [];

    ivaGroups.forEach(({ items: groupItems, percentage }) => {
      if (percentage > 0) {
        // Calcular base total del grupo
        const totalBase = groupItems.reduce((sum, item) => {
          const amount = this.parseDecimal(item.amount);
          // Para calcular base: amount / (1 + (iva/100))
          const base = amount / (1 + (percentage / 100));
          return sum + base;
        }, 0);

        // Calcular IVA: base × (percentage / 100)
        const ivaAmount = totalBase * (percentage / 100);

        if (ivaAmount > 0) {
          result.push({
            name: `${this.formatPercentage(percentage)}% IVA`,
            amount: this.formatAmountWithCurrency(ivaAmount, opts),
            percentage,
            baseAmount: ivaAmount
          });
        }
      }
    });

    // Ordenar por porcentaje
    return result.sort((a, b) => a.percentage - b.percentage);
  }

  /**
   * Calcula totales finales del presupuesto
   */
  static calculateTotals(
    jsonData: BudgetItem[],
    options: CalculationOptions = {}
  ): TotalsResult {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };

    // Calcular total de items
    const itemsOnly = jsonData.filter(item => item.level === 'item');
    const totalAmount = itemsOnly.reduce((sum, item) => {
      return sum + this.parseDecimal(item.amount);
    }, 0);

    // Calcular IVA agrupado
    const ivaGroups = this.calculateGroupedIVA(jsonData, options);
    const totalIVA = ivaGroups.reduce((sum, group) => sum + group.baseAmount, 0);

    // Calcular base
    const baseAmount = totalAmount - totalIVA;

    return {
      base: {
        name: 'Base',
        amount: this.formatAmountWithCurrency(baseAmount, opts)
      },
      ivas: ivaGroups,
      total: {
        name: 'Total Presupuesto',
        amount: this.formatAmountWithCurrency(totalAmount, opts)
      }
    };
  }

  /**
   * Recalcula presupuesto completo
   */
  static recalculateBudget(
    jsonData: BudgetItem[],
    options: CalculationOptions = {}
  ): BudgetCalculationResult {
    const startTime = performance.now();

    try {
      // 1. Propagar totales a ancestros
      const dataWithTotals = this.propagateTotalsToAncestors(jsonData, options);

      // 2. Calcular totales finales
      const totals = this.calculateTotals(dataWithTotals, options);

      const endTime = performance.now();

      return {
        data: dataWithTotals,
        totals
      };
    } catch (error) {
      // En caso de error, devolver datos originales con totales vacíos
      return {
        data: jsonData,
        totals: {
          base: { name: 'Base', amount: '0,00 €' },
          ivas: [],
          total: { name: 'Total Presupuesto', amount: '0,00 €' }
        }
      };
    }
  }

  /**
   * Valida datos antes de cálculos
   */
  static validateCalculationData(jsonData: BudgetItem[]): CalculationValidation {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!Array.isArray(jsonData)) {
      errors.push('Los datos deben ser un array');
      return { isValid: false, errors, warnings };
    }

    if (jsonData.length === 0) {
      warnings.push('No hay datos para calcular');
    }

    // Validar estructura de items
    jsonData.forEach((item, index) => {
      if (!item.id) {
        errors.push(`Item ${index}: falta ID`);
      }

      if (!item.level) {
        errors.push(`Item ${index}: falta level`);
      }

      if (item.level === 'item') {
        const quantity = this.parseDecimal(item.quantity || '0');
        const pvp = this.parseDecimal(item.pvp || '0');
        const iva = this.parseDecimal(item.iva_percentage || '0');

        if (isNaN(quantity)) {
          warnings.push(`Item ${item.id}: quantity inválida`);
        }
        if (isNaN(pvp)) {
          warnings.push(`Item ${item.id}: pvp inválido`);
        }
        if (isNaN(iva)) {
          warnings.push(`Item ${item.id}: iva_percentage inválido`);
        }
        if (quantity < 0) {
          warnings.push(`Item ${item.id}: quantity negativa`);
        }
        if (pvp < 0) {
          warnings.push(`Item ${item.id}: pvp negativo`);
        }
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  // Métodos auxiliares privados

  /**
   * Parsea un string decimal manejando comas y puntos
   */
  private static parseDecimal(value: string): number {
    if (!value || typeof value !== 'string') return 0;

    const cleanValue = value
      .replace(/[^\d.,-]/g, '') // Solo números, puntos, comas y signos
      .replace(',', '.'); // Convertir coma a punto

    const parsed = parseFloat(cleanValue);
    return isNaN(parsed) ? 0 : parsed;
  }

  /**
   * Multiplica dos decimales con precisión
   */
  private static multiplyDecimal(a: number, b: number): number {
    // Usar precisión de enteros para evitar errores de punto flotante
    const factor = 10000; // 4 decimales de precisión
    return Math.round(a * factor) * Math.round(b * factor) / (factor * factor);
  }

  /**
   * Formatea un amount con decimales
   */
  private static formatAmount(amount: number, options: Required<CalculationOptions>): string {
    const formatted = amount.toFixed(options.decimals);
    return options.useCommaSeparator ? formatted.replace('.', ',') : formatted;
  }

  /**
   * Formatea un amount con moneda
   */
  private static formatAmountWithCurrency(amount: number, options: Required<CalculationOptions>): string {
    const formatted = this.formatAmount(amount, options);
    return `${formatted} ${options.currency}`;
  }

  /**
   * Formatea porcentaje
   */
  private static formatPercentage(percentage: number): string {
    return percentage.toFixed(2).replace('.', ',');
  }

  /**
   * Obtiene IDs de ancestros de un item
   */
  private static getAncestorIds(itemId: string): string[] {
    const parts = itemId.split('.');
    const ancestors: string[] = [];

    for (let i = 1; i < parts.length; i++) {
      ancestors.push(parts.slice(0, i).join('.'));
    }

    return ancestors;
  }
}