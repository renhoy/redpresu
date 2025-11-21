import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function LogoutPage() {
  console.log('[LogoutPage] Iniciando logout del lado del servidor...')

  // Obtener el store de cookies
  const cookieStore = await cookies()

  // Obtener todas las cookies
  const allCookies = cookieStore.getAll()

  console.log('[LogoutPage] Todas las cookies:', allCookies.map(c => c.name))

  // Eliminar todas las cookies de Supabase
  for (const cookie of allCookies) {
    if (cookie.name.startsWith('sb-')) {
      console.log(`[LogoutPage] Eliminando cookie: ${cookie.name}`)
      cookieStore.delete(cookie.name)
    }
  }

  // También eliminar las cookies estándar
  const standardCookies = ['sb-access-token', 'sb-refresh-token', 'sb-auth-token']
  for (const cookieName of standardCookies) {
    try {
      cookieStore.delete(cookieName)
    } catch {
      // Ignorar si no existe
    }
  }

  console.log('[LogoutPage] Cookies eliminadas, redirigiendo a /login')

  // Redirigir al login
  redirect('/login')
}
