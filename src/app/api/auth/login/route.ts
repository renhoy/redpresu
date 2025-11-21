import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/helpers'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  console.log('=====================================')
  console.log('[API /auth/login] POST recibido')
  console.log('=====================================')

  try {
    const { email, password } = await request.json()
    console.log('[API /auth/login] Email:', email)

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email y contraseña requeridos' },
        { status: 400 }
      )
    }

    // Crear cliente de Supabase para Route Handler
    const supabase = await createRouteHandlerClient()

    console.log('[API /auth/login] Llamando a signInWithPassword...')
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    })

    console.log('[API /auth/login] Respuesta:', { hasData: !!data, hasError: !!error })

    if (error) {
      console.error('[API /auth/login] Error:', error.message)

      let errorMessage = error.message
      if (error.message.includes('Invalid login credentials')) {
        errorMessage = 'Credenciales de acceso incorrectas'
      } else if (error.message.includes('Email not confirmed')) {
        errorMessage = 'Email no confirmado'
      }

      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 401 }
      )
    }

    if (!data.session || !data.user) {
      return NextResponse.json(
        { success: false, error: 'Error en la autenticación' },
        { status: 401 }
      )
    }

    console.log('[API /auth/login] Usuario autenticado:', data.user.email)

    // Obtener datos del usuario
    let { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', data.user.id)
      .maybeSingle()

    // Si el usuario no existe en public.users, crearlo
    if (!userData) {
      console.log('[API /auth/login] Usuario no existe en public.users, creando...')

      const { data: newUser, error: createError } = await supabaseAdmin
        .from('users')
        .insert({
          id: data.user.id,
          name: data.user.user_metadata?.name || 'Usuario',
          last_name: '',
          email: data.user.email || '',
          role: 'admin',
          status: 'pending',
          company_id: null,
        })
        .select()
        .single()

      if (createError) {
        console.error('[API /auth/login] Error creando usuario:', createError)
        return NextResponse.json(
          { success: false, error: 'Error al crear datos del usuario' },
          { status: 500 }
        )
      }

      console.log('[API /auth/login] ✅ Usuario creado en public.users:', newUser.id)
      userData = newUser
    }

    if (userError && userError.code !== 'PGRST116') {
      console.error('[API /auth/login] Error obteniendo usuario:', userError)
      return NextResponse.json(
        { success: false, error: 'Error al obtener datos del usuario' },
        { status: 500 }
      )
    }

    // Verificar si usuario está inactivo
    if (userData.status === 'inactive') {
      console.warn('[API /auth/login] Usuario inactivo:', data.user.email)
      await supabase.auth.signOut()
      return NextResponse.json(
        { success: false, error: 'INACTIVE_USER' },
        { status: 403 }
      )
    }

    // Actualizar last_login
    const updateData: any = { last_login: new Date().toISOString() }

    if (userData.role === 'superadmin' && userData.company_id !== 1) {
      console.log('[API /auth/login] Forzando superadmin a empresa Demo (id = 1)')
      updateData.company_id = 1
    }

    await supabaseAdmin
      .from('users')
      .update(updateData)
      .eq('id', data.user.id)

    console.log('[API /auth/login] Login exitoso:', data.user.email, 'Rol:', userData.role)

    // Determinar a dónde redirigir
    const redirectTo = userData.role === 'comercial' ? '/budgets' : '/dashboard'

    // Crear response
    const response = NextResponse.json({
      success: true,
      redirectTo
    })

    // CRÍTICO: Establecer MANUALMENTE las cookies de la sesión
    // Porque Next.js 15 + Supabase no lo hace automáticamente
    console.log('[API /auth/login] Estableciendo cookies de sesión...')

    // Formato de cookies de Supabase: sb-<project-ref>-auth-token
    // Para localhost usamos un nombre genérico
    const cookieOptions = {
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 días
      httpOnly: true,
      sameSite: 'lax' as const,
      secure: process.env.NODE_ENV === 'production'
    }

    // Establecer los tokens como cookies
    response.cookies.set('sb-access-token', data.session.access_token, cookieOptions)
    response.cookies.set('sb-refresh-token', data.session.refresh_token, cookieOptions)

    console.log('[API /auth/login] ✅ Cookies establecidas')
    console.log('[API /auth/login] Retornando response exitosa')
    return response

  } catch (error) {
    console.error('[API /auth/login] Error crítico:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error inesperado'
      },
      { status: 500 }
    )
  }
}
