import { createServerActionClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST() {
  try {
    // Crear cliente de Supabase
    const supabase = await createServerActionClient()

    // Cerrar sesión en Supabase
    await supabase.auth.signOut()

    // Obtener el store de cookies
    const cookieStore = await cookies()

    // Limpiar cookies de autenticación manualmente
    const cookiesToDelete = [
      'sb-access-token',
      'sb-refresh-token',
      'sb-auth-token',
    ]

    // Crear response
    const response = NextResponse.json({ success: true })

    // Eliminar cada cookie
    for (const cookieName of cookiesToDelete) {
      response.cookies.delete(cookieName)
      // También intentar eliminar con diferentes paths
      response.cookies.set(cookieName, '', {
        expires: new Date(0),
        path: '/',
      })
    }

    // También limpiar cualquier cookie que empiece con sb-
    cookieStore.getAll().forEach((cookie) => {
      if (cookie.name.startsWith('sb-')) {
        response.cookies.delete(cookie.name)
        response.cookies.set(cookie.name, '', {
          expires: new Date(0),
          path: '/',
        })
      }
    })

    console.log('[API Logout] Sesión cerrada y cookies limpiadas')

    return response
  } catch (error) {
    console.error('[API Logout] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Error al cerrar sesión' },
      { status: 500 }
    )
  }
}
