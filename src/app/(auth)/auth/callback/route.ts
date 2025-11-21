import { createServerActionClient } from '@/lib/supabase/helpers'
import { supabaseAdmin } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  console.log('[auth/callback] Iniciando callback con code:', code ? 'presente' : 'ausente')

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
        console.log('[auth/callback] Creando registro en public.users...')

        // Crear registro en public.users con datos mínimos
        const { error: insertError } = await supabaseAdmin
          .from('users')
          .insert({
            id: data.user.id,
            name: data.user.user_metadata?.name || 'Usuario',
            last_name: '',
            email: data.user.email || '',
            role: 'admin', // Por defecto, será admin de su propia empresa
            status: 'pending', // Pendiente hasta completar perfil
            company_id: null, // Se asignará cuando complete el perfil
            issuer_id: null, // Se asignará cuando complete el perfil
          })

        if (insertError) {
          console.error('[auth/callback] Error creando usuario en BD:', insertError)
          return NextResponse.redirect(new URL('/login?error=user_creation', request.url))
        }

        console.log('[auth/callback] Usuario creado en BD exitosamente')
      } else {
        console.log('[auth/callback] Usuario ya existe en BD')
      }

      // Redirigir a página de confirmación exitosa
      return NextResponse.redirect(new URL('/auth/confirmed', request.url))
    } catch (error) {
      console.error('[auth/callback] Error inesperado:', error)
      return NextResponse.redirect(new URL('/login?error=unexpected', request.url))
    }
  }

  console.log('[auth/callback] Sin código, redirigiendo a login')
  return NextResponse.redirect(new URL('/login', request.url))
}
