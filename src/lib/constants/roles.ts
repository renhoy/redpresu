/**
 * Constantes para roles y permisos del sistema
 */

/**
 * Roles de usuario
 */
export const USER_ROLES = {
  SUPERADMIN: "superadmin",
  ADMIN: "admin",
  VENDOR: "vendedor",
} as const;

/**
 * Tipo para roles de usuario
 */
export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

/**
 * Permisos del sistema
 */
export const PERMISSIONS = {
  // Permisos de tarifas
  TARIFFS_READ: "tariffs:read",
  TARIFFS_WRITE: "tariffs:write",
  TARIFFS_DELETE: "tariffs:delete",
  TARIFFS_IMPORT: "tariffs:import",
  TARIFFS_EXPORT: "tariffs:export",

  // Permisos de presupuestos
  BUDGETS_READ: "budgets:read",
  BUDGETS_WRITE: "budgets:write",
  BUDGETS_DELETE: "budgets:delete",
  BUDGETS_SEND: "budgets:send",
  BUDGETS_APPROVE: "budgets:approve",
  BUDGETS_EXPORT_PDF: "budgets:export:pdf",

  // Permisos de clientes
  CLIENTS_READ: "clients:read",
  CLIENTS_WRITE: "clients:write",
  CLIENTS_DELETE: "clients:delete",

  // Permisos de usuarios
  USERS_READ: "users:read",
  USERS_WRITE: "users:write",
  USERS_DELETE: "users:delete",
  USERS_INVITE: "users:invite",

  // Permisos de empresa
  COMPANY_READ: "company:read",
  COMPANY_WRITE: "company:write",
  COMPANY_SETTINGS: "company:settings",

  // Permisos de sistema
  SYSTEM_SETTINGS: "system:settings",
  SYSTEM_LOGS: "system:logs",
  SYSTEM_BACKUP: "system:backup",

  // Permisos especiales
  ALL: "all",
} as const;

/**
 * Tipo para permisos
 */
export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/**
 * Permisos por rol
 */
export const ROLE_PERMISSIONS = {
  superadmin: [PERMISSIONS.ALL],
  admin: [
    // Tarifas
    PERMISSIONS.TARIFFS_READ,
    PERMISSIONS.TARIFFS_WRITE,
    PERMISSIONS.TARIFFS_DELETE,
    PERMISSIONS.TARIFFS_IMPORT,
    PERMISSIONS.TARIFFS_EXPORT,

    // Presupuestos
    PERMISSIONS.BUDGETS_READ,
    PERMISSIONS.BUDGETS_WRITE,
    PERMISSIONS.BUDGETS_DELETE,
    PERMISSIONS.BUDGETS_SEND,
    PERMISSIONS.BUDGETS_APPROVE,
    PERMISSIONS.BUDGETS_EXPORT_PDF,

    // Clientes
    PERMISSIONS.CLIENTS_READ,
    PERMISSIONS.CLIENTS_WRITE,
    PERMISSIONS.CLIENTS_DELETE,

    // Usuarios
    PERMISSIONS.USERS_READ,
    PERMISSIONS.USERS_WRITE,
    PERMISSIONS.USERS_INVITE,

    // Empresa
    PERMISSIONS.COMPANY_READ,
    PERMISSIONS.COMPANY_WRITE,
    PERMISSIONS.COMPANY_SETTINGS,
  ],
  vendedor: [
    // Tarifas (solo lectura)
    PERMISSIONS.TARIFFS_READ,

    // Presupuestos
    PERMISSIONS.BUDGETS_READ,
    PERMISSIONS.BUDGETS_WRITE,
    PERMISSIONS.BUDGETS_SEND,
    PERMISSIONS.BUDGETS_EXPORT_PDF,

    // Clientes
    PERMISSIONS.CLIENTS_READ,
    PERMISSIONS.CLIENTS_WRITE,

    // Empresa (solo lectura)
    PERMISSIONS.COMPANY_READ,
  ],
} as const;

/**
 * Nombres de visualización para roles
 */
export const ROLE_DISPLAY_NAMES = {
  superadmin: "Super Administrador",
  admin: "Administrador",
  vendedor: "Comercial",
} as const;

/**
 * Descripciones de roles
 */
export const ROLE_DESCRIPTIONS = {
  superadmin: "Acceso completo a todo el sistema",
  admin: "Gestión completa de la empresa y usuarios",
  vendedor: "Creación y gestión de presupuestos",
} as const;

/**
 * Jerarquía de roles (orden de importancia)
 */
