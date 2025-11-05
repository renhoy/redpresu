'use server'
import { log } from '@/lib/logger'
import { requireValidCompanyId } from '@/lib/helpers/company-validation'
import { sanitizeError } from '@/lib/helpers/error-helpers'

import { cookies } from 'next/headers'
import { createServerActionClient } from '@supabase/auth-helpers-nextjs'
import { supabaseAdmin } from '@/lib/supabase/server'
import { Tariff, Budget, BudgetStatus } from '@/lib/types/database'
import { revalidatePath } from 'next/cache'
import { buildPDFPayload } from '@/lib/helpers/pdf-payload-builder'
import { generatePDF } from '@/lib/rapid-pdf'
import path from 'path'
import { randomUUID } from 'crypto'
import {
  shouldApplyIRPF,
  calculateIRPF,
  calculateRecargo,
  getTotalRecargo,
  type BudgetItem as FiscalBudgetItem
} from '@/lib/helpers/fiscal-calculations'
import type { ClientType } from '@/lib/helpers/fiscal-calculations'
import { getDefaultEmpresaId } from '@/app/actions/config'

interface ClientData {
  client_type: 'particular' | 'autonomo' | 'empresa'
  client_name: string
  client_nif_nie: string
  client_phone: string
  client_email: string
  client_web?: string
  client_address: string
  client_postal_code: string
  client_locality: string
  client_province: string
  client_acceptance: boolean
}

/**
 * Obtiene los datos del issuer (emisor) del usuario actual
 */
async function getUserIssuer(userId: string): Promise<{
  type: 'empresa' | 'autonomo'
  irpf_percentage: number
} | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('redpresu_issuers')
      .select('type, irpf_percentage')
      .eq('user_id', userId)
      .single()

    if (error || !data) {
      log.error('[getUserIssuer] Error obteniendo issuer:', error)
      return null
    }

    return data
  } catch (error) {
    log.error('[getUserIssuer] Error crítico:', error)
    return null
  }
}

/**
 * Obtiene las tarifas activas de la empresa del usuario actual
 */
export async function getActiveTariffs(): Promise<Tariff[]> {
  try {
    log.info('[getActiveTariffs] Obteniendo tarifas activas...')

    const cookieStore = await cookies()
    const supabase = createServerActionClient({ cookies: () => cookieStore })

    // Obtener usuario actual
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      log.error('[getActiveTariffs] Error de autenticación:', authError)
      return []
    }

    // Obtener company_id del usuario
    const { data: userData, error: userError } = await supabase
      .from('redpresu_users')
      .select('company_id, role')
      .eq('id', user.id)
      .single()

    if (userError) {
      log.error('[getActiveTariffs] Error obteniendo usuario:', userError)
      return []
    }

    // SECURITY: Validar company_id obligatorio
    let empresaId: number
    try {
      empresaId = requireValidCompanyId(userData, '[getActiveTariffs]')
    } catch (error) {
      log.error('[getActiveTariffs] company_id inválido', { error })
      return []
    }

    log.info('[getActiveTariffs] Empresa ID validado:', empresaId)

    // Obtener tarifas activas de la empresa
    const { data: tariffs, error: tariffsError } = await supabaseAdmin
      .from('redpresu_tariffs')
      .select('*')
      .eq('company_id', empresaId)
      .eq('status', 'Activa')
      .order('title')

    if (tariffsError) {
      log.error('[getActiveTariffs] Error obteniendo tarifas:', tariffsError)
      return []
    }

    log.info('[getActiveTariffs] Tarifas encontradas:', tariffs?.length || 0)
    return tariffs || []

  } catch (error) {
    log.error('[getActiveTariffs] Error crítico:', error)
    return []
  }
}

interface BudgetDataItem {
  level: string
  quantity?: string
  price?: string
  iva_percentage?: string
  [key: string]: unknown
}

/**
 * Helper: Calcular totales desde json_budget_data
 */
function calculateBudgetTotals(budgetData: BudgetDataItem[]): {
  total: number
  iva: number
  base: number
} {
  let base = 0
  let totalIva = 0

  budgetData.forEach(item => {
    if (item.level === 'item') {
      const quantity = parseFloat(item.quantity || '0')
      const price = parseFloat(item.price || '0')
      const ivaPercentage = parseFloat(item.iva_percentage || '0')

      const itemTotal = quantity * price
      const itemIva = itemTotal * (ivaPercentage / (100 + ivaPercentage))
      const itemBase = itemTotal - itemIva

      base += itemBase
      totalIva += itemIva
    }
  })

  return {
    base: Math.round(base * 100) / 100,
    iva: Math.round(totalIva * 100) / 100,
    total: Math.round((base + totalIva) * 100) / 100
  }
}

/**
 * Verificar si un número de presupuesto ya existe
 */
export async function checkBudgetNumberExists(
  budgetNumber: string,
  excludeBudgetId?: string
): Promise<{ exists: boolean; error?: string }> {
  try {
    if (!budgetNumber || budgetNumber.trim() === '') {
      return { exists: false }
    }

    const cookieStore = await cookies()
    const supabase = createServerActionClient({ cookies: () => cookieStore })

    // Obtener usuario y empresa
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { exists: false, error: 'No autenticado' }
    }

    const { data: userData, error: userError } = await supabase
      .from('redpresu_users')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (userError) {
      return { exists: false, error: 'Error obteniendo usuario' }
    }

    let empresaId: number
    try {
      empresaId = requireValidCompanyId(userData, '[checkBudgetNumberExists]')
    } catch (error) {
      return { exists: false, error: 'Usuario sin empresa asignada' }
    }

    // Verificar unicidad
    let query = supabaseAdmin
      .from('redpresu_budgets')
      .select('id')
      .eq('budget_number', budgetNumber.trim())
      .eq('company_id', empresaId)

    // Si estamos editando, excluir el presupuesto actual
    if (excludeBudgetId) {
      query = query.neq('id', excludeBudgetId)
    }

    const { data: existingBudget, error: checkError } = await query.maybeSingle()

    if (checkError) {
      log.error('[checkBudgetNumberExists] Error verificando:', checkError)
      return { exists: false, error: 'Error al verificar número' }
    }

    return { exists: !!existingBudget }

  } catch (error) {
    log.error('[checkBudgetNumberExists] Error crítico:', error)
    return { exists: false, error: 'Error inesperado' }
  }
}

/**
 * Crear borrador inicial (al completar paso 1)
 */
