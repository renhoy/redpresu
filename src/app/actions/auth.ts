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