'use server'

import { cookies } from 'next/headers'
import { createServerActionClient } from '@supabase/auth-helpers-nextjs'
import { redirect } from 'next/navigation'

export interface SignInResult {
  success: boolean
  error?: string
}

export async function signInAction(email: string, password: string): Promise<SignInResult> {
  try {
    const cookieStore = await cookies()
    const supabase = createServerActionClient({ cookies: () => cookieStore })

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    })

    if (error) {
      console.error('[Server Action] Login error:', error)

      // Mapear errores comunes a mensajes en español
      let errorMessage = error.message

      if (error.message.includes('Invalid login credentials')) {
        errorMessage = 'Credenciales de acceso incorrectas'
      } else if (error.message.includes('Email not confirmed')) {
        errorMessage = 'Email no confirmado'
      } else if (error.message.includes('Too many requests')) {
        errorMessage = 'Demasiados intentos de login. Intenta de nuevo más tarde'
      }

      return { success: false, error: errorMessage }
    }

    if (!data.session || !data.user) {
      return { success: false, error: 'Error en la autenticación' }
    }

    // Obtener datos completos del usuario desde public.users
    const { data: userData, error: userError } = await supabase
      .from('redpresu_users')
      .select('*')
      .eq('id', data.user.id)
      .single()

    if (userError) {
      console.error('[Server Action] User data error:', userError)
      return { success: false, error: 'Error al obtener datos del usuario' }
    }

    if (!userData) {
      return { success: false, error: 'Usuario no encontrado en la base de datos' }
    }

    console.log(`[Server Action] Login exitoso: ${data.user.email}, Rol: ${userData.role}`)

    // Redirect según rol usando Next.js redirect
    if (userData.role === 'vendedor') {
      redirect('/budgets')
    } else {
      // admin o superadmin
      redirect('/dashboard')
    }

  } catch (error) {
    console.error('[Server Action] Error crítico:', error)

    // Si es un redirect, Next.js lo maneja automáticamente
    if (error && typeof error === 'object' && 'digest' in error) {
      throw error
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido durante el login'
    }
  }
}

export async function signOutAction(): Promise<SignInResult> {
  try {
    const cookieStore = await cookies()
    const supabase = createServerActionClient({ cookies: () => cookieStore })

    // Verificar si hay una sesión activa antes de intentar cerrar sesión
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()

    if (sessionError) {
      console.error('[Server Action] Session check error:', sessionError)
      // Aún así intentar cerrar sesión por si acaso
    }

    if (!session) {
      console.log('[Server Action] No hay sesión activa, redirigiendo a inicio')
      redirect('/')
      return { success: true }
    }

    const { error } = await supabase.auth.signOut()

    if (error) {
      console.error('[Server Action] Logout error:', error)
      return { success: false, error: `Error al cerrar sesión: ${error.message}` }
    }

    console.log('[Server Action] Logout exitoso')
    redirect('/')

  } catch (error) {
    console.error('[Server Action] Error crítico en logout:', error)

    // Si es un redirect, Next.js lo maneja automáticamente
    if (error && typeof error === 'object' && 'digest' in error) {
      throw error
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido al cerrar sesión'
    }
  }
}

/**
 * Interfaz para datos de registro
 */
export interface RegisterData {
  name: string
  last_name: string
  email: string
  password: string
  tipo: 'empresa' | 'autonomo'
  nombreComercial: string
  nif: string
  direccionFiscal: string
  codigoPostal?: string
  ciudad?: string
  provincia?: string
  pais?: string
  telefono?: string
  emailContacto?: string
  web?: string
  irpfPercentage?: number | null
  issuer_id?: string  // ID del emisor existente (solo para superadmin)
  role?: 'admin' | 'vendedor'  // Rol del nuevo usuario (solo para superadmin)
}

/**
 * Interfaz para resultado de registro
 */
export interface RegisterResult {
  success: boolean
  error?: string
  data?: {
    userId: string
    emisorId: string | null
  }
}

/**
 * Server Action para registrar nuevo usuario
 *
 * @param data - Datos de registro del usuario y emisor
 * @returns RegisterResult con userId y emisorId si tiene éxito
 */
