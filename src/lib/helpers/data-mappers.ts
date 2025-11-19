/**
 * Helpers para mapeo y transformación de datos
 * Elimina duplicación de construcción de snapshots y objetos de actualización
 */

/**
 * Datos de cliente para presupuestos
 */
export interface ClientData {
  client_type: 'particular' | 'autonomo' | 'empresa'
  client_name: string
  client_nif_nie: string
  client_phone: string
  client_email: string
  client_web?: string | null
  client_address: string
  client_postal_code: string
  client_locality: string
  client_province: string
  client_acceptance: boolean
}

/**
 * Datos de emisor/issuer
 */
export interface IssuerData {
  type?: 'empresa' | 'autonomo'
  name?: string
  nif?: string
  address?: string
  postal_code?: string
  locality?: string
  province?: string
  country?: string
  phone?: string | null
  email?: string | null
  web?: string | null
  irpf_percentage?: number | null
}

/**
 * Construye snapshot JSON de datos de cliente para versionado
 *
 * Este snapshot se guarda en `json_client_data` del presupuesto para
 * preservar los datos del cliente en el momento de creación/actualización.
 *
 * @param clientData - Datos del cliente (parciales)
 * @returns Objeto JSON con todos los campos del cliente
 *
 * @example
 * const snapshot = buildClientSnapshot({
 *   client_type: 'empresa',
 *   client_name: 'Acme Corp',
 *   client_nif_nie: 'B12345678',
 *   // ... más campos
 * })
 */
export function buildClientSnapshot(
  clientData: Partial<ClientData>
): Record<string, any> {
  return {
    client_type: clientData.client_type || '',
    client_name: clientData.client_name || '',
    client_nif_nie: clientData.client_nif_nie || '',
    client_phone: clientData.client_phone || '',
    client_email: clientData.client_email || '',
    client_web: clientData.client_web || null,
    client_address: clientData.client_address || '',
    client_postal_code: clientData.client_postal_code || '',
    client_locality: clientData.client_locality || '',
    client_province: clientData.client_province || '',
    client_acceptance: clientData.client_acceptance ?? false
  }
}

/**
 * Construye objeto de actualización para datos de cliente en tabla
 *
 * Útil para actualizar campos de cliente en tabla de presupuestos.
 * Solo incluye campos proporcionados (no sobrescribe con undefined).
 *
 * @param clientData - Datos del cliente a actualizar
 * @returns Objeto con solo los campos proporcionados
 *
 * @example
 * const updateData = buildClientUpdateData({
 *   client_name: 'Nuevo Nombre',
 *   client_email: 'nuevo@email.com'
 * })
 * // { client_name: 'Nuevo Nombre', client_email: 'nuevo@email.com' }
 */
export function buildClientUpdateData(
  clientData: Partial<ClientData>
): Record<string, any> {
  const updateData: Record<string, any> = {}

  // Solo agregar campos que están definidos
  if (clientData.client_type !== undefined) {
    updateData.client_type = clientData.client_type
  }
  if (clientData.client_name !== undefined) {
    updateData.client_name = clientData.client_name
  }
  if (clientData.client_nif_nie !== undefined) {
    updateData.client_nif_nie = clientData.client_nif_nie
  }
  if (clientData.client_phone !== undefined) {
    updateData.client_phone = clientData.client_phone
  }
  if (clientData.client_email !== undefined) {
    updateData.client_email = clientData.client_email
  }
  if (clientData.client_web !== undefined) {
    updateData.client_web = clientData.client_web || null
  }
  if (clientData.client_address !== undefined) {
    updateData.client_address = clientData.client_address
  }
  if (clientData.client_postal_code !== undefined) {
    updateData.client_postal_code = clientData.client_postal_code
  }
  if (clientData.client_locality !== undefined) {
    updateData.client_locality = clientData.client_locality
  }
  if (clientData.client_province !== undefined) {
    updateData.client_province = clientData.client_province
  }
  if (clientData.client_acceptance !== undefined) {
    updateData.client_acceptance = clientData.client_acceptance
  }

  return updateData
}

/**
 * Construye objeto de actualización para tabla issuers
 *
 * Solo incluye campos proporcionados para evitar sobrescribir con undefined.
 *
 * @param issuerData - Datos del emisor a actualizar
 * @returns Objeto con solo los campos proporcionados
 *
 * @example
 * const updateData = buildIssuerUpdateData({
 *   name: 'Mi Empresa S.L.',
 *   nif: 'B12345678',
 *   irpf_percentage: 15
 * })
 */
