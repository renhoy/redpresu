/**
 * Export Server Actions
 *
 * Funciones para exportar tarifas y presupuestos en formatos JSON y CSV
 */

'use server'

import { createServerActionClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { getServerUser } from '@/lib/auth/server'
import type { ActionResult } from '@/lib/types/database'
import { convertTariffsToCSV, convertTariffsToJSON, convertBudgetsToCSV, convertBudgetsToJSON } from '@/lib/helpers/export-helpers'

/**
 * Exporta tarifas en formato especificado
 * @param ids - Array de IDs de tarifas a exportar
 * @param format - Formato de exportación: 'json' | 'csv'
 */
export async function exportTariffs(
  ids: string[],
  format: 'json' | 'csv'
): Promise<ActionResult<{ content: string; filename: string; mimeType: string }>> {
  try {
    console.log('[exportTariffs] Iniciando...', { ids, format })

    // 1. Validación entrada
    if (!ids || ids.length === 0) {
      return { success: false, error: 'Debe seleccionar al menos una tarifa' }
    }

    if (!['json', 'csv'].includes(format)) {
      return { success: false, error: 'Formato no válido' }
    }

    // 2. Autenticación
    const user = await getServerUser()
    if (!user) {
      return { success: false, error: 'No autenticado' }
    }

    // 3. Obtener tarifas
    const cookieStore = await cookies()
    const supabase = createServerActionClient({ cookies: () => cookieStore })

    const { data: tariffs, error } = await supabase
      .from('tariffs')
      .select('*')
      .in('id', ids)
      .order('name', { ascending: true })

    if (error) {
      console.error('[exportTariffs] Error BD:', error)
      return { success: false, error: error.message }
    }

    if (!tariffs || tariffs.length === 0) {
      return { success: false, error: 'No se encontraron tarifas' }
    }

    // 4. Convertir según formato
    let content: string
    let filename: string
    let mimeType: string

    if (format === 'json') {
      content = convertTariffsToJSON(tariffs)
      filename = `tarifas_export_${new Date().toISOString().split('T')[0]}.json`
      mimeType = 'application/json'
    } else {
      content = convertTariffsToCSV(tariffs)
      filename = `tarifas_export_${new Date().toISOString().split('T')[0]}.csv`
      mimeType = 'text/csv;charset=utf-8;'
    }

    console.log('[exportTariffs] Éxito:', { count: tariffs.length, format, filename })

    return {
      success: true,
      data: {
        content,
        filename,
        mimeType
      }
    }
  } catch (error) {
    console.error('[exportTariffs] Error inesperado:', error)
    return { success: false, error: 'Error al exportar tarifas' }
  }
}

/**
 * Exporta presupuestos en formato especificado
 * @param ids - Array de IDs de presupuestos a exportar
 * @param format - Formato de exportación: 'json' | 'csv'
 */
export async function exportBudgets(
  ids: string[],
  format: 'json' | 'csv'
): Promise<ActionResult<{ content: string; filename: string; mimeType: string }>> {
  try {
    console.log('[exportBudgets] Iniciando...', { ids, format })

    // 1. Validación entrada
    if (!ids || ids.length === 0) {
      return { success: false, error: 'Debe seleccionar al menos un presupuesto' }
    }

    if (!['json', 'csv'].includes(format)) {
      return { success: false, error: 'Formato no válido' }
    }

    // 2. Autenticación
    const user = await getServerUser()
    if (!user) {
      return { success: false, error: 'No autenticado' }
    }

    // 3. Obtener presupuestos
    const cookieStore = await cookies()
    const supabase = createServerActionClient({ cookies: () => cookieStore })

    const { data: budgets, error } = await supabase
      .from('budgets')
      .select('*')
      .in('id', ids)
      .order('budget_code', { ascending: true })

    if (error) {
      console.error('[exportBudgets] Error BD:', error)
      return { success: false, error: error.message }
    }

    if (!budgets || budgets.length === 0) {
      return { success: false, error: 'No se encontraron presupuestos' }
    }

    // 4. Convertir según formato
    let content: string
    let filename: string
    let mimeType: string

    if (format === 'json') {
      content = convertBudgetsToJSON(budgets)
      filename = `presupuestos_export_${new Date().toISOString().split('T')[0]}.json`
      mimeType = 'application/json'
    } else {
      content = convertBudgetsToCSV(budgets)
      filename = `presupuestos_export_${new Date().toISOString().split('T')[0]}.csv`
      mimeType = 'text/csv;charset=utf-8;'
    }

    console.log('[exportBudgets] Éxito:', { count: budgets.length, format, filename })

    return {
      success: true,
      data: {
        content,
        filename,
        mimeType
      }
    }
  } catch (error) {
    console.error('[exportBudgets] Error inesperado:', error)
    return { success: false, error: 'Error al exportar presupuestos' }
  }
}
