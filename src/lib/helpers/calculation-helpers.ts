import { BudgetItem } from '../validators/csv-types';
import { CalculationUtils } from '../utils/calculations';
import { IVAGroup, TotalsResult, CalculationOptions } from './calculation-types';

/**
 * Funciones de conveniencia para cálculos específicos
 */
export class CalculationHelpers {
  /**
   * Calcula solo el amount de un item sin formateo
   */
  static calculateItemAmountRaw(quantity: string, pvp: string): number {
    const quantityNum = parseFloat(quantity.replace(',', '.')) || 0;
    const pvpNum = parseFloat(pvp.replace(',', '.')) || 0;

    if (quantityNum < 0 || pvpNum < 0) return 0;

    return Math.round(quantityNum * pvpNum * 100) / 100; // Precisión a 2 decimales
  }

  /**
   * Actualiza solo un item específico en el array
   */
  static updateSingleItem(
    jsonData: BudgetItem[],
    itemId: string,
    updates: Partial<Pick<BudgetItem, 'quantity' | 'pvp'>>
  ): BudgetItem[] {
    return jsonData.map(item => {
      if (item.id === itemId && item.level === 'item') {
        const updated = { ...item, ...updates };

        // Recalcular amount automáticamente
        updated.amount = CalculationUtils.calculateItemAmount(
          updated.quantity || '0',
          updated.pvp || '0'
        );

        return updated;
      }
      return item;
    });
  }

  /**
   * Obtiene el total de un contenedor específico
   */
  static getContainerTotal(jsonData: BudgetItem[], containerId: string): number {
    const items = jsonData.filter(item =>
      item.level === 'item' && item.id.startsWith(containerId + '.')
    );

    return items.reduce((sum, item) => {
      const amount = parseFloat(item.amount.replace(',', '.')) || 0;
      return sum + amount;
    }, 0);
  }

  /**
   * Obtiene estadísticas rápidas del presupuesto
   */
  static getBudgetStats(jsonData: BudgetItem[]): {
    totalItems: number;
    totalChapters: number;
    totalSubchapters: number;
    totalSections: number;
    totalAmount: number;
    averageItemAmount: number;
    itemsWithZeroAmount: number;
  } {
    const items = jsonData.filter(item => item.level === 'item');
    const chapters = jsonData.filter(item => item.level === 'chapter');
    const subchapters = jsonData.filter(item => item.level === 'subchapter');
    const sections = jsonData.filter(item => item.level === 'section');

    const totalAmount = items.reduce((sum, item) => {
      return sum + (parseFloat(item.amount.replace(',', '.')) || 0);
    }, 0);

    const itemsWithZeroAmount = items.filter(item =>
      (parseFloat(item.amount.replace(',', '.')) || 0) === 0
    ).length;

    return {
      totalItems: items.length,
      totalChapters: chapters.length,
      totalSubchapters: subchapters.length,
      totalSections: sections.length,
      totalAmount,
      averageItemAmount: items.length > 0 ? totalAmount / items.length : 0,
      itemsWithZeroAmount
    };
  }

  /**
   * Encuentra items con inconsistencias en cálculos
   */
  static findCalculationInconsistencies(jsonData: BudgetItem[]): Array<{
    itemId: string;
    issue: string;
    expected: string;
    actual: string;
  }> {
    const issues: Array<{
      itemId: string;
      issue: string;
      expected: string;
      actual: string;
    }> = [];

    jsonData.forEach(item => {
      if (item.level === 'item') {
        const expectedAmount = CalculationUtils.calculateItemAmount(
          item.quantity || '0',
          item.pvp || '0'
        );

        if (expectedAmount !== item.amount) {
          issues.push({
            itemId: item.id,
            issue: 'Amount incorrecto',
            expected: expectedAmount,
            actual: item.amount
          });
        }

        // Verificar valores negativos
        const quantity = parseFloat(item.quantity?.replace(',', '.') || '0');
        const pvp = parseFloat(item.pvp?.replace(',', '.') || '0');

        if (quantity < 0) {
          issues.push({
            itemId: item.id,
            issue: 'Quantity negativa',
            expected: '≥ 0',
            actual: item.quantity || '0'
          });
        }

        if (pvp < 0) {
          issues.push({
            itemId: item.id,
            issue: 'PVP negativo',
            expected: '≥ 0',
            actual: item.pvp || '0'
          });
        }
      }
    });

    return issues;
  }

