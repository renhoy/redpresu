import { CalculationOptions } from '../helpers/calculation-types';

/**
 * Constantes para cálculos de presupuestos
 */

/**
 * Configuraciones predefinidas para cálculos
 */
export const CALCULATION_PRESETS = {
  /** Configuración estándar española */
  SPANISH_STANDARD: {
    decimals: 2,
    currency: '€',
    useCommaSeparator: true,
    validateNegative: true
  } as CalculationOptions,

  /** Configuración para exportación */
  EXPORT_FORMAT: {
    decimals: 2,
    currency: '€',
    useCommaSeparator: false, // Punto para compatibilidad
    validateNegative: true
  } as CalculationOptions,

  /** Configuración para cálculos internos */
  INTERNAL_CALCULATION: {
    decimals: 4,
    currency: '',
    useCommaSeparator: false,
    validateNegative: true
  } as CalculationOptions,

  /** Configuración para mostrar en UI */
  UI_DISPLAY: {
    decimals: 2,
    currency: '€',
    useCommaSeparator: true,
    validateNegative: false // Permitir mostrar negativos en UI
  } as CalculationOptions
} as const;

/**
 * Rangos de IVA comunes en España
 */
export const IVA_RATES = {
  SUPER_REDUCED: 4,    // IVA superreducido
  REDUCED: 10,         // IVA reducido
  STANDARD: 21         // IVA general
} as const;

/**
 * Límites de validación
 */
export const CALCULATION_LIMITS = {
  /** Cantidad máxima permitida */
  MAX_QUANTITY: 999999.99,

  /** PVP máximo permitido */
  MAX_PVP: 999999.99,

  /** Amount máximo calculado */
  MAX_AMOUNT: 999999999.99,

  /** Porcentaje de IVA máximo */
  MAX_IVA_PERCENTAGE: 100,

  /** Tolerancia para comparaciones decimales */
  DECIMAL_TOLERANCE: 0.01,

  /** Número máximo de items en un presupuesto */
  MAX_BUDGET_ITEMS: 10000
} as const;

/**
 * Mensajes de error para cálculos
 */
export const CALCULATION_ERRORS = {
  INVALID_QUANTITY: 'Cantidad inválida',
  INVALID_PVP: 'PVP inválido',
  NEGATIVE_QUANTITY: 'La cantidad no puede ser negativa',
  NEGATIVE_PVP: 'El PVP no puede ser negativo',
  QUANTITY_EXCEEDED: `La cantidad no puede superar ${CALCULATION_LIMITS.MAX_QUANTITY}`,
  PVP_EXCEEDED: `El PVP no puede superar ${CALCULATION_LIMITS.MAX_PVP}`,
  AMOUNT_EXCEEDED: `El importe no puede superar ${CALCULATION_LIMITS.MAX_AMOUNT}`,
  INVALID_IVA: 'Porcentaje de IVA inválido',
  IVA_EXCEEDED: `El IVA no puede superar ${CALCULATION_LIMITS.MAX_IVA_PERCENTAGE}%`,
  MISSING_DATA: 'Faltan datos para realizar el cálculo',
  CALCULATION_ERROR: 'Error en el cálculo',
  BUDGET_TOO_LARGE: `El presupuesto no puede tener más de ${CALCULATION_LIMITS.MAX_BUDGET_ITEMS} items`
} as const;

/**
 * Formatos de moneda
 */
export const CURRENCY_FORMATS = {
  EURO_ES: {
    symbol: '€',
    position: 'after', // después del número
    separator: ',',    // separador decimal
    thousands: '.'     // separador de miles
  },
  EURO_EN: {
    symbol: '€',
    position: 'after',
    separator: '.',
    thousands: ','
  },
  DOLLAR: {
    symbol: '$',
    position: 'before',
    separator: '.',
    thousands: ','
  }
} as const;

/**
 * Configuraciones de redondeo
 */
export const ROUNDING_MODES = {
  /** Redondeo matemático estándar */
  STANDARD: 'round',

  /** Redondeo hacia arriba */
  UP: 'ceil',

  /** Redondeo hacia abajo */
  DOWN: 'floor'
} as const;

/**
 * Patrones regex para validación
 */
export const VALIDATION_PATTERNS = {
  /** Número decimal positivo */
  POSITIVE_DECIMAL: /^\d+([.,]\d{1,2})?$/,

  /** Número decimal (incluye negativos) */
  DECIMAL: /^-?\d+([.,]\d{1,2})?$/,

  /** Porcentaje (0-100) */
  PERCENTAGE: /^(100|[0-9]{1,2})([.,]\d{1,2})?$/,

  /** Moneda europea */
  EURO_AMOUNT: /^\d{1,3}(\.\d{3})*,\d{2}\s€$/
} as const;

/**
 * Códigos de nivel de presupuesto
 */
export const BUDGET_LEVELS = {
  CHAPTER: 'chapter',
  SUBCHAPTER: 'subchapter',
  SECTION: 'section',
  ITEM: 'item'
} as const;

/**
 * Prioridades de cálculo (orden de ejecución)
 */
export const CALCULATION_PRIORITIES = {
  ITEM_AMOUNTS: 1,      // Primero calcular amounts de items
  PROPAGATION: 2,       // Luego propagar a contenedores
  IVA_GROUPING: 3,      // Después agrupar IVA
  FINAL_TOTALS: 4       // Finalmente calcular totales
} as const;

/**
 * Configuraciones de performance
 */
export const PERFORMANCE_CONFIG = {
  /** Tamaño de lote para procesamiento */
  BATCH_SIZE: 100,

  /** Timeout para cálculos (ms) */
  CALCULATION_TIMEOUT: 5000,

  /** Usar Web Workers para presupuestos grandes */
  USE_WEB_WORKERS_THRESHOLD: 1000
} as const;