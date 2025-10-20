/**
 * Export Server Actions
 *
 * Funciones para exportar tarifas y presupuestos en formatos JSON y CSV
 */

'use server'
import { log } from '@/lib/logger'

import { createServerActionClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { getServerUser } from '@/lib/auth/server'
import type { ActionResult } from '@/lib/types/database'
import {
  convertTariffsToCSV,
  convertTariffsToJSON,
  convertTariffToPriceStructureCSV,
  convertBudgetsToCSV,
  convertBudgetsToJSON
} from '@/lib/helpers/export-helpers'

/**
 * Genera nombre de archivo para estructura de precios CSV
 */
function generatePriceStructureFilename(
  tariffName: string,
  index: number,
  total: number,
  date: string
): string {
  const name = tariffName.replace(/\s+/g, '-')
  const position = String(index + 1).padStart(2, '0')
  const totalStr = String(total).padStart(2, '0')
  return `exp_precios_${name}_${date}_${position}de${totalStr}.csv`
}

/**
 * Genera nombre de archivo para tarifa JSON
 */
function generateJSONFilename(
  tariffName: string,
  index: number,
  date: string
): string {
  const name = tariffName.replace(/\s+/g, '-')
  const position = String(index + 1).padStart(2, '0')
  return `exp-tarifa_${name}_${date}_${position}.json`
}

/**
 * Genera nombre de archivo para presupuesto JSON
 */
function generateBudgetFilename(
  clientName: string,
  index: number,
  date: string
): string {
  const name = clientName.replace(/\s+/g, '-')
  const position = String(index + 1).padStart(2, '0')
  return `exp-presupuesto_${name}_${date}_${position}.json`
}

/**
 * Exporta tarifas en formato especificado
 * @param ids - Array de IDs de tarifas a exportar
 * @param format - Formato de exportación: 'json' | 'csv' | 'price-structure'
 */
export async function exportTariffs(
  ids: string[],
  format: 'json' | 'csv' | 'price-structure'
): Promise<ActionResult<
  | { content: string; filename: string; mimeType: string }
  | { files: Array<{ content: string; filename: string; mimeType: string }> }
>> {
  try {
    log.info('[exportTariffs] Iniciando...', { ids, format })

    // 1. Validación entrada
    if (!ids || ids.length === 0) {
      return { success: false, error: 'Debe seleccionar al menos una tarifa' }
    }

    if (!['json', 'csv', 'price-structure'].includes(format)) {
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
      .from('redpresu_tariffs')
      .select('*')
      .in('id', ids)
      .order('name', { ascending: true })

    if (error) {
      log.error('[exportTariffs] Error BD:', error)
      return { success: false, error: error.message }
    }

    if (!tariffs || tariffs.length === 0) {
      return { success: false, error: 'No se encontraron tarifas' }
    }

    // 4. Convertir según formato
    const date = new Date().toISOString().split('T')[0]

    if (format === 'json') {
      // JSON: siempre múltiples archivos si hay más de una tarifa
      if (tariffs.length === 1) {
        const content = convertTariffsToJSON(tariffs)
        const filename = generateJSONFilename(tariffs[0].name, 0, date)
        log.info('[exportTariffs] Éxito:', { count: 1, format, filename })
        return {
          success: true,
          data: {
            content,
            filename,
            mimeType: 'application/json'
          }
        }
      } else {
        // Múltiples tarifas: generar un archivo JSON por tarifa
        const files = tariffs.map((tariff, index) => ({
          content: convertTariffsToJSON([tariff]),
          filename: generateJSONFilename(tariff.name, index, date),
          mimeType: 'application/json'
        }))
        log.info('[exportTariffs] Éxito:', { count: files.length, format, filesCount: files.length })
        return {
          success: true,
          data: { files }
        }
      }
    } else if (format === 'price-structure') {
      // CSV estructura de precios: siempre múltiples archivos si hay más de una tarifa
      if (tariffs.length === 1) {
        const content = convertTariffToPriceStructureCSV(tariffs[0])
        const filename = generatePriceStructureFilename(tariffs[0].name, 0, 1, date)
        log.info('[exportTariffs] Éxito:', { count: 1, format, filename })
        return {
          success: true,
          data: {
            content,
            filename,
            mimeType: 'text/csv;charset=utf-8;'
          }
        }
      } else {
        // Múltiples tarifas: generar un archivo CSV por tarifa
        const files = tariffs.map((tariff, index) => ({
          content: convertTariffToPriceStructureCSV(tariff),
          filename: generatePriceStructureFilename(tariff.name, index, tariffs.length, date),
          mimeType: 'text/csv;charset=utf-8;'
        }))
        log.info('[exportTariffs] Éxito:', { count: files.length, format, filesCount: files.length })
        return {
          success: true,
          data: { files }
        }
      }
    } else {
      // CSV completo: siempre un único archivo
      const content = convertTariffsToCSV(tariffs)
      const filename = `tarifas_export_${date}.csv`
      log.info('[exportTariffs] Éxito:', { count: tariffs.length, format, filename })
      return {
        success: true,
        data: {
          content,
          filename,
          mimeType: 'text/csv;charset=utf-8;'
        }
      }
    }
  } catch (error) {
    log.error('[exportTariffs] Error inesperado:', error)
    return { success: false, error: 'Error al exportar tarifas' }
  }
}

/**
 * Exporta presupuestos en formato especificado
 * @param ids - Array de IDs de presupuestos a exportar
 * @param format - Formato de exportación: 'json' (solo JSON soportado)
 */
export async function exportBudgets(
  ids: string[],
  format: 'json'
): Promise<ActionResult<
  | { content: string; filename: string; mimeType: string }
  | { files: Array<{ content: string; filename: string; mimeType: string }> }
>> {
  try {
    log.info('[exportBudgets] Iniciando...', { ids, format })

    // 1. Validación entrada
    if (!ids || ids.length === 0) {
      return { success: false, error: 'Debe seleccionar al menos un presupuesto' }
    }

    if (format !== 'json') {
      return { success: false, error: 'Solo se soporta formato JSON para presupuestos' }
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
      .from('redpresu_budgets')
      .select('*')
      .in('id', ids)
      .order('client_name', { ascending: true })

    if (error) {
      log.error('[exportBudgets] Error BD:', error)
      return { success: false, error: error.message }
    }

    if (!budgets || budgets.length === 0) {
      return { success: false, error: 'No se encontraron presupuestos' }
    }

    // 4. Convertir según formato
    const date = new Date().toISOString().split('T')[0]

    // JSON: siempre múltiples archivos si hay más de un presupuesto
    if (budgets.length === 1) {
      const content = convertBudgetsToJSON(budgets)
      const filename = generateBudgetFilename(budgets[0].client_name, 0, date)
      log.info('[exportBudgets] Éxito:', { count: 1, format, filename })
      return {
        success: true,
        data: {
          content,
          filename,
          mimeType: 'application/json'
        }
      }
    } else {
      // Múltiples presupuestos: generar un archivo JSON por presupuesto
      const files = budgets.map((budget, index) => ({
        content: convertBudgetsToJSON([budget]),
        filename: generateBudgetFilename(budget.client_name, index, date),
        mimeType: 'application/json'
      }))
      log.info('[exportBudgets] Éxito:', { count: files.length, format, filesCount: files.length })
      return {
        success: true,
        data: { files }
      }
    }
  } catch (error) {
    log.error('[exportBudgets] Error inesperado:', error)
    return { success: false, error: 'Error al exportar presupuestos' }
  }
}
