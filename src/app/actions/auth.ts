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
      .from('users')
      .select('role, name')
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
      console.log('[Server Action] No hay sesión activa, redirigiendo a login')
      redirect('/login')
      return { success: true }
    }

    const { error } = await supabase.auth.signOut()

    if (error) {
      console.error('[Server Action] Logout error:', error)
      return { success: false, error: `Error al cerrar sesión: ${error.message}` }
    }

    console.log('[Server Action] Logout exitoso')
    redirect('/login')

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
}

/**
 * Interfaz para resultado de registro
 */
export interface RegisterResult {
  success: boolean
  error?: string
  data?: {
    userId: string
    emisorId: string
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
    console.log('[registerUser] Iniciando registro...', { email: data.email, tipo: data.tipo })

    const cookieStore = await cookies()
    const supabase = createServerActionClient({ cookies: () => cookieStore })

    // 1. Validar que el NIF no esté ya registrado
    const { data: existingEmisor, error: checkError } = await supabase
      .from('emisores')
      .select('id, nif')
      .eq('nif', data.nif.trim().toUpperCase())
      .eq('empresa_id', 1) // Por ahora solo empresa_id = 1
      .single()

    if (existingEmisor) {
      console.error('[registerUser] NIF ya registrado:', data.nif)
      return {
        success: false,
        error: 'El NIF/CIF ya está registrado en el sistema'
      }
    }

    // 2. Crear usuario en auth.users
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email.trim().toLowerCase(),
      password: data.password,
      options: {
        data: {
          nombre_comercial: data.nombreComercial,
          tipo: data.tipo
        }
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

    // 3. Crear registro en public.users (con rol admin por defecto para nuevos registros)
    const { error: userError } = await supabase
      .from('users')
      .insert({
        id: userId,
        name: data.nombreComercial,
        email: data.email.trim().toLowerCase(),
        role: 'admin', // Primer usuario de una nueva empresa = admin
        empresa_id: 1, // Por ahora todas las empresas tienen ID 1
        status: 'active'
      })

    if (userError) {
      console.error('[registerUser] Error al crear registro en users:', userError)

      // Intentar eliminar el usuario de auth si falla la creación en public.users
      await supabase.auth.admin.deleteUser(userId)

      return {
        success: false,
        error: 'Error al crear el perfil de usuario'
      }
    }

    console.log('[registerUser] Registro en users creado')

    // 4. Crear registro en public.emisores
    const { data: emisorData, error: emisorError } = await supabase
      .from('emisores')
      .insert({
        user_id: userId,
        empresa_id: 1,
        tipo: data.tipo,
        nombre_comercial: data.nombreComercial.trim(),
        nif: data.nif.trim().toUpperCase(),
        direccion_fiscal: data.direccionFiscal.trim(),
        codigo_postal: data.codigoPostal?.trim() || null,
        ciudad: data.ciudad?.trim() || null,
        provincia: data.provincia?.trim() || null,
        pais: data.pais?.trim() || 'España',
        telefono: data.telefono?.trim() || null,
        email: data.emailContacto?.trim() || data.email.trim().toLowerCase(),
        web: data.web?.trim() || null,
        irpf_percentage: data.tipo === 'autonomo' ? (data.irpfPercentage ?? 15) : null
      })
      .select('id')
      .single()

    if (emisorError) {
      console.error('[registerUser] Error al crear emisor:', emisorError)

      // Intentar rollback: eliminar usuario de public.users y auth.users
      await supabase.from('users').delete().eq('id', userId)
      await supabase.auth.admin.deleteUser(userId)

      return {
        success: false,
        error: 'Error al crear los datos del emisor'
      }
    }

    if (!emisorData) {
      console.error('[registerUser] No se obtuvo el emisor creado')

      // Rollback
      await supabase.from('users').delete().eq('id', userId)
      await supabase.auth.admin.deleteUser(userId)

      return {
        success: false,
        error: 'Error al crear los datos del emisor'
      }
    }

    console.log('[registerUser] Emisor creado:', emisorData.id)
    console.log('[registerUser] Registro completado exitosamente')

    // 5. Iniciar sesión automáticamente
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: data.email.trim().toLowerCase(),
      password: data.password
    })

    if (signInError) {
      console.error('[registerUser] Error al iniciar sesión automática:', signInError)
      // No es crítico, el usuario puede hacer login manual
    }

    // 6. Redirect a dashboard
    redirect('/dashboard')

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