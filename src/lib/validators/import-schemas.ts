/**
 * Schemas de validación Zod para imports de tarifas y presupuestos
 * VULN-008: Prevención de inyección y prototype pollution
 */

import { z } from 'zod'

// ============================================
// CONSTANTES DE SEGURIDAD
// ============================================

const MAX_STRING_LENGTH = 5000
const MAX_DESCRIPTION_LENGTH = 10000
const MAX_ARRAY_LENGTH = 1000
const MAX_NESTED_DEPTH = 10

// ============================================
// SCHEMAS PRIMITIVOS SEGUROS
// ============================================

/**
 * String seguro: limita longitud y previene inyección
 */
const SafeString = z.string()
  .max(MAX_STRING_LENGTH, 'Texto demasiado largo')
  .transform((val) => val.trim())

/**
 * String opcional seguro
 */
const SafeStringOptional = z.string()
  .max(MAX_STRING_LENGTH, 'Texto demasiado largo')
  .transform((val) => val.trim())
  .nullable()
  .optional()

/**
 * Descripción larga (permite más caracteres)
 */
const SafeDescription = z.string()
  .max(MAX_DESCRIPTION_LENGTH, 'Descripción demasiado larga')
  .transform((val) => val.trim())
  .nullable()
  .optional()

/**
 * Número positivo seguro
 */
const SafePositiveNumber = z.number()
  .nonnegative('Debe ser un número no negativo')
  .finite('Debe ser un número finito')

/**
 * Precio/Importe seguro (máximo 1 millón)
 */
const SafePrice = z.number()
  .nonnegative('El precio debe ser positivo')
  .max(1_000_000, 'Precio demasiado alto')
  .finite('Debe ser un número finito')

/**
 * Porcentaje seguro (0-100)
 */
const SafePercentage = z.number()
  .min(0, 'Porcentaje mínimo: 0')
  .max(100, 'Porcentaje máximo: 100')
  .finite('Debe ser un número finito')

/**
 * UUID v4 seguro
 */
const SafeUUID = z.string()
  .uuid('UUID inválido')

/**
 * Color hexadecimal seguro
 */