export async function createDraftBudget(data: {
  tariffId: string
  budgetNumber?: string  // OPCIONAL: Si no se proporciona, se genera automáticamente
  clientData: ClientData
  tariffData: unknown[]
  validity: number | null
  totals: { base: number; total: number }
}): Promise<{ success: boolean; budgetId?: string; error?: string }> {
  try {
    log.info('[createDraftBudget] Creando borrador...')

    // Verificar límites del plan (si suscripciones están habilitadas)
    const { canCreateBudget } = await import('@/lib/helpers/subscription-helpers')
    const limitCheck = await canCreateBudget()

    if (!limitCheck.canCreate) {
      log.info('[createDraftBudget] Límite alcanzado:', limitCheck.message)
      return { success: false, error: limitCheck.message }
    }

    const cookieStore = await cookies()
    const supabase = createServerActionClient({ cookies: () => cookieStore })

    // Obtener usuario actual
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      log.error('[createDraftBudget] Error de autenticación:', authError)
      return { success: false, error: 'No autenticado' }
    }

    // Obtener company_id del usuario
    const { data: userData, error: userError } = await supabase
      .from('redpresu_users')
      .select('company_id, role')
      .eq('id', user.id)
      .single()

    if (userError) {
      log.error('[createDraftBudget] Error obteniendo usuario:', userError)
      return { success: false, error: 'Error obteniendo datos del usuario' }
    }

    // SECURITY: Validar company_id obligatorio
    let empresaId: number
    try {
      empresaId = requireValidCompanyId(userData, '[createDraftBudget]')
    } catch (error) {
      log.error('[createDraftBudget] company_id inválido', { error })
      return { success: false, error: 'Usuario sin empresa asignada' }
    }

    // Generar budget_number único si no se proporcionó
    let finalBudgetNumber: string

    if (data.budgetNumber && data.budgetNumber.trim() !== '') {
      // Usuario proporcionó un número personalizado, verificar unicidad
      const trimmedNumber = data.budgetNumber.trim()

      const { data: existingBudget, error: checkError } = await supabaseAdmin
        .from('redpresu_budgets')
        .select('id')
        .eq('budget_number', trimmedNumber)
        .eq('company_id', empresaId)
        .maybeSingle()

      if (checkError) {
        log.error('[createDraftBudget] Error verificando unicidad:', checkError)
        return { success: false, error: 'Error al verificar número de presupuesto' }
      }

      if (existingBudget) {
        return { success: false, error: `El número de presupuesto "${trimmedNumber}" ya existe. Por favor, usa otro número.` }
      }

      finalBudgetNumber = trimmedNumber
      log.info('[createDraftBudget] Usando budget_number proporcionado:', finalBudgetNumber)
    } else {
      // Generar automáticamente un budget_number único
      const now = new Date()
      let secondsToAdd = 0
      const maxAttempts = 100
      let found = false

      for (let attempt = 0; attempt < maxAttempts && !found; attempt++) {
        const candidateDate = new Date(now)
        candidateDate.setSeconds(candidateDate.getSeconds() + secondsToAdd)

        // Formatear: YYYYMMDD-HHMMSS
        const year = candidateDate.getFullYear()
        const month = String(candidateDate.getMonth() + 1).padStart(2, '0')
        const day = String(candidateDate.getDate()).padStart(2, '0')
        const hour = String(candidateDate.getHours()).padStart(2, '0')
        const minute = String(candidateDate.getMinutes()).padStart(2, '0')
        const second = String(candidateDate.getSeconds()).padStart(2, '0')

        const candidateNumber = `${year}${month}${day}-${hour}${minute}${second}`

        // Verificar si existe en BD
        const { data: existingBudget, error: checkError } = await supabaseAdmin
          .from('redpresu_budgets')
          .select('id')
          .eq('budget_number', candidateNumber)
          .eq('company_id', empresaId)
          .maybeSingle()

        if (checkError) {
          log.error('[createDraftBudget] Error verificando budget_number:', checkError)
          // Continuar con el intento actual
        }

        if (!existingBudget) {
          // Número disponible
          finalBudgetNumber = candidateNumber
          found = true
          log.info('[createDraftBudget] Budget_number único generado:', {
            numero: finalBudgetNumber,
            intentos: attempt + 1,
            segundos_sumados: secondsToAdd
          })
        } else {
          // Ya existe, probar siguiente
          secondsToAdd++
        }
      }

      if (!found) {
        // Fallback: usar timestamp con milisegundos
        log.warn('[createDraftBudget] No se encontró número único tras ' + maxAttempts + ' intentos, usando milisegundos')
        const year = now.getFullYear()
        const month = String(now.getMonth() + 1).padStart(2, '0')
        const day = String(now.getDate()).padStart(2, '0')
        const hour = String(now.getHours()).padStart(2, '0')
        const minute = String(now.getMinutes()).padStart(2, '0')
        const second = String(now.getSeconds()).padStart(2, '0')
        const millisecond = String(now.getMilliseconds()).padStart(3, '0')
        finalBudgetNumber = `${year}${month}${day}-${hour}${minute}${second}${millisecond.substring(0, 1)}`
      }
    }

    // Calcular IVA
    const iva = data.totals.total - data.totals.base

    // Helper para normalizar formato de números (convertir punto a coma)
    const normalizeNumberFormat = (value: string | undefined): string | undefined => {
      if (value === undefined) return undefined
      return String(value).replace('.', ',')
    }

    // Inicializar json_budget_data con copia de tariffData
    // Si tariffData ya tiene cantidades (viene de handleSaveBudget), preservarlas (normalizando formato)
    // Si no tiene cantidades (viene de handleStep1Continue), inicializar en 0,00
    const initialBudgetData = (data.tariffData as BudgetDataItem[]).map(item => ({
      ...item,
      quantity: item.quantity !== undefined
        ? normalizeNumberFormat(item.quantity)
        : (item.level === 'item' ? '0,00' : undefined),
      amount: item.amount !== undefined
        ? normalizeNumberFormat(item.amount)
        : '0,00'
    }))

    // Crear snapshot de datos del cliente para versionado
    const jsonClientData = {
      client_type: data.clientData.client_type,
      client_name: data.clientData.client_name,
      client_nif_nie: data.clientData.client_nif_nie,
      client_phone: data.clientData.client_phone,
      client_email: data.clientData.client_email,
      client_web: data.clientData.client_web,
      client_address: data.clientData.client_address,
      client_postal_code: data.clientData.client_postal_code,
      client_locality: data.clientData.client_locality,
      client_province: data.clientData.client_province,
      client_acceptance: data.clientData.client_acceptance
    }

    // Crear borrador con retry en caso de race condition
    let budget: any = null
    let insertSuccess = false
    const maxInsertRetries = 10
    let currentBudgetNumber = finalBudgetNumber
    const baseTimestamp = new Date()

    for (let retryCount = 0; retryCount < maxInsertRetries && !insertSuccess; retryCount++) {
      const { data: insertedBudget, error: insertError } = await supabaseAdmin
        .from('redpresu_budgets')
        .insert({
          company_id: empresaId,
          tariff_id: data.tariffId,
          user_id: user.id,
          budget_number: currentBudgetNumber,
          json_tariff_data: data.tariffData,
          json_budget_data: initialBudgetData,
          json_client_data: jsonClientData,
          parent_budget_id: null,
          version_number: 1,
          client_type: data.clientData.client_type,
          client_name: data.clientData.client_name,
          client_nif_nie: data.clientData.client_nif_nie,
          client_phone: data.clientData.client_phone,
          client_email: data.clientData.client_email,
          client_web: data.clientData.client_web || null,
          client_address: data.clientData.client_address,
          client_postal_code: data.clientData.client_postal_code,
          client_locality: data.clientData.client_locality,
          client_province: data.clientData.client_province,
          client_acceptance: data.clientData.client_acceptance,
          status: BudgetStatus.BORRADOR,
          total: data.totals.total,
          iva: iva,
          base: data.totals.base,
          irpf: 0,
          irpf_percentage: 0,
          re_apply: false,
          re_total: 0,
          total_pay: data.totals.total,
          validity_days: data.validity,
          start_date: null,
          end_date: null
        })
        .select()
        .single()

      if (insertedBudget && !insertError) {
        // Éxito
        budget = insertedBudget
        insertSuccess = true
        if (retryCount > 0) {
          log.info('[createDraftBudget] INSERT exitoso tras race condition:', {
            budget_number: currentBudgetNumber,
            intentos: retryCount + 1
          })
        }
      } else if (insertError) {
        // Verificar si el error es por duplicate key (race condition)
        const isDuplicateError = insertError.code === '23505' ||
                                insertError.message?.includes('duplicate') ||
                                insertError.message?.includes('unique')

        if (isDuplicateError && retryCount < maxInsertRetries - 1) {
          // Race condition detectada, generar nuevo número y reintentar
          const newDate = new Date(baseTimestamp)
          newDate.setSeconds(newDate.getSeconds() + retryCount + 1)

          const year = newDate.getFullYear()
          const month = String(newDate.getMonth() + 1).padStart(2, '0')
          const day = String(newDate.getDate()).padStart(2, '0')
          const hour = String(newDate.getHours()).padStart(2, '0')
          const minute = String(newDate.getMinutes()).padStart(2, '0')
          const second = String(newDate.getSeconds()).padStart(2, '0')

          currentBudgetNumber = `${year}${month}${day}-${hour}${minute}${second}`

          log.warn('[createDraftBudget] Race condition detectada, reintentando:', {
            intento: retryCount + 1,
            nuevo_numero: currentBudgetNumber,
            error: insertError.message
          })
        } else {
          // Error diferente o se agotaron los reintentos
          log.error('[createDraftBudget] Error creando borrador:', insertError)
          return { success: false, error: isDuplicateError
            ? 'No se pudo generar un número único después de ' + maxInsertRetries + ' intentos'
            : 'Error al crear borrador' }
        }
      }
    }

    if (!insertSuccess || !budget) {
      log.error('[createDraftBudget] Falló INSERT tras ' + maxInsertRetries + ' intentos')
      return { success: false, error: 'Error al crear presupuesto después de múltiples intentos' }
    }

    log.info('[createDraftBudget] Borrador creado:', budget.id)
    revalidatePath('/budgets')

    return { success: true, budgetId: budget.id }

  } catch (error) {
    log.error('[createDraftBudget] Error crítico:', error)
    return { success: false, error: 'Error interno del servidor' }
  }
}

/**
 * Actualizar borrador existente (auto-guardado)
 */
export async function updateBudgetDraft(
  budgetId: string,
  data: {
    clientData?: ClientData
    budgetData: unknown[]
    totals?: { base: number; total: number }
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    log.info('[updateBudgetDraft] Actualizando borrador:', budgetId)

    const cookieStore = await cookies()
    const supabase = createServerActionClient({ cookies: () => cookieStore })

    // Obtener usuario actual
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      log.error('[updateBudgetDraft] Error de autenticación:', authError)
      return { success: false, error: 'No autenticado' }
    }

    // SECURITY: Obtener datos del usuario actual (VULN-010)
    const { data: userData, error: userError } = await supabase
      .from('redpresu_users')
      .select('company_id, role')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      log.error('[updateBudgetDraft] Error obteniendo usuario:', userError)
      return { success: false, error: 'Usuario no encontrado' }
    }

    // SECURITY: Verificar que el usuario es owner del budget (VULN-010)
    const { data: existingBudget, error: budgetError } = await supabaseAdmin
      .from('redpresu_budgets')
      .select('user_id, status, company_id')
      .eq('id', budgetId)
      .single()

    if (budgetError || !existingBudget) {
      log.error('[updateBudgetDraft] Budget no encontrado:', budgetError)
      return { success: false, error: 'Presupuesto no encontrado' }
    }

    // Validar ownership
    if (existingBudget.user_id !== user.id) {
      log.error('[updateBudgetDraft] Usuario no autorizado')
      return { success: false, error: 'No autorizado' }
    }

    // Validar company_id (defensa en profundidad)
    if (existingBudget.company_id !== userData.company_id) {
      log.error('[updateBudgetDraft] Intento de acceso cross-company:', {
        userId: user.id,
        userCompany: userData.company_id,
        budgetCompany: existingBudget.company_id
      })
      return { success: false, error: 'No autorizado' }
    }

    // Solo permitir actualizar borradores
    if (existingBudget.status !== BudgetStatus.BORRADOR) {
      log.error('[updateBudgetDraft] Solo se pueden actualizar borradores')
      return { success: false, error: 'Solo se pueden actualizar borradores' }
    }

    // Preparar datos a actualizar
    const updateData: Record<string, unknown> = {
      json_budget_data: data.budgetData,
      updated_at: new Date().toISOString()
    }

    // Si se proporcionan totals, actualizar también
    if (data.totals) {
      const iva = data.totals.total - data.totals.base
      updateData.total = data.totals.total
      updateData.iva = iva
      updateData.base = data.totals.base
    }

    // Si hay clientData, actualizar también
    if (data.clientData) {
      updateData.client_type = data.clientData.client_type
      updateData.client_name = data.clientData.client_name
      updateData.client_nif_nie = data.clientData.client_nif_nie
      updateData.client_phone = data.clientData.client_phone
      updateData.client_email = data.clientData.client_email
      updateData.client_web = data.clientData.client_web || null
      updateData.client_address = data.clientData.client_address
      updateData.client_postal_code = data.clientData.client_postal_code
      updateData.client_locality = data.clientData.client_locality
      updateData.client_province = data.clientData.client_province
      updateData.client_acceptance = data.clientData.client_acceptance
    }

    // Actualizar
    const { error: updateError } = await supabaseAdmin
      .from('redpresu_budgets')
      .update(updateData)
      .eq('id', budgetId)

    if (updateError) {
      log.error('[updateBudgetDraft] Error actualizando:', updateError)
      return { success: false, error: 'Error al actualizar' }
    }

    log.info('[updateBudgetDraft] Borrador actualizado exitosamente')
    return { success: true }

  } catch (error) {
    log.error('[updateBudgetDraft] Error crítico:', error)
    return { success: false, error: 'Error interno del servidor' }
  }
}

