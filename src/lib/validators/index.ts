// Exportar el conversor principal y utilidades
export { CSV2JSONConverter, detectIVAsPresentes } from './csv-converter';

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

// Exportar todas las constantes del sistema
export * from '../constants';

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

// Exportar helpers de formateo
export {
  formatCurrency,
  formatCurrencyCompact,
  parseCurrency,
  formatNumberES,
  formatNumberEN,
  parseNumber,
  formatDate,
  formatDateRelative,
  parseDate,
  removeAccents,
  createSlug,
  capitalize,
  truncate
} from '../helpers/format';

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