/**
 * Códigos de error estructurados para validación CSV
 */
export const ERROR_CODES = {
  PARSE_ERROR: 'PARSE_ERROR',
  STRUCTURE_ERROR: 'STRUCTURE_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  HIERARCHY_ERROR: 'HIERARCHY_ERROR',
  DUPLICATE_ERROR: 'DUPLICATE_ERROR',
  SEQUENCE_ERROR: 'SEQUENCE_ERROR',
  RANGE_ERROR: 'RANGE_ERROR'
} as const;

/**
 * Niveles de severidad para errores
 */
export const SEVERITY = {
  FATAL: 'fatal',
  ERROR: 'error',
  WARNING: 'warning'
} as const;

/**
 * Mapeo de niveles en español a inglés
 */
export const LEVEL_MAP = {
  'capitulo': 'chapter',
  'subcapitulo': 'subchapter',
  'apartado': 'section',
  'partida': 'item'
} as const;

/**
 * Campos requeridos en CSV
 */
export const REQUIRED_FIELDS = {
  spanish: ['nivel', 'id', 'nombre', 'descripcion', 'ud', '%iva', 'pvp'],
  english: ['level', 'id', 'name', 'description', 'unit', 'iva_percentage', 'pvp']
} as const;

/**
 * Delimitadores CSV soportados
 */
export const CSV_DELIMITERS = [',', ';', '\t', '|'] as const;