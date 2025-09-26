/**
 * Mensajes de error y notificaciones del sistema
 */

/**
 * Mensajes de error de CSV
 */
export const CSV_ERROR_MESSAGES = {
  INVALID_STRUCTURE: 'Estructura CSV inválida',
  MISSING_COLUMNS: 'Faltan columnas obligatorias',
  EMPTY_FILE: 'El archivo CSV está vacío',
  INVALID_ENCODING: 'Codificación de archivo no válida',
  FILE_TOO_LARGE: 'El archivo es demasiado grande',
  INVALID_FORMAT: 'Formato de archivo no válido',
  PARSE_ERROR: 'Error al procesar el archivo CSV',
  INVALID_DELIMITER: 'Delimitador CSV no reconocido',
  MALFORMED_HEADERS: 'Cabeceras del CSV malformadas',
  INVALID_DATA_TYPE: 'Tipo de dato inválido en el CSV'
} as const;

/**
 * Mensajes de error de jerarquía
 */
export const HIERARCHY_ERROR_MESSAGES = {
  INVALID_HIERARCHY: 'Jerarquía inválida',
  DUPLICATE_ID: 'ID duplicado encontrado',
  MISSING_PARENT: 'Falta el elemento padre',
  INVALID_DEPTH: 'Profundidad de jerarquía inválida',
  INVALID_SEQUENCE: 'Secuencia numérica incorrecta',
  ORPHANED_ITEM: 'Elemento huérfano detectado',
  CIRCULAR_REFERENCE: 'Referencia circular detectada',
  MAX_DEPTH_EXCEEDED: 'Profundidad máxima excedida',
  INVALID_LEVEL_TRANSITION: 'Transición de nivel inválida',
  EMPTY_CONTAINER: 'Contenedor sin elementos'
} as const;

/**
 * Mensajes de error de validación
 */
export const VALIDATION_ERROR_MESSAGES = {
  REQUIRED_FIELD: 'Campo obligatorio',
  INVALID_EMAIL: 'Email inválido',
  INVALID_PHONE: 'Teléfono inválido',
  INVALID_TAX_ID: 'NIF/CIF inválido',
  INVALID_NUMBER: 'Número inválido',
  INVALID_DATE: 'Fecha inválida',
  INVALID_RANGE: 'Valor fuera de rango',
  INVALID_LENGTH: 'Longitud inválida',
  INVALID_FORMAT: 'Formato inválido',
  INVALID_CHARACTER: 'Carácter no permitido',
  DUPLICATE_VALUE: 'Valor duplicado',
  NEGATIVE_VALUE: 'Valor negativo no permitido',
  ZERO_VALUE: 'Valor cero no permitido',
  DECIMAL_PLACES: 'Número de decimales inválido',
  MIN_VALUE: 'Valor menor al mínimo permitido',
  MAX_VALUE: 'Valor mayor al máximo permitido'
} as const;

/**
 * Mensajes de error de autenticación
 */
export const AUTH_ERROR_MESSAGES = {
  INVALID_CREDENTIALS: 'Credenciales inválidas',
  USER_NOT_FOUND: 'Usuario no encontrado',
  EMAIL_NOT_VERIFIED: 'Email no verificado',
  ACCOUNT_DISABLED: 'Cuenta deshabilitada',
  ACCOUNT_LOCKED: 'Cuenta bloqueada',
  SESSION_EXPIRED: 'Sesión expirada',
  INSUFFICIENT_PERMISSIONS: 'Permisos insuficientes',
  PASSWORD_TOO_WEAK: 'Contraseña demasiado débil',
  PASSWORD_EXPIRED: 'Contraseña expirada',
  TOO_MANY_ATTEMPTS: 'Demasiados intentos fallidos',
  MFA_REQUIRED: 'Autenticación de dos factores requerida',
  INVALID_TOKEN: 'Token inválido'
} as const;

/**
 * Mensajes de error de presupuestos
 */
