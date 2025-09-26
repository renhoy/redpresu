import { ProcessedRow, BudgetItem, TransformationResult } from './csv-types';
import { CSVUtils } from '../helpers/csv-utils';
import { LEVEL_MAP } from '../constants/csv';

/**
 * Transformador de datos CSV validados a formato JSON del presupuesto
 */
export class DataTransformer {
  /**
   * Transforma datos validados a formato JSON final
   */
  transform(data: ProcessedRow[]): TransformationResult {
    try {
      const transformedItems = data.map(item => this.transformItem(item));

      return {
        success: true,
        data: transformedItems,
        errors: []
      };
    } catch (error) {
      return {
        success: false,
        errors: [{
          code: 'TRANSFORMATION_ERROR',
          severity: 'error',
          message: `Error al transformar datos: ${error instanceof Error ? error.message : 'Error desconocido'}`
        }]
      };
    }
  }

  /**
   * Transforma un item individual
   */
  private transformItem(item: ProcessedRow): BudgetItem {
    const normalizedLevel = item.normalizedLevel as keyof typeof LEVEL_MAP;
    const level = LEVEL_MAP[normalizedLevel];

    const transformed: BudgetItem = {
      level,
      id: item.id || '',
      name: item.nombre || '',
      amount: '0.00'
    };

    // Para partidas (items), incluir campos adicionales
    if (item.normalizedLevel === 'partida') {
      transformed.description = this.normalizeDescription(item.descripcion);
      transformed.unit = item.ud || '';
      transformed.quantity = '0.00';
      transformed.iva_percentage = this.formatNumber(item['%iva']);
      transformed.pvp = this.formatNumber(item.pvp);
    }

    return transformed;
  }

  /**
   * Normaliza descripciones (maneja valores vacíos)
   */
  private normalizeDescription(description?: string): string {
    if (!description || description.trim() === '') {
      return ' '; // Espacio en blanco para mantener compatibilidad
    }
    return description.trim();
  }

  /**
   * Formatea números a formato inglés con 2 decimales
   */
  private formatNumber(value?: string): string {
    return CSVUtils.formatNumber(value || '');
  }

  /**
   * Convierte datos JSON de vuelta a CSV (útil para exports)
   */
  jsonToCSV(jsonData: BudgetItem[]): string {
    if (!jsonData || jsonData.length === 0) return '';

    const levelMap = {
      chapter: 'Capítulo',
      subchapter: 'Subcapítulo',
      section: 'Apartado',
      item: 'Partida'
    };

    const headers = ['Nivel', 'ID', 'Nombre', 'Descripción', 'Ud', '%IVA', 'PVP'];
    const rows = [headers];

    jsonData.forEach(item => {
      const row = [
        levelMap[item.level] || '',
        item.id || '',
        item.name || '',
        item.description || '',
        item.unit || '',
        item.iva_percentage ? this.formatForCSV(item.iva_percentage) : '',
        item.pvp ? this.formatForCSV(item.pvp) : ''
      ];
      rows.push(row);
    });

    return rows.map(row =>
      row.map(field => {
        const stringField = String(field);
        if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
          return '"' + stringField.replace(/"/g, '""') + '"';
        }
        return stringField;
      }).join(',')
    ).join('\n');
  }

  /**
   * Formatea números para CSV (formato español con comas)
   */
  private formatForCSV(value: string): string {
    return value.replace('.', ',');
  }

  /**
   * Genera una plantilla CSV de ejemplo
   */
  generateTemplate(): string {
    const templateContent = `"Nivel","ID","Nombre","Descripción","Ud","%IVA","PVP"
"Capítulo",1,"Instalaciones Eléctricas",,,,
"Subcapítulo","1.1","Cableado Estructurado",,,,
"Apartado","1.1.1","Cableado de Baja Tensión",,,,
"Partida","1.1.1.1","Instalación de Cable UTP Cat6","Instalación de cable UTP categoría 6","m",21,15.50
"Capítulo",2,"Fontanería",,,,
"Subcapítulo","2.1","Tuberías de Agua",,,,
"Partida","2.1.1","Instalación de Tubería PEX","Instalación de tuberías PEX","m",10,12.30
"Capítulo",3,"Pintura",,,,
"Partida","3.1","Pintura de Paredes","Aplicación de pintura plástica","m²",21,8.50`;

    return templateContent;
  }

  /**
   * Filtra solo los items (partidas) de un conjunto de datos
   */
  filterItemsOnly(data: BudgetItem[]): BudgetItem[] {
    return data.filter(item => item.level === 'item');
  }

  /**
   * Agrupa items por su contenedor padre
   */
  groupByParent(data: BudgetItem[]): Record<string, BudgetItem[]> {
    const groups: Record<string, BudgetItem[]> = {};

    data.forEach(item => {
      const parentId = CSVUtils.getParentId(item.id);
      if (!groups[parentId]) {
        groups[parentId] = [];
      }
      groups[parentId].push(item);
    });

    return groups;
  }

  /**
   * Calcula estadísticas del presupuesto
   */
  calculateStats(data: BudgetItem[]) {
    const items = this.filterItemsOnly(data);

    return {
      totalChapters: data.filter(item => item.level === 'chapter').length,
      totalSubchapters: data.filter(item => item.level === 'subchapter').length,
      totalSections: data.filter(item => item.level === 'section').length,
      totalItems: items.length,
      averageIva: this.calculateAverageIva(items),
      totalValue: this.calculateTotalValue(items)
    };
  }

  /**
   * Calcula IVA promedio de los items
   */
  private calculateAverageIva(items: BudgetItem[]): number {
    if (items.length === 0) return 0;

    const total = items.reduce((sum, item) => {
      const iva = parseFloat(item.iva_percentage || '0');
      return sum + (isNaN(iva) ? 0 : iva);
    }, 0);

    return total / items.length;
  }

  /**
   * Calcula valor total de todos los PVP
   */
  private calculateTotalValue(items: BudgetItem[]): number {
    return items.reduce((sum, item) => {
      const pvp = parseFloat(item.pvp || '0');
      return sum + (isNaN(pvp) ? 0 : pvp);
    }, 0);
  }
}