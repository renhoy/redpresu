/**
 * Constantes para estados del sistema
 */

/**
 * Estados de presupuestos
 */
export const BUDGET_STATUSES = {
  DRAFT: 'borrador',
  PENDING: 'pendiente',
  SENT: 'enviado',
  APPROVED: 'aprobado',
  REJECTED: 'rechazado',
  EXPIRED: 'caducado'
} as const;

/**
 * Tipo para estados de presupuesto
 */
export type BudgetStatus = typeof BUDGET_STATUSES[keyof typeof BUDGET_STATUSES];

/**
 * Transiciones permitidas entre estados
 */
export const STATUS_TRANSITIONS = {
  borrador: ['pendiente'],
  pendiente: ['enviado'],
  enviado: ['aprobado', 'rechazado', 'caducado'],
  aprobado: ['caducado'],
  rechazado: ['borrador'],
  caducado: ['borrador']
} as const;

/**
 * Nombres de visualización para estados
 */
export const STATUS_DISPLAY_NAMES = {
  borrador: 'Borrador',
  pendiente: 'Pendiente',
  enviado: 'Enviado',
  aprobado: 'Aprobado',
  rechazado: 'Rechazado',
  caducado: 'Caducado'
} as const;

/**
 * Descripciones de estados
 */
export const STATUS_DESCRIPTIONS = {
  borrador: 'Presupuesto en elaboración',
  pendiente: 'Presupuesto listo para enviar',
  enviado: 'Presupuesto enviado al cliente',
  aprobado: 'Presupuesto aprobado por el cliente',
  rechazado: 'Presupuesto rechazado por el cliente',
  caducado: 'Presupuesto vencido'
} as const;

/**
 * Colores para estados (UI)
 */
export const STATUS_COLORS = {
  borrador: '#6b7280',   // gray-500
  pendiente: '#f59e0b',  // amber-500
  enviado: '#3b82f6',    // blue-500
  aprobado: '#10b981',   // emerald-500
  rechazado: '#ef4444',  // red-500
  caducado: '#8b5cf6'    // violet-500
} as const;

/**
 * Iconos para estados
 */
export const STATUS_ICONS = {
  borrador: '📝',
  pendiente: '⏳',
  enviado: '📤',
  aprobado: '✅',
  rechazado: '❌',
  caducado: '⏰'
} as const;

/**
 * Estados que permiten edición
 */
export const EDITABLE_STATUSES = [
  BUDGET_STATUSES.DRAFT,
  BUDGET_STATUSES.PENDING
] as const;

/**
 * Estados finales (no permiten transición)
 */
export const FINAL_STATUSES = [
  BUDGET_STATUSES.APPROVED,
  BUDGET_STATUSES.EXPIRED
] as const;

/**
 * Estados de tarifas
 */
export const TARIFF_STATUSES = {
  ACTIVE: 'activo',
  INACTIVE: 'inactivo',
  ARCHIVED: 'archivado'
} as const;

/**
 * Tipo para estados de tarifa
 */
export type TariffStatus = typeof TARIFF_STATUSES[keyof typeof TARIFF_STATUSES];

/**
 * Estados de archivos CSV
 */
export const CSV_STATUSES = {
  PENDING: 'pendiente',
  PROCESSING: 'procesando',
  COMPLETED: 'completado',
  ERROR: 'error'
} as const;

/**
 * Tipo para estados de CSV
 */
export type CSVStatus = typeof CSV_STATUSES[keyof typeof CSV_STATUSES];

/**
 * Estados de usuarios
 */
export const USER_STATUSES = {
  ACTIVE: 'activo',
  INACTIVE: 'inactivo',
  SUSPENDED: 'suspendido',
  PENDING_VERIFICATION: 'pendiente_verificacion'
} as const;

/**
 * Tipo para estados de usuario
 */
export type UserStatus = typeof USER_STATUSES[keyof typeof USER_STATUSES];

/**
 * Estados de clientes
 */
export const CLIENT_STATUSES = {
  ACTIVE: 'activo',
  INACTIVE: 'inactivo',
  PROSPECT: 'prospecto',
  BLOCKED: 'bloqueado'
} as const;

/**
 * Tipo para estados de cliente
 */
export type ClientStatus = typeof CLIENT_STATUSES[keyof typeof CLIENT_STATUSES];

/**
 * Prioridades
 */
export const PRIORITIES = {
  LOW: 'baja',
  MEDIUM: 'media',
  HIGH: 'alta',
  URGENT: 'urgente'
} as const;

/**
 * Tipo para prioridades
 */
export type Priority = typeof PRIORITIES[keyof typeof PRIORITIES];

/**
 * Colores para prioridades
 */
export const PRIORITY_COLORS = {
  baja: '#10b981',    // emerald-500
  media: '#f59e0b',   // amber-500
  alta: '#f97316',    // orange-500
  urgente: '#ef4444'  // red-500
} as const;

/**
 * Estados de sincronización
 */
export const SYNC_STATUSES = {
  IDLE: 'inactivo',
  SYNCING: 'sincronizando',
  SUCCESS: 'exitoso',
  ERROR: 'error',
  CONFLICT: 'conflicto'
} as const;

/**
 * Tipo para estados de sincronización
 */
export type SyncStatus = typeof SYNC_STATUSES[keyof typeof SYNC_STATUSES];

/**
 * Configuración de timeouts por estado
 */
export const STATUS_TIMEOUTS = {
  /** Tiempo para que un presupuesto pendiente expire (días) */
  PENDING_TIMEOUT_DAYS: 7,
  /** Tiempo para que un presupuesto enviado expire (días) */
  SENT_TIMEOUT_DAYS: 30,
  /** Tiempo para mantener presupuestos rechazados (días) */
  REJECTED_RETENTION_DAYS: 90,
  /** Tiempo para archivar presupuestos caducados (días) */
  EXPIRED_ARCHIVE_DAYS: 365
} as const;

/**
 * Validaciones de transición de estado
 */
export const STATUS_VALIDATION_RULES = {
  borrador: {
    canEdit: true,
    canDelete: true,
    canSend: true,
    requiredFields: ['name', 'client_id']
  },
  pendiente: {
    canEdit: true,
    canDelete: true,
    canSend: true,
    requiredFields: ['name', 'client_id', 'items']
  },
  enviado: {
    canEdit: false,
    canDelete: false,
    canSend: false,
    requiredFields: ['name', 'client_id', 'items', 'sent_date']
  },
  aprobado: {
    canEdit: false,
    canDelete: false,
    canSend: false,
    requiredFields: ['name', 'client_id', 'items', 'sent_date', 'approved_date']
  },
  rechazado: {
    canEdit: false,
    canDelete: false,
    canSend: false,
    requiredFields: ['name', 'client_id', 'items', 'sent_date', 'rejected_date']
  },
  caducado: {
    canEdit: false,
    canDelete: false,
    canSend: false,
    requiredFields: ['name', 'client_id', 'items', 'sent_date', 'expired_date']
  }
} as const;