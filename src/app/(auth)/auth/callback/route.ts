import { createServerActionClient } from '@/lib/supabase/helpers'
import { supabaseAdmin } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const error = requestUrl.searchParams.get('error')
  const errorCode = requestUrl.searchParams.get('error_code')
  const errorDescription = requestUrl.searchParams.get('error_description')

  console.log('[auth/callback] ========================================')
  console.log('[auth/callback] CALLBACK INICIADO')
  console.log('[auth/callback] URL completa:', request.url)
  console.log('[auth/callback] Todos los params:', Object.fromEntries(requestUrl.searchParams))
  console.log('[auth/callback] Code presente:', code ? 'SI' : 'NO')
  console.log('[auth/callback] Error:', error || 'ninguno')
  console.log('[auth/callback] Error code:', errorCode || 'ninguno')
  console.log('[auth/callback] Error description:', errorDescription || 'ninguno')
  console.log('[auth/callback] ========================================')

  if (code) {
    try {
      const supabase = await createServerActionClient()
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)

      if (error) {
        console.error('[auth/callback] Error al confirmar email:', error)
        return NextResponse.redirect(new URL('/login?error=confirmation', request.url))
      }

      if (!data.user) {
        console.error('[auth/callback] No se obtuvo usuario después de confirmar')
        return NextResponse.redirect(new URL('/login?error=no_user', request.url))
      }

      console.log('[auth/callback] Email confirmado exitosamente para:', data.user.email)

      // Verificar si el usuario ya existe en public.users
      const { data: existingUser } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('id', data.user.id)
        .single()

      if (!existingUser) {
        console.log('[auth/callback] Usuario NO existe en BD, creando...')

        const insertData = {
          id: data.user.id,
          name: data.user.user_metadata?.name || 'Usuario',
          last_name: '',
          email: data.user.email || '',
          role: 'admin',
          status: 'pending',
          company_id: null,
        }

        console.log('[auth/callback] Datos a insertar:', JSON.stringify(insertData, null, 2))

        // Crear registro en public.users con datos mínimos
        const { data: insertedUser, error: insertError } = await supabaseAdmin
          .from('users')
          .insert(insertData)
          .select()
          .single()

        if (insertError) {
          console.error('[auth/callback] ❌ ERROR INSERTANDO USUARIO:')
          console.error('[auth/callback] Código:', insertError.code)
          console.error('[auth/callback] Mensaje:', insertError.message)
          console.error('[auth/callback] Detalles:', insertError.details)
          console.error('[auth/callback] Hint:', insertError.hint)
          console.error('[auth/callback] Error completo:', JSON.stringify(insertError, null, 2))
          return NextResponse.redirect(new URL('/login?error=user_creation', request.url))
        }

        console.log('[auth/callback] ✅ Usuario creado exitosamente:', insertedUser?.id)
      } else {
        console.log('[auth/callback] Usuario ya existe en BD:', existingUser.id)
      }

      // Redirigir a página de confirmación exitosa
      return NextResponse.redirect(new URL('/auth/confirmed', request.url))
    } catch (error) {
      console.error('[auth/callback] Error inesperado:', error)
      return NextResponse.redirect(new URL('/login?error=unexpected', request.url))
    }
  }

  // Si Supabase envió un error, mostrarlo
  if (error) {
    console.error('[auth/callback] Supabase envió error:', { error, errorCode, errorDescription })
    return NextResponse.redirect(new URL(`/login?error=${error}&description=${errorDescription || ''}`, request.url))
  }

  console.log('[auth/callback] Sin código ni error, redirigiendo a login')
  return NextResponse.redirect(new URL('/login', request.url))
}