/**
 * Guardar presupuesto (botón Guardar)
 */
export async function saveBudget(
  budgetId: string,
  totals: { base: number; total: number },
  budgetData: BudgetDataItem[],
  clientData?: {
    client_type: string
    client_name: string
    client_nif_nie: string
    client_phone: string
    client_email: string
    client_web?: string
    client_address: string
    client_postal_code: string
    client_locality: string
    client_province: string
    client_acceptance: boolean
  },
  recargoData?: {
    aplica: boolean
    recargos: Record<number, number>
  }
): Promise<{ success: boolean; error?: string; had_pdf?: boolean }> {
  try {
    const cookieStore = await cookies()
    const supabase = createServerActionClient({ cookies: () => cookieStore })

    // Obtener usuario actual
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      log.error('[saveBudget] Error de autenticación:', authError)
      return { success: false, error: 'No autenticado' }
    }

    // SECURITY: Obtener datos del usuario actual (VULN-010)
    const { data: userData, error: userError } = await supabase
      .from('redpresu_users')
      .select('company_id, role')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      log.error('[saveBudget] Error obteniendo usuario:', userError)
      return { success: false, error: 'Usuario no encontrado' }
    }

    // SECURITY: Obtener budget y validar ownership (VULN-010)
    const { data: budget, error: budgetError } = await supabaseAdmin
      .from('redpresu_budgets')
      .select('*')
      .eq('id', budgetId)
      .single()

    if (budgetError || !budget) {
      log.error('[saveBudget] Budget no encontrado:', budgetError)
      return { success: false, error: 'Presupuesto no encontrado' }
    }

    // Validar ownership
    if (budget.user_id !== user.id) {
      log.error('[saveBudget] Usuario no autorizado')
      return { success: false, error: 'No autorizado' }
    }

    // Validar company_id (defensa en profundidad)
    if (budget.company_id !== userData.company_id) {
      log.error('[saveBudget] Intento de acceso cross-company:', {
        userId: user.id,
        userCompany: userData.company_id,
        budgetCompany: budget.company_id
      })
      return { success: false, error: 'No autorizado' }
    }

    // Validar que hay al menos una partida con cantidad > 0 usando datos del request
    const hasItems = budgetData.some(item => {
      if (item.level !== 'item') return false

      // Parsear cantidad manejando formato español (coma como decimal)
      const quantityStr = (item.quantity || '0').toString()
      const quantity = parseFloat(quantityStr.replace(',', '.'))

      return quantity > 0
    })

    if (!hasItems) {
      return { success: false, error: 'Debe incluir al menos un elemento con cantidad' }
    }

    // Calcular IVA
    const iva = totals.total - totals.base

    // Obtener datos del emisor para calcular IRPF
    const issuer = await getUserIssuer(user.id)

    // Determinar tipo de cliente
    const clientType = (clientData?.client_type || budget.client_type) as ClientType

    // Calcular IRPF si aplica
    let irpfAmount = 0
    let irpfPercentage = 0

    if (issuer) {
      const aplicaIRPF = shouldApplyIRPF(issuer.type, clientType)

      if (aplicaIRPF && issuer.irpf_percentage) {
        irpfPercentage = issuer.irpf_percentage
        irpfAmount = calculateIRPF(totals.base, irpfPercentage)
        log.info('[saveBudget] IRPF aplicable:', {
          emisorTipo: issuer.type,
          clienteTipo: clientType,
          porcentaje: irpfPercentage,
          baseImponible: totals.base,
          irpfAmount
        })
      } else {
        log.info('[saveBudget] IRPF NO aplica:', {
          emisorTipo: issuer.type,
          clienteTipo: clientType
        })
      }
    } else {
      log.warn('[saveBudget] No se pudo obtener datos del emisor, IRPF = 0')
    }

    // Calcular Recargo de Equivalencia si aplica
    let reByIVA: Record<number, number> = {}
    let totalRE = 0

    if (recargoData?.aplica && Object.keys(recargoData.recargos).length > 0) {
      log.info('[saveBudget] Calculando RE:', recargoData.recargos)
      reByIVA = calculateRecargo(budgetData as FiscalBudgetItem[], recargoData.recargos)
      totalRE = getTotalRecargo(reByIVA)
      log.info('[saveBudget] RE calculado:', { reByIVA, totalRE })
    }

    // Calcular total a pagar (total con IVA - IRPF + RE)
    const totalPagar = totals.total - irpfAmount + totalRE

    // Preparar json_budget_data extendido con info de RE
    let extendedBudgetData: any = budgetData

    if (recargoData?.aplica) {
      // Añadir metadatos de RE al budgetData
      extendedBudgetData = {
        items: budgetData,
        recargo: {
          aplica: true,
          recargos: recargoData.recargos,
          reByIVA: reByIVA,
          totalRE: totalRE
        }
      }
    }

    // Calcular fechas
    const startDate = new Date()
    const endDate = new Date(startDate)
    if (budget.validity_days) {
      endDate.setDate(endDate.getDate() + budget.validity_days)
    }

    // Detectar si había PDF para informar al frontend
    const hadPdf = !!budget.pdf_url

    // Preparar datos de actualización
    const updateData: any = {
      status: BudgetStatus.BORRADOR,
      total: totals.total,
      iva: iva,
      base: totals.base,
      irpf: irpfAmount,
      irpf_percentage: irpfPercentage,
      re_apply: recargoData?.aplica || false,
      re_total: totalRE,
      total_pay: totalPagar,
      json_budget_data: extendedBudgetData,
      start_date: startDate.toISOString(),
      end_date: budget.validity_days ? endDate.toISOString() : null,
      updated_at: new Date().toISOString()
    }

    // Si hay clientData, actualizar campos del cliente
    if (clientData) {
      updateData.client_type = clientData.client_type
      updateData.client_name = clientData.client_name
      updateData.client_nif_nie = clientData.client_nif_nie
      updateData.client_phone = clientData.client_phone
      updateData.client_email = clientData.client_email
      updateData.client_web = clientData.client_web || null
      updateData.client_address = clientData.client_address
      updateData.client_postal_code = clientData.client_postal_code
      updateData.client_locality = clientData.client_locality
      updateData.client_province = clientData.client_province
      updateData.client_acceptance = clientData.client_acceptance
    }

    // Si había PDF, eliminarlo (tanto URL como archivo físico)
    if (hadPdf) {
      updateData.pdf_url = null

      // Eliminar archivo físico
      try {
        const fs = require('fs')
        const path = require('path')
        const filePath = path.join(process.cwd(), 'public', budget.pdf_url)
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath)
          log.info('[saveBudget] PDF físico eliminado:', filePath)
        }
      } catch (fsError) {
        log.error('[saveBudget] Error eliminando PDF físico:', fsError)
        // No fallar el guardado por error de eliminación de archivo
      }
    }

    // Si es la primera vez que se guarda (notas vacías), copiar notas de la tarifa
    if (!budget.summary_note || !budget.conditions_note) {
      const { data: tariff, error: tariffError } = await supabaseAdmin
        .from('redpresu_tariffs')
        .select('summary_note, conditions_note')
        .eq('id', budget.tariff_id)
        .single()

      if (!tariffError && tariff) {
        if (!budget.summary_note) {
          updateData.summary_note = tariff.summary_note || ''
        }
        if (!budget.conditions_note) {
          updateData.conditions_note = tariff.conditions_note || ''
        }
        log.info('[saveBudget] Notas copiadas de la tarifa')
      }
    }

    // Actualizar como borrador
    const { error: updateError } = await supabaseAdmin
      .from('redpresu_budgets')
      .update(updateData)
      .eq('id', budgetId)

    if (updateError) {
      log.error('[saveBudget] Error actualizando:', updateError)
      return { success: false, error: 'Error al guardar presupuesto' }
    }

    log.info('[saveBudget] Presupuesto guardado como borrador')
    revalidatePath('/budgets')

    return { success: true, had_pdf: hadPdf }

  } catch (error) {
    // SECURITY (VULN-013): Sanitizar error para producción
    const sanitized = sanitizeError(error, {
      context: 'saveBudget',
      category: 'database',
      metadata: { budgetId }
    })
    return { success: false, error: sanitized.userMessage }
  }
}

/**
 * Duplicar presupuesto (crear nuevo a partir de existente)
 */
