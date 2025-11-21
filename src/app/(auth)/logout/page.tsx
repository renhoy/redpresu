import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function LogoutPage() {
  console.log('[LogoutPage] Iniciando logout del lado del servidor...')

  try {
    // Obtener el store de cookies
    const cookieStore = await cookies()

    // Obtener todas las cookies
    const allCookies = cookieStore.getAll()
    const supabaseCookies = allCookies.filter(c => c.name.startsWith('sb-'))

    console.log('[LogoutPage] Cookies de Supabase encontradas:', supabaseCookies.map(c => c.name))

    // Eliminar todas las cookies de Supabase usando set con expiración en el pasado
    for (const cookie of supabaseCookies) {
      console.log(`[LogoutPage] Eliminando cookie: ${cookie.name}`)
      cookieStore.set(cookie.name, '', {
        expires: new Date(0),
        path: '/',
      })
    }

    // También eliminar las cookies estándar por si acaso
    const standardCookies = ['sb-access-token', 'sb-refresh-token', 'sb-auth-token']
    for (const cookieName of standardCookies) {
      cookieStore.set(cookieName, '', {
        expires: new Date(0),
        path: '/',
      })
    }

    console.log('[LogoutPage] Cookies eliminadas exitosamente')
  } catch (error) {
    console.error('[LogoutPage] Error eliminando cookies:', error)
  }

  // Redirigir a la página principal
  redirect('/')
}
