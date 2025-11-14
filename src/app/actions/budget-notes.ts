"use server"

import { createServerActionClient } from "@/lib/supabase/helpers"
import { getServerUser } from '@/lib/auth/server'
import { log } from '@/lib/logger'
import { requireValidCompanyId } from '@/lib/helpers/company-validation'

export interface BudgetNote {
  id: string
  budget_id: string
  user_id: string
  content: string
  created_at: string
  updated_at: string
  users?: {
    name: string
    email: string
  }
}

export interface ActionResult {
  success: boolean
  data?: BudgetNote | BudgetNote[]
  error?: string
}

/**
 * Obtener todas las notas de un presupuesto
 */
export async function getBudgetNotes(budgetId: string): Promise<ActionResult> {
  try {
    // Validar budgetId temprano
    if (!budgetId || budgetId.trim() === '') {
      log.warn('[getBudgetNotes] budgetId vacío o inválido')
      return { success: true, data: [] } // Retornar array vacío en lugar de error
    }

    log.info('[getBudgetNotes] Obteniendo notas para presupuesto:', budgetId)

    const user = await getServerUser()
    if (!user) {
      return { success: false, error: 'No autenticado' }
    }

    // SECURITY: Validar company_id obligatorio
    let empresaId: number
    try {
      empresaId = requireValidCompanyId(user, '[getBudgetNotes]')
    } catch (error) {
      log.error('[getBudgetNotes] company_id inválido', { error })
      return { success: false, error: 'Usuario sin empresa asignada' }
    }

        const supabase = await createServerActionClient()

    // SECURITY: Verificar que el budget pertenece a la empresa del usuario
    const { data: budgetData, error: budgetError } = await supabase
      .from('budgets')
      .select('company_id')
      .eq('id', budgetId)
      .single()

    if (budgetError || !budgetData) {
      // En lugar de error, retornar array vacío silenciosamente
      // Esto es normal cuando el componente se renderiza antes que exista el presupuesto
      log.warn('[getBudgetNotes] Budget no encontrado o no accesible:', budgetId)
      return { success: true, data: [] }
    }

    if (budgetData.company_id !== empresaId) {
      log.warn('[getBudgetNotes] Budget de otra empresa, retornando vacío', {
        budgetCompanyId: budgetData.company_id,
        userCompanyId: empresaId
      })
      return { success: true, data: [] }
    }

    // Obtener notas
    const { data: notesData, error: notesError } = await supabase
      .from('budget_notes')
      .select('*')
      .eq('budget_id', budgetId)
      .order('created_at', { ascending: false })

    if (notesError) {
      log.error('[getBudgetNotes] Error BD:', notesError)
      return { success: false, error: notesError.message }
    }

    if (!notesData || notesData.length === 0) {
      log.info('[getBudgetNotes] No hay notas')
      return { success: true, data: [] }
    }

    // Obtener usuarios para las notas
    const userIds = [...new Set(notesData.map(note => note.user_id))]
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('id, nombre, email')
      .in('id', userIds)

    if (usersError) {
      log.error('[getBudgetNotes] Error obteniendo usuarios:', usersError)
      // Continuar sin datos de usuarios
    }

    // Combinar datos
    const notesWithUsers = notesData.map(note => ({
      ...note,
      users: usersData?.find(u => u.id === note.user_id) || { name: 'Usuario', email: '' }
    }))

    log.info('[getBudgetNotes] Notas obtenidas:', notesWithUsers.length)
    return { success: true, data: notesWithUsers as BudgetNote[] }

  } catch (error) {
    log.error('[getBudgetNotes] Error inesperado:', error)
    return { success: false, error: 'Error inesperado' }
  }
}

/**
 * Crear una nueva nota en un presupuesto
 */
