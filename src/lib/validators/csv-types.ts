import { ERROR_CODES, SEVERITY, LEVEL_MAP } from '../constants/csv';

/**
 * Tipos de errores
 */
export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];
export type ErrorSeverity = typeof SEVERITY[keyof typeof SEVERITY];

/**
 * Tipos de nivel de presupuesto
 */
export type BudgetLevel = typeof LEVEL_MAP[keyof typeof LEVEL_MAP];
export type SpanishLevel = keyof typeof LEVEL_MAP;

/**
 * Error de validación estructurado
 */
export interface ValidationError {
  code: ErrorCode;
  severity: ErrorSeverity;
  message: string;
  line?: number;
  field?: string;
  originalRow?: string[];
}

/**
 * Resultado de operación con posibles errores
 */
export interface OperationResult<T = unknown> {
  success: boolean;
  data?: T;
  errors: ValidationError[];
}

/**
 * Mapeo de campos CSV
 */
export interface FieldMap {
  [key: string]: number;
}

/**
 * Datos de fila CSV procesada
 */
export interface ProcessedRow {
  lineNumber: number;
  originalRow: string[];
  nivel?: string;
  normalizedLevel?: string;
  id?: string;
  nombre?: string;
  descripcion?: string;
  ud?: string;
  '%iva'?: string;
  pvp?: string;
}

/**
 * Item de presupuesto transformado
 */
export interface BudgetItem {
  level: BudgetLevel;
  id: string;
  name: string;
  amount: string;
  description?: string;
  unit?: string;
  quantity?: string;
  iva_percentage?: string;
  pvp?: string;
}

/**
 * Configuración de validación
 */
export interface ValidationConfig {
  strictMode?: boolean;
  allowMissingDescriptions?: boolean;
  maxHierarchyDepth?: number;
}

/**
 * Resultado de parsing CSV
 */
export interface ParseResult {
  success: boolean;
  data?: string[][];
  errors: ValidationError[];
}

/**
 * Resultado de validación de estructura
 */
export interface StructureValidationResult {
  success: boolean;
  fieldMap?: FieldMap;
  errors: ValidationError[];
}

/**
 * Resultado de validación de datos
 */
export interface DataValidationResult {
  success: boolean;
  data?: ProcessedRow[];
  errors: ValidationError[];
}

/**
 * Resultado de transformación
 */
export interface TransformationResult {
  success: boolean;
  data?: BudgetItem[];
  errors: ValidationError[];
}