export async function duplicateBudget(
  originalBudgetId: string,
  newData: {
    clientData: {
      client_type: string
      client_name: string
      client_nif_nie: string
      client_phone: string
      client_email: string
      client_web?: string
      client_address: string
      client_postal_code: string
      client_locality: string
      client_province: string
      client_acceptance: boolean
    }
    budgetData: BudgetDataItem[]
    totals: { base: number; total: number }
    recargo?: { aplica: boolean; recargos: Record<number, number> }
    asVersion?: boolean  // Si true, se crea como versión hijo
  }
): Promise<{ success: boolean; newBudgetId?: string; budgetId?: string; error?: string }> {
  try {
    log.info('[duplicateBudget] Duplicando presupuesto:', originalBudgetId)

    const cookieStore = await cookies()
    const supabase = createServerActionClient({ cookies: () => cookieStore })

    // Obtener usuario actual
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      log.error('[duplicateBudget] Error de autenticación:', authError)
      return { success: false, error: 'No autenticado' }
    }

    // SECURITY: Obtener datos del usuario actual (VULN-010)
    const { data: userData, error: userError } = await supabase
      .from('redpresu_users')
      .select('company_id, role')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      log.error('[duplicateBudget] Error obteniendo usuario:', userError)
      return { success: false, error: 'Usuario no encontrado' }
    }

    // Obtener budget original para copiar datos base
    const { data: originalBudget, error: budgetError } = await supabaseAdmin
      .from('redpresu_budgets')
      .select('*')
      .eq('id', originalBudgetId)
      .single()

    if (budgetError || !originalBudget) {
      log.error('[duplicateBudget] Budget original no encontrado:', budgetError)
      return { success: false, error: 'Presupuesto original no encontrado' }
    }

    // SECURITY: Validar ownership del presupuesto original (VULN-010)
    if (originalBudget.user_id !== user.id) {
      log.error('[duplicateBudget] Usuario no autorizado para duplicar este presupuesto')
      return { success: false, error: 'No autorizado' }
    }

    // SECURITY: Validar company_id (defensa en profundidad)
    if (originalBudget.company_id !== userData.company_id) {
      log.error('[duplicateBudget] Intento de acceso cross-company:', {
        userId: user.id,
        userCompany: userData.company_id,
        budgetCompany: originalBudget.company_id
      })
      return { success: false, error: 'No autorizado' }
    }

    // Calcular IVA
    const iva = newData.totals.total - newData.totals.base

    // Calcular fechas de validez
    const startDate = new Date()
    const endDate = new Date(startDate)
    if (originalBudget.validity_days) {
      endDate.setDate(endDate.getDate() + originalBudget.validity_days)
    }

    log.info('[duplicateBudget] Fechas calculadas:', {
      validity_days: originalBudget.validity_days,
      start_date: startDate.toISOString(),
      end_date: originalBudget.validity_days ? endDate.toISOString() : null
    })

    // Determinar parent_budget_id y version_number si es versión
    let parentBudgetId: string | null = null
    let versionNumber = 1

    if (newData.asVersion) {
      parentBudgetId = originalBudgetId

      // Obtener el siguiente número de versión usando la función SQL
      const { data: nextVersionData, error: versionError } = await supabaseAdmin
        .rpc('get_next_budget_version_number', { p_parent_budget_id: originalBudgetId })

      if (versionError) {
        log.error('[duplicateBudget] Error obteniendo version_number:', versionError)
      } else {
        versionNumber = nextVersionData as number
      }

      log.info('[duplicateBudget] Creando como versión hijo:', {
        parent_budget_id: parentBudgetId,
        version_number: versionNumber
      })
    }

    // Calcular IRPF y RE si corresponde
    const issuer = await getUserIssuer(user.id)

    if (!issuer) {
      log.warn('[duplicateBudget] Usuario sin issuer:', user.id, '- usando valores por defecto')
    }

    const issuerType = issuer?.type || 'empresa'
    const issuerIRPFPercentage = issuer?.irpf_percentage || 15

    let irpf = 0
    let irpfPercentage = 0
    let totalPagar = newData.totals.total
    let hasFiscalChanges = false // Track si hay IRPF o RE

    if (shouldApplyIRPF(issuerType, newData.clientData.client_type as ClientType)) {
      irpfPercentage = issuerIRPFPercentage
      irpf = calculateIRPF(newData.totals.base, irpfPercentage)
      totalPagar -= irpf
      hasFiscalChanges = true
      log.info('[duplicateBudget] IRPF aplicado:', { irpfPercentage, irpf, base: newData.totals.base })
    }

    // Calcular RE si aplica y hay datos
    let jsonBudgetData: any = newData.budgetData
    if (newData.recargo?.aplica && newData.recargo.recargos) {
      const reByIVA = calculateRecargo(newData.budgetData as any[], newData.recargo.recargos)
      const totalRE = getTotalRecargo(reByIVA)

      totalPagar += totalRE
      hasFiscalChanges = true

      // Incluir datos de recargo en json_budget_data
      jsonBudgetData = {
        items: newData.budgetData,
        recargo: {
          aplica: true,
          recargos: newData.recargo.recargos,
          reByIVA,
          totalRE
        }
      }
    }

    // Crear NUEVO presupuesto con los datos actualizados
    const { data: newBudget, error: insertError } = await supabaseAdmin
      .from('redpresu_budgets')
      .insert({
        company_id: originalBudget.company_id,
        user_id: user.id,
        tariff_id: originalBudget.tariff_id,
        status: BudgetStatus.BORRADOR,

        // Jerarquía de versiones
        parent_budget_id: parentBudgetId,
        version_number: versionNumber,

        // Copiar json_tariff_data del original (requerido)
        json_tariff_data: originalBudget.json_tariff_data,

        // Datos del cliente (actualizados)
        client_type: newData.clientData.client_type,
        client_name: newData.clientData.client_name,
        client_nif_nie: newData.clientData.client_nif_nie,
        client_phone: newData.clientData.client_phone,
        client_email: newData.clientData.client_email,
        client_web: newData.clientData.client_web || null,
        client_address: newData.clientData.client_address,
        client_postal_code: newData.clientData.client_postal_code,
        client_locality: newData.clientData.client_locality,
        client_province: newData.clientData.client_province,
        client_acceptance: newData.clientData.client_acceptance,

        // Snapshot de datos cliente (para versionado)
        json_client_data: {
          client_type: newData.clientData.client_type,
          client_name: newData.clientData.client_name,
          client_nif_nie: newData.clientData.client_nif_nie,
          client_phone: newData.clientData.client_phone,
          client_email: newData.clientData.client_email,
          client_web: newData.clientData.client_web,
          client_address: newData.clientData.client_address,
          client_postal_code: newData.clientData.client_postal_code,
          client_locality: newData.clientData.client_locality,
          client_province: newData.clientData.client_province,
          client_acceptance: newData.clientData.client_acceptance
        },

        // Datos del presupuesto (actualizados)
        json_budget_data: jsonBudgetData,
        total: newData.totals.total,
        iva: iva,
        base: newData.totals.base,

        // Datos fiscales
        irpf: irpf > 0 ? irpf : null,
        irpf_percentage: irpfPercentage > 0 ? irpfPercentage : null,
        total_pay: totalPagar, // Siempre asignar, puede ser igual a total o modificado

        // Fechas y validez
        validity_days: originalBudget.validity_days,
        start_date: startDate.toISOString(),
        end_date: originalBudget.validity_days ? endDate.toISOString() : null,

        // Sin PDF (se genera después si se desea)
        pdf_url: null
      })
      .select()
      .single()

    if (insertError || !newBudget) {
      log.error('[duplicateBudget] Error creando nuevo presupuesto:', insertError)
      return { success: false, error: 'Error al duplicar presupuesto' }
    }

    log.info('[duplicateBudget] Nuevo presupuesto creado:', newBudget.id)
    revalidatePath('/budgets')

    return { success: true, budgetId: newBudget.id, newBudgetId: newBudget.id }

  } catch (error) {
    log.error('[duplicateBudget] Error crítico:', error)
    return { success: false, error: 'Error interno del servidor' }
  }
}

/**
 * Actualizar estado de presupuesto con validación de transiciones
 */
export async function updateBudgetStatus(
  budgetId: string,
  newStatus: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const cookieStore = await cookies()
    const supabase = createServerActionClient({ cookies: () => cookieStore })

    // Obtener usuario actual
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      log.error('[updateBudgetStatus] Error de autenticación:', authError)
      return { success: false, error: 'No autenticado' }
    }

    // SECURITY: Obtener datos del usuario actual (VULN-010)
    const { data: userData, error: userError } = await supabase
      .from('redpresu_users')
      .select('company_id, role')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      log.error('[updateBudgetStatus] Error obteniendo usuario:', userError)
      return { success: false, error: 'Usuario no encontrado' }
    }

    // SECURITY: Obtener budget y validar ownership (VULN-010)
    const { data: budget, error: budgetError } = await supabaseAdmin
      .from('redpresu_budgets')
      .select('*')
      .eq('id', budgetId)
      .single()

    if (budgetError || !budget) {
      log.error('[updateBudgetStatus] Budget no encontrado:', budgetError)
      return { success: false, error: 'Presupuesto no encontrado' }
    }

    // Validar ownership
    if (budget.user_id !== user.id) {
      log.error('[updateBudgetStatus] Usuario no autorizado')
      return { success: false, error: 'No autorizado' }
    }

    // Validar company_id (defensa en profundidad)
    if (budget.company_id !== userData.company_id) {
      log.error('[updateBudgetStatus] Intento de acceso cross-company:', {
        userId: user.id,
        userCompany: userData.company_id,
        budgetCompany: budget.company_id
      })
      return { success: false, error: 'No autorizado' }
    }

    // Permitir transición a cualquier estado
    // Ya no se validan transiciones específicas - se puede cambiar de cualquier estado a cualquier otro
    const currentStatus = budget.status

    // Validar que el nuevo estado sea válido
    const validStatuses = [
      BudgetStatus.BORRADOR,
      BudgetStatus.PENDIENTE,
      BudgetStatus.ENVIADO,
      BudgetStatus.APROBADO,
      BudgetStatus.RECHAZADO,
      BudgetStatus.CADUCADO
    ]

    if (!validStatuses.includes(newStatus as BudgetStatus)) {
      return {
        success: false,
        error: `Estado "${newStatus}" no válido`
      }
    }

    // Actualizar estado
    const { error: updateError } = await supabaseAdmin
      .from('redpresu_budgets')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', budgetId)

    if (updateError) {
      log.error('[updateBudgetStatus] Error actualizando:', updateError)
      return { success: false, error: 'Error al actualizar estado' }
    }

    log.info('[updateBudgetStatus] Estado actualizado:', currentStatus, '→', newStatus)
    revalidatePath('/budgets')

    return { success: true }

  } catch (error) {
    log.error('[updateBudgetStatus] Error crítico:', error)
    return { success: false, error: 'Error interno del servidor' }
  }
}

