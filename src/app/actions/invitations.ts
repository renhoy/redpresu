'use server'

import { log } from '@/lib/logger'
import { cookies } from 'next/headers'
import { createServerActionClient } from '@supabase/auth-helpers-nextjs'
import { supabaseAdmin } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import crypto from 'crypto'

/**
 * Interfaz para datos de invitación
 */
export interface InvitationData {
  id: string
  inviter_id: string
  inviter_name: string
  inviter_email: string
  email: string
  token: string
  expires_at: string
  status: 'pending' | 'accepted' | 'expired' | 'cancelled'
  created_at: string
}

/**
 * Interfaz para resultado de operaciones de invitación
 */
export interface InvitationResult {
  success: boolean
  error?: string
  data?: {
    invitationId?: string
    token?: string
    expiresAt?: string
    emailMessage?: string
    existingUserName?: string
    existingUserLastName?: string
    userId?: string
    autoLoginFailed?: boolean
  }
}

/**
 * Server Action para crear una invitación de usuario
 *
 * @param email - Email del usuario a invitar
 * @param expirationDays - Días hasta que expire la invitación (por defecto lee de config, fallback 7)
 * @returns InvitationResult con token y datos de la invitación
 */
export async function createUserInvitation(
  email: string,
  expirationDays?: number
): Promise<InvitationResult> {
  try {
    const cookieStore = await cookies()
    const supabase = createServerActionClient({ cookies: () => cookieStore })

    // Obtener días de expiración desde configuración si no se proporciona
    if (!expirationDays) {
      const { data: configData } = await supabase
        .from('redpresu_config')
        .select('value')
        .eq('key', 'invitation_token_expiration_days')
        .single()

      expirationDays = configData?.value ? Number(configData.value) : 7
    }

    log.info('[createUserInvitation] Iniciando...', { email, expirationDays })

    // Validar email
    if (!email || !email.trim()) {
      return {
        success: false,
        error: 'El email es requerido'
      }
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email.trim())) {
      return {
        success: false,
        error: 'Email inválido'
      }
    }

    // Obtener usuario autenticado
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      log.error('[createUserInvitation] No autenticado:', authError)
      return {
        success: false,
        error: 'No estás autenticado'
      }
    }

    // Verificar rol (solo admin y superadmin pueden invitar)
    const { data: userData, error: userError } = await supabase
      .from('redpresu_users')
      .select('role, name, email, company_id')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      log.error('[createUserInvitation] Error obteniendo usuario:', userError)
      return {
        success: false,
        error: 'Error al obtener datos del usuario'
      }
    }

    if (!['admin', 'superadmin'].includes(userData.role)) {
      return {
        success: false,
        error: 'Solo administradores pueden invitar usuarios'
      }
    }

    // Verificar el estado del usuario si ya está registrado
    const { data: existingUser, error: checkError } = await supabaseAdmin
      .from('redpresu_users')
      .select('id, email, status')
      .eq('email', email.trim().toLowerCase())
      .maybeSingle()

    if (existingUser) {
      // Si el usuario ya está activo (tiene contraseña), no permitir invitación
      if (existingUser.status === 'active' || existingUser.status === 'inactive') {
        return {
          success: false,
          error: 'Este usuario ya ha configurado su contraseña'
        }
      }

      // Si está en pending, puede recibir invitación (no tiene contraseña aún)
      if (existingUser.status !== 'pending') {
        return {
          success: false,
          error: 'Este email ya está registrado en el sistema'
        }
      }

      // Usuario está en pending: OK, continuar con invitación
    }

    // Verificar si ya existe una invitación pendiente para este email
    const { data: existingInvitation, error: invError } = await supabase
      .from('redpresu_user_invitations')
      .select('id, status, expires_at')
      .eq('email', email.trim().toLowerCase())
      .eq('status', 'pending')
      .maybeSingle()

    if (existingInvitation) {
      // Verificar si está expirada
      const expiresAt = new Date(existingInvitation.expires_at)
      if (expiresAt > new Date()) {
        return {
          success: false,
          error: 'Ya existe una invitación pendiente para este email'
        }
      } else {
        // Marcar como expirada
        await supabase
          .from('redpresu_user_invitations')
          .update({ status: 'expired', updated_at: new Date().toISOString() })
          .eq('id', existingInvitation.id)
      }
    }

    // Generar token único
    const token = crypto.randomBytes(32).toString('hex')

    // Calcular fecha de expiración
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + expirationDays)

    // Crear invitación
    const { data: invitationData, error: createError } = await supabase
      .from('redpresu_user_invitations')
      .insert({
        inviter_id: user.id,
        email: email.trim().toLowerCase(),
        token,
        expires_at: expiresAt.toISOString(),
        status: 'pending'
      })
      .select('id')
      .single()

    if (createError || !invitationData) {
      log.error('[createUserInvitation] Error creando invitación:', createError)
      return {
        success: false,
        error: 'Error al crear la invitación'
      }
    }

    log.info('[createUserInvitation] Invitación creada:', invitationData.id)

    // Construir URL de invitación
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    const invitationUrl = `${baseUrl}/accept-invitation?token=${token}`

    // Obtener plantilla de email desde configuración
    const { data: templateConfig } = await supabase
      .from('redpresu_config')
      .select('value')
      .eq('key', 'invitation_email_template')
      .single()

    // Construir mensaje de email usando plantilla o fallback
    let emailMessage: string

    if (templateConfig?.value) {
      // Usar plantilla de configuración
      const template = typeof templateConfig.value === 'string'
        ? templateConfig.value
        : JSON.stringify(templateConfig.value).replace(/^"|"$/g, '')

      emailMessage = template.replace(/\{\{invitationUrl\}\}/g, invitationUrl)
    } else {
      // Fallback: plantilla por defecto si no existe en config
      emailMessage = `Hola,

${userData.name} (${userData.email}) te ha invitado a unirte al sistema de presupuestos.

Para aceptar la invitación y configurar tu contraseña, haz clic en el siguiente enlace:

${invitationUrl}

Este enlace expirará el ${expiresAt.toLocaleDateString('es-ES', {
  day: '2-digit',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
})}.

Si no solicitaste esta invitación, puedes ignorar este mensaje.

Saludos,
El equipo de ${process.env.NEXT_PUBLIC_APP_NAME || 'Presupuestos'}`
    }

    return {
      success: true,
      data: {
        invitationId: invitationData.id,
        token,
        expiresAt: expiresAt.toISOString(),
        emailMessage
      }
    }

  } catch (error) {
    log.error('[createUserInvitation] Error crítico:', error)

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error inesperado al crear invitación'
    }
  }
}

