import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { isMultiEmpresa } from '@/lib/helpers/app-mode'

export async function middleware(req: NextRequest) {
  try {
    // CRÍTICO: Crear response de Next.js ANTES de obtener la sesión
    const res = NextResponse.next()

    // Crear cliente de Supabase pasando req y res para manejo correcto de cookies
    const supabase = createMiddlewareClient({ req, res })

    // Obtener sesión actual desde cookies
    const { data: { session }, error } = await supabase.auth.getSession()

    const pathname = req.nextUrl.pathname

    // Verificar modo de operación
    const multiempresa = await isMultiEmpresa()

    // Verificar si hay sesión válida
    const isAuthenticated = !error && !!session

    // MODO MONOEMPRESA: Bloquear rutas específicas y redirigir home a login
    if (!multiempresa) {
      // Bloquear registro en modo monoempresa (siempre, autenticado o no)
      if (pathname === '/register' || pathname.startsWith('/register/')) {
        console.log('[Middleware] Modo mono: bloqueando /register → /login')
        const redirectUrl = req.nextUrl.clone()
        redirectUrl.pathname = '/login'
        return NextResponse.redirect(redirectUrl)
      }

      // Bloquear suscripciones en modo monoempresa (redirigir a dashboard si autenticado, a login si no)
      if (pathname.startsWith('/subscriptions')) {
        const target = isAuthenticated ? '/dashboard' : '/login'
        console.log(`[Middleware] Modo mono: bloqueando /subscriptions → ${target}`)
        const redirectUrl = req.nextUrl.clone()
        redirectUrl.pathname = target
        return NextResponse.redirect(redirectUrl)
      }

      // En modo mono, home redirige a login (sin importar si está autenticado)
      if (pathname === '/') {
        const target = isAuthenticated ? '/dashboard' : '/login'
        console.log(`[Middleware] Modo mono: / → ${target}`)
        const redirectUrl = req.nextUrl.clone()
        redirectUrl.pathname = target
        return NextResponse.redirect(redirectUrl)
      }

      // Bloquear /pricing en modo mono
      if (pathname === '/pricing' || pathname.startsWith('/pricing/')) {
        const target = isAuthenticated ? '/dashboard' : '/login'
        console.log(`[Middleware] Modo mono: bloqueando /pricing → ${target}`)
        const redirectUrl = req.nextUrl.clone()
        redirectUrl.pathname = target
        return NextResponse.redirect(redirectUrl)
      }
    }

    // Definir rutas públicas que no requieren autenticación
    const publicRoutes = ['/', '/login', '/forgot-password', '/reset-password', '/signup', '/register', '/pricing']
    const isPublicRoute = publicRoutes.some(path => {
      if (path === '/') {
        return pathname === '/'
      }
      return pathname === path || pathname.startsWith(path + '/')
    })

    console.log(`[Middleware] Path: ${pathname}, Auth: ${isAuthenticated}, Public: ${isPublicRoute}, MultiEmpresa: ${multiempresa}`)

    // Usuario NO autenticado intentando acceder a ruta privada
    if (!isAuthenticated && !isPublicRoute) {
      console.log(`[Middleware] Redirect no autenticado: ${pathname} → /login`)
      const redirectUrl = req.nextUrl.clone()
      redirectUrl.pathname = '/login'
      redirectUrl.searchParams.delete('redirectedFrom') // Limpiar parámetros previos
      return NextResponse.redirect(redirectUrl)
    }

    // Usuario autenticado intentando acceder a ruta pública (excepto home en modo multi)
    // En modo monoempresa, el home ya fue manejado arriba
    if (isAuthenticated && isPublicRoute && pathname !== '/') {
      console.log(`[Middleware] Redirect autenticado: ${pathname} → /dashboard`)
      const redirectUrl = req.nextUrl.clone()
      redirectUrl.pathname = '/dashboard'
      redirectUrl.searchParams.delete('redirectedFrom') // Limpiar parámetros previos
      return NextResponse.redirect(redirectUrl)
    }

    // Verificar acceso a rutas restringidas por rol
    if (isAuthenticated && session?.user) {
      const userMetadata = session.user.user_metadata
      const userRole = userMetadata?.role || 'vendedor'

      // /companies - Solo superadmin puede acceder a la lista
      if (pathname === '/companies' && userRole !== 'superadmin') {
        console.log(`[Middleware] Acceso denegado a /companies (rol: ${userRole}) → /dashboard`)
        const redirectUrl = req.nextUrl.clone()
        redirectUrl.pathname = '/dashboard'
        return NextResponse.redirect(redirectUrl)
      }

      // /companies/[id]/edit - Solo superadmin puede editar cualquier empresa
      if (pathname.startsWith('/companies/') && pathname.includes('/edit') && pathname !== '/companies/edit') {
        if (userRole !== 'superadmin') {
          console.log(`[Middleware] Acceso denegado a ${pathname} (rol: ${userRole}) → /dashboard`)
          const redirectUrl = req.nextUrl.clone()
          redirectUrl.pathname = '/dashboard'
          return NextResponse.redirect(redirectUrl)
        }
      }

      // /companies/edit - Admin y superadmin pueden editar su propia empresa
      if (pathname === '/companies/edit' && !['admin', 'superadmin'].includes(userRole)) {
        console.log(`[Middleware] Acceso denegado a /companies/edit (rol: ${userRole}) → /dashboard`)
        const redirectUrl = req.nextUrl.clone()
        redirectUrl.pathname = '/dashboard'
        return NextResponse.redirect(redirectUrl)
      }

      // /settings - Solo superadmin
      if (pathname.startsWith('/settings') && userRole !== 'superadmin') {
        console.log(`[Middleware] Acceso denegado a /settings (rol: ${userRole}) → /dashboard`)
        const redirectUrl = req.nextUrl.clone()
        redirectUrl.pathname = '/dashboard'
        return NextResponse.redirect(redirectUrl)
      }

      // /users/create - Solo admin y superadmin
      if (pathname === '/users/create' && !['admin', 'superadmin'].includes(userRole)) {
        console.log(`[Middleware] Acceso denegado a /users/create (rol: ${userRole}) → /dashboard`)
        const redirectUrl = req.nextUrl.clone()
        redirectUrl.pathname = '/dashboard'
        return NextResponse.redirect(redirectUrl)
      }
    }

    // CRÍTICO: Retornar siempre la response de Supabase para preservar cookies
    return res

  } catch (error) {
    console.error('[Middleware] Error crítico:', error)

    // En caso de error, crear response limpia y redirect a login por seguridad
    const pathname = req.nextUrl.pathname
    const publicRoutes = ['/', '/login', '/forgot-password', '/reset-password', '/signup', '/register', '/pricing']
    const isPublicRoute = publicRoutes.some(path => {
      if (path === '/') {
        return pathname === '/'
      }
      return pathname === path || pathname.startsWith(path + '/')
    })

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