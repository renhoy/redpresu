'use server'
import { log } from '@/lib/logger'
import { requireValidCompanyId, validateUserCompanyId } from '@/lib/helpers/company-validation'

import { cookies } from 'next/headers'
import { createServerActionClient } from "@/lib/supabase/helpers"
import { supabaseAdmin } from '@/lib/supabase/server'
import { Database } from '@/lib/types/database.types'
import { revalidatePath } from 'next/cache'
import { CSV2JSONConverter, detectIVAsPresentes } from '@/lib/validators'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { isValidNIF, getNIFErrorMessage } from '@/lib/helpers/nif-validator'

type Tariff = Database['public']['Tables']['tariffs']['Row']

/**
 * Restaura acentos perdidos durante la normalización del CSV
 */
function restoreAccents(processedData: unknown[], originalCSV: string): unknown[] {
  // Extraer todas las palabras con acentos del CSV original
  const originalWords = extractWordsWithAccents(originalCSV)

  // Crear mapeo de palabras sin acento → palabras con acento
  const accentMap = new Map<string, string>()

  originalWords.forEach(word => {
    const normalized = word.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    if (normalized !== word) {
      accentMap.set(normalized.toLowerCase(), word)
    }
  })

  // Restaurar acentos en los datos procesados
  return processedData.map(item => {
    if (typeof item === 'object' && item !== null) {
      const processedItem = { ...item } as Record<string, unknown>

      // Restaurar acentos en campos de texto
      if (typeof processedItem.name === 'string') {
        processedItem.name = restoreWordAccents(processedItem.name, accentMap)
      }
      if (typeof processedItem.description === 'string') {
        processedItem.description = restoreWordAccents(processedItem.description, accentMap)
      }

      return processedItem
    }
    return item
  })
}

/**
 * Extrae palabras que contienen acentos del texto original
 */
function extractWordsWithAccents(text: string): string[] {
  const words = text.match(/[a-zA-ZñÑáéíóúÁÉÍÓÚüÜ]+/g) || []
  return words.filter(word => /[áéíóúÁÉÍÓÚüÜ]/.test(word))
}

/**
 * Restaura acentos en una cadena usando el mapeo
 */
function restoreWordAccents(text: string, accentMap: Map<string, string>): string {
  return text.replace(/\b[a-zA-ZñÑ]+\b/g, (word) => {
    const restored = accentMap.get(word.toLowerCase())
    return restored || word
  })
}

export interface TariffFormData {
  title: string
  description?: string
  validity: number
  status: 'Borrador' | 'Activa' | 'Inactiva'
  logo_url: string
  name: string
  nif: string
  address: string
  contact: string
  template: string
  primary_color: string
  secondary_color: string
  summary_note: string
  conditions_note: string
  legal_note: string
  json_tariff_data?: unknown
}

