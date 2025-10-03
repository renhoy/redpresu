import { CSVParser } from './csv-parser';
import { BudgetValidator } from './budget-validator';
import { DataTransformer } from './data-transformer';
import {
  OperationResult,
  BudgetItem,
  ValidationConfig
} from './csv-types';

/**
 * Conversor principal CSV a JSON que orquesta todo el proceso
 */
export class CSV2JSONConverter {
  private readonly parser: CSVParser;
  private readonly validator: BudgetValidator;
  private readonly transformer: DataTransformer;

  constructor(config?: ValidationConfig) {
    this.parser = new CSVParser();
    this.validator = new BudgetValidator(config);
    this.transformer = new DataTransformer();
  }

  /**
   * Convierte contenido CSV a formato JSON de presupuesto
   */
  async convertCSVToJSON(csvContent: string): Promise<OperationResult<BudgetItem[]>> {
    try {
      // 1. Parsear CSV
      const parseResult = this.parser.parse(csvContent);
      if (!parseResult.success) {
        return {
          success: false,
          data: undefined,
          errors: parseResult.errors
        };
      }

      // Validar que parseResult.data existe y es un array
      if (!parseResult.data || !Array.isArray(parseResult.data)) {
        return {
          success: false,
          data: undefined,
          errors: [{
            code: 'PARSE_ERROR',
            severity: 'fatal',
            message: 'No se pudo leer el contenido del CSV. Verifica que el archivo tenga el formato correcto.'
          }]
        };
      }

      // 2. Validar estructura
      const structureResult = this.validator.validateStructure(parseResult.data);
      if (!structureResult.success) {
        return {
          success: false,
          data: undefined,
          errors: structureResult.errors
        };
      }

      // Validar que structureResult.fieldMap existe
      if (!structureResult.fieldMap) {
        return {
          success: false,
          data: undefined,
          errors: [{
            code: 'STRUCTURE_ERROR',
            severity: 'fatal',
            message: 'No se pudieron identificar las columnas del CSV. Verifica que la primera fila contenga las cabeceras correctas.'
          }]
        };
      }

      // 3. Validar datos
      const dataResult = this.validator.validateData(
        parseResult.data,
        structureResult.fieldMap
      );
      if (!dataResult.success) {
        return {
          success: false,
          data: undefined,
          errors: dataResult.errors
        };
      }

      // Validar que dataResult.data existe
      if (!dataResult.data || !Array.isArray(dataResult.data)) {
        return {
          success: false,
          data: undefined,
          errors: [{
            code: 'VALIDATION_ERROR',
            severity: 'fatal',
            message: 'No se pudieron validar los datos del CSV. Verifica que todas las filas tengan el formato correcto.'
          }]
        };
      }

      // 4. Transformar a JSON con normalización completa
      const transformResult = this.transformer.transformWithFullNormalization(dataResult.data);
      if (!transformResult.success) {
        return {
          success: false,
          data: undefined,
          errors: transformResult.errors
        };
      }

      // Validar que transformResult.data existe
      if (!transformResult.data || !Array.isArray(transformResult.data)) {
        return {
          success: false,
          data: undefined,
          errors: [{
            code: 'TRANSFORMATION_ERROR',
            severity: 'fatal',
            message: 'Error al transformar los datos del CSV. Por favor, verifica el formato del archivo.'
          }]
        };
      }

      // Retornar éxito pero incluir warnings si los hay
      return {
        success: true,
        data: transformResult.data,
        errors: dataResult.errors // Incluir warnings de la validación
      };

    } catch (error) {
      // Logging para debugging
      console.error('[CSV2JSONConverter] Error inesperado:', error);
      console.error('[CSV2JSONConverter] Stack:', error instanceof Error ? error.stack : 'No stack');

      // Detectar errores técnicos comunes
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isTechnicalError = errorMessage.includes('undefined') ||
                               errorMessage.includes('null') ||
                               errorMessage.includes('Cannot read') ||
                               errorMessage.includes('forEach') ||
                               errorMessage.includes('TypeError');

      return {
        success: false,
        data: undefined,
        errors: [{
          code: 'UNKNOWN_ERROR',
          severity: 'fatal',
          message: isTechnicalError
            ? 'El archivo CSV tiene un formato inválido o datos corruptos. Verifica que todas las columnas requeridas estén presentes y tengan valores válidos. Descarga plantilla: /tarifa-plantilla.csv'
            : `Error al procesar el CSV: ${errorMessage}`
        }]
      };
    }
  }