export async function registerUser(data: RegisterData): Promise<RegisterResult> {
  try {
    console.log('[registerUser] Iniciando registro...', {
      email: data.email,
      tipo: data.tipo,
      hasIssuerId: !!data.issuer_id
    })

    const cookieStore = await cookies()
    const supabase = createServerActionClient({ cookies: () => cookieStore })

    // Crear cliente admin de Supabase con service role key
    const { createClient } = await import('@supabase/supabase-js')
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Variable para almacenar el ID de la empresa y el emisor
    let empresaId: number
    let emisorId: string | null = null

    // ==========================================
    // CASO 1: Superadmin asigna usuario a emisor existente
    // ==========================================
    if (data.issuer_id) {
      console.log('[registerUser] Asignando a emisor existente:', data.issuer_id)

      // Verificar que el usuario actual es superadmin
      const { data: { user }, error: authError } = await supabase.auth.getUser()

      if (authError || !user) {
        return {
          success: false,
          error: 'No autenticado'
        }
      }

      const { data: userData, error: userError } = await supabase
        .from('redpresu_users')
        .select('role')
        .eq('id', user.id)
        .single()

      if (userError || !userData || userData.role !== 'superadmin') {
        return {
          success: false,
          error: 'Solo superadmin puede asignar usuarios a emisores existentes'
        }
      }

      // Obtener el emisor existente
      const { data: issuerData, error: issuerError } = await supabaseAdmin
        .from('redpresu_issuers')
        .select('id, company_id')
        .eq('id', data.issuer_id)
        .single()

      if (issuerError || !issuerData) {
        console.error('[registerUser] Error al obtener emisor:', issuerError)
        return {
          success: false,
          error: 'Emisor no encontrado'
        }
      }

      empresaId = issuerData.company_id
      emisorId = issuerData.id
      console.log('[registerUser] Usando empresa existente:', empresaId)

    // ==========================================
    // CASO 2: Registro normal (crear nueva empresa y emisor)
    // ==========================================
    } else {
      // 1. Validar que el NIF no esté ya registrado en TODA la base de datos
      const { data: existingIssuer, error: checkError } = await supabase
        .from('redpresu_issuers')
        .select('id, nif')
        .eq('nif', data.nif.trim().toUpperCase())
        .maybeSingle()

      if (existingIssuer) {
        console.error('[registerUser] NIF ya registrado:', data.nif)
        return {
          success: false,
          error: 'El NIF/CIF ya está registrado en el sistema'
        }
      }

      // 2. Crear nueva empresa para este emisor
      const { data: empresaData, error: empresaError } = await supabaseAdmin
        .from('redpresu_companies')
        .insert({
          name: data.nombreComercial,
          status: 'active'
        })
        .select('id')
        .single()

      if (empresaError || !empresaData) {
        console.error('[registerUser] Error al crear empresa:', empresaError)
        return {
          success: false,
          error: 'Error al crear la empresa'
        }
      }

      empresaId = empresaData.id
      console.log('[registerUser] Empresa creada:', empresaId)
    }

    // 4. Crear usuario en auth.users usando admin API para evitar confirmación de email
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: data.email.trim().toLowerCase(),
      password: data.password,
      email_confirm: true, // Auto-confirmar email en desarrollo
      user_metadata: {
        nombre_comercial: data.nombreComercial,
        tipo: data.tipo
      }
    })

    if (authError) {
      console.error('[registerUser] Error en signUp:', authError)

      let errorMessage = authError.message

      if (authError.message.includes('already registered')) {
        errorMessage = 'Este email ya está registrado'
      } else if (authError.message.includes('invalid email')) {
        errorMessage = 'Email inválido'
      } else if (authError.message.includes('password')) {
        errorMessage = 'La contraseña no cumple los requisitos mínimos'
      }

      return { success: false, error: errorMessage }
    }

    if (!authData.user) {
      console.error('[registerUser] No se obtuvo el usuario creado')
      return { success: false, error: 'Error al crear el usuario' }
    }

    const userId = authData.user.id

    console.log('[registerUser] Usuario auth creado:', userId)

    // Determinar el rol del usuario
    // - Si se proporciona role explícitamente (superadmin), usar ese
    // - Si no, y es el primer usuario de una nueva empresa: admin
    // - Si no, y es usuario asignado a emisor existente: vendedor por defecto
    const userRole = data.role || (data.issuer_id ? 'vendedor' : 'admin')

    // 5. Crear registro en public.users
    // Usar supabaseAdmin para bypass RLS policies
    const { error: userError } = await supabaseAdmin
      .from('redpresu_users')
      .insert({
        id: userId,
        name: data.name.trim(),
        last_name: data.last_name.trim(),
        email: data.email.trim().toLowerCase(),
        role: userRole,
        company_id: empresaId,
        status: 'active'
      })

    if (userError) {
      console.error('[registerUser] Error al crear registro en users:', userError)

      // Intentar eliminar el usuario de auth y la empresa si falla la creación en public.users
      await supabaseAdmin.auth.admin.deleteUser(userId)
      // Solo eliminar empresa si fue creada en este proceso (no existía issuer_id)
      if (!data.issuer_id) {
        await supabaseAdmin.from('redpresu_companies').delete().eq('id', empresaId)
      }

      return {
        success: false,
        error: 'Error al crear el perfil de usuario'
      }
    }

    console.log('[registerUser] Registro en users creado con rol:', userRole)

    // 6. Crear registro en public.issuers SOLO si no se proporcionó issuer_id
    if (!data.issuer_id) {
      const { data: issuerData, error: issuerError } = await supabaseAdmin
        .from('redpresu_issuers')
        .insert({
          user_id: userId,
          company_id: empresaId,
          type: data.tipo,
          name: data.nombreComercial.trim(),
          nif: data.nif.trim().toUpperCase(),
          address: data.direccionFiscal.trim(),
          postal_code: data.codigoPostal?.trim() || null,
          locality: data.ciudad?.trim() || null,
          province: data.provincia?.trim() || null,
          country: data.pais?.trim() || 'España',
          phone: data.telefono?.trim() || null,
          email: data.emailContacto?.trim() || data.email.trim().toLowerCase(),
          web: data.web?.trim() || null,
          irpf_percentage: data.tipo === 'autonomo' ? (data.irpfPercentage ?? 15) : null
        })
        .select('id')
        .single()

      if (issuerError) {
        console.error('[registerUser] Error al crear issuer:', issuerError)

        // Intentar rollback: eliminar usuario, auth y empresa
        await supabaseAdmin.from('redpresu_users').delete().eq('id', userId)
        await supabaseAdmin.auth.admin.deleteUser(userId)
        await supabaseAdmin.from('redpresu_companies').delete().eq('id', empresaId)

        return {
          success: false,
          error: 'Error al crear los datos del emisor'
        }
      }

      if (!issuerData) {
        console.error('[registerUser] No se obtuvo el issuer creado')

        // Rollback: eliminar usuario, auth y empresa
        await supabaseAdmin.from('redpresu_users').delete().eq('id', userId)
        await supabaseAdmin.auth.admin.deleteUser(userId)
        await supabaseAdmin.from('redpresu_companies').delete().eq('id', empresaId)

        return {
          success: false,
          error: 'Error al crear los datos del emisor'
        }
      }

      emisorId = issuerData.id
      console.log('[registerUser] Issuer creado:', issuerData.id)
    }

    console.log('[registerUser] Registro completado exitosamente')

    // 7. Iniciar sesión automáticamente (solo si no es superadmin creando usuario)
    if (!data.issuer_id) {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: data.email.trim().toLowerCase(),
        password: data.password
      })

      if (signInError) {
        console.error('[registerUser] Error al iniciar sesión automática:', signInError)
        // No es crítico, el usuario puede hacer login manual
      }

      // Redirect a dashboard
      redirect('/dashboard')
    }

    // 8. Si es superadmin, retornar resultado sin redirect
    return {
      success: true,
      data: {
        userId,
        emisorId
      }
    }

  } catch (error) {
    console.error('[registerUser] Error crítico:', error)

    // Si es un redirect, Next.js lo maneja automáticamente
    if (error && typeof error === 'object' && 'digest' in error) {
      throw error
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error inesperado durante el registro'
    }
  }
}