export async function getTariffs(
  empresaId: number,
  filters?: {
    status?: 'Borrador' | 'Activa' | 'Inactiva' | 'all'
    search?: string
    user_id?: string
  }
): Promise<Tariff[]> {
  const supabase = supabaseAdmin

  try {
    // Primero obtener tarifas sin el JOIN
    let query = supabase
      .from('tariffs')
      .select('*')
      .eq('company_id', empresaId)
      .order('created_at', { ascending: false })

    // Filtro por estado
    if (filters?.status && filters.status !== 'all') {
      query = query.eq('status', filters.status)
    }

    // Filtro por usuario creador (ignorar si es 'all' o undefined)
    if (filters?.user_id && filters.user_id !== 'all') {
      query = query.eq('user_id', filters.user_id)
    }

    // Filtro por búsqueda (título y descripción)
    if (filters?.search && filters.search.trim()) {
      const searchTerm = `%${filters.search.trim()}%`
      query = query.or(`title.ilike.${searchTerm},description.ilike.${searchTerm}`)
    }

    const { data: tariffs, error: tariffsError } = await query

    if (tariffsError) {
      log.error('Error fetching tariffs (base query):', tariffsError)
      throw new Error('Error al obtener las tarifas: ' + JSON.stringify(tariffsError))
    }

    if (!tariffs || tariffs.length === 0) {
      return []
    }

    // Ahora obtener la información de los creadores
    const userIds = [...new Set(tariffs.map(t => t.user_id).filter(Boolean))]

    if (userIds.length === 0) {
      // Si no hay user_ids, retornar tarifas sin información de creador
      return tariffs.map(t => ({ ...t, creator: null })) as Tariff[]
    }

    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, name, role')
      .in('id', userIds)

    if (usersError) {
      log.error('Error fetching users:', usersError)
      // Retornar tarifas sin información de creador si falla
      return tariffs.map(t => ({ ...t, creator: null })) as Tariff[]
    }

    // Mapear usuarios a tarifas
    const usersMap = new Map(users?.map(u => [u.id, { name: u.name, role: u.role }]) || [])

    // Obtener conteo de presupuestos por tarifa
    const tariffIds = tariffs.map(t => t.id)
    const { data: budgetCounts, error: budgetCountsError } = await supabase
      .from('budgets')
      .select('tariff_id')
      .in('tariff_id', tariffIds)

    if (budgetCountsError) {
      log.error('Error fetching budget counts:', budgetCountsError)
    }

    // Contar presupuestos por tarifa
    const budgetCountMap = new Map<string, number>()
    budgetCounts?.forEach(budget => {
      const count = budgetCountMap.get(budget.tariff_id) || 0
      budgetCountMap.set(budget.tariff_id, count + 1)
    })

    return tariffs.map(tariff => ({
      ...tariff,
      creator: tariff.user_id ? usersMap.get(tariff.user_id) || null : null,
      budget_count: budgetCountMap.get(tariff.id) || 0
    })) as Tariff[]

  } catch (error) {
    log.error('Unexpected error in getTariffs:', error)
    throw error
  }
}

/**
 * Valida si una tarifa tiene todos los campos completos
 * para poder activarse
 */
function isTariffComplete(tariff: Partial<Tariff>): {
  complete: boolean
  missingFields: string[]
} {
  const missing: string[] = []

  // Validar campos obligatorios
  if (!tariff.title?.trim()) missing.push('Título')
  if (!tariff.validity || tariff.validity < 1) missing.push('Validez')
  if (!tariff.logo_url?.trim()) missing.push('Logo')
  if (!tariff.name?.trim()) missing.push('Nombre de empresa')
  if (!tariff.nif?.trim()) missing.push('NIF/CIF')
  if (!tariff.address?.trim()) missing.push('Dirección')
  if (!tariff.contact?.trim()) missing.push('Contacto')
  if (!tariff.template?.trim()) missing.push('Plantilla')
  if (!tariff.primary_color?.trim()) missing.push('Color primario')
  if (!tariff.secondary_color?.trim()) missing.push('Color secundario')
  if (!tariff.summary_note?.trim()) missing.push('Nota resumen')
  if (!tariff.conditions_note?.trim()) missing.push('Condiciones')
  if (!tariff.legal_note?.trim()) missing.push('Notas legales')
  if (!tariff.json_tariff_data) missing.push('Archivo CSV')

  return {
    complete: missing.length === 0,
    missingFields: missing
  }
}

export async function toggleTariffStatus(
  tariffId: string,
  currentStatus: 'Borrador' | 'Activa' | 'Inactiva'
): Promise<{ success: boolean; error?: string; missingFields?: string[] }> {
  const supabase = supabaseAdmin

  // Si el estado actual es Borrador y se intenta activar, validar que esté completa
  if (currentStatus === 'Borrador') {
    // Obtener la tarifa completa para validar
    const { data: tariff, error: fetchError } = await supabase
      .from('tariffs')
      .select('*')
      .eq('id', tariffId)
      .single()

    if (fetchError || !tariff) {
      log.error('Error fetching tariff for validation:', fetchError)
      return {
        success: false,
        error: 'No se pudo validar la tarifa'
      }
    }

    // Validar si está completa
    const validation = isTariffComplete(tariff)
    if (!validation.complete) {
      return {
        success: false,
        error: `No se puede activar la tarifa. Faltan ${validation.missingFields.length} campos obligatorios.`,
        missingFields: validation.missingFields
      }
    }

    // Si está completa, activarla
    const { error } = await supabase
      .from('tariffs')
      .update({
        status: 'Activa',
        updated_at: new Date().toISOString()
      })
      .eq('id', tariffId)

    if (error) {
      log.error('Error activating tariff:', error)
      return {
        success: false,
        error: 'Error al activar la tarifa'
      }
    }

    revalidatePath('/tariffs')
    return { success: true }
  }

  // Para estados Activa/Inactiva, alternar normalmente
  const newStatus = currentStatus === 'Activa' ? 'Inactiva' : 'Activa'

  const { error } = await supabase
    .from('tariffs')
    .update({
      status: newStatus,
      updated_at: new Date().toISOString()
    })
    .eq('id', tariffId)

  if (error) {
    log.error('Error toggling tariff status:', error)
    return {
      success: false,
      error: 'Error al cambiar el estado de la tarifa'
    }
  }

  revalidatePath('/tariffs')
  return { success: true }
}

