/**
 * Import Server Actions
 *
 * Funciones para importar tarifas y presupuestos desde archivos JSON
 */

'use server'
import { log } from '@/lib/logger'

import { createServerActionClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { getServerUser } from '@/lib/auth/server'
import type { ActionResult } from '@/lib/types/database'
import { revalidatePath } from 'next/cache'
import { detectIVAsPresentes } from '@/lib/validators/csv-converter'

/**
 * Importa tarifas desde JSON
 * @param content - Contenido del archivo JSON
 */
export async function importTariffs(
  content: string
): Promise<ActionResult<{ count: number }>> {
  try {
    log.info('[importTariffs] Iniciando...')

    // 1. Autenticación
    const user = await getServerUser()
    if (!user) {
      return { success: false, error: 'No autenticado' }
    }

    // 2. Autorización (solo admin/superadmin)
    if (user.role === 'vendedor') {
      return { success: false, error: 'Sin permisos para importar tarifas' }
    }

    // 3. Parsear JSON
    let tariffs: any[]
    try {
      tariffs = JSON.parse(content)
    } catch (e) {
      log.error('[importTariffs] Error parsing JSON:', e)
      return {
        success: false,
        error: 'El archivo JSON de tarifa importado no es válido. Puedes exportar una tarifa existente para obtener un ejemplo del formato correcto.\n\nExporta tus tarifas para tener una copia de seguridad fuera de Redpresu. Si deseas generar nuevas tarifas hazlo desde Redpresu para evitar errores.'
      }
    }

    if (!Array.isArray(tariffs)) {
      return {
        success: false,
        error: 'El archivo JSON de tarifa importado no es válido. Puedes exportar una tarifa existente para obtener un ejemplo del formato correcto.\n\nExporta tus tarifas para tener una copia de seguridad fuera de Redpresu. Si deseas generar nuevas tarifas hazlo desde Redpresu para evitar errores.'
      }
    }

    if (tariffs.length === 0) {
      return { success: false, error: 'El archivo no contiene tarifas' }
    }

    // 4. Validar estructura básica
    const validatedTariffs = []
    const errors: string[] = []

    for (let i = 0; i < tariffs.length; i++) {
      const tariff = tariffs[i]

      // Campos requeridos
      if (!tariff.name || !tariff.title) {
        errors.push(`Tarifa ${i + 1}: falta campo obligatorio (name o title)`)
        continue
      }

      // Calcular IVAs presentes desde json_tariff_data
      let ivasPresentes: number[] = []
      try {
        const tariffData = typeof tariff.json_tariff_data === 'string'
          ? JSON.parse(tariff.json_tariff_data)
          : tariff.json_tariff_data

        if (Array.isArray(tariffData) && tariffData.length > 0) {
          ivasPresentes = detectIVAsPresentes(tariffData)
        }
      } catch (e) {
        log.error(`[importTariffs] Error calculando IVAs presentes para tarifa ${i + 1}:`, e)
        // Continuar sin IVAs presentes si hay error
      }

      // Eliminar campos internos y regenerables
      const { id, created_at, updated_at, company_id, user_id, ...tariffData } = tariff

      // Construir tarifa limpia
      const cleanTariff = {
        ...tariffData,
        // Asignar a usuario actual
        company_id: user.company_id,
        user_id: user.id,
        // Forzar valores para importación
        is_template: false,
        status: 'Inactiva',
        ivas_presentes: ivasPresentes,
      }

      validatedTariffs.push(cleanTariff)
    }

    if (errors.length > 0) {
      log.error('[importTariffs] Errores de validación:', errors)
      return { success: false, error: `Errores de validación: ${errors.join(', ')}` }
    }

    // 5. Insertar en BD
    const cookieStore = await cookies()
    const supabase = createServerActionClient({ cookies: () => cookieStore })

    const { data, error } = await supabase
      .from('redpresu_tariffs')
      .insert(validatedTariffs)
      .select()

    if (error) {
      log.error('[importTariffs] Error BD:', error)
      return { success: false, error: error.message }
    }

    // 6. Revalidar página
    revalidatePath('/tariffs')

    log.info('[importTariffs] Éxito:', data?.length, 'tarifas importadas')

    return {
      success: true,
      data: { count: data?.length || 0 }
    }
  } catch (error) {
    log.error('[importTariffs] Error inesperado:', error)
    return { success: false, error: 'Error al importar tarifas' }
  }
}

/**
 * Importa presupuestos desde JSON
 * @param content - Contenido del archivo JSON
 */
export async function importBudgets(
  content: string
): Promise<ActionResult<{ count: number }>> {
  try {
    log.info('[importBudgets] Iniciando...')

    // 1. Autenticación
    const user = await getServerUser()
    if (!user) {
      return { success: false, error: 'No autenticado' }
    }

    // 2. Autorización (todos los roles pueden importar presupuestos)

    // 3. Parsear JSON
    let budgets: any[]
    try {
      budgets = JSON.parse(content)
    } catch (e) {
      log.error('[importBudgets] Error parsing JSON:', e)
      return {
        success: false,
        error: 'El archivo JSON de presupuesto importado no es válido. Puedes exportar un presupuesto existente para obtener un ejemplo del formato correcto.\n\nExporta tus presupuestos para tener una copia de seguridad fuera de Redpresu. Si deseas generar nuevos presupuestos hazlo desde Redpresu para evitar errores.'
      }
    }

    if (!Array.isArray(budgets)) {
      return {
        success: false,
        error: 'El archivo JSON de presupuesto importado no es válido. Puedes exportar un presupuesto existente para obtener un ejemplo del formato correcto.\n\nExporta tus presupuestos para tener una copia de seguridad fuera de Redpresu. Si deseas generar nuevos presupuestos hazlo desde Redpresu para evitar errores.'
      }
    }

    if (budgets.length === 0) {
      return { success: false, error: 'El archivo no contiene presupuestos' }
    }

    // 4. Validar estructura básica
    const validatedBudgets = []
    const errors: string[] = []

    const cookieStore = await cookies()
    const supabase = createServerActionClient({ cookies: () => cookieStore })

    for (let i = 0; i < budgets.length; i++) {
      const budget = budgets[i]

      // Campos requeridos
      if (!budget.client_name) {
        errors.push(`Presupuesto ${i + 1}: falta campo obligatorio (client_name)`)
        continue
      }

      // Validar si tarifa existe (opcional, no falla si no existe)
      let tariffId = budget.tariff_id
      if (tariffId) {
        const { data: tariffExists } = await supabase
          .from('redpresu_tariffs')
          .select('id')
          .eq('id', tariffId)
          .eq('company_id', user.company_id)
          .single()

        if (!tariffExists) {
          log.info(`[importBudgets] Presupuesto ${i + 1}: tariff_id no existe, se establecerá como null`)
          tariffId = null
        }
      }

      // Eliminar campos internos y regenerables
      const { id, created_at, updated_at, company_id, user_id, parent_budget_id, version_number, ...budgetData } = budget

      // Construir presupuesto limpio
      const cleanBudget = {
        ...budgetData,
        // Asignar tarifa (null si no existe)
        tariff_id: tariffId,
        // Asignar a usuario actual
        company_id: user.company_id,
        user_id: user.id,
        // Resetear relaciones de versiones
        parent_budget_id: null,
        version_number: 1,
        // Forzar estado borrador
        status: 'borrador',
      }

      validatedBudgets.push(cleanBudget)
    }

    if (errors.length > 0) {
      log.error('[importBudgets] Errores de validación:', errors)
      return { success: false, error: `Errores de validación: ${errors.join(', ')}` }
    }

    // 5. Insertar en BD
    const { data, error } = await supabase
      .from('redpresu_budgets')
      .insert(validatedBudgets)
      .select()

    if (error) {
      log.error('[importBudgets] Error BD:', error)
      return { success: false, error: error.message }
    }

    // 6. Revalidar página
    revalidatePath('/budgets')

    log.info('[importBudgets] Éxito:', data?.length, 'presupuestos importados')

    return {
      success: true,
      data: { count: data?.length || 0 }
    }
  } catch (error) {
    log.error('[importBudgets] Error inesperado:', error)
    return { success: false, error: 'Error al importar presupuestos' }
  }
}