export const BUDGET_ERROR_MESSAGES = {
  NOT_FOUND: 'Presupuesto no encontrado',
  ALREADY_SENT: 'Presupuesto ya enviado',
  ALREADY_APPROVED: 'Presupuesto ya aprobado',
  ALREADY_REJECTED: 'Presupuesto ya rechazado',
  EXPIRED: 'Presupuesto caducado',
  EMPTY_BUDGET: 'Presupuesto vacío',
  INVALID_STATUS: 'Estado inválido',
  CANNOT_EDIT: 'No se puede editar',
  CANNOT_DELETE: 'No se puede eliminar',
  CALCULATION_ERROR: 'Error en los cálculos',
  PDF_GENERATION_ERROR: 'Error al generar PDF',
  EMAIL_SEND_ERROR: 'Error al enviar email',
  INVALID_CLIENT: 'Cliente inválido',
  MISSING_ITEMS: 'Faltan partidas',
  INVALID_TOTAL: 'Total inválido'
} as const;

/**
 * Mensajes de error de clientes
 */
export const CLIENT_ERROR_MESSAGES = {
  NOT_FOUND: 'Cliente no encontrado',
  ALREADY_EXISTS: 'Cliente ya existe',
  INVALID_TYPE: 'Tipo de cliente inválido',
  MISSING_TAX_ID: 'NIF/CIF requerido',
  INVALID_TAX_ID: 'NIF/CIF inválido',
  HAS_ACTIVE_BUDGETS: 'Cliente con presupuestos activos',
  CANNOT_DELETE: 'No se puede eliminar',
  DUPLICATE_EMAIL: 'Email ya registrado',
  DUPLICATE_TAX_ID: 'NIF/CIF ya registrado'
} as const;

/**
 * Mensajes de error de usuarios
 */
export const USER_ERROR_MESSAGES = {
  NOT_FOUND: 'Usuario no encontrado',
  ALREADY_EXISTS: 'Usuario ya existe',
  INVALID_ROLE: 'Rol inválido',
  CANNOT_DELETE_SELF: 'No puedes eliminarte a ti mismo',
  CANNOT_CHANGE_OWN_ROLE: 'No puedes cambiar tu propio rol',
  LAST_ADMIN: 'No se puede eliminar el último administrador',
  INVITATION_EXPIRED: 'Invitación expirada',
  INVITATION_ALREADY_USED: 'Invitación ya utilizada',
  MAX_USERS_REACHED: 'Máximo de usuarios alcanzado'
} as const;

/**
 * Mensajes de error de tarifas
 */
export const TARIFF_ERROR_MESSAGES = {
  NOT_FOUND: 'Tarifa no encontrada',
  ALREADY_EXISTS: 'Tarifa ya existe',
  IN_USE: 'Tarifa en uso',
  CANNOT_DELETE: 'No se puede eliminar',
  INVALID_IMPORT: 'Importación inválida',
  IMPORT_FAILED: 'Error en la importación',
  NO_ITEMS: 'Tarifa sin partidas',
  INVALID_VERSION: 'Versión inválida'
} as const;

/**
 * Mensajes de éxito
 */
export const SUCCESS_MESSAGES = {
  // Operaciones generales
  SAVED: 'Guardado correctamente',
  DELETED: 'Eliminado correctamente',
  UPDATED: 'Actualizado correctamente',
  CREATED: 'Creado correctamente',
  IMPORTED: 'Importado correctamente',
  EXPORTED: 'Exportado correctamente',

  // CSV
  CSV_PROCESSED: 'CSV procesado correctamente',
  CSV_VALIDATED: 'CSV validado correctamente',

  // Presupuestos
  BUDGET_SENT: 'Presupuesto enviado correctamente',
  BUDGET_APPROVED: 'Presupuesto aprobado',
  BUDGET_REJECTED: 'Presupuesto rechazado',
  PDF_GENERATED: 'PDF generado correctamente',

  // Usuarios
  USER_INVITED: 'Usuario invitado correctamente',
  PASSWORD_CHANGED: 'Contraseña cambiada',
  PROFILE_UPDATED: 'Perfil actualizado',

  // Autenticación
  LOGIN_SUCCESS: 'Inicio de sesión exitoso',
  LOGOUT_SUCCESS: 'Sesión cerrada',
  EMAIL_VERIFIED: 'Email verificado'
} as const;