  /**
   * Obtiene la jerarquía de un item (todos sus ancestros)
   */
  static getItemHierarchy(jsonData: BudgetItem[], itemId: string): BudgetItem[] {
    const hierarchy: BudgetItem[] = [];
    const parts = itemId.split('.');

    // Construir IDs de ancestros
    for (let i = 1; i < parts.length; i++) {
      const ancestorId = parts.slice(0, i).join('.');
      const ancestor = jsonData.find(item => item.id === ancestorId);
      if (ancestor) {
        hierarchy.push(ancestor);
      }
    }

    // Agregar el item mismo si existe
    const item = jsonData.find(item => item.id === itemId);
    if (item) {
      hierarchy.push(item);
    }

    return hierarchy;
  }

  /**
   * Calcula el porcentaje que representa un item del total
   */
  static getItemPercentageOfTotal(jsonData: BudgetItem[], itemId: string): number {
    const item = jsonData.find(item => item.id === itemId);
    if (!item || item.level !== 'item') return 0;

    const itemAmount = parseFloat(item.amount.replace(',', '.')) || 0;
    const stats = this.getBudgetStats(jsonData);

    return stats.totalAmount > 0 ? (itemAmount / stats.totalAmount) * 100 : 0;
  }

  /**
   * Agrupa items por rango de precios
   */
  static groupItemsByPriceRange(jsonData: BudgetItem[]): {
    low: BudgetItem[];    // 0-100€
    medium: BudgetItem[]; // 100-500€
    high: BudgetItem[];   // 500-1000€
    premium: BudgetItem[]; // >1000€
  } {
    const items = jsonData.filter(item => item.level === 'item');

    return items.reduce((groups, item) => {
      const amount = parseFloat(item.amount.replace(',', '.')) || 0;

      if (amount <= 100) {
        groups.low.push(item);
      } else if (amount <= 500) {
        groups.medium.push(item);
      } else if (amount <= 1000) {
        groups.high.push(item);
      } else {
        groups.premium.push(item);
      }

      return groups;
    }, {
      low: [] as BudgetItem[],
      medium: [] as BudgetItem[],
      high: [] as BudgetItem[],
      premium: [] as BudgetItem[]
    });
  }

  /**
   * Convierte totales a formato para mostrar en UI
   */
  static formatTotalsForDisplay(totals: TotalsResult): {
    base: { label: string; value: string; numeric: number };
    ivas: Array<{ label: string; value: string; numeric: number; percentage: number }>;
    total: { label: string; value: string; numeric: number };
  } {
    const parseAmount = (amountStr: string): number => {
      return parseFloat(amountStr.replace(/[^\d.,-]/g, '').replace(',', '.')) || 0;
    };

    return {
      base: {
        label: totals.base.name,
        value: totals.base.amount,
        numeric: parseAmount(totals.base.amount)
      },
      ivas: totals.ivas.map(iva => ({
        label: iva.name,
        value: iva.amount,
        numeric: iva.baseAmount,
        percentage: iva.percentage
      })),
      total: {
        label: totals.total.name,
        value: totals.total.amount,
        numeric: parseAmount(totals.total.amount)
      }
    };
  }

  /**
   * Valida que la suma de contenedores coincida con sus items
   */
  static validateContainerTotals(jsonData: BudgetItem[]): Array<{
    containerId: string;
    containerAmount: number;
    calculatedAmount: number;
    difference: number;
  }> {
    const containers = jsonData.filter(item => item.level !== 'item');
    const issues: Array<{
      containerId: string;
      containerAmount: number;
      calculatedAmount: number;
      difference: number;
    }> = [];

    containers.forEach(container => {
      const containerAmount = parseFloat(container.amount.replace(',', '.')) || 0;
      const calculatedAmount = this.getContainerTotal(jsonData, container.id);
      const difference = Math.abs(containerAmount - calculatedAmount);

      if (difference > 0.01) { // Tolerancia de 1 céntimo
        issues.push({
          containerId: container.id,
          containerAmount,
          calculatedAmount,
          difference
        });
      }
    });

    return issues;
  }
}