/**
 * Recuperar borrador existente
 */
export async function getBudgetById(
  budgetId: string
): Promise<Budget | null> {
  try {
    log.info('[getBudgetById] Obteniendo budget:', budgetId)

    const cookieStore = await cookies()
    const supabase = createServerActionClient({ cookies: () => cookieStore })

    // Obtener usuario actual
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      log.error('[getBudgetById] Error de autenticación:', authError)
      return null
    }

    // SECURITY: Obtener datos del usuario actual (VULN-010)
    const { data: userData, error: userError } = await supabase
      .from('redpresu_users')
      .select('company_id, role')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      log.error('[getBudgetById] Error obteniendo usuario:', userError)
      return null
    }

    // Obtener budget (RLS se encargará de verificar permisos, pero añadimos defensa en profundidad)
    const { data: budget, error: budgetError } = await supabase
      .from('redpresu_budgets')
      .select('*')
      .eq('id', budgetId)
      .single()

    if (budgetError || !budget) {
      log.error('[getBudgetById] Budget no encontrado:', budgetError)
      return null
    }

    // SECURITY: Validar ownership/company_id (defensa en profundidad sobre RLS) - VULN-010
    if (budget.user_id !== user.id && budget.company_id !== userData.company_id) {
      log.error('[getBudgetById] Usuario no autorizado:', {
        userId: user.id,
        budgetUserId: budget.user_id,
        userCompany: userData.company_id,
        budgetCompany: budget.company_id
      })
      return null
    }

    log.info('[getBudgetById] Budget encontrado:', budget.id)
    return budget as Budget

  } catch (error) {
    log.error('[getBudgetById] Error crítico:', error)
    return null
  }
}

/**
 * Sanitiza nombre de archivo removiendo caracteres especiales
 */
function sanitizeFilename(filename: string): string {
  return filename
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Eliminar acentos
    .replace(/[^a-z0-9_-]/g, '_') // Solo letras, números, guiones y guiones bajos
    .replace(/_+/g, '_') // Múltiples _ a uno solo
    .substring(0, 100) // Máximo 100 caracteres
}

/**
 * Generar PDF desde presupuesto con Rapid-PDF API
 */
export async function generateBudgetPDF(budgetId: string): Promise<{
  success: boolean
  pdf_url?: string
  debug?: boolean
  payload?: any
  error?: string
}> {
  const fs = require('fs')
  const path = require('path')

  try {
    log.info('[generateBudgetPDF] Iniciando generación PDF para budget:', budgetId)

    const cookieStore = await cookies()
    const supabase = createServerActionClient({ cookies: () => cookieStore })

    // Obtener usuario actual
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      log.error('[generateBudgetPDF] Error de autenticación:', authError)
      return { success: false, error: 'No autenticado' }
    }

    // SECURITY: Obtener datos del usuario actual (VULN-010)
    const { data: userData, error: userError } = await supabase
      .from('redpresu_users')
      .select('company_id, role')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      log.error('[generateBudgetPDF] Error obteniendo usuario:', userError)
      return { success: false, error: 'Usuario no encontrado' }
    }

    // Obtener budget con join a tariff
    const { data: budget, error: budgetError } = await supabase
      .from('redpresu_budgets')
      .select(`
        *,
        tariff:redpresu_tariffs(*)
      `)
      .eq('id', budgetId)
      .single()

    if (budgetError || !budget) {
      log.error('[generateBudgetPDF] Budget no encontrado:', budgetError)
      return { success: false, error: 'Presupuesto no encontrado' }
    }

    // SECURITY: Validar ownership (VULN-010)
    if (budget.user_id !== user.id) {
      log.error('[generateBudgetPDF] Usuario no autorizado')
      return { success: false, error: 'No autorizado' }
    }

    // SECURITY: Validar company_id (defensa en profundidad)
    if (budget.company_id !== userData.company_id) {
      log.error('[generateBudgetPDF] Intento de acceso cross-company:', {
        userId: user.id,
        userCompany: userData.company_id,
        budgetCompany: budget.company_id
      })
      return { success: false, error: 'No autorizado' }
    }

    // Validar que exista tariff
    if (!budget.tariff) {
      log.error('[generateBudgetPDF] Tarifa no encontrada para budget:', budgetId)
      return { success: false, error: 'Tarifa no encontrada' }
    }

    const budgetTyped = budget as Budget
    const tariffTyped = budget.tariff as Tariff

    // 1. Construir payload
    log.info('[generateBudgetPDF] Construyendo payload...')
    const payload = await buildPDFPayload(budgetTyped, tariffTyped)

    // Obtener modo de aplicación para logs
    const { isDevelopmentMode } = await import('@/lib/helpers/config-helpers')
    const isDev = await isDevelopmentMode()

    // MODO DEBUG: Solo mostrar payload, no llamar API (activar con RAPID_PDF_DEBUG_ONLY=true)
    if (process.env.RAPID_PDF_DEBUG_ONLY === 'true') {
      log.info('[generateBudgetPDF] Modo debug: payload construido, no se llama a Rapid-PDF')
      log.info('[generateBudgetPDF] Payload:', JSON.stringify(payload, null, 2))

      return {
        success: true,
        debug: true,
        payload
      }
    }

    // En modo desarrollo, imprimir payload en consola antes de enviar a Rapid-PDF
    if (isDev) {
      log.info('\n' + '='.repeat(80))
      log.info('[generateBudgetPDF] 🔍 DEVELOPMENT MODE - PAYLOAD COMPLETO:')
      log.info('='.repeat(80))
      log.info(JSON.stringify(payload, null, 2))
      log.info('='.repeat(80) + '\n')
    }

    // Generar PDF con módulo interno Rapid-PDF
    log.info('[generateBudgetPDF] Generando PDF con módulo interno...')

    let pdfBuffer: Buffer

    try {
      // Generar PDF con módulo interno
      // El módulo lee la configuración rapid_pdf_mode automáticamente
      const result = await generatePDF(payload, {
        returnBuffer: true, // Solicitar que retorne el buffer del PDF
      })

      if (!result.success) {
        log.error('[generateBudgetPDF] Error generando PDF:', result.error)
        return { success: false, error: result.error }
      }

      if (!result.buffer) {
        log.error('[generateBudgetPDF] No se recibió buffer del PDF')
        return { success: false, error: 'No se generó el buffer del PDF' }
      }

      log.info(
        '[generateBudgetPDF] PDF generado exitosamente en',
        result.processingTime,
        'ms'
      )

      // Asignar el buffer del PDF
      pdfBuffer = result.buffer

    } catch (moduleError) {
      log.error('[generateBudgetPDF] Error generando PDF:', moduleError)
      return {
        success: false,
        error: `Error generando PDF: ${moduleError instanceof Error ? moduleError.message : 'Unknown error'}`
      }
    }

    // 5. Subir PDF a Supabase Storage (privado)
    // Formato: {company_id}/presupuesto_nombre_nif_nie_YYYY-MM-DD_HH-MM-SS.pdf
    const now = new Date()
    const datePart = now.toISOString().split('T')[0] // YYYY-MM-DD
    const timePart = now.toTimeString().split(' ')[0].replace(/:/g, '-') // HH-MM-SS
    const timestamp = `${datePart}_${timePart}`

    const clientName = sanitizeFilename(budgetTyped.client_name)
    const clientNif = sanitizeFilename(budgetTyped.client_nif_nie || 'sin_nif')
    const filename = `presupuesto_${clientName}_${clientNif}_${timestamp}.pdf`

    // SECURITY: Path incluye company_id para RLS policies
    const storagePath = `${budgetTyped.company_id}/${filename}`

    log.info('[generateBudgetPDF] Subiendo a Storage:', storagePath)

    const { error: uploadError } = await supabaseAdmin.storage
      .from('budget-pdfs')
      .upload(storagePath, pdfBuffer!, {
        contentType: 'application/pdf',
        upsert: false, // No sobrescribir si existe (cada PDF es único por timestamp)
      })

    if (uploadError) {
      log.error('[generateBudgetPDF] Error subiendo a Storage:', uploadError)
      return { success: false, error: 'Error guardando PDF en Storage' }
    }

    log.info('[generateBudgetPDF] PDF subido exitosamente a Storage')

    // 6. Actualizar pdf_url en budgets (guardar storage path, no URL pública)
    const { error: updateError } = await supabaseAdmin
      .from('redpresu_budgets')
      .update({ pdf_url: storagePath })
      .eq('id', budgetId)

    if (updateError) {
      log.error('[generateBudgetPDF] Error actualizando pdf_url:', updateError)
      // Intentar limpiar archivo de Storage
      await supabaseAdmin.storage.from('budget-pdfs').remove([storagePath])
      return { success: false, error: 'Error actualizando presupuesto' }
    }

    log.info('[generateBudgetPDF] ✅ PDF generado y guardado exitosamente:', storagePath)
    revalidatePath('/budgets')

    // Generar signed URL para retornar al cliente
    const { data: signedUrlData } = await supabaseAdmin.storage
      .from('budget-pdfs')
      .createSignedUrl(storagePath, 3600) // 1 hora

    return {
      success: true,
      pdf_url: signedUrlData?.signedUrl || storagePath
    }

  } catch (error) {
    // SECURITY (VULN-013): Sanitizar error para producción
    const sanitized = sanitizeError(error, {
      context: 'generateBudgetPDF',
      category: 'network',
      metadata: { budgetId }
    })
    return { success: false, error: sanitized.userMessage }
  }
}