export async function addBudgetNote(budgetId: string, content: string): Promise<ActionResult> {
  try {
    log.info('[addBudgetNote] Añadiendo nota a presupuesto:', budgetId)

    if (!content || content.trim() === '') {
      return { success: false, error: 'El contenido no puede estar vacío' }
    }

    const user = await getServerUser()
    if (!user) {
      return { success: false, error: 'No autenticado' }
    }

    // SECURITY: Validar company_id obligatorio
    let empresaId: number
    try {
      empresaId = requireValidCompanyId(user, '[addBudgetNote]')
    } catch (error) {
      log.error('[addBudgetNote] company_id inválido', { error })
      return { success: false, error: 'Usuario sin empresa asignada' }
    }

        const supabase = await createServerActionClient()

    // SECURITY: Verificar que el budget pertenece a la empresa del usuario
    const { data: budgetData, error: budgetError } = await supabase
      .from('budgets')
      .select('company_id')
      .eq('id', budgetId)
      .single()

    if (budgetError || !budgetData) {
      log.error('[addBudgetNote] Budget no encontrado:', budgetError)
      return { success: false, error: 'Presupuesto no encontrado' }
    }

    if (budgetData.company_id !== empresaId) {
      log.error('[addBudgetNote] Intento de acceso a budget de otra empresa', {
        budgetCompanyId: budgetData.company_id,
        userCompanyId: empresaId
      })
      return { success: false, error: 'No tienes acceso a este presupuesto' }
    }

    // Insertar nota
    const { data: noteData, error: noteError } = await supabase
      .from('budget_notes')
      .insert({
        budget_id: budgetId,
        user_id: user.id,
        content: content.trim()
      })
      .select('*')
      .single()

    if (noteError) {
      log.error('[addBudgetNote] Error BD:', noteError)
      return { success: false, error: noteError.message }
    }

    // Obtener datos del usuario
    const { data: userData } = await supabase
      .from('users')
      .select('id, nombre, email')
      .eq('id', user.id)
      .single()

    // Combinar datos
    const noteWithUser = {
      ...noteData,
      users: userData || { name: 'Usuario', email: user.email || '' }
    }

    log.info('[addBudgetNote] Nota creada:', noteWithUser.id)
    return { success: true, data: noteWithUser as BudgetNote }

  } catch (error) {
    log.error('[addBudgetNote] Error inesperado:', error)
    return { success: false, error: 'Error inesperado' }
  }
}

/**
 * Actualizar una nota existente
 */
export async function updateBudgetNote(noteId: string, content: string): Promise<ActionResult> {
  try {
    log.info('[updateBudgetNote] Actualizando nota:', noteId)

    if (!content || content.trim() === '') {
      return { success: false, error: 'El contenido no puede estar vacío' }
    }

    const user = await getServerUser()
    if (!user) {
      return { success: false, error: 'No autenticado' }
    }

        const supabase = await createServerActionClient()

    // Actualizar nota
    const { data: noteData, error: noteError } = await supabase
      .from('budget_notes')
      .update({
        content: content.trim()
      })
      .eq('id', noteId)
      .eq('user_id', user.id) // Solo el creador puede editar
      .select('*')
      .single()

    if (noteError) {
      log.error('[updateBudgetNote] Error BD:', noteError)
      return { success: false, error: noteError.message }
    }

    // Obtener datos del usuario
    const { data: userData } = await supabase
      .from('users')
      .select('id, nombre, email')
      .eq('id', user.id)
      .single()

    // Combinar datos
    const noteWithUser = {
      ...noteData,
      users: userData || { name: 'Usuario', email: user.email || '' }
    }

    log.info('[updateBudgetNote] Nota actualizada:', noteWithUser.id)
    return { success: true, data: noteWithUser as BudgetNote }

  } catch (error) {
    log.error('[updateBudgetNote] Error inesperado:', error)
    return { success: false, error: 'Error inesperado' }
  }
}

/**
 * Eliminar una nota
 */
export async function deleteBudgetNote(noteId: string): Promise<ActionResult> {
  try {
    log.info('[deleteBudgetNote] Eliminando nota:', noteId)

    const user = await getServerUser()
    if (!user) {
      return { success: false, error: 'No autenticado' }
    }

        const supabase = await createServerActionClient()

    // Verificar si es superadmin
    const isSuperadmin = user.role === 'superadmin'

    let query = supabase
      .from('budget_notes')
      .delete()
      .eq('id', noteId)

    // Si no es superadmin, solo puede borrar sus propias notas
    if (!isSuperadmin) {
      query = query.eq('user_id', user.id)
    }

    const { error } = await query

    if (error) {
      log.error('[deleteBudgetNote] Error BD:', error)
      return { success: false, error: error.message }
    }

    log.info('[deleteBudgetNote] Nota eliminada:', noteId)
    return { success: true }

  } catch (error) {
    log.error('[deleteBudgetNote] Error inesperado:', error)
    return { success: false, error: 'Error inesperado' }
  }
}

/**
 * Obtener el conteo de notas de un presupuesto (para mostrar badge)
 */
export async function getBudgetNotesCount(budgetId: string): Promise<number> {
  try {
        const supabase = await createServerActionClient()

    const { count, error } = await supabase
      .from('budget_notes')
      .select('*', { count: 'exact', head: true })
      .eq('budget_id', budgetId)

    if (error) {
      log.error('[getBudgetNotesCount] Error BD:', error)
      return 0
    }

    return count || 0

  } catch (error) {
    log.error('[getBudgetNotesCount] Error inesperado:', error)
    return 0
  }
}