export async function deleteTariff(
  tariffId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = supabaseAdmin

  // Verificar si la tarifa tiene presupuestos asociados
  const { data: budgets, error: budgetError } = await supabase
    .from('budgets')
    .select('id')
    .eq('tariff_id', tariffId)
    .limit(1)

  if (budgetError) {
    log.error('Error checking associated budgets:', budgetError)
    return {
      success: false,
      error: 'Error al verificar presupuestos asociados'
    }
  }

  if (budgets && budgets.length > 0) {
    return {
      success: false,
      error: 'No se puede eliminar una tarifa que tiene presupuestos asociados'
    }
  }

  const { error } = await supabase
    .from('tariffs')
    .delete()
    .eq('id', tariffId)

  if (error) {
    log.error('Error deleting tariff:', error)
    return {
      success: false,
      error: 'Error al eliminar la tarifa'
    }
  }

  revalidatePath('/tariffs')
  return { success: true }
}

export async function getTariffById(
  tariffId: string
): Promise<Tariff | null> {
  const supabase = supabaseAdmin

  const { data, error } = await supabase
    .from('tariffs')
    .select('*')
    .eq('id', tariffId)
    .single()

  if (error) {
    log.error('Error fetching tariff:', error)
    return null
  }

  return data
}

export async function createTariff(data: TariffFormData): Promise<{
  success: boolean
  tariffId?: string
  error?: string
}> {
  try {
    log.info('[createTariff] Iniciando creación de tarifa...')

    // Verificar límites del plan (si suscripciones están habilitadas)
    const { canCreateTariff } = await import('@/lib/helpers/subscription-helpers')
    const limitCheck = await canCreateTariff()

    if (!limitCheck.canCreate) {
      log.info('[createTariff] Límite alcanzado:', limitCheck.message)
      return { success: false, error: limitCheck.message }
    }

    // Validar NIF solo si la tarifa está activa
    // Las tarifas en borrador pueden tener campos vacíos o inválidos
    if (data.status === 'Activa' && !isValidNIF(data.nif)) {
      log.error('[createTariff] NIF inválido para tarifa activa:', data.nif)
      return { success: false, error: getNIFErrorMessage(data.nif) }
    }

    const cookieStore = await cookies()
    log.info('[createTariff] Cookies obtenidas:', { hasCookieStore: !!cookieStore })

    // CRÍTICO: Pasar función que retorna cookieStore
    const supabase = createServerActionClient({
      cookies: () => cookieStore
    })

    // Usar getUser() NO getSession()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    log.info('[createTariff] User check:', {
      hasUser: !!user,
      userId: user?.id,
      userEmail: user?.email,
      authError: authError?.message
    })

    if (authError || !user) {
      log.error('[createTariff] Auth error:', authError)
      return { success: false, error: 'Usuario no autenticado' }
    }

    // Obtener company_id del usuario actual
    log.info('[createTariff] Obteniendo datos del usuario...')
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('company_id, role')
      .eq('id', user.id)
      .single()

    if (userError) {
      log.error('[createTariff] User data error:', userError)
      return { success: false, error: 'No se pudo obtener la empresa del usuario' }
    }

    // SECURITY: Validar company_id obligatorio
    let companyId: number
    try {
      companyId = requireValidCompanyId(userData, '[createTariff]')
    } catch (error) {
      log.error('[createTariff] company_id inválido', { error })
      return { success: false, error: 'Usuario sin empresa asignada' }
    }

    // Detectar IVAs presentes en los datos de la tarifa
    log.info('[createTariff] Detectando IVAs presentes...')
    let ivasPresentes: number[] = []
    try {
      // Parsear json_tariff_data si es string, o usar directamente si es objeto
      const tariffData = typeof data.json_tariff_data === 'string'
        ? JSON.parse(data.json_tariff_data)
        : data.json_tariff_data

      // Detectar IVAs si tariffData es un array válido
      if (Array.isArray(tariffData)) {
        ivasPresentes = detectIVAsPresentes(tariffData)
        log.info('[createTariff] IVAs detectados:', ivasPresentes)
      }
    } catch (parseError) {
      log.warn('[createTariff] No se pudieron detectar IVAs:', parseError)
      // Continuar sin IVAs si falla la detección
    }

    // Crear tarifa
    log.info('[createTariff] Insertando tarifa en BD...')
    const { error } = await supabase
      .from('tariffs')
      .insert({
        company_id: companyId,
        user_id: user.id, // Añadir trazabilidad de creación
        title: data.title,
        description: data.description,
        validity: data.validity,
        status: data.status,
        logo_url: data.logo_url,
        name: data.name,
        nif: data.nif,
        address: data.address,
        contact: data.contact,
        template: data.template,
        primary_color: data.primary_color,
        secondary_color: data.secondary_color,
        summary_note: data.summary_note,
        conditions_note: data.conditions_note,
        legal_note: data.legal_note,
        // json_tariff_data es NOT NULL en BD, enviar array vacío si no hay datos
        json_tariff_data: data.json_tariff_data || [],
        ivas_presentes: ivasPresentes // Guardar IVAs detectados
      })

    if (error) {
      log.error('[createTariff] Insert error:', error)
      return { success: false, error: 'Error al crear la tarifa' }
    }

    log.info('[createTariff] Tarifa creada exitosamente')
    revalidatePath('/tariffs')
    return { success: true }

  } catch (error) {
    log.error('[createTariff] Critical error:', error)
    return { success: false, error: 'Error crítico al crear tarifa' }
  }
}

