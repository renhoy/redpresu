import { ValidationError, ErrorSeverity } from '../validators/csv-types';
import { ERROR_CODES, SEVERITY } from '../constants/csv';

/**
 * Clase para crear errores de validación de forma consistente
 */
export class ErrorFactory {
  /**
   * Crea un error de campo específico
   */
  static createFieldError(
    field: string,
    message: string,
    lineNumber: number,
    originalRow?: string[]
  ): ValidationError {
    return {
      code: ERROR_CODES.VALIDATION_ERROR,
      severity: SEVERITY.ERROR,
      line: lineNumber,
      field: field,
      originalRow: originalRow,
      message: `${field} ${message}`
    };
  }

  /**
   * Crea un error de parsing
   */
  static createParseError(message: string): ValidationError {
    return {
      code: ERROR_CODES.PARSE_ERROR,
      severity: SEVERITY.FATAL,
      message: `Error al parsear CSV: ${message}`
    };
  }

  /**
   * Crea un error de estructura
   */
  static createStructureError(message: string): ValidationError {
    return {
      code: ERROR_CODES.STRUCTURE_ERROR,
      severity: SEVERITY.FATAL,
      message
    };
  }

  /**
   * Crea un error de jerarquía
   */
  static createHierarchyError(
    message: string,
    lineNumber?: number,
    originalRow?: string[]
  ): ValidationError {
    return {
      code: ERROR_CODES.HIERARCHY_ERROR,
      severity: SEVERITY.ERROR,
      line: lineNumber,
      originalRow: originalRow,
      message
    };
  }

  /**
   * Crea un error de duplicado
   */
  static createDuplicateError(
    id: string,
    originalRow?: string[]
  ): ValidationError {
    return {
      code: ERROR_CODES.DUPLICATE_ERROR,
      severity: SEVERITY.ERROR,
      originalRow: originalRow,
      message: `ID duplicado: ${id} (también aparece en otra línea)`
    };
  }

  /**
   * Crea un error de secuencia
   */
  static createSequenceError(
    expected: number,
    actual: number,
    originalRow?: string[]
  ): ValidationError {
    return {
      code: ERROR_CODES.SEQUENCE_ERROR,
      severity: SEVERITY.WARNING,
      originalRow: originalRow,
      message: `Secuencia incorrecta: esperado ${expected}, encontrado ${actual}`
    };
  }

  /**
   * Crea un error de validación numérica
   */
  static createNumberValidationError(
    fieldName: string,
    value: string,
    lineNumber: number,
    originalRow?: string[]
  ): ValidationError {
    return this.createFieldError(
      fieldName,
      `debe ser un número válido (encontrado: "${value}")`,
      lineNumber,
      originalRow
    );
  }

  /**
   * Crea un error de rango numérico
   */
  static createRangeError(
    fieldName: string,
    min: number | null,
    max: number | null,
    lineNumber: number,
    originalRow?: string[]
  ): ValidationError {
    let message = '';
    if (min !== null && max !== null) {
      message = `debe estar entre ${min} y ${max}`;
    } else if (min !== null) {
      message = `debe ser mayor o igual a ${min}`;
    } else if (max !== null) {
      message = `debe ser menor o igual a ${max}`;
    }

    return this.createFieldError(fieldName, message, lineNumber, originalRow);
  }

  /**
   * Crea un error de formato de ID
   */
  static createIdFormatError(
    lineNumber: number,
    originalRow?: string[]
  ): ValidationError {
    return this.createFieldError(
      'ID',
      'formato inválido (debe ser números separados por puntos)',
      lineNumber,
      originalRow
    );
  }
}

/**
 * Utilidades para manejo de errores
 */
export class ErrorUtils {
  /**
   * Filtra errores por severidad
   */
  static filterBySeverity(
    errors: ValidationError[],
    severity: ErrorSeverity
  ): ValidationError[] {
    return errors.filter(error => error.severity === severity);
  }

  /**
   * Verifica si hay errores fatales
   */
  static hasFatalErrors(errors: ValidationError[]): boolean {
    return errors.some(error => error.severity === SEVERITY.FATAL);
  }

  /**
   * Cuenta errores por tipo
   */
  static countByCode(errors: ValidationError[]): Record<string, number> {
    return errors.reduce((acc, error) => {
      acc[error.code] = (acc[error.code] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  /**
   * Formatea errores para mostrar al usuario
   */
  static formatForDisplay(errors: ValidationError[]): string[] {
    return errors.map(error => {
      let message = error.message;

      if (error.originalRow) {
        const csvLine = error.originalRow.map(field => `"${field}"`).join(',');
        message = `${csvLine} ← ${message}`;
      } else if (error.line) {
        message = `Línea ${error.line}: ${message}`;
      }

      return message;
    });
  }
}