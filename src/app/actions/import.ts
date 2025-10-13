/**
 * Import Server Actions
 *
 * Funciones para importar tarifas y presupuestos desde archivos JSON
 */

'use server'

import { createServerActionClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { getServerUser } from '@/lib/auth/server'
import type { ActionResult } from '@/lib/types/database'
import { revalidatePath } from 'next/cache'

/**
 * Importa tarifas desde JSON
 * @param content - Contenido del archivo JSON
 */
export async function importTariffs(
  content: string
): Promise<ActionResult<{ count: number }>> {
  try {
    console.log('[importTariffs] Iniciando...')

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
      console.error('[importTariffs] Error parsing JSON:', e)
      return { success: false, error: 'JSON inválido' }
    }

    if (!Array.isArray(tariffs)) {
      return { success: false, error: 'El JSON debe contener un array de tarifas' }
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

      // Limpiar campos internos
      const cleanTariff = {
        ...tariff,
        // Regenerar campos
        id: undefined, // nuevo ID generado por DB
        created_at: undefined,
        updated_at: undefined,
        // Asignar a usuario actual
        empresa_id: user.empresa_id,
        user_id: user.id,
        // Resetear plantilla
        is_template: false,
      }

      validatedTariffs.push(cleanTariff)
    }

    if (errors.length > 0) {
      console.error('[importTariffs] Errores de validación:', errors)
      return { success: false, error: `Errores de validación: ${errors.join(', ')}` }
    }

    // 5. Insertar en BD
    const cookieStore = await cookies()
    const supabase = createServerActionClient({ cookies: () => cookieStore })

    const { data, error } = await supabase
      .from('tariffs')
      .insert(validatedTariffs)
      .select()

    if (error) {
      console.error('[importTariffs] Error BD:', error)
      return { success: false, error: error.message }
    }

    // 6. Revalidar página
    revalidatePath('/tariffs')

    console.log('[importTariffs] Éxito:', data?.length, 'tarifas importadas')

    return {
      success: true,
      data: { count: data?.length || 0 }
    }
  } catch (error) {
    console.error('[importTariffs] Error inesperado:', error)
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
    console.log('[importBudgets] Iniciando...')

    // 1. Autenticación
    const user = await getServerUser()
    if (!user) {
      return { success: false, error: 'No autenticado' }
    }

    // 2. Autorización (solo admin/superadmin)
    if (user.role === 'vendedor') {
      return { success: false, error: 'Sin permisos para importar presupuestos' }
    }

    // 3. Parsear JSON
    let budgets: any[]
    try {
      budgets = JSON.parse(content)
    } catch (e) {
      console.error('[importBudgets] Error parsing JSON:', e)
      return { success: false, error: 'JSON inválido' }
    }

    if (!Array.isArray(budgets)) {
      return { success: false, error: 'El JSON debe contener un array de presupuestos' }
    }

    if (budgets.length === 0) {
      return { success: false, error: 'El archivo no contiene presupuestos' }
    }

    // 4. Validar estructura básica
    const validatedBudgets = []
    const errors: string[] = []

    for (let i = 0; i < budgets.length; i++) {
      const budget = budgets[i]

      // Campos requeridos
      if (!budget.tariff_id || !budget.client_name) {
        errors.push(`Presupuesto ${i + 1}: falta campo obligatorio (tariff_id o client_name)`)
        continue
      }

      // Validar tarifa existe
      const cookieStore = await cookies()
      const supabase = createServerActionClient({ cookies: () => cookieStore })

      const { data: tariffExists } = await supabase
        .from('tariffs')
        .select('id')
        .eq('id', budget.tariff_id)
        .eq('empresa_id', user.empresa_id)
        .single()

      if (!tariffExists) {
        errors.push(`Presupuesto ${i + 1}: tariff_id no existe o no pertenece a tu empresa`)
        continue
      }

      // Limpiar campos internos
      const cleanBudget = {
        ...budget,
        // Regenerar campos
        id: undefined, // nuevo ID generado por DB
        created_at: undefined,
        updated_at: undefined,
        // Asignar a usuario actual
        empresa_id: user.empresa_id,
        user_id: user.id,
        // Resetear relaciones de versiones
        parent_budget_id: null,
        version_number: 1,
        // Resetear estado
        status: 'borrador',
      }

      validatedBudgets.push(cleanBudget)
    }

    if (errors.length > 0) {
      console.error('[importBudgets] Errores de validación:', errors)
      return { success: false, error: `Errores de validación: ${errors.join(', ')}` }
    }

    // 5. Insertar en BD
    const cookieStore = await cookies()
    const supabase = createServerActionClient({ cookies: () => cookieStore })

    const { data, error } = await supabase
      .from('budgets')
      .insert(validatedBudgets)
      .select()

    if (error) {
      console.error('[importBudgets] Error BD:', error)
      return { success: false, error: error.message }
    }

    // 6. Revalidar página
    revalidatePath('/budgets')

    console.log('[importBudgets] Éxito:', data?.length, 'presupuestos importados')

    return {
      success: true,
      data: { count: data?.length || 0 }
    }
  } catch (error) {
    console.error('[importBudgets] Error inesperado:', error)
    return { success: false, error: 'Error al importar presupuestos' }
  }
}