export const ROLE_HIERARCHY = {
  superadmin: 3,
  admin: 2,
  vendedor: 1,
} as const;

/**
 * Tipos de cliente
 */
export const CLIENT_TYPES = {
  INDIVIDUAL: "particular",
  SELF_EMPLOYED: "autonomo",
  COMPANY: "empresa",
} as const;

/**
 * Tipo para tipos de cliente
 */
export type ClientType = (typeof CLIENT_TYPES)[keyof typeof CLIENT_TYPES];

/**
 * Nombres de visualización para tipos de cliente
 */
export const CLIENT_TYPE_DISPLAY_NAMES = {
  particular: "Particular",
  autonomo: "Autónomo",
  empresa: "Empresa",
} as const;

/**
 * Configuración de campos requeridos por tipo de cliente
 */
export const CLIENT_TYPE_REQUIRED_FIELDS = {
  particular: ["name", "email", "phone"],
  autonomo: ["name", "email", "phone", "tax_id"],
  empresa: ["name", "email", "phone", "tax_id", "company_name"],
} as const;

/**
 * Permisos de módulos
 */
export const MODULE_PERMISSIONS = {
  // Módulo Dashboard
  DASHBOARD_VIEW: "dashboard:view",
  DASHBOARD_STATS: "dashboard:stats",

  // Módulo Tarifas
  TARIFFS_MODULE: "tariffs:module",

  // Módulo Presupuestos
  BUDGETS_MODULE: "budgets:module",

  // Módulo Clientes
  CLIENTS_MODULE: "clients:module",

  // Módulo Usuarios
  USERS_MODULE: "users:module",

  // Módulo Configuración
  SETTINGS_MODULE: "settings:module",
} as const;

/**
 * Acceso a módulos por rol
 */
export const ROLE_MODULE_ACCESS = {
  superadmin: [
    MODULE_PERMISSIONS.DASHBOARD_VIEW,
    MODULE_PERMISSIONS.DASHBOARD_STATS,
    MODULE_PERMISSIONS.TARIFFS_MODULE,
    MODULE_PERMISSIONS.BUDGETS_MODULE,
    MODULE_PERMISSIONS.CLIENTS_MODULE,
    MODULE_PERMISSIONS.USERS_MODULE,
    MODULE_PERMISSIONS.SETTINGS_MODULE,
  ],
  admin: [
    MODULE_PERMISSIONS.DASHBOARD_VIEW,
    MODULE_PERMISSIONS.DASHBOARD_STATS,
    MODULE_PERMISSIONS.TARIFFS_MODULE,
    MODULE_PERMISSIONS.BUDGETS_MODULE,
    MODULE_PERMISSIONS.CLIENTS_MODULE,
    MODULE_PERMISSIONS.USERS_MODULE,
    MODULE_PERMISSIONS.SETTINGS_MODULE,
  ],
  vendedor: [
    MODULE_PERMISSIONS.DASHBOARD_VIEW,
    MODULE_PERMISSIONS.BUDGETS_MODULE,
    MODULE_PERMISSIONS.CLIENTS_MODULE,
  ],
} as const;

/**
 * Rutas protegidas por rol
 */
export const PROTECTED_ROUTES = {
  superadmin: ["/admin/*", "/system/*"],
  admin: ["/admin/*", "/users/*", "/settings/*"],
  vendedor: ["/budgets/*", "/clients/*"],
} as const;

/**
 * Límites por rol
 */
export const ROLE_LIMITS = {
  superadmin: {
    maxCompanies: Infinity,
    maxUsers: Infinity,
    maxBudgets: Infinity,
    maxClients: Infinity,
  },
  admin: {
    maxCompanies: 1,
    maxUsers: 50,
    maxBudgets: Infinity,
    maxClients: 200,
  },
  vendedor: {
    maxCompanies: 1,
    maxUsers: 1,
    maxBudgets: 100,
    maxClients: 50,
  },
} as const;

/**
 * Configuración de sesiones por rol
 */
export const ROLE_SESSION_CONFIG = {
  superadmin: {
    maxSessions: 5,
    sessionTimeout: 24 * 60 * 60 * 1000, // 24 horas
    requireMFA: true,
  },
  admin: {
    maxSessions: 3,
    sessionTimeout: 8 * 60 * 60 * 1000, // 8 horas
    requireMFA: false,
  },
  vendedor: {
    maxSessions: 2,
    sessionTimeout: 4 * 60 * 60 * 1000, // 4 horas
    requireMFA: false,
  },
} as const;
