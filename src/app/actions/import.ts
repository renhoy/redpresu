/**
 * Import Server Actions
 *
 * Funciones para importar tarifas y presupuestos desde archivos JSON
 * VULN-008: Validación robusta con Zod para prevenir inyección
 */

'use server'
import { log } from '@/lib/logger'

import { createServerActionClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { getServerUser } from '@/lib/auth/server'
import type { ActionResult } from '@/lib/types/database'
import { revalidatePath } from 'next/cache'
import { detectIVAsPresentes } from '@/lib/validators/csv-converter'
import { requireValidCompanyId } from '@/lib/helpers/company-validation'
import { getAppName } from '@/lib/helpers/config-helpers'
import {
  ImportTariffsArraySchema,
  ImportBudgetsArraySchema,
  sanitizeObject,
  validateJSONSize,
  MAX_FILE_SIZE_FORMATTED
} from '@/lib/validators/import-schemas'
import { ZodError } from 'zod'

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
    if (user.role === 'comercial') {
      return { success: false, error: 'Sin permisos para importar tarifas' }
    }

    // SECURITY: Validar company_id obligatorio
    let empresaId: number
    try {
      empresaId = requireValidCompanyId(user, '[importTariffs]')
    } catch (error) {
      log.error('[importTariffs] company_id inválido', { error })
      return { success: false, error: 'Usuario sin empresa asignada' }
    }

    // 3. SECURITY: Validar tamaño de archivo
    const sizeValidation = validateJSONSize(content)
    if (!sizeValidation.valid) {
      log.error('[importTariffs] Archivo demasiado grande')
      return { success: false, error: sizeValidation.error! }
    }

    // 4. Parsear JSON (primer paso antes de validación)
    let rawTariffs: any[]
    try {
      rawTariffs = JSON.parse(content)
    } catch (e) {
      log.error('[importTariffs] Error parsing JSON:', e)
      const appName = await getAppName()
      return {
        success: false,
        error: `El archivo JSON de tarifa importado no es válido. Puedes exportar una tarifa existente para obtener un ejemplo del formato correcto.\n\nExporta tus tarifas para tener una copia de seguridad fuera de ${appName}. Si deseas generar nuevas tarifas hazlo desde ${appName} para evitar errores.`
      }
    }

    // 5. SECURITY: Sanitizar objeto (prevenir prototype pollution)
    const sanitizedTariffs = sanitizeObject(rawTariffs)

    // 6. SECURITY: Validar con Zod (estructura completa)
    let validatedTariffs: any[]
    try {
      validatedTariffs = ImportTariffsArraySchema.parse(sanitizedTariffs)
      log.info('[importTariffs] Validación Zod exitosa:', validatedTariffs.length, 'tarifas')
    } catch (e) {
      if (e instanceof ZodError) {
        const firstError = e.errors[0]
        const errorPath = firstError.path.join('.')
        const errorMessage = firstError.message

        log.error('[importTariffs] Error validación Zod:', {
          path: errorPath,
          message: errorMessage,
          errors: e.errors.slice(0, 3) // Primeros 3 errores
        })

        return {
          success: false,
          error: `Error de validación en ${errorPath}: ${errorMessage}. Verifica que el archivo tenga el formato correcto.`
        }
      }

      log.error('[importTariffs] Error inesperado en validación:', e)
      return {
        success: false,
        error: 'Error al validar el archivo. Verifica el formato.'
      }
    }

    // 7. Preparar tarifas para inserción
    const tariffsToInsert = validatedTariffs.map((tariff, i) => {
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
      const { ...tariffData } = tariff

      // Construir tarifa limpia
      return {
        ...tariffData,
        // SECURITY: Asignar company_id validado
        company_id: empresaId,
        user_id: user.id,
        // Forzar valores para importación
        is_template: false,
        status: 'Inactiva',
        ivas_presentes: ivasPresentes,
      }
    })

    // 8. Insertar en BD
    const cookieStore = await cookies()
    const supabase = createServerActionClient({ cookies: () => cookieStore })

    const { data, error } = await supabase
      .from('redpresu_tariffs')
      .insert(tariffsToInsert)
      .select()

    if (error) {
      log.error('[importTariffs] Error BD:', error)
      return { success: false, error: error.message }
    }

    // 9. Revalidar página
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

    // SECURITY: Validar company_id obligatorio
    let empresaId: number
    try {
      empresaId = requireValidCompanyId(user, '[importBudgets]')
    } catch (error) {
      log.error('[importBudgets] company_id inválido', { error })
      return { success: false, error: 'Usuario sin empresa asignada' }
    }

    // 2. Autorización (todos los roles pueden importar presupuestos)

    // 3. SECURITY: Validar tamaño de archivo
    const sizeValidation = validateJSONSize(content)
    if (!sizeValidation.valid) {
      log.error('[importBudgets] Archivo demasiado grande')
      return { success: false, error: sizeValidation.error! }
    }

    // 4. Parsear JSON (primer paso antes de validación)
    let rawBudgets: any[]
    try {
      rawBudgets = JSON.parse(content)
    } catch (e) {
      log.error('[importBudgets] Error parsing JSON:', e)
      const appName = await getAppName()
      return {
        success: false,
        error: `El archivo JSON de presupuesto importado no es válido. Puedes exportar un presupuesto existente para obtener un ejemplo del formato correcto.\n\nExporta tus presupuestos para tener una copia de seguridad fuera de ${appName}. Si deseas generar nuevos presupuestos hazlo desde ${appName} para evitar errores.`
      }
    }

    // 5. SECURITY: Sanitizar objeto (prevenir prototype pollution)
    const sanitizedBudgets = sanitizeObject(rawBudgets)

    // 6. SECURITY: Validar con Zod (estructura completa)
    let validatedBudgets: any[]
    try {
      validatedBudgets = ImportBudgetsArraySchema.parse(sanitizedBudgets)
      log.info('[importBudgets] Validación Zod exitosa:', validatedBudgets.length, 'presupuestos')
    } catch (e) {
      if (e instanceof ZodError) {
        const firstError = e.errors[0]
        const errorPath = firstError.path.join('.')
        const errorMessage = firstError.message

        log.error('[importBudgets] Error validación Zod:', {
          path: errorPath,
          message: errorMessage,
          errors: e.errors.slice(0, 3) // Primeros 3 errores
        })

        return {
          success: false,
          error: `Error de validación en ${errorPath}: ${errorMessage}. Verifica que el archivo tenga el formato correcto.`
        }
      }

      log.error('[importBudgets] Error inesperado en validación:', e)
      return {
        success: false,
        error: 'Error al validar el archivo. Verifica el formato.'
      }
    }

    // 7. Preparar presupuestos para inserción
    const cookieStore = await cookies()
    const supabase = createServerActionClient({ cookies: () => cookieStore })

    const budgetsToInsert = await Promise.all(
      validatedBudgets.map(async (budget, i) => {
        // Validar si tarifa existe (opcional, no falla si no existe)
        let tariffId = budget.tariff_id
        if (tariffId) {
          const { data: tariffExists } = await supabase
            .from('redpresu_tariffs')
            .select('id')
            .eq('id', tariffId)
            .eq('company_id', empresaId)  // SECURITY: Usar empresaId validado
            .single()

          if (!tariffExists) {
            log.info(`[importBudgets] Presupuesto ${i + 1}: tariff_id no existe, se establecerá como null`)
            tariffId = null
          }
        }

        // Construir presupuesto limpio
        return {
          ...budget,
          // Asignar tarifa (null si no existe)
          tariff_id: tariffId,
          // SECURITY: Asignar company_id validado
          company_id: empresaId,
          user_id: user.id,
          // Resetear relaciones de versiones
          parent_budget_id: null,
          version_number: 1,
          // Forzar estado borrador
          status: 'borrador',
        }
      })
    )

    // 8. Insertar en BD
    const { data, error } = await supabase
      .from('redpresu_budgets')
      .insert(budgetsToInsert)
      .select()

    if (error) {
      log.error('[importBudgets] Error BD:', error)
      return { success: false, error: error.message }
    }

    // 9. Revalidar página
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