  /**
   * Valida un CSV sin transformarlo (solo validación)
   */
  async validateCSV(csvContent: string): Promise<OperationResult<void>> {
    try {
      // 1. Parsear CSV
      const parseResult = this.parser.parse(csvContent);
      if (!parseResult.success) {
        return {
          success: false,
          errors: parseResult.errors
        };
      }

      // 2. Validar estructura
      const structureResult = this.validator.validateStructure(parseResult.data!);
      if (!structureResult.success) {
        return {
          success: false,
          errors: structureResult.errors
        };
      }

      // 3. Validar datos
      const dataResult = this.validator.validateData(
        parseResult.data!,
        structureResult.fieldMap!
      );

      return {
        success: dataResult.success,
        errors: dataResult.errors
      };

    } catch (error) {
      return {
        success: false,
        errors: [{
          code: 'UNKNOWN_ERROR',
          severity: 'fatal',
          message: `Error inesperado: ${error instanceof Error ? error.message : 'Error desconocido'}`
        }]
      };
    }
  }

  /**
   * Genera una plantilla CSV de ejemplo
   */
  generateTemplate(): string {
    return this.transformer.generateTemplate();
  }

  /**
   * Convierte datos JSON de vuelta a CSV
   */
  jsonToCSV(jsonData: BudgetItem[]): string {
    return this.transformer.jsonToCSV(jsonData);
  }

  /**
   * Calcula estadísticas del presupuesto
   */
  calculateStats(data: BudgetItem[]) {
    return this.transformer.calculateStats(data);
  }

  /**
   * Filtra solo los items (partidas)
   */
  getItemsOnly(data: BudgetItem[]): BudgetItem[] {
    return this.transformer.filterItemsOnly(data);
  }

  /**
   * Convierte CSV a JSON usando transformación básica (compatibilidad)
   */
  async convertCSVToJSONBasic(csvContent: string): Promise<OperationResult<BudgetItem[]>> {
    try {
      // 1. Parsear CSV
      const parseResult = this.parser.parse(csvContent);
      if (!parseResult.success) {
        return {
          success: false,
          data: undefined,
          errors: parseResult.errors
        };
      }

      // 2. Validar estructura
      const structureResult = this.validator.validateStructure(parseResult.data!);
      if (!structureResult.success) {
        return {
          success: false,
          data: undefined,
          errors: structureResult.errors
        };
      }

      // 3. Validar datos
      const dataResult = this.validator.validateData(
        parseResult.data!,
        structureResult.fieldMap!
      );
      if (!dataResult.success) {
        return {
          success: false,
          data: undefined,
          errors: dataResult.errors
        };
      }

      // 4. Transformar a JSON (método básico)
      const transformResult = this.transformer.transform(dataResult.data!);
      if (!transformResult.success) {
        return {
          success: false,
          data: undefined,
          errors: transformResult.errors
        };
      }

      return {
        success: true,
        data: transformResult.data!,
        errors: []
      };

    } catch (error) {
      return {
        success: false,
        data: undefined,
        errors: [{
          code: 'UNKNOWN_ERROR',
          severity: 'fatal',
          message: `Error inesperado: ${error instanceof Error ? error.message : 'Error desconocido'}`
        }]
      };
    }
  }

  /**
   * Valida un objeto BudgetItem transformado
   */
  validateTransformedItem(item: BudgetItem): { isValid: boolean; errors: string[] } {
    return this.transformer.validateTransformedItem(item);
  }

  /**
   * Agrupa items por su contenedor padre
   */
  groupItemsByParent(data: BudgetItem[]): Record<string, BudgetItem[]> {
    return this.transformer.groupByParent(data);
  }
}

/**
 * Detecta los porcentajes de IVA únicos presentes en los items del presupuesto
 * @param jsonData - Array de items del presupuesto
 * @returns Array de porcentajes de IVA únicos, ordenados de mayor a menor
 *
 * @example
 * const items = [
 *   { iva: 21, ... },
 *   { iva: 10, ... },
 *   { iva: 21, ... }
 * ]
 * detectIVAsPresentes(items) // [21, 10]
 */
export function detectIVAsPresentes(jsonData: BudgetItem[]): number[] {
  if (!jsonData || !Array.isArray(jsonData) || jsonData.length === 0) {
    return [];
  }

  // Extraer todos los valores de IVA únicos
  const ivasSet = new Set<number>();

  jsonData.forEach(item => {
    // Solo considerar items que tengan IVA definido y sea un número válido
    if (
      item.iva !== undefined &&
      item.iva !== null &&
      typeof item.iva === 'number' &&
      !isNaN(item.iva) &&
      item.iva >= 0 &&
      item.iva <= 100
    ) {
      // Redondear a 2 decimales para evitar problemas de precisión
      const ivaRedondeado = Math.round(item.iva * 100) / 100;
      ivasSet.add(ivaRedondeado);
    }
  });

  // Convertir Set a Array y ordenar descendente (21, 10, 4, etc.)
  return Array.from(ivasSet).sort((a, b) => b - a);
}