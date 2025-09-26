// Exportar el conversor principal
export { CSV2JSONConverter } from './csv-converter';

// Exportar tipos principales
export type {
  BudgetItem,
  ValidationError,
  OperationResult,
  ValidationConfig,
  BudgetLevel,
  ErrorCode,
  ErrorSeverity
} from './csv-types';

// Exportar constantes
export {
  ERROR_CODES,
  SEVERITY,
  LEVEL_MAP,
  REQUIRED_FIELDS
} from '../constants/csv';

// Exportar constantes de cálculos
export {
  CALCULATION_PRESETS,
  IVA_RATES,
  CALCULATION_LIMITS,
  CALCULATION_ERRORS,
  CURRENCY_FORMATS,
  ROUNDING_MODES,
  VALIDATION_PATTERNS,
  BUDGET_LEVELS,
  CALCULATION_PRIORITIES,
  PERFORMANCE_CONFIG
} from '../constants/calculations';

// Exportar utilidades para casos avanzados
export { ErrorFactory, ErrorUtils } from '../helpers/csv-errors';
export { CSVUtils } from '../helpers/csv-utils';
export { NormalizationUtils } from '../helpers/normalization-utils';
export {
  TransformationUtils,
  type HierarchicalItem,
  type ValidationResult,
  type HierarchyMetrics,
  type TransformationSummary
} from '../helpers/transformation-utils';

// Exportar utilidades de cálculo
export { CalculationUtils } from '../utils/calculations';
export { CalculationHelpers } from '../helpers/calculation-helpers';
export type {
  IVAGroup,
  TotalLine,
  TotalsResult,
  BudgetCalculationResult,
  CalculationOptions,
  CalculationValidation,
  CalculationMetrics
} from '../helpers/calculation-types';

// Exportar componentes individuales para casos específicos
export { CSVParser } from './csv-parser';
export { BudgetValidator } from './budget-validator';
export { DataTransformer } from './data-transformer';