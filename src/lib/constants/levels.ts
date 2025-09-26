/**
 * Constantes para niveles jerárquicos del presupuesto
 */

/**
 * Niveles jerárquicos del presupuesto
 */
export const LEVELS = {
  CHAPTER: 'chapter',
  SUBCHAPTER: 'subchapter',
  SECTION: 'section',
  ITEM: 'item'
} as const;

/**
 * Tipo para niveles jerárquicos
 */
export type BudgetLevel = typeof LEVELS[keyof typeof LEVELS];

/**
 * Traducciones de niveles del español al inglés
 */
export const LEVEL_TRANSLATIONS = {
  'capitulo': 'chapter',
  'subcapitulo': 'subchapter',
  'apartado': 'section',
  'partida': 'item'
} as const;

/**
 * Traducciones inversas del inglés al español
 */
export const LEVEL_TRANSLATIONS_REVERSE = {
  'chapter': 'capitulo',
  'subchapter': 'subcapitulo',
  'section': 'apartado',
  'item': 'partida'
} as const;

/**
 * Nombres de visualización para niveles (singular)
 */
export const LEVEL_DISPLAY_NAMES = {
  chapter: 'Capítulo',
  subchapter: 'Subcapítulo',
  section: 'Apartado',
  item: 'Partida'
} as const;

/**
 * Nombres de visualización para niveles (plural)
 */
export const LEVEL_DISPLAY_NAMES_PLURAL = {
  chapter: 'Capítulos',
  subchapter: 'Subcapítulos',
  section: 'Apartados',
  item: 'Partidas'
} as const;

/**
 * Configuración de jerarquía de niveles
 */
export const LEVEL_HIERARCHY = {
  /** Nivel raíz */
  ROOT: 0,
  /** Capítulo (1) */
  CHAPTER: 1,
  /** Subcapítulo (1.1) */
  SUBCHAPTER: 2,
  /** Apartado (1.1.1) */
  SECTION: 3,
  /** Partida (1.1.1.1) */
  ITEM: 4
} as const;

/**
 * Mapeo de nivel a profundidad jerárquica
 */
export const LEVEL_TO_DEPTH = {
  chapter: LEVEL_HIERARCHY.CHAPTER,
  subchapter: LEVEL_HIERARCHY.SUBCHAPTER,
  section: LEVEL_HIERARCHY.SECTION,
  item: LEVEL_HIERARCHY.ITEM
} as const;

/**
 * Mapeo de profundidad a nivel
 */
export const DEPTH_TO_LEVEL = {
  [LEVEL_HIERARCHY.CHAPTER]: 'chapter',
  [LEVEL_HIERARCHY.SUBCHAPTER]: 'subchapter',
  [LEVEL_HIERARCHY.SECTION]: 'section',
  [LEVEL_HIERARCHY.ITEM]: 'item'
} as const;

/**
 * Niveles que pueden contener hijos
 */
export const CONTAINER_LEVELS = [
  LEVELS.CHAPTER,
  LEVELS.SUBCHAPTER,
  LEVELS.SECTION
] as const;

/**
 * Niveles que no pueden contener hijos (hojas)
 */
export const LEAF_LEVELS = [
  LEVELS.ITEM
] as const;

/**
 * Configuración de validación por nivel
 */
export const LEVEL_VALIDATION_CONFIG = {
  chapter: {
    requiredFields: ['id', 'name'],
    optionalFields: ['description'],
    maxDepth: 1,
    canHaveChildren: true,
    parentLevels: []
  },
  subchapter: {
    requiredFields: ['id', 'name'],
    optionalFields: ['description'],
    maxDepth: 2,
    canHaveChildren: true,
    parentLevels: ['chapter']
  },
  section: {
    requiredFields: ['id', 'name'],
    optionalFields: ['description'],
    maxDepth: 3,
    canHaveChildren: true,
    parentLevels: ['subchapter']
  },
  item: {
    requiredFields: ['id', 'name', 'unit', 'iva_percentage', 'pvp'],
    optionalFields: ['description', 'quantity'],
    maxDepth: 4,
    canHaveChildren: false,
    parentLevels: ['chapter', 'subchapter', 'section']
  }
} as const;

/**
 * Iconos para cada nivel (para UI)
 */
export const LEVEL_ICONS = {
  chapter: '📁',
  subchapter: '📂',
  section: '📄',
  item: '📋'
} as const;

/**
 * Colores para cada nivel (para UI)
 */
export const LEVEL_COLORS = {
  chapter: '#1f2937',    // gray-800
  subchapter: '#374151', // gray-700
  section: '#4b5563',    // gray-600
  item: '#6b7280'        // gray-500
} as const;

/**
 * Prefijos para IDs según nivel
 */
export const LEVEL_ID_PREFIXES = {
  chapter: '',     // 1
  subchapter: '',  // 1.1
  section: '',     // 1.1.1
  item: ''         // 1.1.1.1
} as const;

/**
 * Límites por nivel
 */
export const LEVEL_LIMITS = {
  /** Máximo número de capítulos */
  MAX_CHAPTERS: 99,
  /** Máximo número de subcapítulos por capítulo */
  MAX_SUBCHAPTERS_PER_CHAPTER: 99,
  /** Máximo número de apartados por subcapítulo */
  MAX_SECTIONS_PER_SUBCHAPTER: 99,
  /** Máximo número de partidas por apartado */
  MAX_ITEMS_PER_SECTION: 999,
  /** Profundidad máxima de jerarquía */
  MAX_HIERARCHY_DEPTH: 4
} as const;