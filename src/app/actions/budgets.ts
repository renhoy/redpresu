'use server'

import { cookies } from 'next/headers'
import { createServerActionClient } from '@supabase/auth-helpers-nextjs'
import { supabaseAdmin } from '@/lib/supabase/server'
import { Tariff, Budget, BudgetStatus } from '@/lib/types/database'
import { revalidatePath } from 'next/cache'
import { buildPDFPayload } from '@/lib/helpers/pdf-payload-builder'
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
      console.error('[getUserIssuer] Error obteniendo issuer:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('[getUserIssuer] Error crítico:', error)
    return null
  }
}

/**
 * Obtiene las tarifas activas de la empresa del usuario actual
 */
export async function getActiveTariffs(): Promise<Tariff[]> {
  try {
    console.log('[getActiveTariffs] Obteniendo tarifas activas...')

    const cookieStore = await cookies()
    const supabase = createServerActionClient({ cookies: () => cookieStore })

    // Obtener usuario actual
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.error('[getActiveTariffs] Error de autenticación:', authError)
      return []
    }

    // Obtener company_id del usuario
    const { data: userData, error: userError } = await supabase
      .from('redpresu_users')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (userError) {
      console.error('[getActiveTariffs] Error obteniendo usuario:', userError)
      return []
    }

    // Si el usuario no tiene company_id (superadmin), usar empresa por defecto
    let empresaId = userData?.company_id
    if (!empresaId) {
      console.log('[getActiveTariffs] Usuario sin company_id, obteniendo empresa por defecto...')
      empresaId = await getDefaultEmpresaId()
      console.log('[getActiveTariffs] Empresa por defecto obtenida:', empresaId)
    }

    console.log('[getActiveTariffs] Empresa ID:', empresaId)

    // Obtener tarifas activas de la empresa
    const { data: tariffs, error: tariffsError } = await supabaseAdmin
      .from('redpresu_tariffs')
      .select('*')
      .eq('company_id', empresaId)
      .eq('status', 'Activa')
      .order('title')

    if (tariffsError) {
      console.error('[getActiveTariffs] Error obteniendo tarifas:', tariffsError)
      return []
    }

    console.log('[getActiveTariffs] Tarifas encontradas:', tariffs?.length || 0)
    return tariffs || []

  } catch (error) {
    console.error('[getActiveTariffs] Error crítico:', error)
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
 * Crear borrador inicial (al completar paso 1)
 */
export async function createDraftBudget(data: {
  tariffId: string
  clientData: ClientData
  tariffData: unknown[]
  validity: number | null
  totals: { base: number; total: number }
}): Promise<{ success: boolean; budgetId?: string; error?: string }> {
  try {
    console.log('[createDraftBudget] Creando borrador...')

    const cookieStore = await cookies()
    const supabase = createServerActionClient({ cookies: () => cookieStore })

    // Obtener usuario actual
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.error('[createDraftBudget] Error de autenticación:', authError)
      return { success: false, error: 'No autenticado' }
    }

    // Obtener company_id del usuario
    const { data: userData, error: userError } = await supabase
      .from('redpresu_users')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (userError) {
      console.error('[createDraftBudget] Error obteniendo usuario:', userError)
      return { success: false, error: 'Error obteniendo datos del usuario' }
    }

    // Si el usuario no tiene company_id (superadmin), usar empresa por defecto
    let empresaId = userData?.company_id
    if (!empresaId) {
      console.log('[createDraftBudget] Usuario sin company_id, obteniendo empresa por defecto...')
      empresaId = await getDefaultEmpresaId()
      console.log('[createDraftBudget] Empresa por defecto obtenida:', empresaId)
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

    // Crear borrador
    const { data: budget, error: insertError } = await supabaseAdmin
      .from('redpresu_budgets')
      .insert({
        company_id: empresaId,
        tariff_id: data.tariffId,
        user_id: user.id,
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

    if (insertError || !budget) {
      console.error('[createDraftBudget] Error creando borrador:', insertError)
      return { success: false, error: 'Error al crear borrador' }
    }

    console.log('[createDraftBudget] Borrador creado:', budget.id)
    revalidatePath('/budgets')

    return { success: true, budgetId: budget.id }

  } catch (error) {
    console.error('[createDraftBudget] Error crítico:', error)
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
    console.log('[updateBudgetDraft] Actualizando borrador:', budgetId)

    const cookieStore = await cookies()
    const supabase = createServerActionClient({ cookies: () => cookieStore })

    // Obtener usuario actual
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.error('[updateBudgetDraft] Error de autenticación:', authError)
      return { success: false, error: 'No autenticado' }
    }

    // Verificar que el usuario es owner del budget
    const { data: existingBudget, error: budgetError } = await supabaseAdmin
      .from('redpresu_budgets')
      .select('user_id, status')
      .eq('id', budgetId)
      .single()

    if (budgetError || !existingBudget) {
      console.error('[updateBudgetDraft] Budget no encontrado:', budgetError)
      return { success: false, error: 'Presupuesto no encontrado' }
    }

    if (existingBudget.user_id !== user.id) {
      console.error('[updateBudgetDraft] Usuario no autorizado')
      return { success: false, error: 'No autorizado' }
    }

    // Solo permitir actualizar borradores
    if (existingBudget.status !== BudgetStatus.BORRADOR) {
      console.error('[updateBudgetDraft] Solo se pueden actualizar borradores')
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
      console.error('[updateBudgetDraft] Error actualizando:', updateError)
      return { success: false, error: 'Error al actualizar' }
    }

    console.log('[updateBudgetDraft] Borrador actualizado exitosamente')
    return { success: true }

  } catch (error) {
    console.error('[updateBudgetDraft] Error crítico:', error)
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
      console.error('[saveBudget] Error de autenticación:', authError)
      return { success: false, error: 'No autenticado' }
    }

    // Obtener budget
    const { data: budget, error: budgetError } = await supabaseAdmin
      .from('redpresu_budgets')
      .select('*')
      .eq('id', budgetId)
      .single()

    if (budgetError || !budget) {
      console.error('[saveBudget] Budget no encontrado:', budgetError)
      return { success: false, error: 'Presupuesto no encontrado' }
    }

    if (budget.user_id !== user.id) {
      console.error('[saveBudget] Usuario no autorizado')
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
        console.log('[saveBudget] IRPF aplicable:', {
          emisorTipo: issuer.type,
          clienteTipo: clientType,
          porcentaje: irpfPercentage,
          baseImponible: totals.base,
          irpfAmount
        })
      } else {
        console.log('[saveBudget] IRPF NO aplica:', {
          emisorTipo: issuer.type,
          clienteTipo: clientType
        })
      }
    } else {
      console.warn('[saveBudget] No se pudo obtener datos del emisor, IRPF = 0')
    }

    // Calcular Recargo de Equivalencia si aplica
    let reByIVA: Record<number, number> = {}
    let totalRE = 0

    if (recargoData?.aplica && Object.keys(recargoData.recargos).length > 0) {
      console.log('[saveBudget] Calculando RE:', recargoData.recargos)
      reByIVA = calculateRecargo(budgetData as FiscalBudgetItem[], recargoData.recargos)
      totalRE = getTotalRecargo(reByIVA)
      console.log('[saveBudget] RE calculado:', { reByIVA, totalRE })
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
          console.log('[saveBudget] PDF físico eliminado:', filePath)
        }
      } catch (fsError) {
        console.error('[saveBudget] Error eliminando PDF físico:', fsError)
        // No fallar el guardado por error de eliminación de archivo
      }
    }

    // Actualizar como borrador
    const { error: updateError } = await supabaseAdmin
      .from('redpresu_budgets')
      .update(updateData)
      .eq('id', budgetId)

    if (updateError) {
      console.error('[saveBudget] Error actualizando:', updateError)
      return { success: false, error: 'Error al guardar presupuesto' }
    }

    console.log('[saveBudget] Presupuesto guardado como borrador')
    revalidatePath('/budgets')

    return { success: true, had_pdf: hadPdf }

  } catch (error) {
    console.error('[saveBudget] Error crítico:', error)
    return { success: false, error: 'Error interno del servidor' }
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
    console.log('[duplicateBudget] Duplicando presupuesto:', originalBudgetId)

    const cookieStore = await cookies()
    const supabase = createServerActionClient({ cookies: () => cookieStore })

    // Obtener usuario actual
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.error('[duplicateBudget] Error de autenticación:', authError)
      return { success: false, error: 'No autenticado' }
    }

    // Obtener budget original para copiar datos base
    const { data: originalBudget, error: budgetError } = await supabaseAdmin
      .from('redpresu_budgets')
      .select('*')
      .eq('id', originalBudgetId)
      .single()

    if (budgetError || !originalBudget) {
      console.error('[duplicateBudget] Budget original no encontrado:', budgetError)
      return { success: false, error: 'Presupuesto original no encontrado' }
    }

    // Calcular IVA
    const iva = newData.totals.total - newData.totals.base

    // Calcular fechas de validez
    const startDate = new Date()
    const endDate = new Date(startDate)
    if (originalBudget.validity_days) {
      endDate.setDate(endDate.getDate() + originalBudget.validity_days)
    }

    console.log('[duplicateBudget] Fechas calculadas:', {
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
        console.error('[duplicateBudget] Error obteniendo version_number:', versionError)
      } else {
        versionNumber = nextVersionData as number
      }

      console.log('[duplicateBudget] Creando como versión hijo:', {
        parent_budget_id: parentBudgetId,
        version_number: versionNumber
      })
    }

    // Calcular IRPF y RE si corresponde
    const issuer = await getUserIssuer(user.id)

    if (!issuer) {
      console.warn('[duplicateBudget] Usuario sin issuer:', user.id, '- usando valores por defecto')
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
      console.log('[duplicateBudget] IRPF aplicado:', { irpfPercentage, irpf, base: newData.totals.base })
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
      console.error('[duplicateBudget] Error creando nuevo presupuesto:', insertError)
      return { success: false, error: 'Error al duplicar presupuesto' }
    }

    console.log('[duplicateBudget] Nuevo presupuesto creado:', newBudget.id)
    revalidatePath('/budgets')

    return { success: true, budgetId: newBudget.id, newBudgetId: newBudget.id }

  } catch (error) {
    console.error('[duplicateBudget] Error crítico:', error)
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
      console.error('[updateBudgetStatus] Error de autenticación:', authError)
      return { success: false, error: 'No autenticado' }
    }

    // Obtener budget
    const { data: budget, error: budgetError } = await supabaseAdmin
      .from('redpresu_budgets')
      .select('*')
      .eq('id', budgetId)
      .single()

    if (budgetError || !budget) {
      console.error('[updateBudgetStatus] Budget no encontrado:', budgetError)
      return { success: false, error: 'Presupuesto no encontrado' }
    }

    if (budget.user_id !== user.id) {
      console.error('[updateBudgetStatus] Usuario no autorizado')
      return { success: false, error: 'No autorizado' }
    }

    // Validar transición de estado
    const currentStatus = budget.status
    const validTransitions: Record<string, string[]> = {
      [BudgetStatus.BORRADOR]: [BudgetStatus.PENDIENTE, BudgetStatus.ENVIADO],
      [BudgetStatus.PENDIENTE]: [BudgetStatus.BORRADOR, BudgetStatus.ENVIADO],
      [BudgetStatus.ENVIADO]: [BudgetStatus.PENDIENTE, BudgetStatus.APROBADO, BudgetStatus.RECHAZADO],
      [BudgetStatus.APROBADO]: [BudgetStatus.BORRADOR],
      [BudgetStatus.RECHAZADO]: [BudgetStatus.BORRADOR],
      [BudgetStatus.CADUCADO]: [BudgetStatus.BORRADOR]
    }

    if (!validTransitions[currentStatus]?.includes(newStatus)) {
      return {
        success: false,
        error: `No se puede cambiar de ${currentStatus} a ${newStatus}`
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
      console.error('[updateBudgetStatus] Error actualizando:', updateError)
      return { success: false, error: 'Error al actualizar estado' }
    }

    console.log('[updateBudgetStatus] Estado actualizado:', currentStatus, '→', newStatus)
    revalidatePath('/budgets')

    return { success: true }

  } catch (error) {
    console.error('[updateBudgetStatus] Error crítico:', error)
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
    console.log('[getBudgetById] Obteniendo budget:', budgetId)

    const cookieStore = await cookies()
    const supabase = createServerActionClient({ cookies: () => cookieStore })

    // Obtener usuario actual
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.error('[getBudgetById] Error de autenticación:', authError)
      return null
    }

    // Obtener budget (RLS se encargará de verificar permisos)
    const { data: budget, error: budgetError } = await supabase
      .from('redpresu_budgets')
      .select('*')
      .eq('id', budgetId)
      .single()

    if (budgetError || !budget) {
      console.error('[getBudgetById] Budget no encontrado:', budgetError)
      return null
    }

    console.log('[getBudgetById] Budget encontrado:', budget.id)
    return budget as Budget

  } catch (error) {
    console.error('[getBudgetById] Error crítico:', error)
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
    console.log('[generateBudgetPDF] Iniciando generación PDF para budget:', budgetId)

    const cookieStore = await cookies()
    const supabase = createServerActionClient({ cookies: () => cookieStore })

    // Obtener usuario actual
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.error('[generateBudgetPDF] Error de autenticación:', authError)
      return { success: false, error: 'No autenticado' }
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
      console.error('[generateBudgetPDF] Budget no encontrado:', budgetError)
      return { success: false, error: 'Presupuesto no encontrado' }
    }

    // Validar que exista tariff
    if (!budget.tariff) {
      console.error('[generateBudgetPDF] Tarifa no encontrada para budget:', budgetId)
      return { success: false, error: 'Tarifa no encontrada' }
    }

    const budgetTyped = budget as Budget
    const tariffTyped = budget.tariff as Tariff

    // 1. Construir payload
    console.log('[generateBudgetPDF] Construyendo payload...')
    const payload = buildPDFPayload(budgetTyped, tariffTyped)

    // Obtener modo de aplicación para logs
    const { isDevelopmentMode } = await import('@/lib/helpers/config-helpers')
    const isDev = await isDevelopmentMode()

    // MODO DEBUG: Solo mostrar payload, no llamar API (activar con RAPID_PDF_DEBUG_ONLY=true)
    if (process.env.RAPID_PDF_DEBUG_ONLY === 'true') {
      console.log('[generateBudgetPDF] Modo debug: payload construido, no se llama a Rapid-PDF')
      console.log('[generateBudgetPDF] Payload:', JSON.stringify(payload, null, 2))

      return {
        success: true,
        debug: true,
        payload
      }
    }

    // En modo desarrollo, imprimir payload en consola antes de enviar a Rapid-PDF
    if (isDev) {
      console.log('\n' + '='.repeat(80))
      console.log('[generateBudgetPDF] 🔍 DEVELOPMENT MODE - PAYLOAD COMPLETO:')
      console.log('='.repeat(80))
      console.log(JSON.stringify(payload, null, 2))
      console.log('='.repeat(80) + '\n')
    }

    // FLUJO COMPLETO (desarrollo y producción)
    // 2. Validar variables de entorno
    const RAPID_PDF_URL = process.env.RAPID_PDF_URL
    const RAPID_PDF_API_KEY = process.env.RAPID_PDF_API_KEY

    if (!RAPID_PDF_URL || !RAPID_PDF_API_KEY) {
      console.error('[generateBudgetPDF] Variables de entorno Rapid-PDF no configuradas')
      return { success: false, error: 'Servicio PDF no configurado' }
    }

    // 3. Llamar a Rapid-PDF API con timeout 60s
    console.log('[generateBudgetPDF] Llamando a Rapid-PDF API...')
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 60000) // 60 segundos

    let rapidPdfResponse
    try {
      rapidPdfResponse = await fetch(`${RAPID_PDF_URL}/generate_document`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': RAPID_PDF_API_KEY
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!rapidPdfResponse.ok) {
        const errorText = await rapidPdfResponse.text()
        console.error('[generateBudgetPDF] Error Rapid-PDF:', rapidPdfResponse.status, errorText)
        return {
          success: false,
          error: `Error del servicio PDF (${rapidPdfResponse.status})`
        }
      }

    } catch (fetchError: any) {
      clearTimeout(timeoutId)

      if (fetchError.name === 'AbortError') {
        console.error('[generateBudgetPDF] Timeout > 60s')
        return { success: false, error: 'Timeout: generación PDF excedió 60 segundos' }
      }

      console.error('[generateBudgetPDF] Error de conexión Rapid-PDF:', fetchError)
      return { success: false, error: 'Servicio PDF no disponible' }
    }

    const rapidPdfData = await rapidPdfResponse.json()
    console.log('[generateBudgetPDF] Respuesta Rapid-PDF:', rapidPdfData)

    if (!rapidPdfData.url) {
      console.error('[generateBudgetPDF] Respuesta sin URL:', rapidPdfData)
      return { success: false, error: 'Respuesta inválida del servicio PDF' }
    }

    // 4. Descargar PDF desde la URL retornada
    console.log('[generateBudgetPDF] Descargando PDF desde:', rapidPdfData.url)

    let pdfBuffer: Buffer
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const pdfUrl = `${RAPID_PDF_URL}${rapidPdfData.url}`
        const downloadResponse = await fetch(pdfUrl)

        if (!downloadResponse.ok) {
          throw new Error(`HTTP ${downloadResponse.status}`)
        }

        const arrayBuffer = await downloadResponse.arrayBuffer()
        pdfBuffer = Buffer.from(arrayBuffer)
        console.log('[generateBudgetPDF] PDF descargado exitosamente:', pdfBuffer.length, 'bytes')
        break

      } catch (downloadError) {
        console.error(`[generateBudgetPDF] Intento ${attempt}/2 descarga falló:`, downloadError)

        if (attempt === 2) {
          return { success: false, error: 'Error descargando PDF generado' }
        }

        // Esperar 1s antes de reintentar
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    // 5. Guardar PDF en /public/pdfs/
    // Formato: presupuesto_nombre_nif_nie_YYYY-MM-DD_HH-MM-SS.pdf
    const now = new Date()
    const datePart = now.toISOString().split('T')[0] // YYYY-MM-DD
    const timePart = now.toTimeString().split(' ')[0].replace(/:/g, '-') // HH-MM-SS
    const timestamp = `${datePart}_${timePart}`

    const clientName = sanitizeFilename(budgetTyped.client_name)
    const clientNif = sanitizeFilename(budgetTyped.client_nif_nie || 'sin_nif')
    const filename = `presupuesto_${clientName}_${clientNif}_${timestamp}.pdf`

    const publicDir = path.join(process.cwd(), 'public', 'pdfs')
    const filePath = path.join(publicDir, filename)

    // Crear directorio si no existe
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true })
      console.log('[generateBudgetPDF] Directorio creado:', publicDir)
    }

    fs.writeFileSync(filePath, pdfBuffer!)
    console.log('[generateBudgetPDF] PDF guardado en:', filePath)

    const pdfUrl = `/pdfs/${filename}`

    // 6. Actualizar pdf_url en budgets
    const { error: updateError } = await supabaseAdmin
      .from('redpresu_budgets')
      .update({ pdf_url: pdfUrl })
      .eq('id', budgetId)

    if (updateError) {
      console.error('[generateBudgetPDF] Error actualizando pdf_url:', updateError)
      // No retornamos error, el PDF ya está guardado
    }

    console.log('[generateBudgetPDF] ✅ PDF generado exitosamente:', pdfUrl)
    revalidatePath('/budgets')

    return { success: true, pdf_url: pdfUrl }

  } catch (error) {
    console.error('[generateBudgetPDF] Error crítico:', error)
    return { success: false, error: 'Error generando PDF' }
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
    console.log('[getBudgets] Obteniendo presupuestos con filtros:', filters)

    const cookieStore = await cookies()
    const supabase = createServerActionClient({ cookies: () => cookieStore })

    // Obtener usuario actual
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.error('[getBudgets] Error de autenticación:', authError)
      return []
    }

    // Obtener company_id y rol del usuario
    const { data: userData, error: userError } = await supabase
      .from('redpresu_users')
      .select('company_id, role')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      console.error('[getBudgets] Error obteniendo usuario:', userError)
      return []
    }

    console.log('[getBudgets] Usuario:', userData.role, 'Empresa:', userData.company_id)

    // Construir query base con JOIN a tariffs
    // Nota: users se obtiene por separado ya que la relación puede no estar definida
    let query = supabase
      .from('redpresu_budgets')
      .select(`
        *,
        redpresu_tariffs (
          title
        )
      `)

    // Filtrar según rol
    if (userData.role === 'vendedor') {
      // Vendedor: solo sus presupuestos
      query = query.eq('user_id', user.id)
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
      console.error('[getBudgets] Error obteniendo presupuestos:', budgetsError)
      console.error('[getBudgets] Error details:', JSON.stringify(budgetsError, null, 2))
      return []
    }

    console.log('[getBudgets] Presupuestos encontrados:', budgets?.length || 0)

    // Obtener nombres de usuarios por separado
    if (budgets && budgets.length > 0) {
      const userIds = [...new Set(budgets.map(b => b.user_id))]
      const { data: users } = await supabase
        .from('redpresu_users')
        .select('id, name')
        .in('id', userIds)

      // Mapear usuarios a presupuestos
      const usersMap = new Map(users?.map(u => [u.id, u.name]) || [])
      const budgetsWithUsers = budgets.map(budget => ({
        ...budget,
        users: { name: usersMap.get(budget.user_id) || 'N/A' }
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
    console.error('[getBudgets] Error crítico:', error)
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
    console.log('[deleteBudget] Eliminando presupuesto:', budgetId)

    const cookieStore = await cookies()
    const supabase = createServerActionClient({ cookies: () => cookieStore })

    // Obtener usuario actual
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.error('[deleteBudget] Error de autenticación:', authError)
      return { success: false, error: 'No autenticado' }
    }

    // Obtener presupuesto para verificar permisos
    const { data: budget, error: budgetError } = await supabaseAdmin
      .from('redpresu_budgets')
      .select('user_id, pdf_url, company_id')
      .eq('id', budgetId)
      .single()

    if (budgetError || !budget) {
      console.error('[deleteBudget] Presupuesto no encontrado:', budgetError)
      return { success: false, error: 'Presupuesto no encontrado' }
    }

    // Verificar permisos
    const { data: userData, error: userError } = await supabase
      .from('redpresu_users')
      .select('role, company_id')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      console.error('[deleteBudget] Error obteniendo usuario:', userError)
      return { success: false, error: 'Usuario no encontrado' }
    }

    // Validar permisos según rol
    const canDelete =
      budget.user_id === user.id || // Owner
      (userData.role === 'admin' && budget.company_id === userData.company_id) || // Admin de la empresa
      userData.role === 'superadmin' // Superadmin

    if (!canDelete) {
      console.error('[deleteBudget] Usuario no autorizado')
      return { success: false, error: 'No tiene permisos para eliminar este presupuesto' }
    }

    // TODO: Si tiene PDF, eliminar archivo físico del sistema
    // Esto se implementará cuando tengamos el módulo PDF Generation
    if (budget.pdf_url) {
      console.log('[deleteBudget] TODO: Eliminar PDF físico:', budget.pdf_url)
    }

    // Eliminar presupuesto
    const { error: deleteError } = await supabaseAdmin
      .from('redpresu_budgets')
      .delete()
      .eq('id', budgetId)

    if (deleteError) {
      console.error('[deleteBudget] Error eliminando:', deleteError)
      return { success: false, error: 'Error al eliminar presupuesto' }
    }

    console.log('[deleteBudget] Presupuesto eliminado exitosamente')
    revalidatePath('/budgets')

    return { success: true }

  } catch (error) {
    console.error('[deleteBudget] Error crítico:', error)
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
      console.error('[userHasBudgets] Error:', error)
      return false
    }

    return (count || 0) > 0

  } catch (error) {
    console.error('[userHasBudgets] Error crítico:', error)
    return false
  }
}