const SafeHexColor = z.string()
  .regex(/^#[0-9A-Fa-f]{6}$/, 'Color hexadecimal inválido')
  .default('#000000')

/**
 * Email seguro
 */
const SafeEmail = z.string()
  .email('Email inválido')
  .max(255, 'Email demasiado largo')
  .nullable()
  .optional()

/**
 * URL segura
 */
const SafeURL = z.string()
  .url('URL inválida')
  .max(2048, 'URL demasiado larga')
  .nullable()
  .optional()

// ============================================
// SCHEMAS DE DATOS JERÁRQUICOS (TARIFAS)
// ============================================

/**
 * Item de tarifa (nivel más bajo)
 */
const TariffItemSchema = z.object({
  id: SafeUUID,
  name: SafeString,
  unit: SafeString,
  amount: SafePrice,
  description: SafeDescription,
  level: z.number().int().min(1).max(MAX_NESTED_DEPTH),
  iva: SafePercentage.optional(),
}).strict() // No permitir campos extra

/**
 * Categoría de tarifa (contiene items)
 * Prevención: limitar array length para evitar DoS
 */
const TariffCategorySchema = z.object({
  id: SafeUUID,
  name: SafeString,
  children: z.array(TariffItemSchema)
    .max(MAX_ARRAY_LENGTH, 'Demasiados items en categoría'),
  level: z.number().int().min(1).max(MAX_NESTED_DEPTH),
}).strict()

/**
 * Datos JSON de tarifa (recursivo)
 */
const TariffDataSchema: z.ZodType<any> = z.lazy(() =>
  z.array(
    z.object({
      id: SafeUUID,
      name: SafeString,
      amount: SafePrice.optional(),
      unit: SafeString.optional(),
      description: SafeDescription,
      level: z.number().int().min(1).max(MAX_NESTED_DEPTH),
      iva: SafePercentage.optional(),
      children: z.array(TariffDataSchema).max(MAX_ARRAY_LENGTH).optional(),
    }).strict()
  ).max(MAX_ARRAY_LENGTH, 'Demasiados elementos en tarifa')
)

/**
 * Schema completo de Tariff para import
 */
export const ImportTariffSchema = z.object({
  // Campos obligatorios
  name: SafeString,
  title: SafeString,

  // Campos opcionales
  description: SafeDescription,
  logo_url: SafeURL,
  nif: SafeString.nullable().optional(),
  address: SafeString.nullable().optional(),
  contact: SafeString.nullable().optional(),
  summary_note: SafeDescription,
  conditions_note: SafeDescription,
  legal_note: SafeDescription,
  template: z.enum(['classic', 'modern', 'minimal']).nullable().optional(),
  primary_color: SafeHexColor,
  secondary_color: SafeHexColor,
  status: z.enum(['Activa', 'Inactiva']).default('Inactiva'),
  validity: z.number().int().positive().max(365).nullable().optional(),

  // JSON data (validación profunda)
  json_tariff_data: TariffDataSchema,

  // Arrays opcionales
  ivas_presentes: z.array(SafePercentage)
    .max(10, 'Demasiados IVAs')
    .optional(),

  // Flags
  is_template: z.boolean().optional(),

  // IMPORTANTE: Excluir campos que se regeneran
  // id, created_at, updated_at, company_id, user_id se filtran en el código
}).strict() // No permitir campos extra (previene prototype pollution)

// ============================================
// SCHEMAS DE PRESUPUESTOS
// ============================================

/**
 * Datos JSON de presupuesto (similar a tariff pero con quantity)
 */
const BudgetDataSchema: z.ZodType<any> = z.lazy(() =>
  z.array(
    z.object({
      id: SafeUUID,
      name: SafeString,
      quantity: SafePositiveNumber,
      amount: SafePrice,
      unit: SafeString.optional(),
      description: SafeDescription,
      level: z.number().int().min(1).max(MAX_NESTED_DEPTH),
      total: SafePrice,
      iva: SafePercentage.optional(),
      children: z.array(BudgetDataSchema).max(MAX_ARRAY_LENGTH).optional(),
    }).strict()
  ).max(MAX_ARRAY_LENGTH, 'Demasiados elementos en presupuesto')
)

/**
 * Schema completo de Budget para import
 */
export const ImportBudgetSchema = z.object({
  // Campos obligatorios
  client_name: SafeString,

  // Cliente
  client_type: z.enum(['empresa', 'particular', 'autonomo']),
  client_nif_nie: SafeString.nullable().optional(),
  client_phone: SafeString.nullable().optional(),
  client_email: SafeEmail,
  client_web: SafeURL,
  client_address: SafeString.nullable().optional(),
  client_postal_code: z.string().max(10).nullable().optional(),
  client_locality: SafeString.nullable().optional(),
  client_province: SafeString.nullable().optional(),
  client_country: SafeString.nullable().optional(),

  // Opcionales
  project_name: SafeString.nullable().optional(),
  project_location: SafeString.nullable().optional(),
  project_start_date: z.string().datetime().nullable().optional(),
  project_end_date: z.string().datetime().nullable().optional(),

  // Relaciones
  tariff_id: SafeUUID.nullable().optional(),

  // Datos JSON
  json_budget_data: BudgetDataSchema,
  json_client_data: z.any().optional(), // Validación laxa para retrocompatibilidad

  // Cálculos
  subtotal: SafePrice.optional(),
  discount_percentage: SafePercentage.optional(),
  discount_amount: SafePrice.optional(),
  iva_amount: SafePrice.optional(),
  irpf_percentage: SafePercentage.nullable().optional(),
  irpf_amount: SafePrice.nullable().optional(),
  re_percentage: SafePercentage.nullable().optional(),
  re_amount: SafePrice.nullable().optional(),
  total: SafePrice.optional(),

  // Fechas
  start_date: z.string().datetime().nullable().optional(),
  end_date: z.string().datetime().nullable().optional(),

  // Notas
  summary_note: SafeDescription,
  conditions_note: SafeDescription,
  legal_note: SafeDescription,

  // Estado
  status: z.enum(['borrador', 'enviado', 'aprobado', 'rechazado']).default('borrador'),

  // IMPORTANTE: Excluir campos que se regeneran
  // id, created_at, updated_at, company_id, user_id, parent_budget_id, version_number se filtran en el código
}).strict()

// ============================================
// SCHEMAS DE VALIDACIÓN DE ARCHIVOS
// ============================================

/**
 * Validación de tamaño de archivo
 */
export const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
export const MAX_FILE_SIZE_FORMATTED = '5MB'

/**
 * Validación de array de tarifas
 */
export const ImportTariffsArraySchema = z.array(ImportTariffSchema)
  .min(1, 'El archivo debe contener al menos 1 tarifa')
  .max(100, 'Máximo 100 tarifas por importación')

/**
 * Validación de array de presupuestos
 */
export const ImportBudgetsArraySchema = z.array(ImportBudgetSchema)
  .min(1, 'El archivo debe contener al menos 1 presupuesto')
  .max(100, 'Máximo 100 presupuestos por importación')

// ============================================
// HELPERS DE SANITIZACIÓN
// ============================================

/**
 * Sanitizar objeto eliminando campos peligrosos
 * Previene prototype pollution
 */
export function sanitizeObject<T>(obj: T): T {
  const dangerous = ['__proto__', 'constructor', 'prototype']

  if (typeof obj !== 'object' || obj === null) {
    return obj
  }

  const sanitized: any = Array.isArray(obj) ? [] : {}

  for (const [key, value] of Object.entries(obj)) {
    // Eliminar campos peligrosos
    if (dangerous.includes(key)) {
      continue
    }

    // Recursivo para objetos anidados
    sanitized[key] = typeof value === 'object' && value !== null
      ? sanitizeObject(value)
      : value
  }

  return sanitized
}

/**
 * Validar tamaño de contenido JSON
 */
export function validateJSONSize(content: string): { valid: boolean; error?: string } {
  const size = new Blob([content]).size

  if (size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `El archivo es demasiado grande (${(size / 1024 / 1024).toFixed(2)}MB). Máximo: ${MAX_FILE_SIZE_FORMATTED}`
    }
  }

  return { valid: true }
}
