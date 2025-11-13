'use server'
import { log } from '@/lib/logger'

import { createServerActionClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { getServerUser } from '@/lib/auth/server'
import { BudgetVersion } from '@/lib/types/database'
import { requireValidCompanyId } from '@/lib/helpers/company-validation'

interface ActionResult<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

/**
 * Crea una nueva versión de un presupuesto
 * @param budgetId - ID del presupuesto
 * @param versionName - Nombre opcional para la versión
 * @param notes - Notas opcionales sobre la versión
 */
export async function createBudgetVersion(
  budgetId: string,
  versionName?: string,
  notes?: string
): Promise<ActionResult<BudgetVersion>> {
  try {
    log.info('[createBudgetVersion] Iniciando:', { budgetId, versionName })

    // 1. Autenticación
    const user = await getServerUser()
    if (!user) {
      return { success: false, error: 'No autenticado' }
    }

    // SECURITY: Validar company_id obligatorio
    let empresaId: number
    try {
      empresaId = requireValidCompanyId(user, '[createBudgetVersion]')
    } catch (error) {
      log.error('[createBudgetVersion] company_id inválido', { error })
      return { success: false, error: 'Usuario sin empresa asignada' }
    }

    const cookieStore = await cookies()
    const supabase = createServerActionClient({ cookies: () => cookieStore })

    // 2. Obtener datos actuales del presupuesto
    const { data: budget, error: budgetError } = await supabase
      .from('budgets')
      .select('*')
      .eq('id', budgetId)
      .single()

    if (budgetError || !budget) {
      log.error('[createBudgetVersion] Error obteniendo presupuesto:', budgetError)
      return { success: false, error: 'Presupuesto no encontrado' }
    }

    // SECURITY: Verificar que el budget pertenece a la empresa del usuario
    if (budget.company_id !== empresaId) {
      log.error('[createBudgetVersion] Intento de acceso a budget de otra empresa', {
        budgetCompanyId: budget.company_id,
        userCompanyId: empresaId
      })
      return { success: false, error: 'No tienes acceso a este presupuesto' }
    }

    // 3. Verificar permisos (debe ser el creador o admin de la misma empresa)
    if (
      budget.user_id !== user.id &&
      user.role !== 'admin' &&
      user.role !== 'superadmin'
    ) {
      return { success: false, error: 'Sin permisos para crear versión' }
    }

    // 4. Obtener el siguiente número de versión usando la función SQL
    const { data: versionData, error: versionError } = await supabase
      .rpc('get_next_version_number', { p_budget_id: budgetId })

    if (versionError) {
      log.error('[createBudgetVersion] Error obteniendo número versión:', versionError)
      return { success: false, error: 'Error obteniendo número de versión' }
    }

    const versionNumber = versionData as number

    // 5. Crear snapshot de json_client_data si no existe
    let jsonClientData = budget.json_client_data
    if (!jsonClientData) {
      jsonClientData = {
        client_type: budget.client_type,
        client_name: budget.client_name,
        client_nif_nie: budget.client_nif_nie,
        client_phone: budget.client_phone,
        client_email: budget.client_email,
        client_web: budget.client_web,
        client_address: budget.client_address,
        client_postal_code: budget.client_postal_code,
        client_locality: budget.client_locality,
        client_province: budget.client_province,
        client_acceptance: budget.client_acceptance
      }
    }

    // 6. Crear la versión con snapshot completo
    const { data: version, error: insertError } = await supabase
      .from('budget_versions')
      .insert({
        budget_id: budgetId,
        version_number: versionNumber,
        version_name: versionName || `Versión ${versionNumber}`,
        json_budget_data: budget.json_budget_data,
        json_client_data: jsonClientData,
        total_amount: budget.total,
        base_amount: budget.base,
        irpf: budget.irpf || 0,
        irpf_percentage: budget.irpf_percentage || 0,
        total_pay: budget.total_pay || budget.total,
        created_by: user.id,
        notes
      })
      .select(`
        *,
        users:created_by (
          name,
          email
        )
      `)
      .single()

    if (insertError || !version) {
      log.error('[createBudgetVersion] Error insertando versión:', insertError)
      return { success: false, error: insertError?.message || 'Error creando versión' }
    }

    log.info('[createBudgetVersion] Versión creada:', version.id, `#${versionNumber}`)

    return { success: true, data: version as BudgetVersion }
  } catch (error) {
    log.error('[createBudgetVersion] Error inesperado:', error)
    return { success: false, error: 'Error inesperado' }
  }
}

/**
 * Obtiene todas las versiones de un presupuesto
 * @param budgetId - ID del presupuesto
 */
export async function getBudgetVersions(
  budgetId: string
): Promise<ActionResult<BudgetVersion[]>> {
  try {
    log.info('[getBudgetVersions] Obteniendo versiones para:', budgetId)

    // 1. Autenticación
    const user = await getServerUser()
    if (!user) {
      return { success: false, error: 'No autenticado' }
    }

    // SECURITY: Validar company_id obligatorio
    let empresaId: number
    try {
      empresaId = requireValidCompanyId(user, '[getBudgetVersions]')
    } catch (error) {
      log.error('[getBudgetVersions] company_id inválido', { error })
      return { success: false, error: 'Usuario sin empresa asignada' }
    }

    const cookieStore = await cookies()
    const supabase = createServerActionClient({ cookies: () => cookieStore })

    // SECURITY: Verificar que el budget pertenece a la empresa del usuario
    const { data: budgetData, error: budgetError } = await supabase
      .from('budgets')
      .select('company_id')
      .eq('id', budgetId)
      .single()

    if (budgetError || !budgetData) {
      log.error('[getBudgetVersions] Budget no encontrado:', budgetError)
      return { success: false, error: 'Presupuesto no encontrado' }
    }

    if (budgetData.company_id !== empresaId) {
      log.error('[getBudgetVersions] Intento de acceso a budget de otra empresa', {
        budgetCompanyId: budgetData.company_id,
        userCompanyId: empresaId
      })
      return { success: false, error: 'No tienes acceso a este presupuesto' }
    }

    // 2. Obtener versiones (RLS policy se encarga de filtrar por empresa)
    const { data: versions, error } = await supabase
      .from('budget_versions')
      .select(`
        *,
        users:created_by (
          name,
          email
        )
      `)
      .eq('budget_id', budgetId)
      .order('version_number', { ascending: false })

    if (error) {
      log.error('[getBudgetVersions] Error obteniendo versiones:', error)
      return { success: false, error: error.message }
    }

    log.info('[getBudgetVersions] Versiones encontradas:', versions?.length || 0)

    return { success: true, data: (versions || []) as BudgetVersion[] }
  } catch (error) {
    log.error('[getBudgetVersions] Error inesperado:', error)
    return { success: false, error: 'Error inesperado' }
  }
}

/**
 * Restaura una versión de un presupuesto
 * @param versionId - ID de la versión a restaurar
 * @param createNewVersion - Si se debe crear una nueva versión antes de restaurar
 */
export async function restoreBudgetVersion(
  versionId: string,
  createNewVersion = true
): Promise<ActionResult<{ budget_id: string }>> {
  try {
    log.info('[restoreBudgetVersion] Restaurando versión:', versionId)

    // 1. Autenticación
    const user = await getServerUser()
    if (!user) {
      return { success: false, error: 'No autenticado' }
    }

    const cookieStore = await cookies()
    const supabase = createServerActionClient({ cookies: () => cookieStore })

    // 2. Obtener la versión a restaurar
    const { data: version, error: versionError } = await supabase
      .from('budget_versions')
      .select('*')
      .eq('id', versionId)
      .single()

    if (versionError || !version) {
      log.error('[restoreBudgetVersion] Error obteniendo versión:', versionError)
      return { success: false, error: 'Versión no encontrada' }
    }

    // 3. Obtener el presupuesto actual
    const { data: budget, error: budgetError } = await supabase
      .from('budgets')
      .select('*, users!budgets_user_id_fkey(company_id)')
      .eq('id', version.budget_id)
      .single()

    if (budgetError || !budget) {
      log.error('[restoreBudgetVersion] Error obteniendo presupuesto:', budgetError)
      return { success: false, error: 'Presupuesto no encontrado' }
    }

    // 4. SECURITY: Verificar permisos (VULN-010)
    const budgetUser = Array.isArray(budget.users) ? budget.users[0] : budget.users
    const isOwner = budget.user_id === user.id
    const isAdminOrSuper = user.role === 'admin' || user.role === 'superadmin'
    const sameCompany = budgetUser && budgetUser.company_id === user.company_id

    // Denegar si NO es owner Y (NO es admin/superadmin O empresa diferente)
    if (!isOwner && (!isAdminOrSuper || !sameCompany)) {
      log.error('[restoreBudgetVersion] Permisos denegados:', {
        userId: user.id,
        budgetUserId: budget.user_id,
        userRole: user.role,
        userCompany: user.company_id,
        budgetCompany: budgetUser?.company_id
      })
      return { success: false, error: 'Sin permisos para restaurar versión' }
    }

    // 5. Si se solicita, crear versión del estado actual antes de restaurar
    if (createNewVersion) {
      const createResult = await createBudgetVersion(
        version.budget_id,
        'Antes de restaurar',
        `Estado anterior a restaurar versión #${version.version_number}`
      )

      if (!createResult.success) {
        log.error('[restoreBudgetVersion] Error creando versión backup')
        // No retornar error, continuar con la restauración
      }
    }

    // 6. Extraer datos del cliente desde json_client_data
    const clientData = version.json_client_data as any

    // 7. Restaurar el presupuesto con los datos de la versión
    const { error: updateError } = await supabase
      .from('budgets')
      .update({
        json_budget_data: version.json_budget_data,
        json_client_data: version.json_client_data,
        client_type: clientData?.client_type || budget.client_type,
        client_name: clientData?.client_name || budget.client_name,
        client_nif_nie: clientData?.client_nif_nie || budget.client_nif_nie,
        client_phone: clientData?.client_phone || budget.client_phone,
        client_email: clientData?.client_email || budget.client_email,
        client_web: clientData?.client_web || budget.client_web,
        client_address: clientData?.client_address || budget.client_address,
        client_postal_code: clientData?.client_postal_code || budget.client_postal_code,
        client_locality: clientData?.client_locality || budget.client_locality,
        client_province: clientData?.client_province || budget.client_province,
        client_acceptance: clientData?.client_acceptance ?? budget.client_acceptance,
        total: version.total_amount,
        base: version.base_amount,
        irpf: version.irpf,
        irpf_percentage: version.irpf_percentage,
        total_pay: version.total_pay,
        updated_at: new Date().toISOString()
      })
      .eq('id', version.budget_id)

    if (updateError) {
      log.error('[restoreBudgetVersion] Error restaurando presupuesto:', updateError)
      return { success: false, error: updateError.message }
    }

    log.info('[restoreBudgetVersion] Presupuesto restaurado:', version.budget_id)

    return { success: true, data: { budget_id: version.budget_id } }
  } catch (error) {
    log.error('[restoreBudgetVersion] Error inesperado:', error)
    return { success: false, error: 'Error inesperado' }
  }
}

/**
 * Elimina una versión de presupuesto (solo admin/superadmin)
 * @param versionId - ID de la versión a eliminar
 */
export async function deleteBudgetVersion(
  versionId: string
): Promise<ActionResult> {
  try {
    log.info('[deleteBudgetVersion] Eliminando versión:', versionId)

    // 1. Autenticación y autorización
    const user = await getServerUser()
    if (!user) {
      return { success: false, error: 'No autenticado' }
    }

    if (user.role !== 'admin' && user.role !== 'superadmin') {
      return { success: false, error: 'Sin permisos para eliminar versiones' }
    }

    const cookieStore = await cookies()
    const supabase = createServerActionClient({ cookies: () => cookieStore })

    // 2. Eliminar versión (RLS policy verifica permisos)
    const { error } = await supabase
      .from('budget_versions')
      .delete()
      .eq('id', versionId)

    if (error) {
      log.error('[deleteBudgetVersion] Error eliminando versión:', error)
      return { success: false, error: error.message }
    }

    log.info('[deleteBudgetVersion] Versión eliminada:', versionId)

    return { success: true }
  } catch (error) {
    log.error('[deleteBudgetVersion] Error inesperado:', error)
    return { success: false, error: 'Error inesperado' }
  }
}
