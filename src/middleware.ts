import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  try {
    const response = NextResponse.next()
    const supabase = createMiddlewareClient({ req: request, res: response })

    // Obtener la sesión actual desde las cookies
    const {
      data: { session },
      error: sessionError
    } = await supabase.auth.getSession()

    const url = request.nextUrl.clone()
    const pathname = url.pathname

    // Definir rutas públicas que no requieren autenticación
    const publicRoutes = [
      '/login',
      '/forgot-password',
      '/reset-password',
      '/signup'
    ]

    // Verificar si es una ruta pública
    const isPublicRoute = publicRoutes.includes(pathname)

    // Verificar si es una ruta de API o archivo estático (ya excluidos por matcher)
    const isApiRoute = pathname.startsWith('/api/')
    const isStaticFile = pathname.startsWith('/_next/') ||
                        pathname.includes('/favicon.ico') ||
                        /\.(svg|png|jpg|jpeg|gif|webp)$/.test(pathname)

    // Si hay error en la sesión o no hay sesión válida
    const isAuthenticated = !sessionError && !!session

    // Lógica de redirects
    if (!isAuthenticated) {
      // Usuario NO autenticado
      if (!isPublicRoute && !isApiRoute && !isStaticFile) {
        // Intentando acceder a ruta privada sin autenticación → redirect a login
        console.log(`[Middleware] Usuario no autenticado intentando acceder a: ${pathname} → redirect a /login`)
        url.pathname = '/login'
        return NextResponse.redirect(url)
      }
    } else {
      // Usuario SÍ autenticado
      if (isPublicRoute) {
        // Intentando acceder a ruta pública estando autenticado → redirect a dashboard
        console.log(`[Middleware] Usuario autenticado intentando acceder a: ${pathname} → redirect a /dashboard`)
        url.pathname = '/dashboard'
        return NextResponse.redirect(url)
      }

      if (pathname === '/') {
        // Accediendo a home estando autenticado → redirect a dashboard
        console.log(`[Middleware] Usuario autenticado en home → redirect a /dashboard`)
        url.pathname = '/dashboard'
        return NextResponse.redirect(url)
      }
    }

    // Continuar con la request normal
    return response

  } catch (error) {
    // Error en el middleware - permitir continuar pero loggear el error
    console.error('[Middleware] Error procesando request:', error)

    const url = request.nextUrl.clone()
    const pathname = url.pathname

    // Si hay error crítico y no es una ruta pública, redirect a login como seguridad
    const publicRoutes = ['/login', '/forgot-password', '/reset-password', '/signup']
    const isPublicRoute = publicRoutes.includes(pathname)
    const isApiRoute = pathname.startsWith('/api/')

    if (!isPublicRoute && !isApiRoute) {
      console.log(`[Middleware] Error crítico, redirecting a /login por seguridad`)
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }

    // Para rutas públicas o APIs, continuar normalmente
    return NextResponse.next()
  }
}

// Configuración del matcher optimizado
// Excluye archivos estáticos, _next, y archivos de imagen automáticamente
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - Files with extensions: .svg, .png, .jpg, .jpeg, .gif, .webp
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}