export async function updateTariff(id: string, data: TariffFormData): Promise<{
  success: boolean
  error?: string
}> {
  try {
    log.info('[updateTariff] Iniciando actualización de tarifa:', { id })

    // Validar NIF solo si la tarifa está activa
    // Las tarifas en borrador pueden tener campos vacíos o inválidos
    if (data.status === 'Activa' && !isValidNIF(data.nif)) {
      log.error('[updateTariff] NIF inválido para tarifa activa:', data.nif)
      return { success: false, error: getNIFErrorMessage(data.nif) }
    }

    const cookieStore = await cookies()
    log.info('[updateTariff] Cookies obtenidas:', { hasCookieStore: !!cookieStore })

    // CRÍTICO: Pasar función que retorna cookieStore
    const supabase = createServerActionClient({
      cookies: () => cookieStore
    })

    // Usar getUser() NO getSession()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    log.info('[updateTariff] User check:', {
      hasUser: !!user,
      userId: user?.id,
      userEmail: user?.email,
      authError: authError?.message
    })

    if (authError || !user) {
      log.error('[updateTariff] Auth error:', authError)
      return { success: false, error: 'Usuario no autenticado' }
    }

    // Detectar IVAs presentes en los datos de la tarifa
    log.info('[updateTariff] Detectando IVAs presentes...')
    let ivasPresentes: number[] = []
    try {
      // Parsear json_tariff_data si es string, o usar directamente si es objeto
      const tariffData = typeof data.json_tariff_data === 'string'
        ? JSON.parse(data.json_tariff_data)
        : data.json_tariff_data

      // Detectar IVAs si tariffData es un array válido
      if (Array.isArray(tariffData)) {
        ivasPresentes = detectIVAsPresentes(tariffData)
        log.info('[updateTariff] IVAs detectados:', ivasPresentes)
      }
    } catch (parseError) {
      log.warn('[updateTariff] No se pudieron detectar IVAs:', parseError)
      // Continuar sin IVAs si falla la detección
    }

    // Actualizar tarifa
    log.info('[updateTariff] Actualizando tarifa en BD...')
    const { error } = await supabase
      .from('tariffs')
      .update({
        title: data.title,
        description: data.description,
        validity: data.validity,
        status: data.status,
        logo_url: data.logo_url,
        name: data.name,
        nif: data.nif,
        address: data.address,
        contact: data.contact,
        template: data.template,
        primary_color: data.primary_color,
        secondary_color: data.secondary_color,
        summary_note: data.summary_note,
        conditions_note: data.conditions_note,
        legal_note: data.legal_note,
        // json_tariff_data es NOT NULL en BD, mantener array vacío si no hay datos
        json_tariff_data: data.json_tariff_data || [],
        ivas_presentes: ivasPresentes, // Actualizar IVAs detectados
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (error) {
      log.error('[updateTariff] Update error:', error)
      return { success: false, error: 'Error al actualizar la tarifa' }
    }

    log.info('[updateTariff] Tarifa actualizada exitosamente')
    revalidatePath('/tariffs')
    revalidatePath(`/tariffs/edit/${id}`)
    return { success: true }

  } catch (error) {
    log.error('[updateTariff] Critical error:', error)
    return { success: false, error: 'Error crítico al actualizar tarifa' }
  }
}

