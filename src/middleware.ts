import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { isMultiEmpresa } from '@/lib/helpers/app-mode'
import { getSubscriptionsEnabled } from '@/lib/helpers/config-helpers'
import { supabaseAdmin } from '@/lib/supabase/server'

/**
 * Helper para crear redirección preservando cookies de Supabase
 */
function createRedirectWithCookies(
  url: URL,
  sourceResponse: NextResponse
): NextResponse {
  const redirectRes = NextResponse.redirect(url)

  // Copiar todas las cookies de la respuesta original
  sourceResponse.cookies.getAll().forEach(cookie => {
    redirectRes.cookies.set(cookie.name, cookie.value)
  })

  return redirectRes
}

export async function middleware(req: NextRequest) {
  try {
    // CRÍTICO: Crear response de Next.js ANTES de obtener la sesión
    const res = NextResponse.next()

    // Crear cliente de Supabase pasando req y res para manejo correcto de cookies
    const supabase = createMiddlewareClient({ req, res })

    // Obtener usuario actual y validar token con el servidor
    // IMPORTANTE: getUser() valida el token con Supabase, getSession() solo lee cookies
    const { data: { user }, error } = await supabase.auth.getUser()

    const pathname = req.nextUrl.pathname

    // Verificar modo de operación
    const multiempresa = await isMultiEmpresa()

    // Verificar si suscripciones están habilitadas
    const subscriptionsEnabled = await getSubscriptionsEnabled()

    // Verificar si hay sesión válida (usuario autenticado con token válido)
    const isAuthenticated = !error && !!user
    const session = user ? { user } : null

    // Bloquear /subscriptions si:
    // 1. Modo monoempresa (no disponible), O
    // 2. Modo multiempresa pero config subscriptions_enabled = false
    if (pathname.startsWith('/subscriptions')) {
      const shouldBlock = !multiempresa || !subscriptionsEnabled

      if (shouldBlock) {
        const target = isAuthenticated ? '/dashboard' : '/login'
        const reason = !multiempresa
          ? 'Modo mono: bloqueando /subscriptions'
          : 'Suscripciones deshabilitadas: bloqueando /subscriptions'
        console.log(`[Middleware] ${reason} → ${target}`)
        const redirectUrl = req.nextUrl.clone()
        redirectUrl.pathname = target
        return NextResponse.redirect(redirectUrl)
      }
    }

    // MODO MONOEMPRESA: Bloquear rutas específicas y redirigir home a login
    if (!multiempresa) {
      // Bloquear registro en modo monoempresa (siempre, autenticado o no)
      if (pathname === '/register' || pathname.startsWith('/register/')) {
        console.log('[Middleware] Modo mono: bloqueando /register → /login')
        const redirectUrl = req.nextUrl.clone()
        redirectUrl.pathname = '/login'
        return NextResponse.redirect(redirectUrl)
      }

      // En modo mono, home redirige a login (sin importar si está autenticado)
      if (pathname === '/') {
        const target = isAuthenticated ? '/dashboard' : '/login'
        console.log(`[Middleware] Modo mono: / → ${target}`)
        const redirectUrl = req.nextUrl.clone()
        redirectUrl.pathname = target
        return createRedirectWithCookies(redirectUrl, res)
      }

      // Bloquear /pricing en modo mono
      if (pathname === '/pricing' || pathname.startsWith('/pricing/')) {
        const target = isAuthenticated ? '/dashboard' : '/login'
        console.log(`[Middleware] Modo mono: bloqueando /pricing → ${target}`)
        const redirectUrl = req.nextUrl.clone()
        redirectUrl.pathname = target
        return createRedirectWithCookies(redirectUrl, res)
      }
    }

    // Definir rutas públicas que no requieren autenticación
    const publicRoutes = ['/', '/login', '/forgot-password', '/reset-password', '/signup', '/register', '/pricing', '/accept-invitation']
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

    // Usuario autenticado intentando acceder a ruta pública (excepto home)
    // Excepción: si viene con reason=inactive, permitir acceso al login para mostrar mensaje
    // En modo monoempresa, el home ya fue manejado arriba
    const reasonParam = req.nextUrl.searchParams.get('reason')
    if (isAuthenticated && isPublicRoute && pathname !== '/' && reasonParam !== 'inactive') {
      console.log(`[Middleware] Redirect autenticado: ${pathname} → /dashboard`)
      const redirectUrl = req.nextUrl.clone()
      redirectUrl.pathname = '/dashboard'
      redirectUrl.searchParams.delete('redirectedFrom') // Limpiar parámetros previos
      return createRedirectWithCookies(redirectUrl, res)
    }

    // Verificar acceso a rutas restringidas por rol
    // NO verificar en rutas públicas (login, register, etc)
    if (isAuthenticated && session?.user && !isPublicRoute) {
      // Obtener rol y status desde la base de datos usando supabaseAdmin (bypasea RLS)
      const { data: userData, error: userError } = await supabaseAdmin
        .from('redpresu_users')
        .select('role, status')
        .eq('id', session.user.id)
        .single()

      if (userError) {
        console.error(`[Middleware] Error obteniendo datos usuario:`, userError)
      }

      const userRole = userData?.role || 'comercial'
      const userStatus = userData?.status || 'active'

      console.log(`[Middleware] Verificando permisos - Path: ${pathname}, Rol: ${userRole} (desde BD), Status: ${userStatus}, MultiEmpresa: ${multiempresa}`)

      // Verificar si el usuario está inactivo
      if (userStatus === 'inactive') {
        console.warn(`[Middleware] Usuario inactivo detectado: ${session.user.email}`)
        // Redirigir directamente al login con mensaje
        const redirectUrl = req.nextUrl.clone()
        redirectUrl.pathname = '/login'
        redirectUrl.searchParams.set('reason', 'inactive')
        // No usar createRedirectWithCookies aquí - queremos que pierda la sesión
        return NextResponse.redirect(redirectUrl)
      }

      // /companies - Solo superadmin en modo multiempresa
      // En modo monoempresa, admin redirige a /companies/edit
      if (pathname === '/companies') {
        console.log(`[Middleware] Acceso a /companies - Rol: ${userRole}, MultiEmpresa: ${multiempresa}`)

        if (userRole === 'superadmin') {
          // Superadmin siempre puede ver lista de empresas
          console.log(`[Middleware] Superadmin: acceso permitido a /companies`)
        } else if (userRole === 'admin' && !multiempresa) {
          // Admin en modo mono redirige a editar su empresa
          console.log(`[Middleware] Admin en modo mono: /companies → /companies/edit`)
          const redirectUrl = req.nextUrl.clone()
          redirectUrl.pathname = '/companies/edit'
          return createRedirectWithCookies(redirectUrl, res)
        } else if (userRole === 'admin' && multiempresa) {
          // Admin en modo multi no puede ver lista
          console.log(`[Middleware] Admin en modo multi: acceso denegado a /companies → /dashboard`)
          const redirectUrl = req.nextUrl.clone()
          redirectUrl.pathname = '/dashboard'
          return createRedirectWithCookies(redirectUrl, res)
        } else {
          // Otros roles no tienen acceso
          console.log(`[Middleware] Rol ${userRole}: acceso denegado a /companies → /dashboard`)
          const redirectUrl = req.nextUrl.clone()
          redirectUrl.pathname = '/dashboard'
          return createRedirectWithCookies(redirectUrl, res)
        }
      }

      // /companies/[id]/edit - Solo superadmin puede editar cualquier empresa
      if (pathname.startsWith('/companies/') && pathname.includes('/edit') && pathname !== '/companies/edit') {
        if (userRole !== 'superadmin') {
          console.log(`[Middleware] Acceso denegado a ${pathname} (rol: ${userRole}) → /dashboard`)
          const redirectUrl = req.nextUrl.clone()
          redirectUrl.pathname = '/dashboard'
          return createRedirectWithCookies(redirectUrl, res)
        }
      }

      // /companies/edit - Admin y superadmin pueden editar su propia empresa
      if (pathname === '/companies/edit' && !['admin', 'superadmin'].includes(userRole)) {
        console.log(`[Middleware] Acceso denegado a /companies/edit (rol: ${userRole}) → /dashboard`)
        const redirectUrl = req.nextUrl.clone()
        redirectUrl.pathname = '/dashboard'
        return createRedirectWithCookies(redirectUrl, res)
      }

      // /settings - Solo superadmin
      if (pathname.startsWith('/settings') && userRole !== 'superadmin') {
        console.log(`[Middleware] Acceso denegado a /settings (rol: ${userRole}) → /dashboard`)
        const redirectUrl = req.nextUrl.clone()
        redirectUrl.pathname = '/dashboard'
        return createRedirectWithCookies(redirectUrl, res)
      }

      // /users/create - Solo admin y superadmin
      if (pathname === '/users/create' && !['admin', 'superadmin'].includes(userRole)) {
        console.log(`[Middleware] Acceso denegado a /users/create (rol: ${userRole}) → /dashboard`)
        const redirectUrl = req.nextUrl.clone()
        redirectUrl.pathname = '/dashboard'
        return createRedirectWithCookies(redirectUrl, res)
      }
    }

    // CRÍTICO: Retornar siempre la response de Supabase para preservar cookies
    return res

  } catch (error) {
    console.error('[Middleware] Error crítico:', error)

    // En caso de error, crear response limpia y redirect a login por seguridad
    const pathname = req.nextUrl.pathname
    const publicRoutes = ['/', '/login', '/forgot-password', '/reset-password', '/signup', '/register', '/pricing', '/accept-invitation']
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