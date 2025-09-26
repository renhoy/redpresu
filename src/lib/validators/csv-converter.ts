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

      // 4. Transformar a JSON con normalización completa
      const transformResult = this.transformer.transformWithFullNormalization(dataResult.data!);
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