export function buildIssuerUpdateData(
  issuerData: Partial<IssuerData>
): Record<string, any> {
  const updateData: Record<string, any> = {}

  if (issuerData.type !== undefined) {
    updateData.type = issuerData.type
  }
  if (issuerData.name !== undefined) {
    updateData.name = issuerData.name
  }
  if (issuerData.nif !== undefined) {
    updateData.nif = issuerData.nif
  }
  if (issuerData.address !== undefined) {
    updateData.address = issuerData.address
  }
  if (issuerData.postal_code !== undefined) {
    updateData.postal_code = issuerData.postal_code
  }
  if (issuerData.locality !== undefined) {
    updateData.locality = issuerData.locality
  }
  if (issuerData.province !== undefined) {
    updateData.province = issuerData.province
  }
  if (issuerData.country !== undefined) {
    updateData.country = issuerData.country
  }
  if (issuerData.phone !== undefined) {
    updateData.phone = issuerData.phone || null
  }
  if (issuerData.email !== undefined) {
    updateData.email = issuerData.email || null
  }
  if (issuerData.web !== undefined) {
    updateData.web = issuerData.web || null
  }
  if (issuerData.irpf_percentage !== undefined) {
    updateData.irpf_percentage = issuerData.irpf_percentage
  }

  return updateData
}

/**
 * Filtra objeto eliminando campos undefined
 *
 * Útil para limpiar objetos antes de enviarlos a Supabase.
 *
 * @param obj - Objeto con posibles valores undefined
 * @returns Nuevo objeto sin campos undefined
 *
 * @example
 * const clean = removeUndefined({
 *   name: 'Juan',
 *   age: undefined,
 *   email: 'juan@example.com'
 * })
 * // { name: 'Juan', email: 'juan@example.com' }
 */
export function removeUndefined<T extends Record<string, any>>(
  obj: T
): Partial<T> {
  const result: Partial<T> = {}

  for (const key in obj) {
    if (obj[key] !== undefined) {
      result[key] = obj[key]
    }
  }

  return result
}

/**
 * Normaliza valores null y undefined a null
 *
 * Útil para asegurar que campos vacíos se guarden como null en DB
 * en lugar de undefined (que Supabase no acepta).
 *
 * @param obj - Objeto con posibles undefined
 * @returns Nuevo objeto con undefined → null
 *
 * @example
 * const normalized = normalizeNulls({
 *   name: 'Juan',
 *   middleName: undefined,
 *   lastName: null
 * })
 * // { name: 'Juan', middleName: null, lastName: null }
 */
export function normalizeNulls<T extends Record<string, any>>(
  obj: T
): T {
  const result: any = {}

  for (const key in obj) {
    result[key] = obj[key] === undefined ? null : obj[key]
  }

  return result as T
}

/**
 * Mapea datos de Supabase a DTO para frontend
 *
 * Convierte campos de snake_case a camelCase y aplica transformaciones.
 *
 * @param dbRecord - Registro de base de datos
 * @param fieldMap - Mapa de campos { dbField: 'dtoField' }
 * @returns Objeto mapeado
 *
 * @example
 * const dto = mapDbToDto(
 *   { user_id: '123', first_name: 'Juan', last_name: 'Pérez' },
 *   { user_id: 'id', first_name: 'firstName', last_name: 'lastName' }
 * )
 * // { id: '123', firstName: 'Juan', lastName: 'Pérez' }
 */
export function mapDbToDto<T extends Record<string, any>, U extends Record<string, any>>(
  dbRecord: T,
  fieldMap: Record<keyof T, string>
): Partial<U> {
  const result: any = {}

  for (const dbField in fieldMap) {
    const dtoField = fieldMap[dbField]
    if (dbRecord[dbField] !== undefined) {
      result[dtoField] = dbRecord[dbField]
    }
  }

  return result as Partial<U>
}

/**
 * Aplica valores por defecto a un objeto
 *
 * Similar a Object.assign pero solo para campos undefined.
 *
 * @param obj - Objeto con posibles valores faltantes
 * @param defaults - Valores por defecto
 * @returns Objeto con defaults aplicados
 *
 * @example
 * const complete = applyDefaults(
 *   { name: 'Juan', age: undefined },
 *   { age: 18, country: 'España' }
 * )
 * // { name: 'Juan', age: 18, country: 'España' }
 */
export function applyDefaults<T extends Record<string, any>>(
  obj: Partial<T>,
  defaults: Partial<T>
): T {
  const result: any = { ...defaults }

  for (const key in obj) {
    if (obj[key] !== undefined) {
      result[key] = obj[key]
    }
  }

  return result as T
}

/**
 * Valida que un objeto tenga todos los campos requeridos
 *
 * @param obj - Objeto a validar
 * @param requiredFields - Array de campos requeridos
 * @returns { valid: boolean, missing?: string[] }
 *
 * @example
 * const validation = validateRequiredFields(
 *   { name: 'Juan', email: 'juan@example.com' },
 *   ['name', 'email', 'phone']
 * )
 * // { valid: false, missing: ['phone'] }
 */
export function validateRequiredFields<T extends Record<string, any>>(
  obj: T,
  requiredFields: (keyof T)[]
): { valid: boolean; missing?: string[] } {
  const missing: string[] = []

  for (const field of requiredFields) {
    if (obj[field] === undefined || obj[field] === null || obj[field] === '') {
      missing.push(String(field))
    }
  }

  if (missing.length > 0) {
    return { valid: false, missing }
  }

  return { valid: true }
}