/**
 * Server Action para validar un token de invitación
 *
 * @param token - Token de invitación a validar
 * @returns InvitationResult con datos de la invitación si es válida
 */
export async function validateInvitationToken(token: string): Promise<InvitationResult> {
  try {
    log.info('[validateInvitationToken] Validando token...')

    if (!token || !token.trim()) {
      return {
        success: false,
        error: 'Token inválido'
      }
    }

    // Buscar invitación usando supabaseAdmin (bypass RLS para tokens públicos)
    const { data: invitation, error: invError } = await supabaseAdmin
      .from('redpresu_user_invitations')
      .select(`
        id,
        inviter_id,
        email,
        token,
        expires_at,
        status,
        created_at
      `)
      .eq('token', token.trim())
      .single()

    if (invError || !invitation) {
      log.error('[validateInvitationToken] Token no encontrado:', invError)
      return {
        success: false,
        error: 'Token de invitación no válido'
      }
    }

    // Verificar que no esté ya aceptada
    if (invitation.status === 'accepted') {
      return {
        success: false,
        error: 'Esta invitación ya ha sido aceptada'
      }
    }

    // Verificar que no esté cancelada
    if (invitation.status === 'cancelled') {
      return {
        success: false,
        error: 'Esta invitación ha sido cancelada'
      }
    }

    // Verificar que no esté expirada
    const expiresAt = new Date(invitation.expires_at)
    if (expiresAt < new Date()) {
      // Marcar como expirada
      await supabaseAdmin
        .from('redpresu_user_invitations')
        .update({ status: 'expired', updated_at: new Date().toISOString() })
        .eq('id', invitation.id)

      return {
        success: false,
        error: 'Esta invitación ha expirado'
      }
    }

    // Obtener datos del invitador
    const { data: inviterData, error: inviterError } = await supabaseAdmin
      .from('redpresu_users')
      .select('name, email')
      .eq('id', invitation.inviter_id)
      .single()

    if (inviterError || !inviterData) {
      log.error('[validateInvitationToken] Error obteniendo invitador:', inviterError)
    }

    // Verificar si el usuario ya existe (pre-creado por admin)
    const { data: existingUser } = await supabaseAdmin
      .from('redpresu_users')
      .select('id, name, last_name, status')
      .eq('email', invitation.email)
      .eq('status', 'pending')
      .maybeSingle()

    log.info('[validateInvitationToken] Token válido para:', invitation.email)

    return {
      success: true,
      data: {
        invitationId: invitation.id,
        token: invitation.token,
        expiresAt: invitation.expires_at,
        emailMessage: `Invitación de ${inviterData?.name || 'un administrador'} (${inviterData?.email || ''}) para ${invitation.email}`,
        // Incluir nombre y apellidos si el usuario ya existe
        existingUserName: existingUser?.name || undefined,
        existingUserLastName: existingUser?.last_name || undefined
      }
    }

  } catch (error) {
    log.error('[validateInvitationToken] Error crítico:', error)

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error inesperado al validar token'
    }
  }
}

