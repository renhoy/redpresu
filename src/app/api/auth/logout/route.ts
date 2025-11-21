import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST() {
  console.log('[API Logout] Iniciando logout...')

  try {
    // Obtener el store de cookies
    const cookieStore = await cookies()

    // Listar todas las cookies que empiezan con sb-
    const allCookies = cookieStore.getAll()
    const supabaseCookies = allCookies.filter(c => c.name.startsWith('sb-'))

    console.log('[API Logout] Cookies de Supabase encontradas:', supabaseCookies.map(c => c.name))

    // Crear response con las cookies eliminadas
    const response = NextResponse.json({ success: true })

    // Eliminar todas las cookies de Supabase
    for (const cookie of supabaseCookies) {
      console.log(`[API Logout] Eliminando cookie: ${cookie.name}`)
      response.cookies.set(cookie.name, '', {
        expires: new Date(0),
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
      })
    }

    // También eliminar las cookies estándar por si acaso
    const standardCookies = ['sb-access-token', 'sb-refresh-token', 'sb-auth-token']
    for (const cookieName of standardCookies) {
      response.cookies.set(cookieName, '', {
        expires: new Date(0),
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
      })
    }

    console.log('[API Logout] Cookies eliminadas exitosamente')

    return response
  } catch (error) {
    console.error('[API Logout] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Error al cerrar sesión' },
      { status: 500 }
    )
  }
}
