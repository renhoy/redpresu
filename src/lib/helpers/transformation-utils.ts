import { BudgetItem } from '../validators/csv-types';
import { CSVUtils } from './csv-utils';
import { NormalizationUtils } from './normalization-utils';

/**
 * Utilidades adicionales para transformación de datos de presupuesto
 */
export class TransformationUtils {
  /**
   * Genera una estructura jerárquica anidada desde una lista plana
   */
  static buildHierarchicalStructure(flatData: BudgetItem[]): HierarchicalItem[] {
    const itemMap = new Map<string, HierarchicalItem>();
    const rootItems: HierarchicalItem[] = [];

    // Convertir items planos a estructura jerárquica
    flatData.forEach(item => {
      const hierarchicalItem: HierarchicalItem = {
        ...item,
        children: []
      };
      itemMap.set(item.id, hierarchicalItem);
    });

    // Establecer relaciones padre-hijo
    flatData.forEach(item => {
      const hierarchicalItem = itemMap.get(item.id)!;
      const parentId = CSVUtils.getParentId(item.id);

      if (parentId && itemMap.has(parentId)) {
        const parent = itemMap.get(parentId)!;
        parent.children.push(hierarchicalItem);
      } else {
        // Es un elemento raíz
        rootItems.push(hierarchicalItem);
      }
    });

    return rootItems;
  }

  /**
   * Aplana una estructura jerárquica a lista plana
   */
  static flattenHierarchicalStructure(hierarchicalData: HierarchicalItem[]): BudgetItem[] {
    const result: BudgetItem[] = [];

    function flatten(items: HierarchicalItem[]) {
      items.forEach(item => {
        const { children, ...flatItem } = item;
        result.push(flatItem);
        if (children && children.length > 0) {
          flatten(children);
        }
      });
    }

    flatten(hierarchicalData);
    return result;
  }

  /**
   * Valida la integridad de la jerarquía
   */
  static validateHierarchyIntegrity(data: BudgetItem[]): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Verificar que todos los padres existen
    const idSet = new Set(data.map(item => item.id));

    data.forEach(item => {
      const parentId = CSVUtils.getParentId(item.id);
      if (parentId && !idSet.has(parentId)) {
        errors.push(`Item ${item.id}: falta el padre ${parentId}`);
      }
    });

    // Verificar secuencias correctas por nivel
    const byLevel = this.groupByLevel(data);

    Object.entries(byLevel).forEach(([level, items]) => {
      const byParent = this.groupByParentId(items);

      Object.entries(byParent).forEach(([parentId, siblings]) => {
        const sequences = siblings.map(item => {
          const parts = item.id.split('.');
          return parseInt(parts[parts.length - 1]);
        }).sort((a, b) => a - b);

        for (let i = 0; i < sequences.length; i++) {
          if (sequences[i] !== i + 1) {
            warnings.push(`Secuencia incorrecta en ${parentId || 'raíz'}: esperado ${i + 1}, encontrado ${sequences[i]}`);
          }
        }
      });
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Calcula métricas de la estructura jerárquica
   */
  static calculateHierarchyMetrics(data: BudgetItem[]): HierarchyMetrics {
    const levels = this.groupByLevel(data);
    const depths = data.map(item => CSVUtils.getHierarchyDepth(item.id));

    return {
      totalItems: data.length,
      itemsByLevel: {
        chapters: levels.chapter?.length || 0,
        subchapters: levels.subchapter?.length || 0,
        sections: levels.section?.length || 0,
        items: levels.item?.length || 0
      },
      maxDepth: Math.max(...depths),
      avgDepth: depths.reduce((sum, depth) => sum + depth, 0) / depths.length,
      totalValue: this.calculateTotalValue(data),
      avgIvaPercentage: this.calculateAverageIva(data)
    };
  }

  /**
   * Genera un resumen de la transformación
   */
  static generateTransformationSummary(
    originalCount: number,
    transformedData: BudgetItem[]
  ): TransformationSummary {
    const metrics = this.calculateHierarchyMetrics(transformedData);
    const integrity = this.validateHierarchyIntegrity(transformedData);

    return {
      originalItemCount: originalCount,
      transformedItemCount: transformedData.length,
      successRate: (transformedData.length / originalCount) * 100,
      metrics,
      integrity,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Agrupa items por nivel
   */
  private static groupByLevel(data: BudgetItem[]): Record<string, BudgetItem[]> {
    return data.reduce((acc, item) => {
      if (!acc[item.level]) {
        acc[item.level] = [];
      }
      acc[item.level].push(item);
      return acc;
    }, {} as Record<string, BudgetItem[]>);
  }

  /**
   * Agrupa items por ID del padre
   */
  private static groupByParentId(data: BudgetItem[]): Record<string, BudgetItem[]> {
    return data.reduce((acc, item) => {
      const parentId = CSVUtils.getParentId(item.id) || '';
      if (!acc[parentId]) {
        acc[parentId] = [];
      }
      acc[parentId].push(item);
      return acc;
    }, {} as Record<string, BudgetItem[]>);
  }

  /**
   * Calcula el valor total de los items
   */
  private static calculateTotalValue(data: BudgetItem[]): number {
    return data
      .filter(item => item.level === 'item')
      .reduce((sum, item) => {
        const pvp = parseFloat(item.pvp || '0');
        return sum + (isNaN(pvp) ? 0 : pvp);
      }, 0);
  }

  /**
   * Calcula el promedio de IVA
   */
  private static calculateAverageIva(data: BudgetItem[]): number {
    const items = data.filter(item => item.level === 'item');
    if (items.length === 0) return 0;

    const total = items.reduce((sum, item) => {
      const iva = parseFloat(item.iva_percentage || '0');
      return sum + (isNaN(iva) ? 0 : iva);
    }, 0);

    return total / items.length;
  }
}

/**
 * Interfaces para estructuras jerárquicas
 */
export interface HierarchicalItem extends BudgetItem {
  children: HierarchicalItem[];
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface HierarchyMetrics {
  totalItems: number;
  itemsByLevel: {
    chapters: number;
    subchapters: number;
    sections: number;
    items: number;
  };
  maxDepth: number;
  avgDepth: number;
  totalValue: number;
  avgIvaPercentage: number;
}

export interface TransformationSummary {
  originalItemCount: number;
  transformedItemCount: number;
  successRate: number;
  metrics: HierarchyMetrics;
  integrity: ValidationResult;
  timestamp: string;
}