/**
 * Marca una tarifa como plantilla (desmarcando las demás de la empresa)
 */
export async function setTariffAsTemplate(tariffId: string): Promise<{
  success: boolean
  error?: string
}> {
  try {
    log.info('[setTariffAsTemplate] Marcando tarifa como plantilla:', tariffId)

    const cookieStore = await cookies()
    const supabase = createServerActionClient({
      cookies: () => cookieStore
    })

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: 'Usuario no autenticado' }
    }

    // Verificar que el usuario es admin/superadmin
    const { data: userData } = await supabase
      .from('users')
      .select('role, company_id')
      .eq('id', user.id)
      .single()

    if (!userData || !['admin', 'superadmin'].includes(userData.role)) {
      return { success: false, error: 'No tienes permisos para establecer plantillas' }
    }

    // SECURITY: Validar company_id obligatorio
    let companyId: number
    try {
      companyId = requireValidCompanyId(userData, '[setTariffAsTemplate]')
    } catch (error) {
      log.error('[setTariffAsTemplate] company_id inválido', { error })
      return { success: false, error: 'Usuario sin empresa asignada' }
    }

    // Marcar como plantilla (el trigger se encargará de desmarcar las demás)
    const { error } = await supabase
      .from('tariffs')
      .update({ is_template: true })
      .eq('id', tariffId)
      .eq('company_id', companyId) // Seguridad: solo su empresa

    if (error) {
      log.error('[setTariffAsTemplate] Error:', error)
      return { success: false, error: 'Error al establecer plantilla' }
    }

    revalidatePath('/tariffs')
    return { success: true }

  } catch (error) {
    log.error('[setTariffAsTemplate] Critical error:', error)
    return { success: false, error: 'Error crítico al establecer plantilla' }
  }
}

/**
 * Desmarca una tarifa como plantilla
 */
export async function unsetTariffAsTemplate(tariffId: string): Promise<{
  success: boolean
  error?: string
}> {
  try {
    log.info('[unsetTariffAsTemplate] Desmarcando tarifa como plantilla:', tariffId)

    const cookieStore = await cookies()
    const supabase = createServerActionClient({
      cookies: () => cookieStore
    })

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: 'Usuario no autenticado' }
    }

    // Verificar que el usuario es admin/superadmin
    const { data: userData } = await supabase
      .from('users')
      .select('role, company_id')
      .eq('id', user.id)
      .single()

    if (!userData || !['admin', 'superadmin'].includes(userData.role)) {
      return { success: false, error: 'No tienes permisos para modificar plantillas' }
    }

    // SECURITY: Validar company_id obligatorio
    let companyId: number
    try {
      companyId = requireValidCompanyId(userData, '[unsetTariffAsTemplate]')
    } catch (error) {
      log.error('[unsetTariffAsTemplate] company_id inválido', { error })
      return { success: false, error: 'Usuario sin empresa asignada' }
    }

    // Desmarcar como plantilla
    const { error } = await supabase
      .from('tariffs')
      .update({ is_template: false })
      .eq('id', tariffId)
      .eq('company_id', companyId) // Seguridad: solo su empresa

    if (error) {
      log.error('[unsetTariffAsTemplate] Error:', error)
      return { success: false, error: 'Error al desmarcar plantilla' }
    }

    revalidatePath('/tariffs')
    return { success: true }

  } catch (error) {
    log.error('[unsetTariffAsTemplate] Critical error:', error)
    return { success: false, error: 'Error crítico al desmarcar plantilla' }
  }
}