/**
 * Server Action para aceptar una invitación y crear usuario
 *
 * @param token - Token de invitación
 * @param password - Contraseña del nuevo usuario
 * @param name - Nombre del usuario
 * @param lastName - Apellido del usuario
 * @returns InvitationResult indicando éxito o error
 */
export async function acceptInvitation(
  token: string,
  password: string,
  name: string,
  lastName: string
): Promise<InvitationResult> {
  try {
    log.info('[acceptInvitation] Aceptando invitación...')

    // Validar datos
    if (!token || !password || !name || !lastName) {
      return {
        success: false,
        error: 'Todos los campos son requeridos'
      }
    }

    // Validar contraseña
    if (password.length < 8) {
      return {
        success: false,
        error: 'La contraseña debe tener al menos 8 caracteres'
      }
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/
    if (!passwordRegex.test(password)) {
      return {
        success: false,
        error: 'La contraseña debe contener al menos una mayúscula, una minúscula y un número'
      }
    }

    // Validar token
    const validationResult = await validateInvitationToken(token)
    if (!validationResult.success) {
      return validationResult
    }

    // Obtener invitación
    const { data: invitation, error: invError } = await supabaseAdmin
      .from('redpresu_user_invitations')
      .select('id, inviter_id, email')
      .eq('token', token)
      .eq('status', 'pending')
      .single()

    if (invError || !invitation) {
      log.error('[acceptInvitation] Error obteniendo invitación:', invError)
      return {
        success: false,
        error: 'Invitación no válida'
      }
    }

    // Obtener company_id del invitador
    const { data: inviterData, error: inviterError } = await supabaseAdmin
      .from('redpresu_users')
      .select('company_id')
      .eq('id', invitation.inviter_id)
      .single()

    if (inviterError || !inviterData) {
      log.error('[acceptInvitation] Error obteniendo empresa del invitador:', inviterError)
      return {
        success: false,
        error: 'Error al obtener datos de la empresa'
      }
    }

    // Verificar si el usuario ya existe (pre-creado por admin)
    const { data: existingUser, error: existingUserError } = await supabaseAdmin
      .from('redpresu_users')
      .select('id, status, role, name, last_name')
      .eq('email', invitation.email)
      .maybeSingle()

    let userId: string

    if (existingUser && existingUser.status === 'pending') {
      // FLUJO A: Usuario pre-creado por admin (status='pending')
      // Solo actualizamos su contraseña y lo activamos
      log.info('[acceptInvitation] Usuario pre-creado encontrado, actualizando contraseña:', existingUser.id)

      userId = existingUser.id

      // Actualizar contraseña en auth.users
      const { error: updatePasswordError } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        {
          password,
          email_confirm: true,
          user_metadata: {
            name,
            last_name: lastName
          }
        }
      )

      if (updatePasswordError) {
        log.error('[acceptInvitation] Error actualizando contraseña:', updatePasswordError)
        return {
          success: false,
          error: 'Error al configurar la contraseña'
        }
      }

      // Actualizar registro en redpresu_users
      const { error: updateUserError } = await supabaseAdmin
        .from('redpresu_users')
        .update({
          name: name.trim(),
          last_name: lastName.trim(),
          status: 'active',
          invited_by: invitation.inviter_id,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)

      if (updateUserError) {
        log.error('[acceptInvitation] Error actualizando usuario:', updateUserError)
        return {
          success: false,
          error: 'Error al actualizar el perfil de usuario'
        }
      }

    } else {
      // FLUJO B: Usuario NO existe, crear nuevo (flujo original de invitación directa)
      log.info('[acceptInvitation] Creando nuevo usuario para:', invitation.email)

      // Crear usuario en auth.users
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: invitation.email,
        password,
        email_confirm: true,
        user_metadata: {
          name,
          last_name: lastName
        }
      })

      if (authError) {
        log.error('[acceptInvitation] Error creando usuario en auth:', authError)

        let errorMessage = authError.message
        if (authError.message.includes('already registered')) {
          errorMessage = 'Este email ya está registrado'
        }

        return { success: false, error: errorMessage }
      }

      if (!authData.user) {
        return { success: false, error: 'Error al crear el usuario' }
      }

      userId = authData.user.id

      // Crear registro en public.redpresu_users
      const { error: userError } = await supabaseAdmin
        .from('redpresu_users')
        .insert({
          id: userId,
          name: name.trim(),
          last_name: lastName.trim(),
          email: invitation.email,
          role: 'comercial',
          company_id: inviterData.company_id,
          status: 'active',
          invited_by: invitation.inviter_id
        })

      if (userError) {
        log.error('[acceptInvitation] Error creando usuario en tabla:', userError)

        // Rollback: eliminar usuario de auth
        await supabaseAdmin.auth.admin.deleteUser(userId)

        return {
          success: false,
          error: 'Error al crear el perfil de usuario'
        }
      }
    }

    // Marcar invitación como aceptada
    await supabaseAdmin
      .from('redpresu_user_invitations')
      .update({
        status: 'accepted',
        updated_at: new Date().toISOString()
      })
      .eq('id', invitation.id)

    log.info('[acceptInvitation] Usuario creado exitosamente:', userId)

    // Iniciar sesión automáticamente
    const cookieStore = await cookies()
    const supabase = createServerActionClient({ cookies: () => cookieStore })

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: invitation.email,
      password: password
    })

    if (signInError) {
      log.error('[acceptInvitation] Error al iniciar sesión automática:', signInError)
      // No es crítico, el usuario puede hacer login manual
      return {
        success: true,
        data: {
          invitationId: invitation.id,
          userId: userId,
          autoLoginFailed: true
        }
      }
    }

    // Actualizar last_login y obtener rol para redirect
    const { data: userDataForRedirect } = await supabaseAdmin
      .from('redpresu_users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', userId)
      .select('role')
      .single()

    // Redirect según rol (como en signInAction)
    const userRole = userDataForRedirect?.role || 'comercial'
    if (userRole === 'comercial') {
      redirect('/budgets')
    } else {
      // admin o superadmin
      redirect('/dashboard')
    }

  } catch (error) {
    log.error('[acceptInvitation] Error crítico:', error)

    // Si es un redirect, Next.js lo maneja automáticamente
    if (error && typeof error === 'object' && 'digest' in error) {
      throw error
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error inesperado al aceptar invitación'
    }
  }
}

