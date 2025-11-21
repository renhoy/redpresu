'use server'

import { supabaseAdmin } from '@/lib/supabase/server'
import { createServerActionClient } from '@/lib/supabase/helpers'
import { log } from '@/lib/logger'
import { sendUserApprovedEmail, sendUserRejectedEmail } from '@/lib/helpers/email-helpers'
import { getEmailNotificationsEnabled } from '@/lib/helpers/config-helpers'

export interface ActionResult {
  success: boolean
  error?: string
  message?: string
}

export interface PendingUser {
  id: string
  name: string
  last_name: string
  email: string
  role: string
  company_id: number
  created_at: string
  companies?: {
    name: string
  }
}

/**
 * Obtiene lista de usuarios pendientes de aprobación
 * Solo accesible para superadmin
 */
export async function getPendingUsers(): Promise<{ success: boolean; users?: PendingUser[]; error?: string }> {
  try {
    const supabase = await createServerActionClient()

    // Verificar que el usuario actual es superadmin
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: 'No autenticado' }
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userError || !userData || userData.role !== 'superadmin') {
      return { success: false, error: 'Solo superadmin puede ver usuarios pendientes' }
    }

    // Obtener usuarios con estado 'pendiente'
    const { data: pendingUsers, error: queryError } = await supabaseAdmin
      .from('users')
      .select('id, name, last_name, email, role, company_id, created_at, companies(name)')
      .eq('status', 'pendiente')
      .order('created_at', { ascending: false })

    if (queryError) {
      log.error('[getPendingUsers] Error:', queryError)
      return { success: false, error: 'Error al obtener usuarios pendientes' }
    }

    return { success: true, users: pendingUsers || [] }
  } catch (error) {
    log.error('[getPendingUsers] Error crítico:', error)
    return { success: false, error: 'Error inesperado' }
  }
}

/**
 * Aprueba un usuario pendiente (cambia estado a 'active')
 * Solo accesible para superadmin
 */
export async function approveUser(userId: string): Promise<ActionResult> {
  try {
    log.info('[approveUser] Aprobando usuario:', userId)

    const supabase = await createServerActionClient()

    // Verificar que el usuario actual es superadmin
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: 'No autenticado' }
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userError || !userData || userData.role !== 'superadmin') {
      return { success: false, error: 'Solo superadmin puede aprobar usuarios' }
    }

    // Obtener datos del usuario a aprobar
    const { data: targetUser, error: targetError } = await supabaseAdmin
      .from('users')
      .select('id, name, email, status')
      .eq('id', userId)
      .single()

    if (targetError || !targetUser) {
      log.error('[approveUser] Usuario no encontrado:', targetError)
      return { success: false, error: 'Usuario no encontrado' }
    }

    if (targetUser.status !== 'pendiente') {
      return { success: false, error: 'El usuario no está pendiente de aprobación' }
    }

    // Cambiar estado a 'active'
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)

    if (updateError) {
      log.error('[approveUser] Error al actualizar usuario:', updateError)
      return { success: false, error: 'Error al aprobar usuario' }
    }

    log.info('[approveUser] Usuario aprobado exitosamente:', userId)

    // Enviar email de notificación si está habilitado
    const emailEnabled = await getEmailNotificationsEnabled()
    if (emailEnabled) {
      try {
        await sendUserApprovedEmail(targetUser.email, targetUser.name)
        log.info('[approveUser] Email de aprobación enviado a:', targetUser.email)
      } catch (emailError) {
        log.error('[approveUser] Error al enviar email:', emailError)
        // No fallar si el email falla - el usuario ya fue aprobado
      }
    }

    return {
      success: true,
      message: `Usuario ${targetUser.name} aprobado exitosamente`
    }
  } catch (error) {
    log.error('[approveUser] Error crítico:', error)
    return { success: false, error: 'Error inesperado al aprobar usuario' }
  }
}

/**
 * Rechaza un usuario pendiente (cambia estado a 'rejected')
 * Solo accesible para superadmin
 */
export async function rejectUser(userId: string, reason?: string): Promise<ActionResult> {
  try {
    log.info('[rejectUser] Rechazando usuario:', userId)

    const supabase = await createServerActionClient()

    // Verificar que el usuario actual es superadmin
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: 'No autenticado' }
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userError || !userData || userData.role !== 'superadmin') {
      return { success: false, error: 'Solo superadmin puede rechazar usuarios' }
    }

    // Obtener datos del usuario a rechazar
    const { data: targetUser, error: targetError } = await supabaseAdmin
      .from('users')
      .select('id, name, email, status')
      .eq('id', userId)
      .single()

    if (targetError || !targetUser) {
      log.error('[rejectUser] Usuario no encontrado:', targetError)
      return { success: false, error: 'Usuario no encontrado' }
    }

    if (targetUser.status !== 'pendiente') {
      return { success: false, error: 'El usuario no está pendiente de aprobación' }
    }

    // Cambiar estado a 'rejected'
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        status: 'rejected',
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)

    if (updateError) {
      log.error('[rejectUser] Error al actualizar usuario:', updateError)
      return { success: false, error: 'Error al rechazar usuario' }
    }

    log.info('[rejectUser] Usuario rechazado exitosamente:', userId)

    // Enviar email de notificación si está habilitado
    const emailEnabled = await getEmailNotificationsEnabled()
    if (emailEnabled) {
      try {
        await sendUserRejectedEmail(targetUser.email, targetUser.name, reason)
        log.info('[rejectUser] Email de rechazo enviado a:', targetUser.email)
      } catch (emailError) {
        log.error('[rejectUser] Error al enviar email:', emailError)
        // No fallar si el email falla - el usuario ya fue rechazado
      }
    }

    return {
      success: true,
      message: `Usuario ${targetUser.name} rechazado`
    }
  } catch (error) {
    log.error('[rejectUser] Error crítico:', error)
    return { success: false, error: 'Error inesperado al rechazar usuario' }
  }
}

/**
 * Obtiene el contador de usuarios pendientes
 * Solo accesible para superadmin
 */
export async function getPendingUsersCount(): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    const supabase = await createServerActionClient()

    // Verificar que el usuario actual es superadmin
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: 'No autenticado' }
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userError || !userData || userData.role !== 'superadmin') {
      return { success: false, count: 0 }
    }

    // Contar usuarios con estado 'pendiente'
    const { count, error: countError } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pendiente')

    if (countError) {
      log.error('[getPendingUsersCount] Error:', countError)
      return { success: false, error: 'Error al contar usuarios pendientes' }
    }

    return { success: true, count: count || 0 }
  } catch (error) {
    log.error('[getPendingUsersCount] Error crítico:', error)
    return { success: false, error: 'Error inesperado' }
  }
}