/**
 * Obtener listado de presupuestos con filtros
 */
export async function getBudgets(filters?: {
  status?: string
  search?: string
}): Promise<Budget[]> {
  try {
    log.info('[getBudgets] Obteniendo presupuestos con filtros:', filters)

    // Usar getServerUser() para evitar problemas con cookies en Server Components
    const { getServerUser } = await import('@/lib/auth/server')
    const userData = await getServerUser()

    if (!userData) {
      log.error('[getBudgets] Error de autenticación: usuario no encontrado')
      return []
    }

    log.info('[getBudgets] Usuario:', userData.role, 'Empresa:', userData.company_id)

    // Construir query base con JOIN a tariffs usando supabaseAdmin
    // Nota: users se obtiene por separado ya que la relación puede no estar definida
    let query = supabaseAdmin
      .from('redpresu_budgets')
      .select(`
        *,
        redpresu_tariffs (
          title
        )
      `)

    // Filtrar según rol
    if (userData.role === 'comercial') {
      // Comercial: solo sus presupuestos
      query = query.eq('user_id', userData.id)
    } else if (userData.role === 'admin') {
      // Admin: presupuestos de su empresa
      query = query.eq('company_id', userData.company_id)
    }
    // Superadmin: todos (no filtrar)

    // Aplicar filtro de estado
    if (filters?.status && filters.status !== 'all') {
      query = query.eq('status', filters.status)
    }

    // Aplicar filtro de búsqueda
    if (filters?.search && filters.search.trim() !== '') {
      const searchTerm = filters.search.trim()
      query = query.or(`client_name.ilike.%${searchTerm}%,client_nif_nie.ilike.%${searchTerm}%`)
    }

    // Ordenar por fecha de creación descendente
    query = query.order('created_at', { ascending: false })

    const { data: budgets, error: budgetsError } = await query

    if (budgetsError) {
      log.error('[getBudgets] Error obteniendo presupuestos:', budgetsError)
      log.error('[getBudgets] Error details:', JSON.stringify(budgetsError, null, 2))
      return []
    }

    log.info('[getBudgets] Presupuestos encontrados:', budgets?.length || 0)

    // Obtener nombres y roles de usuarios por separado
    if (budgets && budgets.length > 0) {
      const userIds = [...new Set(budgets.map(b => b.user_id))]
      const { data: users } = await supabaseAdmin
        .from('redpresu_users')
        .select('id, name, role')
        .in('id', userIds)

      // Mapear usuarios a presupuestos
      const usersMap = new Map(users?.map(u => [u.id, { name: u.name, role: u.role }]) || [])
      const budgetsWithUsers = budgets.map(budget => ({
        ...budget,
        users: usersMap.get(budget.user_id) || { name: 'N/A', role: 'N/A' }
      }))

      // Construir jerarquía: separar padres e hijos
      const budgetsMap = new Map(budgetsWithUsers.map(b => [b.id, { ...b, children: [] }]))
      const rootBudgets: Budget[] = []

      budgetsWithUsers.forEach(budget => {
        const budgetWithChildren = budgetsMap.get(budget.id)!

        if (budget.parent_budget_id) {
          // Es un hijo, añadir al padre
          const parent = budgetsMap.get(budget.parent_budget_id)
          if (parent) {
            parent.children = parent.children || []
            parent.children.push(budgetWithChildren)
          } else {
            // Padre no encontrado (filtrado), tratar como raíz
            rootBudgets.push(budgetWithChildren)
          }
        } else {
          // Es raíz
          rootBudgets.push(budgetWithChildren)
        }
      })

      // Ordenar hijos por version_number ascendente
      rootBudgets.forEach(root => {
        if (root.children && root.children.length > 0) {
          root.children.sort((a, b) => (a.version_number || 0) - (b.version_number || 0))
        }
      })

      return rootBudgets as Budget[]
    }

    return (budgets || []) as Budget[]

  } catch (error) {
    log.error('[getBudgets] Error crítico:', error)
    return []
  }
}

/**
 * Eliminar presupuesto
 */
export async function deleteBudget(budgetId: string): Promise<{
  success: boolean
  error?: string
}> {
  try {
    log.info('[deleteBudget] Eliminando presupuesto:', budgetId)

    const cookieStore = await cookies()
    const supabase = createServerActionClient({ cookies: () => cookieStore })

    // Obtener usuario actual
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      log.error('[deleteBudget] Error de autenticación:', authError)
      return { success: false, error: 'No autenticado' }
    }

    // Obtener presupuesto para verificar permisos
    const { data: budget, error: budgetError } = await supabaseAdmin
      .from('redpresu_budgets')
      .select('user_id, pdf_url, company_id')
      .eq('id', budgetId)
      .single()

    if (budgetError || !budget) {
      log.error('[deleteBudget] Presupuesto no encontrado:', budgetError)
      return { success: false, error: 'Presupuesto no encontrado' }
    }

    // Verificar permisos
    const { data: userData, error: userError } = await supabase
      .from('redpresu_users')
      .select('role, company_id')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      log.error('[deleteBudget] Error obteniendo usuario:', userError)
      return { success: false, error: 'Usuario no encontrado' }
    }

    // Validar permisos según rol
    const canDelete =
      budget.user_id === user.id || // Owner
      (userData.role === 'admin' && budget.company_id === userData.company_id) || // Admin de la empresa
      userData.role === 'superadmin' // Superadmin

    if (!canDelete) {
      log.error('[deleteBudget] Usuario no autorizado')
      return { success: false, error: 'No tiene permisos para eliminar este presupuesto' }
    }

    // TODO: Si tiene PDF, eliminar archivo físico del sistema
    // Esto se implementará cuando tengamos el módulo PDF Generation
    if (budget.pdf_url) {
      log.info('[deleteBudget] TODO: Eliminar PDF físico:', budget.pdf_url)
    }

    // Eliminar presupuesto
    const { error: deleteError } = await supabaseAdmin
      .from('redpresu_budgets')
      .delete()
      .eq('id', budgetId)

    if (deleteError) {
      log.error('[deleteBudget] Error eliminando:', deleteError)
      return { success: false, error: 'Error al eliminar presupuesto' }
    }

    log.info('[deleteBudget] Presupuesto eliminado exitosamente')
    revalidatePath('/budgets')

    return { success: true }

  } catch (error) {
    // SECURITY (VULN-013): Sanitizar error para producción
    const sanitized = sanitizeError(error, {
      context: 'deleteBudget',
      category: 'database',
      metadata: { budgetId }
    })
    return { success: false, error: sanitized.userMessage }
  }
}

/**
 * Eliminar solo el PDF de un presupuesto (mantiene el presupuesto)
 */
export async function deleteBudgetPDF(budgetId: string): Promise<{
  success: boolean
  error?: string
}> {
  const fs = require('fs')
  const path = require('path')

  try {
    log.info('[deleteBudgetPDF] Eliminando PDF del presupuesto:', budgetId)

    const cookieStore = await cookies()
    const supabase = createServerActionClient({ cookies: () => cookieStore })

    // Obtener usuario actual
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      log.error('[deleteBudgetPDF] Error de autenticación:', authError)
      return { success: false, error: 'No autenticado' }
    }

    // Obtener presupuesto para verificar permisos y obtener pdf_url
    const { data: budget, error: budgetError } = await supabaseAdmin
      .from('redpresu_budgets')
      .select('user_id, pdf_url, company_id')
      .eq('id', budgetId)
      .single()

    if (budgetError || !budget) {
      log.error('[deleteBudgetPDF] Presupuesto no encontrado:', budgetError)
      return { success: false, error: 'Presupuesto no encontrado' }
    }

    // Verificar permisos
    const { data: userData, error: userError } = await supabase
      .from('redpresu_users')
      .select('role, company_id')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      log.error('[deleteBudgetPDF] Error obteniendo usuario:', userError)
      return { success: false, error: 'Usuario no encontrado' }
    }

    // Validar permisos según rol
    const canDelete =
      budget.user_id === user.id || // Owner
      (userData.role === 'admin' && budget.company_id === userData.company_id) || // Admin de la empresa
      userData.role === 'superadmin' // Superadmin

    if (!canDelete) {
      log.error('[deleteBudgetPDF] Usuario no autorizado')
      return { success: false, error: 'No tiene permisos para eliminar el PDF' }
    }

    // Verificar que existe PDF
    if (!budget.pdf_url) {
      return { success: false, error: 'No hay PDF para eliminar' }
    }

    // Eliminar de Supabase Storage
    try {
      const { error: storageError } = await supabaseAdmin.storage
        .from('budget-pdfs')
        .remove([budget.pdf_url])

      if (storageError) {
        log.error('[deleteBudgetPDF] Error eliminando de Storage:', storageError)
        // Continuar para actualizar BD aunque falle la eliminación del storage
      } else {
        log.info('[deleteBudgetPDF] PDF eliminado de Storage:', budget.pdf_url)
      }
    } catch (storageError) {
      log.error('[deleteBudgetPDF] Error eliminando archivo de Storage:', storageError)
      // Continuar para actualizar BD aunque falle la eliminación del storage
    }

    // Actualizar BD para quitar pdf_url
    const { error: updateError } = await supabaseAdmin
      .from('redpresu_budgets')
      .update({ pdf_url: null })
      .eq('id', budgetId)

    if (updateError) {
      log.error('[deleteBudgetPDF] Error actualizando BD:', updateError)
      return { success: false, error: 'Error al actualizar presupuesto' }
    }

    log.info('[deleteBudgetPDF] PDF eliminado exitosamente')
    revalidatePath('/budgets')

    return { success: true }

  } catch (error) {
    log.error('[deleteBudgetPDF] Error crítico:', error)
    return { success: false, error: 'Error interno del servidor' }
  }
}