/**
 * Mensajes de información
 */
export const INFO_MESSAGES = {
  LOADING: 'Cargando...',
  PROCESSING: 'Procesando...',
  SAVING: 'Guardando...',
  DELETING: 'Eliminando...',
  SENDING: 'Enviando...',
  GENERATING_PDF: 'Generando PDF...',
  UPLOADING: 'Subiendo archivo...',
  VALIDATING: 'Validando...',
  NO_DATA: 'No hay datos',
  NO_RESULTS: 'No se encontraron resultados',
  EMPTY_STATE: 'Aún no hay elementos',
  SELECT_FILE: 'Selecciona un archivo',
  DRAG_DROP_FILE: 'Arrastra y suelta un archivo aquí',
  CONFIRMING: 'Confirmando...',
  SYNCHRONIZING: 'Sincronizando...'
} as const;

/**
 * Mensajes de advertencia
 */
export const WARNING_MESSAGES = {
  UNSAVED_CHANGES: 'Tienes cambios sin guardar',
  DELETE_CONFIRMATION: '¿Estás seguro de que quieres eliminar?',
  PERMANENT_ACTION: 'Esta acción no se puede deshacer',
  BUDGET_EXPIRED: 'El presupuesto ha caducado',
  LOW_STOCK: 'Stock bajo',
  APPROACHING_LIMIT: 'Te acercas al límite',
  OLD_VERSION: 'Estás usando una versión anterior',
  BROWSER_NOT_SUPPORTED: 'Navegador no soportado completamente',
  NETWORK_ISSUES: 'Problemas de conexión detectados',
  FILE_SIZE_WARNING: 'Archivo grande, puede tardar en procesarse'
} as const;

/**
 * Mensajes de estado
 */
export const STATUS_MESSAGES = {
  ONLINE: 'En línea',
  OFFLINE: 'Sin conexión',
  SYNCING: 'Sincronizando',
  SYNCED: 'Sincronizado',
  ERROR: 'Error',
  READY: 'Listo',
  CONNECTING: 'Conectando...',
  DISCONNECTED: 'Desconectado',
  RECONNECTING: 'Reconectando...',
  MAINTENANCE: 'En mantenimiento'
} as const;

/**
 * Mensajes de configuración específica
 */
export const CONFIG_MESSAGES = {
  DEFAULT_EMPRESA_ID: 'ID de empresa predeterminado',
  DEFAULT_VALIDITY_DAYS: 'Días de validez predeterminados',
  MAX_CLIENTS: 'Máximo número de clientes',
  PDF_TIMEOUT: 'Tiempo límite para generación de PDF',
  DEFAULT_IVA: 'IVA predeterminado',
  DECIMAL_PLACES: 'Lugares decimales'
} as const;

/**
 * Configuración por defecto del sistema
 */
export const DEFAULT_CONFIG = {
  EMPRESA_ID: 1,
  DEFAULT_VALIDITY_DAYS: 30,
  MAX_CLIENTS: 200,
  PDF_GENERATION_TIMEOUT: 60000,
  DEFAULT_IVA: '21.00',
  DECIMAL_PLACES: 2,
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  SUPPORTED_FILE_TYPES: ['.csv', '.xlsx', '.xls'],
  SESSION_TIMEOUT: 30 * 60 * 1000, // 30 minutos
  AUTO_SAVE_INTERVAL: 30 * 1000, // 30 segundos
  MAX_BUDGET_ITEMS: 1000,
  MAX_TARIFF_ITEMS: 10000
} as const;