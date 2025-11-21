import { createServerActionClient } from '@/lib/supabase/helpers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') ?? '/login'

  if (code) {
    const supabase = await createServerActionClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      console.log('[auth/callback] Email confirmado exitosamente')
      return NextResponse.redirect(new URL(next, request.url))
    }

    console.error('[auth/callback] Error al confirmar email:', error)
  }

  // En caso de error o sin código, redirigir a login
  return NextResponse.redirect(new URL('/login', request.url))
}