/**
 * Obtener URL firmada para descargar PDF desde Supabase Storage
 * SECURITY: Solo permite acceso si el usuario pertenece a la empresa
 *
 * @param budgetId - ID del presupuesto
 * @returns URL firmada válida por 1 hora o error
 */
export async function getBudgetPDFSignedUrl(budgetId: string): Promise<{
  success: boolean
  signedUrl?: string
  error?: string
}> {
  try {
    log.info('[getBudgetPDFSignedUrl] Obteniendo URL firmada para budget:', budgetId)

    const cookieStore = await cookies()
    const supabase = createServerActionClient({ cookies: () => cookieStore })

    // Autenticación
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      log.error('[getBudgetPDFSignedUrl] No autenticado:', authError)
      return { success: false, error: 'No autenticado' }
    }

    // Obtener presupuesto para verificar permisos y pdf_url
    const { data: budget, error: budgetError } = await supabaseAdmin
      .from('redpresu_budgets')
      .select('user_id, pdf_url, company_id')
      .eq('id', budgetId)
      .single()

    if (budgetError || !budget) {
      log.error('[getBudgetPDFSignedUrl] Presupuesto no encontrado:', budgetError)
      return { success: false, error: 'Presupuesto no encontrado' }
    }

    if (!budget.pdf_url) {
      return { success: false, error: 'PDF no disponible' }
    }

    // Verificar permisos (mismo company_id)
    const { data: userData, error: userError } = await supabase
      .from('redpresu_users')
      .select('company_id, role')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      log.error('[getBudgetPDFSignedUrl] Error obteniendo usuario:', userError)
      return { success: false, error: 'Usuario no encontrado' }
    }

    // Autorización: mismo company_id o superadmin
    const isAuthorized =
      userData.company_id === budget.company_id ||
      userData.role === 'superadmin'

    if (!isAuthorized) {
      log.error('[getBudgetPDFSignedUrl] Usuario no autorizado')
      return { success: false, error: 'No tiene permisos para ver este PDF' }
    }

    // Generar URL firmada (1 hora de expiración)
    const { data: signedUrlData, error: storageError } = await supabaseAdmin
      .storage
      .from('budget-pdfs')
      .createSignedUrl(budget.pdf_url, 3600) // 3600s = 1 hora

    if (storageError) {
      log.error('[getBudgetPDFSignedUrl] Error generando signed URL:', storageError)
      return { success: false, error: 'Error generando URL de descarga' }
    }

    if (!signedUrlData?.signedUrl) {
      log.error('[getBudgetPDFSignedUrl] URL firmada vacía')
      return { success: false, error: 'URL de descarga no disponible' }
    }

    log.info('[getBudgetPDFSignedUrl] URL firmada generada exitosamente')
    return {
      success: true,
      signedUrl: signedUrlData.signedUrl
    }

  } catch (error) {
    log.error('[getBudgetPDFSignedUrl] Error crítico:', error)
    return { success: false, error: 'Error interno del servidor' }
  }
}

/**
 * Verificar si el usuario tiene al menos un presupuesto
 */
export async function userHasBudgets(): Promise<boolean> {
  try {
    const cookieStore = await cookies()
    const supabase = createServerActionClient({ cookies: () => cookieStore })

    // Obtener usuario actual
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return false
    }

    // Contar presupuestos del usuario (limitado a 1 para eficiencia)
    const { count, error } = await supabase
      .from('redpresu_budgets')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .limit(1)

    if (error) {
      log.error('[userHasBudgets] Error:', error)
      return false
    }

    return (count || 0) > 0

  } catch (error) {
    log.error('[userHasBudgets] Error crítico:', error)
    return false
  }
}

/**
 * Duplicar presupuesto (crear copia simple, no versión)
 * Crea una copia del presupuesto sin PDF y en estado borrador
 */
