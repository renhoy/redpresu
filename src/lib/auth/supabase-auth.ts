import { supabase } from '@/lib/supabase/client'
import type { UserRole } from '@/lib/types/database'

export interface AuthUser {
  id: string
  email: string
  nombre: string
  apellidos: string | null
  role: UserRole
  company_id: number
}

export interface AuthResponse<T = unknown> {
  data: T | null
  error: string | null
  success: boolean
}

export interface SignInCredentials {
  email: string
  password: string
}

/**
 * Obtiene el usuario actual autenticado y su información de rol desde public.users
 */
export async function getUser(): Promise<AuthResponse<AuthUser>> {
  try {
    // Verificar sesión actual
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()

    if (sessionError) {
      return {
        data: null,
        error: `Error de sesión: ${sessionError.message}`,
        success: false
      }
    }

    if (!session?.user) {
      return {
        data: null,
        error: 'Usuario no autenticado',
        success: false
      }
    }

    // Obtener datos extendidos del usuario desde public.users
    const { data: userData, error: userError } = await supabase
      .from('redpresu_users')
      .select('id, email, name, role, company_id')
      .eq('id', session.user.id)
      .single()

    if (userError) {
      return {
        data: null,
        error: `Error al obtener datos del usuario: ${userError.message}`,
        success: false
      }
    }

    if (!userData) {
      return {
        data: null,
        error: 'Usuario no encontrado en la base de datos',
        success: false
      }
    }

    return {
      data: {
        id: userData.id,
        email: userData.email,
        nombre: userData.nombre,
        apellidos: userData.apellidos,
        role: userData.role as UserRole,
        company_id: userData.company_id
      },
      error: null,
      success: true
    }
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Error desconocido al obtener usuario',
      success: false
    }
  }
}

/**
 * Inicia sesión con email y password
 */
export async function signIn(credentials: SignInCredentials): Promise<AuthResponse<AuthUser>> {
  try {
    const { email, password } = credentials

    // Validar credenciales básicas
    if (!email || !password) {
      return {
        data: null,
        error: 'Email y password son requeridos',
        success: false
      }
    }

    // Intentar autenticación con Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password
    })

    if (authError) {
      // Mapear errores comunes de Supabase a mensajes en español
      let errorMessage = authError.message

      if (authError.message.includes('Invalid login credentials')) {
        errorMessage = 'Credenciales de acceso incorrectas'
      } else if (authError.message.includes('Email not confirmed')) {
        errorMessage = 'Email no confirmado'
      } else if (authError.message.includes('Too many requests')) {
        errorMessage = 'Demasiados intentos de login. Intenta de nuevo más tarde'
      }

      return {
        data: null,
        error: errorMessage,
        success: false
      }
    }

    if (!authData.session?.user) {
      return {
        data: null,
        error: 'Error en la autenticación',
        success: false
      }
    }

    // Obtener datos completos del usuario después del login exitoso
    const userResult = await getUser()

    if (!userResult.success || !userResult.data) {
      // Si el login fue exitoso pero no podemos obtener los datos del usuario,
      // cerrar la sesión para mantener consistencia
      await signOut()
      return {
        data: null,
        error: userResult.error || 'Error al obtener datos del usuario después del login',
        success: false
      }
    }

    return {
      data: userResult.data,
      error: null,
      success: true
    }
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Error desconocido en el login',
      success: false
    }
  }
}

/**
 * Cierra la sesión del usuario y limpia cookies
 */
export async function signOut(): Promise<AuthResponse<null>> {
  try {
    const { error } = await supabase.auth.signOut()

    if (error) {
      return {
        data: null,
        error: `Error al cerrar sesión: ${error.message}`,
        success: false
      }
    }

    return {
      data: null,
      error: null,
      success: true
    }
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Error desconocido al cerrar sesión',
      success: false
    }
  }
}

/**
 * Renueva la sesión actual y el token de acceso
 */
export async function refreshSession(): Promise<AuthResponse<AuthUser>> {
  try {
    const { data: sessionData, error: refreshError } = await supabase.auth.refreshSession()

    if (refreshError) {
      return {
        data: null,
        error: `Error al renovar sesión: ${refreshError.message}`,
        success: false
      }
    }

    if (!sessionData.session) {
      return {
        data: null,
        error: 'No se pudo renovar la sesión',
        success: false
      }
    }

    // Obtener datos actualizados del usuario después del refresh
    const userResult = await getUser()

    return {
      data: userResult.data,
      error: userResult.error,
      success: userResult.success
    }
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Error desconocido al renovar sesión',
      success: false
    }
  }
}

/**
 * Verifica si el usuario actual tiene un rol específico
 */
export async function hasRole(requiredRole: UserRole): Promise<boolean> {
  const userResult = await getUser()

  if (!userResult.success || !userResult.data) {
    return false
  }

  const userRole = userResult.data.role

  // Superadmin tiene acceso a todo
  if (userRole === 'superadmin') {
    return true
  }

  // Verificar rol específico
  return userRole === requiredRole
}

/**
 * Verifica si el usuario actual tiene uno de los roles especificados
 */
export async function hasAnyRole(roles: UserRole[]): Promise<boolean> {
  const userResult = await getUser()

  if (!userResult.success || !userResult.data) {
    return false
  }

  const userRole = userResult.data.role

  // Superadmin tiene acceso a todo
  if (userRole === 'superadmin') {
    return true
  }

  // Verificar si tiene alguno de los roles
  return roles.includes(userRole as UserRole)
}

/**
 * Obtiene la sesión actual de Supabase (sin datos extendidos)
 */
export async function getSession() {
  try {
    const { data: { session }, error } = await supabase.auth.getSession()

    if (error) {
      return { session: null, error: error.message }
    }

    return { session, error: null }
  } catch (error) {
    return {
      session: null,
      error: error instanceof Error ? error.message : 'Error desconocido al obtener sesión'
    }
  }
}