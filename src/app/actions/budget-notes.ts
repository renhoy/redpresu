"use server"

import { createServerActionClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { getServerUser } from '@/lib/auth/server'

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
    console.log('[getBudgetNotes] Obteniendo notas para presupuesto:', budgetId)

    const user = await getServerUser()
    if (!user) {
      return { success: false, error: 'No autenticado' }
    }

    const cookieStore = await cookies()
    const supabase = createServerActionClient({ cookies: () => cookieStore })

    const { data, error } = await supabase
      .from('budget_notes')
      .select(`
        *,
        users (
          name,
          email
        )
      `)
      .eq('budget_id', budgetId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[getBudgetNotes] Error BD:', error)
      return { success: false, error: error.message }
    }

    console.log('[getBudgetNotes] Notas obtenidas:', data?.length || 0)
    return { success: true, data: data as BudgetNote[] }

  } catch (error) {
    console.error('[getBudgetNotes] Error inesperado:', error)
    return { success: false, error: 'Error inesperado' }
  }
}

/**
 * Crear una nueva nota en un presupuesto
 */
export async function addBudgetNote(budgetId: string, content: string): Promise<ActionResult> {
  try {
    console.log('[addBudgetNote] Añadiendo nota a presupuesto:', budgetId)

    if (!content || content.trim() === '') {
      return { success: false, error: 'El contenido no puede estar vacío' }
    }

    const user = await getServerUser()
    if (!user) {
      return { success: false, error: 'No autenticado' }
    }

    const cookieStore = await cookies()
    const supabase = createServerActionClient({ cookies: () => cookieStore })

    const { data, error } = await supabase
      .from('budget_notes')
      .insert({
        budget_id: budgetId,
        user_id: user.id,
        content: content.trim()
      })
      .select(`
        *,
        users (
          name,
          email
        )
      `)
      .single()

    if (error) {
      console.error('[addBudgetNote] Error BD:', error)
      return { success: false, error: error.message }
    }

    console.log('[addBudgetNote] Nota creada:', data.id)
    return { success: true, data: data as BudgetNote }

  } catch (error) {
    console.error('[addBudgetNote] Error inesperado:', error)
    return { success: false, error: 'Error inesperado' }
  }
}

/**
 * Actualizar una nota existente
 */
export async function updateBudgetNote(noteId: string, content: string): Promise<ActionResult> {
  try {
    console.log('[updateBudgetNote] Actualizando nota:', noteId)

    if (!content || content.trim() === '') {
      return { success: false, error: 'El contenido no puede estar vacío' }
    }

    const user = await getServerUser()
    if (!user) {
      return { success: false, error: 'No autenticado' }
    }

    const cookieStore = await cookies()
    const supabase = createServerActionClient({ cookies: () => cookieStore })

    const { data, error } = await supabase
      .from('budget_notes')
      .update({
        content: content.trim()
      })
      .eq('id', noteId)
      .eq('user_id', user.id) // Solo el creador puede editar
      .select(`
        *,
        users (
          name,
          email
        )
      `)
      .single()

    if (error) {
      console.error('[updateBudgetNote] Error BD:', error)
      return { success: false, error: error.message }
    }

    console.log('[updateBudgetNote] Nota actualizada:', data.id)
    return { success: true, data: data as BudgetNote }

  } catch (error) {
    console.error('[updateBudgetNote] Error inesperado:', error)
    return { success: false, error: 'Error inesperado' }
  }
}

/**
 * Eliminar una nota
 */
export async function deleteBudgetNote(noteId: string): Promise<ActionResult> {
  try {
    console.log('[deleteBudgetNote] Eliminando nota:', noteId)

    const user = await getServerUser()
    if (!user) {
      return { success: false, error: 'No autenticado' }
    }

    const cookieStore = await cookies()
    const supabase = createServerActionClient({ cookies: () => cookieStore })

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
      console.error('[deleteBudgetNote] Error BD:', error)
      return { success: false, error: error.message }
    }

    console.log('[deleteBudgetNote] Nota eliminada:', noteId)
    return { success: true }

  } catch (error) {
    console.error('[deleteBudgetNote] Error inesperado:', error)
    return { success: false, error: 'Error inesperado' }
  }
}

/**
 * Obtener el conteo de notas de un presupuesto (para mostrar badge)
 */
export async function getBudgetNotesCount(budgetId: string): Promise<number> {
  try {
    const cookieStore = await cookies()
    const supabase = createServerActionClient({ cookies: () => cookieStore })

    const { count, error } = await supabase
      .from('budget_notes')
      .select('*', { count: 'exact', head: true })
      .eq('budget_id', budgetId)

    if (error) {
      console.error('[getBudgetNotesCount] Error BD:', error)
      return 0
    }

    return count || 0

  } catch (error) {
    console.error('[getBudgetNotesCount] Error inesperado:', error)
    return 0
  }
}
