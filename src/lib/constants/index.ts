/**
 * Índice central de todas las constantes del sistema
 */

import { getAppUrlSync } from '@/lib/helpers/url-helpers'

// Re-exportar constantes de niveles
export {
  LEVELS,
  LEVEL_TRANSLATIONS,
  LEVEL_TRANSLATIONS_REVERSE,
  LEVEL_DISPLAY_NAMES,
  LEVEL_DISPLAY_NAMES_PLURAL,
  LEVEL_HIERARCHY,
  LEVEL_TO_DEPTH,
  DEPTH_TO_LEVEL,
  CONTAINER_LEVELS,
  LEAF_LEVELS,
  LEVEL_VALIDATION_CONFIG,
  LEVEL_ICONS,
  LEVEL_COLORS,
  LEVEL_ID_PREFIXES,
  LEVEL_LIMITS,
  type BudgetLevel,
} from "./levels";

// Re-exportar constantes de estados
export {
  BUDGET_STATUSES,
  STATUS_TRANSITIONS,
  STATUS_DISPLAY_NAMES,
  STATUS_DESCRIPTIONS,
  STATUS_COLORS,
  STATUS_ICONS,
  EDITABLE_STATUSES,
  FINAL_STATUSES,
  TARIFF_STATUSES,
  CSV_STATUSES,
  USER_STATUSES,
  CLIENT_STATUSES,
  PRIORITIES,
  PRIORITY_COLORS,
  SYNC_STATUSES,
  STATUS_TIMEOUTS,
  STATUS_VALIDATION_RULES,
  type BudgetStatus,
  type TariffStatus,
  type CSVStatus,
  type UserStatus,
  type ClientStatus,
  type Priority,
  type SyncStatus,
} from "./statuses";

// Re-exportar constantes de roles
export {
  USER_ROLES,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  ROLE_DISPLAY_NAMES,
  ROLE_DESCRIPTIONS,
  ROLE_HIERARCHY,
  CLIENT_TYPES,
  CLIENT_TYPE_DISPLAY_NAMES,
  CLIENT_TYPE_REQUIRED_FIELDS,
  MODULE_PERMISSIONS,
  ROLE_MODULE_ACCESS,
  PROTECTED_ROUTES,
  ROLE_LIMITS,
  ROLE_SESSION_CONFIG,
  type UserRole,
  type Permission,
  type ClientType,
} from "./roles";

// Re-exportar mensajes
export {
  CSV_ERROR_MESSAGES,
  HIERARCHY_ERROR_MESSAGES,
  VALIDATION_ERROR_MESSAGES,
  AUTH_ERROR_MESSAGES,
  BUDGET_ERROR_MESSAGES,
  CLIENT_ERROR_MESSAGES,
  USER_ERROR_MESSAGES,
  TARIFF_ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  INFO_MESSAGES,
  WARNING_MESSAGES,
  STATUS_MESSAGES,
  CONFIG_MESSAGES,
  DEFAULT_CONFIG,
} from "./messages";

// Re-exportar constantes de CSV (ya existentes)
export {
  ERROR_CODES,
  SEVERITY,
  LEVEL_MAP,
  REQUIRED_FIELDS,
  CSV_DELIMITERS,
} from "./csv";

// Re-exportar constantes de cálculos (ya existentes)
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
  PERFORMANCE_CONFIG,
} from "./calculations";

/**
 * Constantes globales del sistema
 *
 * NOTA: El nombre de la aplicación (APP_NAME) se obtiene dinámicamente desde la BD.
 * - Server Components: usar `await getAppName()` desde @/lib/helpers/config-helpers
 * - Client Components: usar `useAppName()` hook desde @/hooks/useAppName
 * - El valor por defecto si no está configurado en BD es 'Redpresu'
 */