/**
 * Server Action para cancelar una invitación pendiente
 *
 * @param invitationId - ID de la invitación a cancelar
 * @returns InvitationResult indicando éxito o error
 */
export async function cancelInvitation(invitationId: string): Promise<InvitationResult> {
  try {
    log.info('[cancelInvitation] Cancelando invitación:', invitationId)

    const cookieStore = await cookies()
    const supabase = createServerActionClient({ cookies: () => cookieStore })

    // Obtener usuario autenticado
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return {
        success: false,
        error: 'No estás autenticado'
      }
    }

    // Actualizar invitación a cancelled
    const { error: updateError } = await supabase
      .from('redpresu_user_invitations')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', invitationId)
      .eq('status', 'pending')

    if (updateError) {
      log.error('[cancelInvitation] Error cancelando invitación:', updateError)
      return {
        success: false,
        error: 'Error al cancelar la invitación'
      }
    }

    log.info('[cancelInvitation] Invitación cancelada exitosamente')

    return {
      success: true
    }

  } catch (error) {
    log.error('[cancelInvitation] Error crítico:', error)

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error inesperado al cancelar invitación'
    }
  }
}

/**
 * Server Action para obtener invitaciones pendientes del usuario actual
 *
 * @returns Lista de invitaciones con datos del invitador
 */
export async function getMyInvitations(): Promise<{
  success: boolean
  data?: InvitationData[]
  error?: string
}> {
  try {
    log.info('[getMyInvitations] Obteniendo invitaciones...')

    const cookieStore = await cookies()
    const supabase = createServerActionClient({ cookies: () => cookieStore })

    // Obtener usuario autenticado
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return {
        success: false,
        error: 'No estás autenticado'
      }
    }

    // Obtener invitaciones del usuario con datos del invitador
    const { data: invitations, error: invError } = await supabase
      .from('redpresu_user_invitations')
      .select(`
        id,
        inviter_id,
        email,
        token,
        expires_at,
        status,
        created_at,
        inviter:inviter_id (
          name,
          email
        )
      `)
      .eq('inviter_id', user.id)
      .order('created_at', { ascending: false })

    if (invError) {
      log.error('[getMyInvitations] Error obteniendo invitaciones:', invError)
      return {
        success: false,
        error: 'Error al obtener invitaciones'
      }
    }

    // Transformar datos
    const transformedInvitations: InvitationData[] = (invitations || []).map((inv: any) => ({
      id: inv.id,
      inviter_id: inv.inviter_id,
      inviter_name: inv.inviter?.name || '',
      inviter_email: inv.inviter?.email || '',
      email: inv.email,
      token: inv.token,
      expires_at: inv.expires_at,
      status: inv.status,
      created_at: inv.created_at
    }))

    return {
      success: true,
      data: transformedInvitations
    }

  } catch (error) {
    log.error('[getMyInvitations] Error crítico:', error)

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error inesperado al obtener invitaciones'
    }
  }
}