/**
 * Interfaz para resultado de operaciones de password
 */
export interface PasswordResetResult {
  success: boolean
  error?: string
  message?: string
}

/**
 * Server Action para solicitar recuperación de contraseña
 *
 * Envía un email con link mágico al usuario para resetear su contraseña
 *
 * @param email - Email del usuario que solicita recuperación
 * @returns PasswordResetResult indicando éxito o error
 */
export async function requestPasswordReset(email: string): Promise<PasswordResetResult> {
  try {
    console.log('[requestPasswordReset] Iniciando...', { email })

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

    const cookieStore = await cookies()
    const supabase = createServerActionClient({ cookies: () => cookieStore })

    // Enviar email de recuperación usando Supabase Auth
    // El link de reset apuntará a /reset-password
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/reset-password`
    })

    if (error) {
      console.error('[requestPasswordReset] Error al enviar email:', error)

      let errorMessage = error.message

      if (error.message.includes('Email not found')) {
        // Por seguridad, no revelamos si el email existe o no
        // Mostramos mensaje genérico de éxito
        return {
          success: true,
          message: 'Si el email está registrado, recibirás un enlace de recuperación'
        }
      }

      return {
        success: false,
        error: errorMessage
      }
    }

    console.log('[requestPasswordReset] Email enviado exitosamente')

    return {
      success: true,
      message: 'Si el email está registrado, recibirás un enlace de recuperación'
    }
  } catch (error) {
    console.error('[requestPasswordReset] Error crítico:', error)

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error inesperado al solicitar recuperación'
    }
  }
}

/**
 * Server Action para resetear contraseña con token
 *
 * @param newPassword - Nueva contraseña del usuario
 * @returns PasswordResetResult indicando éxito o error
 */
export async function resetPassword(newPassword: string): Promise<PasswordResetResult> {
  try {
    console.log('[resetPassword] Iniciando...')

    // Validar contraseña
    if (!newPassword || newPassword.length < 8) {
      return {
        success: false,
        error: 'La contraseña debe tener al menos 8 caracteres'
      }
    }

    // Validar complejidad de contraseña
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/
    if (!passwordRegex.test(newPassword)) {
      return {
        success: false,
        error: 'La contraseña debe contener al menos una mayúscula, una minúscula y un número'
      }
    }

    const cookieStore = await cookies()
    const supabase = createServerActionClient({ cookies: () => cookieStore })

    // Verificar que hay una sesión activa (del link de reset)
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()

    if (sessionError || !session) {
      console.error('[resetPassword] No hay sesión activa:', sessionError)
      return {
        success: false,
        error: 'Token de recuperación inválido o expirado. Solicita un nuevo enlace de recuperación.'
      }
    }

    // Actualizar contraseña
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword
    })

    if (updateError) {
      console.error('[resetPassword] Error al actualizar contraseña:', updateError)

      let errorMessage = updateError.message

      if (updateError.message.includes('same as the old password')) {
        errorMessage = 'La nueva contraseña no puede ser igual a la anterior'
      }

      return {
        success: false,
        error: errorMessage
      }
    }

    console.log('[resetPassword] Contraseña actualizada exitosamente')

    // Cerrar sesión después de resetear (usuario deberá hacer login con nueva contraseña)
    await supabase.auth.signOut()

    return {
      success: true,
      message: 'Contraseña actualizada exitosamente. Ya puedes iniciar sesión con tu nueva contraseña.'
    }
  } catch (error) {
    console.error('[resetPassword] Error crítico:', error)

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error inesperado al resetear contraseña'
    }
  }
}

/**
 * Interfaz para datos de perfil de usuario
 */
export interface UserProfile {
  // Datos usuario
  id: string
  name: string
  email: string
  role: string
  company_id: number

  // Datos emisor
  emisor?: {
    id: string
    tipo: 'empresa' | 'autonomo'
    nombre_comercial: string
    nif: string
    direccion_fiscal: string
    codigo_postal?: string
    ciudad?: string
    provincia?: string
    pais?: string
    telefono?: string
    email?: string
    web?: string
    irpf_percentage?: number
    logo_url?: string
  }
}

/**
 * Interfaz para datos de actualización de perfil
 */
export interface UpdateProfileData {
  // Datos emisor (editables)
  nombre_comercial?: string
  nif?: string
  direccion_fiscal?: string
  codigo_postal?: string
  ciudad?: string
  provincia?: string
  pais?: string
  telefono?: string
  emailContacto?: string
  web?: string
  irpf_percentage?: number

  // Cambio de contraseña (opcional)
  currentPassword?: string
  newPassword?: string
}

/**
 * Interfaz para resultado de operaciones de perfil
 */
export interface ProfileResult {
  success: boolean
  error?: string
  data?: UserProfile
}

/**
 * Server Action para obtener el perfil del usuario actual
 *
 * @returns ProfileResult con datos del usuario y emisor
 */
export async function getUserProfile(): Promise<ProfileResult> {
  try {
    console.log('[getUserProfile] Iniciando...')

    const cookieStore = await cookies()
    const supabase = createServerActionClient({ cookies: () => cookieStore })

    // Obtener usuario autenticado
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error('[getUserProfile] No autenticado:', authError)
      return {
        success: false,
        error: 'No estás autenticado'
      }
    }

    // Obtener datos del usuario desde public.users
    const { data: userData, error: userError } = await supabase
      .from('redpresu_users')
      .select('*')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      console.error('[getUserProfile] Error al obtener usuario:', userError)
      return {
        success: false,
        error: 'Error al obtener datos del usuario'
      }
    }

    // Obtener datos del issuer
    const { data: issuerData, error: issuerError } = await supabase
      .from('redpresu_issuers')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (issuerError) {
      console.error('[getUserProfile] Error al obtener issuer:', issuerError)
      // No es crítico si no existe issuer (usuarios antiguos pueden no tenerlo)
    }

    const profile: UserProfile = {
      ...userData,
      emisor: issuerData ? {
        id: issuerData.id,
        tipo: issuerData.type,
        nombre_comercial: issuerData.name,
        nif: issuerData.nif,
        direccion_fiscal: issuerData.address,
        codigo_postal: issuerData.postal_code,
        ciudad: issuerData.locality,
        provincia: issuerData.province,
        pais: issuerData.country,
        telefono: issuerData.phone,
        email: issuerData.email,
        web: issuerData.web,
        irpf_percentage: issuerData.irpf_percentage,
        logo_url: issuerData.logo_url
      } : undefined
    }

    console.log('[getUserProfile] Perfil obtenido exitosamente')

    return {
      success: true,
      data: profile
    }
  } catch (error) {
    console.error('[getUserProfile] Error crítico:', error)

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error inesperado al obtener perfil'
    }
  }
}

/**
 * Server Action para actualizar el perfil del usuario
 *
 * @param data - Datos a actualizar (emisor y/o contraseña)
 * @returns ProfileResult indicando éxito o error
 */
export async function updateUserProfile(data: UpdateProfileData): Promise<ProfileResult> {
  try {
    console.log('[updateUserProfile] Iniciando...', { hasPasswordChange: !!data.currentPassword })

    const cookieStore = await cookies()
    const supabase = createServerActionClient({ cookies: () => cookieStore })

    // Obtener usuario autenticado
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error('[updateUserProfile] No autenticado:', authError)
      return {
        success: false,
        error: 'No estás autenticado'
      }
    }

    // Si hay cambio de contraseña, validar y actualizar
    if (data.currentPassword && data.newPassword) {
      console.log('[updateUserProfile] Cambiando contraseña...')

      // Validar contraseña nueva
      if (data.newPassword.length < 8) {
        return {
          success: false,
          error: 'La nueva contraseña debe tener al menos 8 caracteres'
        }
      }

      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/
      if (!passwordRegex.test(data.newPassword)) {
        return {
          success: false,
          error: 'La contraseña debe contener al menos una mayúscula, una minúscula y un número'
        }
      }

      // Verificar contraseña actual
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email!,
        password: data.currentPassword
      })

      if (signInError) {
        console.error('[updateUserProfile] Contraseña actual incorrecta:', signInError)
        return {
          success: false,
          error: 'La contraseña actual es incorrecta'
        }
      }

      // Actualizar contraseña
      const { error: updatePasswordError } = await supabase.auth.updateUser({
        password: data.newPassword
      })

      if (updatePasswordError) {
        console.error('[updateUserProfile] Error al actualizar contraseña:', updatePasswordError)
        return {
          success: false,
          error: 'Error al actualizar la contraseña'
        }
      }

      console.log('[updateUserProfile] Contraseña actualizada exitosamente')
    }

    // Actualizar datos del emisor si se proporcionaron
    const hasEmisorData = data.nombre_comercial || data.nif || data.direccion_fiscal ||
                          data.codigo_postal || data.ciudad || data.provincia ||
                          data.telefono || data.emailContacto || data.web ||
                          data.irpf_percentage !== undefined

    if (hasEmisorData) {
      console.log('[updateUserProfile] Actualizando datos emisor...')

      // Construir objeto de actualización solo con campos proporcionados
      const updateData: any = {}

      if (data.nombre_comercial) updateData.name = data.nombre_comercial.trim()
      if (data.nif) updateData.nif = data.nif.trim().toUpperCase()
      if (data.direccion_fiscal) updateData.address = data.direccion_fiscal.trim()
      if (data.codigo_postal !== undefined) updateData.postal_code = data.codigo_postal?.trim() || null
      if (data.ciudad !== undefined) updateData.locality = data.ciudad?.trim() || null
      if (data.provincia !== undefined) updateData.province = data.provincia?.trim() || null
      if (data.pais !== undefined) updateData.country = data.pais?.trim() || null
      if (data.telefono !== undefined) updateData.phone = data.telefono?.trim() || null
      if (data.emailContacto !== undefined) updateData.email = data.emailContacto?.trim() || null
      if (data.web !== undefined) updateData.web = data.web?.trim() || null
      if (data.irpf_percentage !== undefined) updateData.irpf_percentage = data.irpf_percentage

      // Añadir updated_at
      updateData.updated_at = new Date().toISOString()

      // Actualizar issuer
      const { error: issuerError } = await supabase
        .from('redpresu_issuers')
        .update(updateData)
        .eq('user_id', user.id)

      if (issuerError) {
        console.error('[updateUserProfile] Error al actualizar issuer:', issuerError)
        return {
          success: false,
          error: 'Error al actualizar los datos del emisor'
        }
      }

      console.log('[updateUserProfile] Datos issuer actualizados exitosamente')
    }

    // Obtener perfil actualizado
    const profileResult = await getUserProfile()

    if (!profileResult.success) {
      return {
        success: false,
        error: 'Error al obtener el perfil actualizado'
      }
    }

    console.log('[updateUserProfile] Perfil actualizado exitosamente')

    return {
      success: true,
      data: profileResult.data
    }
  } catch (error) {
    console.error('[updateUserProfile] Error crítico:', error)

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error inesperado al actualizar perfil'
    }
  }
}

/**
 * Interfaz para datos de emisor
 */
export interface IssuerData {
  id: string
  company_id: number
  type: 'empresa' | 'autonomo'
  name: string
  nif: string
  address: string
  postal_code: string | null
  locality: string | null
  province: string | null
  phone: string | null
  email: string | null
  web: string | null
}

/**
 * Server Action para obtener lista de emisores (solo para superadmin)
 *
 * @returns Lista de emisores con sus datos básicos
 */
export async function getIssuers(): Promise<{
  success: boolean
  data?: IssuerData[]
  error?: string
}> {
  try {
    console.log('[getIssuers] Obteniendo lista de emisores...')

    const cookieStore = await cookies()
    const supabase = createServerActionClient({ cookies: () => cookieStore })

    // Verificar que el usuario es superadmin
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return {
        success: false,
        error: 'No autenticado'
      }
    }

    const { data: userData, error: userError } = await supabase
      .from('redpresu_users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userError || !userData || userData.role !== 'superadmin') {
      return {
        success: false,
        error: 'Solo superadmin puede acceder a esta función'
      }
    }

    // Obtener lista de emisores
    const { data: issuers, error: issuersError } = await supabase
      .from('redpresu_issuers')
      .select('id, company_id, type, name, nif, address, postal_code, locality, province, phone, email, web')
      .order('name')

    if (issuersError) {
      console.error('[getIssuers] Error obteniendo emisores:', issuersError)
      return {
        success: false,
        error: 'Error al obtener lista de emisores'
      }
    }

    console.log('[getIssuers] Emisores obtenidos:', issuers?.length || 0)

    return {
      success: true,
      data: issuers as IssuerData[]
    }

  } catch (error) {
    console.error('[getIssuers] Error crítico:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error inesperado al obtener emisores'
    }
  }
}