export const SYSTEM_CONSTANTS = {
  // Identificadores
  // APP_NAME: Deprecado - Usar getAppName() o useAppName() en su lugar
  APP_VERSION: "1.0.0",
  API_VERSION: "v1",

  // Configuración de la aplicación
  DEFAULT_LOCALE: "es",
  SUPPORTED_LOCALES: ["es", "en"] as const,
  DEFAULT_CURRENCY: "EUR",
  DEFAULT_TIMEZONE: "Europe/Madrid",

  // Límites del sistema
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_FILENAME_LENGTH: 255,
  MAX_DESCRIPTION_LENGTH: 1000,
  MAX_NAME_LENGTH: 100,

  // Timeouts
  API_TIMEOUT: 30000, // 30 segundos
  FILE_UPLOAD_TIMEOUT: 120000, // 2 minutos
  PDF_GENERATION_TIMEOUT: 60000, // 1 minuto

  // Paginación
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,

  // Validación
  MIN_PASSWORD_LENGTH: 8,
  MAX_PASSWORD_LENGTH: 128,
  PASSWORD_REGEX:
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,

  // Formatos de fecha
  DATE_FORMAT: "DD-MM-YYYY",
  DATETIME_FORMAT: "DD-MM-YYYY HH:mm",
  TIME_FORMAT: "HH:mm",

  // URLs de la aplicación
  // DEPRECADO: Usar getAppUrl() en Server Components/Actions
  BASE_URL: getAppUrlSync(),
  API_BASE_URL: process.env.NEXT_PUBLIC_API_URL || "/api",

  // Rutas
  ROUTES: {
    HOME: "/",
    LOGIN: "/login",
    REGISTER: "/register",
    DASHBOARD: "/dashboard",
    BUDGETS: "/budgets",
    CLIENTS: "/clients",
    TARIFFS: "/tariffs",
    SETTINGS: "/settings",
    // PROFILE: "/profile", // DEPRECADO: Ahora se usa /users/[id]/edit
  },
} as const;

/**
 * Configuración de la UI
 */
export const UI_CONSTANTS = {
  // Breakpoints (Tailwind CSS)
  BREAKPOINTS: {
    SM: 640,
    MD: 768,
    LG: 1024,
    XL: 1280,
    "2XL": 1536,
  },

  // Z-index layers
  Z_INDEX: {
    DROPDOWN: 1000,
    STICKY: 1020,
    FIXED: 1030,
    MODAL_BACKDROP: 1040,
    MODAL: 1050,
    POPOVER: 1060,
    TOOLTIP: 1070,
    TOAST: 1080,
  },

  // Animaciones
  ANIMATION_DURATION: {
    FAST: 150,
    NORMAL: 300,
    SLOW: 500,
  },

  // Tamaños de componentes
  COMPONENT_SIZES: {
    XS: "xs",
    SM: "sm",
    MD: "md",
    LG: "lg",
    XL: "xl",
  },

  // Variantes de color
  COLOR_VARIANTS: {
    PRIMARY: "primary",
    SECONDARY: "secondary",
    SUCCESS: "success",
    WARNING: "warning",
    ERROR: "error",
    INFO: "info",
  },
} as const;

/**
 * Configuración de almacenamiento
 */
export const STORAGE_KEYS = {
  // localStorage keys
  USER_PREFERENCES: "user_preferences",
  THEME: "theme",
  LANGUAGE: "language",
  SIDEBAR_STATE: "sidebar_state",
  TABLE_PREFERENCES: "table_preferences",

  // sessionStorage keys
  FORM_DRAFTS: "form_drafts",
  NAVIGATION_STATE: "navigation_state",
  TEMP_DATA: "temp_data",
} as const;

/**
 * Configuración de eventos del sistema
 */
export const SYSTEM_EVENTS = {
  // Eventos de usuario
  USER_LOGIN: "user:login",
  USER_LOGOUT: "user:logout",
  USER_REGISTER: "user:register",

  // Eventos de presupuestos
  BUDGET_CREATED: "budget:created",
  BUDGET_UPDATED: "budget:updated",
  BUDGET_SENT: "budget:sent",
  BUDGET_APPROVED: "budget:approved",
  BUDGET_REJECTED: "budget:rejected",

  // Eventos de sistema
  FILE_UPLOADED: "file:uploaded",
  PDF_GENERATED: "pdf:generated",
  ERROR_OCCURRED: "error:occurred",
} as const;