/**
 * Obtiene la tarifa plantilla de una empresa
 */
export async function getTemplateTariff(empresaId: number): Promise<{
  success: boolean
  data?: Tariff
  error?: string
}> {
  try {
    log.info('[getTemplateTariff] Obteniendo plantilla para empresa:', empresaId)

    const { data, error } = await supabaseAdmin
      .from('tariffs')
      .select('*')
      .eq('company_id', empresaId)
      .eq('is_template', true)
      .single()

    if (error) {
      // Si no hay plantilla, no es un error crítico
      if (error.code === 'PGRST116') {
        log.info('[getTemplateTariff] No hay plantilla definida')
        return { success: true, data: undefined }
      }
      log.error('[getTemplateTariff] Error:', error)
      return { success: false, error: 'Error al obtener plantilla' }
    }

    return { success: true, data }

  } catch (error) {
    log.error('[getTemplateTariff] Critical error:', error)
    return { success: false, error: 'Error crítico al obtener plantilla' }
  }
}

export async function uploadLogo(formData: FormData): Promise<{
  success: boolean
  url?: string
  error?: string
}> {
  try {
    const file = formData.get('file') as File
    if (!file) {
      return { success: false, error: 'No se seleccionó ningún archivo' }
    }

    // Validar tipo de archivo
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/svg+xml']
    if (!allowedTypes.includes(file.type)) {
      return { success: false, error: 'Formato de archivo no válido. Use JPG, PNG o SVG' }
    }

    // Validar tamaño (máximo 2MB)
    if (file.size > 2 * 1024 * 1024) {
      return { success: false, error: 'El archivo es demasiado grande. Máximo 2MB' }
    }

    // Generar nombre único
    const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '')}`
    const publicPath = join(process.cwd(), 'public', 'logos')
    const filePath = join(publicPath, fileName)

    // Crear directorio si no existe
    await mkdir(publicPath, { recursive: true })

    // Guardar archivo
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)

    const publicUrl = `/logos/${fileName}`
    return { success: true, url: publicUrl }

  } catch (error) {
    log.error('Error uploading logo:', error)
    return { success: false, error: 'Error al subir el archivo' }
  }
}

export async function processCSV(formData: FormData): Promise<{
  success: boolean
  jsonData?: unknown[]
  errors?: unknown[]
}> {
  try {
    const file = formData.get('file') as File
    if (!file) {
      return { success: false, errors: [{ message: 'No se seleccionó ningún archivo' }] }
    }

    // Validar tipo de archivo
    if (!file.name.toLowerCase().endsWith('.csv')) {
      return { success: false, errors: [{ message: 'El archivo debe ser de tipo CSV' }] }
    }

    // Leer contenido del archivo con manejo de BOM y codificación
    const arrayBuffer = await file.arrayBuffer()

    // Validación: verificar que el archivo no está vacío
    if (arrayBuffer.byteLength === 0) {
      return {
        success: false,
        errors: [{
          message: 'El archivo está vacío. Asegúrate de subir un archivo CSV válido con datos.',
          severity: 'fatal'
        }]
      }
    }

    // Detectar y manejar BOM UTF-8
    const uint8Array = new Uint8Array(arrayBuffer)
    let startIndex = 0

    // Verificar BOM UTF-8 (EF BB BF)
    if (uint8Array.length >= 3 &&
        uint8Array[0] === 0xEF &&
        uint8Array[1] === 0xBB &&
        uint8Array[2] === 0xBF) {
      startIndex = 3
    }

    // Crear buffer sin BOM si existe
    const cleanBuffer = startIndex > 0 ?
      arrayBuffer.slice(startIndex) : arrayBuffer

    // Decodificar con UTF-8
    const decoder = new TextDecoder('utf-8')
    const csvContent = decoder.decode(cleanBuffer)

    // Validación: verificar que hay contenido después de decodificar
    if (!csvContent || csvContent.trim().length === 0) {
      return {
        success: false,
        errors: [{
          message: 'El archivo no contiene datos legibles. Verifica que sea un archivo CSV válido con codificación UTF-8.',
          severity: 'fatal'
        }]
      }
    }

    // Procesar con validador de Common
    const converter = new CSV2JSONConverter()
    const result = await converter.convertCSVToJSON(csvContent)

    if (!result.success) {
      return {
        success: false,
        errors: result.errors || [{ message: 'Error al procesar el CSV' }]
      }
    }

    // Validación: verificar que se generaron datos
    if (!result.data || !Array.isArray(result.data) || result.data.length === 0) {
      return {
        success: false,
        errors: [{
          message: 'No se pudieron extraer datos del archivo. Verifica que el CSV tenga el formato correcto con cabeceras y al menos una fila de datos.',
          severity: 'fatal'
        }]
      }
    }

    // Post-procesar para restaurar acentos perdidos por normalización
    const restoredData = restoreAccents(result.data, csvContent)

    // Validación final: verificar que el post-procesamiento funcionó
    if (!restoredData || !Array.isArray(restoredData)) {
      log.error('[processCSV] Error en post-procesamiento:', { hasData: !!result.data, restoredData })
      return {
        success: false,
        errors: [{
          message: 'Error al procesar los datos del CSV. Por favor, intenta nuevamente.',
          severity: 'fatal'
        }]
      }
    }

    return {
      success: true,
      jsonData: restoredData,
      errors: result.errors // Incluir warnings si los hay
    }

  } catch (error) {
    // Logging detallado para debugging
    log.error('[processCSV] Error inesperado:', error)
    log.error('[processCSV] Stack:', error instanceof Error ? error.stack : 'No stack available')
    log.error('[processCSV] Error type:', error instanceof Error ? error.constructor.name : typeof error)

    // Distinguir entre errores controlados y no controlados
    const errorMessage = error instanceof Error ? error.message : String(error)

    // Si el error contiene información técnica (undefined, null, etc), dar mensaje genérico
    if (errorMessage.includes('undefined') ||
        errorMessage.includes('null') ||
        errorMessage.includes('Cannot read') ||
        errorMessage.includes('forEach') ||
        errorMessage.includes('TypeError')) {
      return {
        success: false,
        errors: [{
          message: 'No se pudo procesar el archivo CSV. Posibles causas:\n\n• El archivo no tiene el formato CSV correcto\n• Faltan columnas obligatorias (Nivel, ID, Nombre, Descripción, Ud, %IVA, PVP)\n• El archivo está corrupto o tiene una estructura inválida\n• La codificación no es UTF-8\n\nSolución: Descarga la plantilla de ejemplo y copia tus datos siguiendo ese formato.',
          severity: 'fatal'
        }]
      }
    }

    // Error controlado con mensaje específico
    return {
      success: false,
      errors: [{
        message: errorMessage || 'Error al procesar el archivo CSV',
        severity: 'fatal'
      }]
    }
  }
}

/**
 * Obtiene los datos del issuer del usuario autenticado
 * Para pre-llenar campos de una nueva tarifa cuando no hay plantilla
 */
export async function getUserIssuerData(userId: string): Promise<{
  success: boolean
  data?: {
    name: string
    nif: string
    address: string
    contact: string
  }
  error?: string
}> {
  try {
    const { data, error } = await supabaseAdmin
      .from('issuers')
      .select('name, nif, address, postal_code, locality, province, phone, email, web')
      .eq('user_id', userId)
      .maybeSingle()

    // Si no existe issuer para el usuario, retornar éxito sin datos
    if (error && error.code !== 'PGRST116') {
      log.error('[getUserIssuerData] Error obteniendo issuer:', error)
      return { success: false, error: 'No se pudo obtener los datos del emisor' }
    }

    if (!data) {
      log.info('[getUserIssuerData] No existe issuer para el usuario:', userId)
      return { success: true, data: undefined }
    }

    // Construir dirección completa
    const addressParts = [
      data.address,
      data.postal_code,
      data.locality,
      data.province ? `(${data.province})` : null
    ].filter(Boolean)

    const address = addressParts.join(', ')

    // Construir contacto (Teléfono - Email - Web)
    const contactParts = [
      data.phone,
      data.email,
      data.web
    ].filter(Boolean)

    const contact = contactParts.join(' - ')

    log.info('[getUserIssuerData] Issuer encontrado:', data.name)

    return {
      success: true,
      data: {
        name: data.name,
        nif: data.nif,
        address: address,
        contact: contact
      }
    }
  } catch (error) {
    log.error('[getUserIssuerData] Error crítico:', error)
    return { success: false, error: 'Error al obtener datos del emisor' }
  }
}

/**
 * Duplicar tarifa (crear copia exacta con estado Inactiva y fecha actual)
 */
export async function duplicateTariff(tariffId: string): Promise<{
  success: boolean
  newTariffId?: string
  error?: string
}> {
  try {
    log.info('[duplicateTariff] Duplicando tarifa:', tariffId)

    const cookieStore = await cookies()
    const supabase = createServerActionClient({
      cookies: () => cookieStore
    })

    // Obtener usuario actual
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      log.error('[duplicateTariff] Error de autenticación:', authError)
      return { success: false, error: 'No autenticado' }
    }

    // Obtener company_id del usuario
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('company_id, role')
      .eq('id', user.id)
      .single()

    if (userError) {
      log.error('[duplicateTariff] Error obteniendo usuario:', userError)
      return { success: false, error: 'No se pudo obtener la empresa del usuario' }
    }

    // SECURITY: Validar company_id obligatorio
    let companyId: number
    try {
      companyId = requireValidCompanyId(userData, '[duplicateTariff]')
    } catch (error) {
      log.error('[duplicateTariff] company_id inválido', { error })
      return { success: false, error: 'Usuario sin empresa asignada' }
    }

    // Obtener tarifa original
    const { data: originalTariff, error: tariffError } = await supabaseAdmin
      .from('tariffs')
      .select('*')
      .eq('id', tariffId)
      .single()

    if (tariffError || !originalTariff) {
      log.error('[duplicateTariff] Tarifa no encontrada:', tariffError)
      return { success: false, error: 'Tarifa no encontrada' }
    }

    // Verificar que la tarifa pertenece a la empresa del usuario
    if (originalTariff.company_id !== companyId) {
      log.error('[duplicateTariff] Tarifa no pertenece a la empresa del usuario')
      return { success: false, error: 'No tienes permisos para duplicar esta tarifa' }
    }

    // Crear copia de la tarifa con estado Inactiva y fecha actual
    const { data: newTariff, error: insertError } = await supabaseAdmin
      .from('tariffs')
      .insert({
        company_id: originalTariff.company_id,
        user_id: user.id, // Usuario que crea la copia
        title: `${originalTariff.title} (Copia)`,
        description: originalTariff.description,
        validity: originalTariff.validity,
        status: 'Inactiva', // Siempre Inactiva
        logo_url: originalTariff.logo_url,
        name: originalTariff.name,
        nif: originalTariff.nif,
        address: originalTariff.address,
        contact: originalTariff.contact,
        template: originalTariff.template,
        primary_color: originalTariff.primary_color,
        secondary_color: originalTariff.secondary_color,
        summary_note: originalTariff.summary_note,
        conditions_note: originalTariff.conditions_note,
        legal_note: originalTariff.legal_note,
        json_tariff_data: originalTariff.json_tariff_data,
        ivas_presentes: originalTariff.ivas_presentes,
        is_template: false // La copia nunca es plantilla
        // created_at se establece automáticamente con la fecha actual
      })
      .select()
      .single()

    if (insertError || !newTariff) {
      log.error('[duplicateTariff] Error creando copia:', insertError)
      return { success: false, error: 'Error al duplicar tarifa' }
    }

    log.info('[duplicateTariff] Tarifa duplicada exitosamente:', newTariff.id)
    revalidatePath('/tariffs')

    return { success: true, newTariffId: newTariff.id }

  } catch (error) {
    log.error('[duplicateTariff] Error crítico:', error)
    return { success: false, error: 'Error crítico al duplicar tarifa' }
  }
}