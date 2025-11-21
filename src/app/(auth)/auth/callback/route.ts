import { createServerActionClient } from '@/lib/supabase/helpers'
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

      console.log('[auth/callback] Email confirmado exitosamente para:', data.user?.email)
      return NextResponse.redirect(new URL('/login', request.url))
    } catch (error) {
      console.error('[auth/callback] Error inesperado:', error)
      return NextResponse.redirect(new URL('/login?error=unexpected', request.url))
    }
  }

  console.log('[auth/callback] Sin código, redirigiendo a login')
  return NextResponse.redirect(new URL('/login', request.url))
}
