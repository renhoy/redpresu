import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  try {
    // CRÍTICO: Crear response de Next.js ANTES de obtener la sesión
    const res = NextResponse.next()

    // Crear cliente de Supabase pasando req y res para manejo correcto de cookies
    const supabase = createMiddlewareClient({ req, res })

    // Obtener sesión actual desde cookies
    const { data: { session }, error } = await supabase.auth.getSession()

    const pathname = req.nextUrl.pathname

    // Definir rutas públicas que no requieren autenticación
    const publicRoutes = ['/login', '/forgot-password', '/reset-password', '/signup']
    const isPublicRoute = publicRoutes.some(path => pathname.startsWith(path))

    // Verificar si hay sesión válida
    const isAuthenticated = !error && !!session

    console.log(`[Middleware] Path: ${pathname}, Auth: ${isAuthenticated}, Public: ${isPublicRoute}`)

    // Usuario NO autenticado intentando acceder a ruta privada
    if (!isAuthenticated && !isPublicRoute) {
      console.log(`[Middleware] Redirect no autenticado: ${pathname} → /login`)
      const redirectUrl = req.nextUrl.clone()
      redirectUrl.pathname = '/login'
      redirectUrl.searchParams.delete('redirectedFrom') // Limpiar parámetros previos
      return NextResponse.redirect(redirectUrl)
    }

    // Usuario autenticado intentando acceder a ruta pública
    if (isAuthenticated && isPublicRoute) {
      console.log(`[Middleware] Redirect autenticado: ${pathname} → /dashboard`)
      const redirectUrl = req.nextUrl.clone()
      redirectUrl.pathname = '/dashboard'
      redirectUrl.searchParams.delete('redirectedFrom') // Limpiar parámetros previos
      return NextResponse.redirect(redirectUrl)
    }

    // Usuario autenticado accediendo a home
    if (isAuthenticated && pathname === '/') {
      console.log(`[Middleware] Redirect home: / → /dashboard`)
      const redirectUrl = req.nextUrl.clone()
      redirectUrl.pathname = '/dashboard'
      return NextResponse.redirect(redirectUrl)
    }

    // CRÍTICO: Retornar siempre la response de Supabase para preservar cookies
    return res

  } catch (error) {
    console.error('[Middleware] Error crítico:', error)

    // En caso de error, crear response limpia y redirect a login por seguridad
    const pathname = req.nextUrl.pathname
    const publicRoutes = ['/login', '/forgot-password', '/reset-password', '/signup']
    const isPublicRoute = publicRoutes.some(path => pathname.startsWith(path))

    if (!isPublicRoute) {
      console.log(`[Middleware] Error fallback: ${pathname} → /login`)
      const redirectUrl = req.nextUrl.clone()
      redirectUrl.pathname = '/login'
      return NextResponse.redirect(redirectUrl)
    }

    // Para rutas públicas, continuar normalmente
    return NextResponse.next()
  }
}

// Configuración del matcher optimizado
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - Files with extensions: .svg, .png, .jpg, .jpeg, .gif, .webp
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}