export async function duplicateBudgetCopy(budgetId: string): Promise<{
  success: boolean
  newBudgetId?: string
  error?: string
}> {
  try {
    log.info('[duplicateBudgetCopy] Duplicando presupuesto:', budgetId)

    const cookieStore = await cookies()
    const supabase = createServerActionClient({ cookies: () => cookieStore })

    // Obtener usuario actual
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      log.error('[duplicateBudgetCopy] Error de autenticación:', authError)
      return { success: false, error: 'No autenticado' }
    }

    // Obtener company_id del usuario
    const { data: userData, error: userError } = await supabase
      .from('redpresu_users')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (userError || !userData?.company_id) {
      log.error('[duplicateBudgetCopy] Error obteniendo usuario:', userError)
      return { success: false, error: 'No se pudo obtener la empresa del usuario' }
    }

    // Obtener presupuesto original
    const { data: originalBudget, error: budgetError } = await supabaseAdmin
      .from('redpresu_budgets')
      .select('*')
      .eq('id', budgetId)
      .single()

    if (budgetError || !originalBudget) {
      log.error('[duplicateBudgetCopy] Presupuesto no encontrado:', budgetError)
      return { success: false, error: 'Presupuesto no encontrado' }
    }

    // Verificar que el presupuesto pertenece a la empresa del usuario
    if (originalBudget.company_id !== userData.company_id) {
      log.error('[duplicateBudgetCopy] Presupuesto no pertenece a la empresa del usuario')
      return { success: false, error: 'No tienes permisos para duplicar este presupuesto' }
    }

    // Generar nuevo budget_number único sumando segundos hasta encontrar uno disponible
    let newBudgetNumber: string
    let secondsToAdd = 1
    const maxAttempts = 100 // Máximo 100 intentos para evitar bucles infinitos

    try {
      // Parsear el budget_number original (formato: YYYYMMDD-HHMMSS)
      const originalNumber = originalBudget.budget_number
      const datePart = originalNumber.substring(0, 8) // YYYYMMDD
      const timePart = originalNumber.substring(9, 15) // HHMMSS

      // Crear fecha a partir del número original
      const year = parseInt(datePart.substring(0, 4))
      const month = parseInt(datePart.substring(4, 6)) - 1 // 0-indexed
      const day = parseInt(datePart.substring(6, 8))
      const hour = parseInt(timePart.substring(0, 2))
      const minute = parseInt(timePart.substring(2, 4))
      const second = parseInt(timePart.substring(4, 6))

      const originalDate = new Date(year, month, day, hour, minute, second)

      // Intentar generar un budget_number único sumando segundos
      let found = false
      for (let attempt = 0; attempt < maxAttempts && !found; attempt++) {
        // Sumar segundos incrementales
        const newDate = new Date(originalDate)
        newDate.setSeconds(newDate.getSeconds() + secondsToAdd)

        // Formatear nuevo número: YYYYMMDD-HHMMSS
        const newYear = newDate.getFullYear()
        const newMonth = String(newDate.getMonth() + 1).padStart(2, '0')
        const newDay = String(newDate.getDate()).padStart(2, '0')
        const newHour = String(newDate.getHours()).padStart(2, '0')
        const newMinute = String(newDate.getMinutes()).padStart(2, '0')
        const newSecond = String(newDate.getSeconds()).padStart(2, '0')

        const candidateNumber = `${newYear}${newMonth}${newDay}-${newHour}${newMinute}${newSecond}`

        // Verificar si el budget_number ya existe en la BD (filtrar por empresa)
        const { data: existingBudget, error: checkError } = await supabaseAdmin
          .from('redpresu_budgets')
          .select('id')
          .eq('budget_number', candidateNumber)
          .eq('company_id', originalBudget.company_id)
          .maybeSingle()

        if (checkError) {
          log.error('[duplicateBudgetCopy] Error verificando budget_number:', checkError)
          // En caso de error, continuar con el intento actual (puede ser seguro)
        }

        if (!existingBudget) {
          // Budget number disponible, usar este
          newBudgetNumber = candidateNumber
          found = true
          log.info('[duplicateBudgetCopy] Budget_number único encontrado:', {
            original: originalNumber,
            nuevo: newBudgetNumber,
            intentos: attempt + 1,
            segundos_sumados: secondsToAdd
          })
        } else {
          // Ya existe, probar con +1 segundo más
          secondsToAdd++
          log.debug('[duplicateBudgetCopy] Budget_number ocupado, intentando +' + secondsToAdd + ' segundos')
        }
      }

      if (!found) {
        // Si no se encontró después de maxAttempts, usar timestamp actual como fallback
        throw new Error('No se pudo generar budget_number único después de ' + maxAttempts + ' intentos')
      }

    } catch (error) {
      // Fallback: usar timestamp actual si falla el parsing o no se encuentra número único
      log.warn('[duplicateBudgetCopy] Error generando budget_number, usando timestamp actual:', error)
      const now = new Date()
      const year = now.getFullYear()
      const month = String(now.getMonth() + 1).padStart(2, '0')
      const day = String(now.getDate()).padStart(2, '0')
      const hour = String(now.getHours()).padStart(2, '0')
      const minute = String(now.getMinutes()).padStart(2, '0')
      const second = String(now.getSeconds()).padStart(2, '0')
      const millisecond = String(now.getMilliseconds()).padStart(3, '0')
      newBudgetNumber = `${year}${month}${day}-${hour}${minute}${second}${millisecond.substring(0, 1)}`
    }

    // Actualizar json_client_data con nombre modificado
    let updatedJsonClientData = originalBudget.json_client_data
    if (updatedJsonClientData && typeof updatedJsonClientData === 'object') {
      try {
        // Crear copia del objeto y modificar client_name
        updatedJsonClientData = {
          ...updatedJsonClientData,
          client_name: `${originalBudget.client_name} (Copia)`
        }
      } catch (error) {
        log.warn('[duplicateBudgetCopy] Error actualizando json_client_data:', error)
        // Si falla, usar el original
        updatedJsonClientData = originalBudget.json_client_data
      }
    }

    // Crear copia con retry en caso de race condition
    let newBudget: any = null
    let insertSuccess = false
    const maxInsertRetries = 10
    let currentBudgetNumber = newBudgetNumber

    for (let retryCount = 0; retryCount < maxInsertRetries && !insertSuccess; retryCount++) {
      const { data: insertedBudget, error: insertError } = await supabaseAdmin
        .from('redpresu_budgets')
        .insert({
          company_id: originalBudget.company_id,
          user_id: user.id, // Usuario que crea la copia
          tariff_id: originalBudget.tariff_id,

          // Nueva copia independiente (no versión)
          parent_budget_id: null,
          version_number: 1,

          // Nuevo número de presupuesto único
          budget_number: currentBudgetNumber,

          // Estado borrador sin PDF
          status: BudgetStatus.BORRADOR,
          pdf_url: null,

          // Copiar datos del cliente (añadir "Copia" al nombre)
          client_type: originalBudget.client_type,
          client_name: `${originalBudget.client_name} (Copia)`,
          client_nif_nie: originalBudget.client_nif_nie,
          client_phone: originalBudget.client_phone,
          client_email: originalBudget.client_email,
          client_web: originalBudget.client_web,
          client_address: originalBudget.client_address,
          client_postal_code: originalBudget.client_postal_code,
          client_locality: originalBudget.client_locality,
          client_province: originalBudget.client_province,
          client_acceptance: originalBudget.client_acceptance,

          // Copiar snapshots JSON (con client_name actualizado)
          json_tariff_data: originalBudget.json_tariff_data,
          json_budget_data: originalBudget.json_budget_data,
          json_client_data: updatedJsonClientData,

          // Copiar totales y cálculos
          total: originalBudget.total,
          iva: originalBudget.iva,
          base: originalBudget.base,
          irpf: originalBudget.irpf,
          irpf_percentage: originalBudget.irpf_percentage,
          re_apply: originalBudget.re_apply,
          re_total: originalBudget.re_total,
          total_pay: originalBudget.total_pay,

          // Copiar validez
          validity_days: originalBudget.validity_days,
          start_date: originalBudget.start_date,
          end_date: originalBudget.end_date

          // created_at se establece automáticamente con la fecha actual
        })
        .select()
        .single()

      if (insertedBudget && !insertError) {
        // Éxito
        newBudget = insertedBudget
        insertSuccess = true
        if (retryCount > 0) {
          log.info('[duplicateBudgetCopy] INSERT exitoso tras race condition:', {
            budget_number: currentBudgetNumber,
            intentos: retryCount + 1
          })
        }
      } else if (insertError) {
        // Verificar si el error es por duplicate key (race condition)
        const isDuplicateError = insertError.code === '23505' ||
                                insertError.message?.includes('duplicate') ||
                                insertError.message?.includes('unique')

        if (isDuplicateError && retryCount < maxInsertRetries - 1) {
          // Race condition detectada, generar nuevo número y reintentar
          // Parsear el número actual para sumar 1 segundo
          try {
            const datePart = currentBudgetNumber.substring(0, 8)
            const timePart = currentBudgetNumber.substring(9, 15)

            const year = parseInt(datePart.substring(0, 4))
            const month = parseInt(datePart.substring(4, 6)) - 1
            const day = parseInt(datePart.substring(6, 8))
            const hour = parseInt(timePart.substring(0, 2))
            const minute = parseInt(timePart.substring(2, 4))
            const second = parseInt(timePart.substring(4, 6))

            const currentDate = new Date(year, month, day, hour, minute, second)
            currentDate.setSeconds(currentDate.getSeconds() + 1)

            const newYear = currentDate.getFullYear()
            const newMonth = String(currentDate.getMonth() + 1).padStart(2, '0')
            const newDay = String(currentDate.getDate()).padStart(2, '0')
            const newHour = String(currentDate.getHours()).padStart(2, '0')
            const newMinute = String(currentDate.getMinutes()).padStart(2, '0')
            const newSecond = String(currentDate.getSeconds()).padStart(2, '0')

            currentBudgetNumber = `${newYear}${newMonth}${newDay}-${newHour}${newMinute}${newSecond}`

            log.warn('[duplicateBudgetCopy] Race condition detectada, reintentando:', {
              intento: retryCount + 1,
              nuevo_numero: currentBudgetNumber,
              error: insertError.message
            })
          } catch (parseError) {
            log.error('[duplicateBudgetCopy] Error parseando número para retry:', parseError)
            return { success: false, error: 'Error al generar número único' }
          }
        } else {
          // Error diferente o se agotaron los reintentos
          log.error('[duplicateBudgetCopy] Error creando copia:', insertError)
          return { success: false, error: isDuplicateError
            ? 'No se pudo generar un número único después de ' + maxInsertRetries + ' intentos'
            : 'Error al duplicar presupuesto' }
        }
      }
    }

    if (!insertSuccess || !newBudget) {
      log.error('[duplicateBudgetCopy] Falló INSERT tras ' + maxInsertRetries + ' intentos')
      return { success: false, error: 'Error al duplicar presupuesto después de múltiples intentos' }
    }

    log.info('[duplicateBudgetCopy] Presupuesto duplicado exitosamente:', newBudget.id)
    revalidatePath('/budgets')

    return { success: true, newBudgetId: newBudget.id }

  } catch (error) {
    log.error('[duplicateBudgetCopy] Error crítico:', error)
    return { success: false, error: 'Error crítico al duplicar presupuesto' }
  }
}

/**
 * Actualizar notas de un presupuesto (summary_note y conditions_note)
 */
export async function updateBudgetNotes(
  budgetId: string,
  notes: {
    summary_note: string
    conditions_note: string
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    log.info('[updateBudgetNotes] Actualizando notas del presupuesto:', budgetId)

    const cookieStore = await cookies()
    const supabase = createServerActionClient({ cookies: () => cookieStore })

    // Obtener usuario actual
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      log.error('[updateBudgetNotes] Error de autenticación:', authError)
      return { success: false, error: 'No autenticado' }
    }

    // SECURITY: Obtener datos del usuario actual
    const { data: userData, error: userError } = await supabase
      .from('redpresu_users')
      .select('company_id, role')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      log.error('[updateBudgetNotes] Error obteniendo usuario:', userError)
      return { success: false, error: 'Usuario no encontrado' }
    }

    // SECURITY: Obtener budget y validar ownership
    const { data: budget, error: budgetError } = await supabaseAdmin
      .from('redpresu_budgets')
      .select('id, user_id, company_id, pdf_url')
      .eq('id', budgetId)
      .single()

    if (budgetError || !budget) {
      log.error('[updateBudgetNotes] Budget no encontrado:', budgetError)
      return { success: false, error: 'Presupuesto no encontrado' }
    }

    // Validar permisos: superadmin y admin pueden editar todo, otros solo sus presupuestos
    const canEdit =
      userData.role === 'superadmin' ||
      userData.role === 'admin' ||
      budget.user_id === user.id

    if (!canEdit) {
      log.error('[updateBudgetNotes] Usuario no autorizado')
      return { success: false, error: 'No autorizado' }
    }

    // Validar company_id (excepto para superadmin)
    if (userData.role !== 'superadmin' && budget.company_id !== userData.company_id) {
      log.error('[updateBudgetNotes] Intento de acceso cross-company')
      return { success: false, error: 'No autorizado' }
    }

    // Preparar datos de actualización
    const updateData: any = {
      summary_note: notes.summary_note || '',
      conditions_note: notes.conditions_note || '',
      updated_at: new Date().toISOString()
    }

    // Si tenía PDF, eliminarlo porque las notas han cambiado
    if (budget.pdf_url) {
      updateData.pdf_url = null

      // Eliminar archivo físico
      try {
        const fs = require('fs')
        const path = require('path')
        const filePath = path.join(process.cwd(), 'public', budget.pdf_url)
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath)
          log.info('[updateBudgetNotes] PDF físico eliminado:', filePath)
        }
      } catch (fsError) {
        log.error('[updateBudgetNotes] Error eliminando PDF físico:', fsError)
        // No fallar la actualización por error de eliminación de archivo
      }
    }

    // Actualizar notas
    const { error: updateError } = await supabaseAdmin
      .from('redpresu_budgets')
      .update(updateData)
      .eq('id', budgetId)

    if (updateError) {
      log.error('[updateBudgetNotes] Error actualizando:', updateError)
      return { success: false, error: 'Error al actualizar notas' }
    }

    log.info('[updateBudgetNotes] Notas actualizadas exitosamente')
    revalidatePath('/budgets')
    revalidatePath(`/budgets/${budgetId}/edit-notes`)

    return { success: true }

  } catch (error) {
    const sanitized = sanitizeError(error, {
      context: 'updateBudgetNotes',
      category: 'database',
      metadata: { budgetId }
    })
    return { success: false, error: sanitized.userMessage }
  }
}