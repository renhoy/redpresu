/**
 * Middleware Helper para Verificación de Estado de Suscripción
 *
 * Maneja redirecciones según el estado de la suscripción
 */

import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
import { NextRequest, NextResponse } from "next/server";

/**
 * Verifica si el usuario tiene una cuenta INACTIVE
 * y si debe ser redirigido a /dashboard
 *
 * @param req - Next request
 * @param res - Next response
 * @param userId - UUID del usuario autenticado
 * @param pathname - Ruta actual
 * @returns Response con redirección o null si no necesita redirigir
 */
export async function handleInactiveAccountRedirect(
  req: NextRequest,
  res: NextResponse,
  userId: string,
  pathname: string
): Promise<NextResponse | null> {
  try {
    // Solo verificar para rutas autenticadas (no públicas)
    const publicPaths = ['/login', '/register', '/contact', '/pricing', '/legal'];
    if (publicPaths.includes(pathname) || pathname === '/dashboard') {
      return null; // No redirigir
    }

    // Crear cliente de Supabase con contexto de middleware
    const supabase = createMiddlewareClient({ req, res });

    // Obtener usuario de BD para company_id
    const { data: user } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', userId)
      .single();

    if (!user) {
      return null;
    }

    // Obtener suscripción más reciente (sin filtrar por status)
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('status')
      .eq('company_id', user.company_id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    // Si no hay suscripción, no hay nada que verificar
    if (!subscription) {
      return null;
    }

    // Si status es 'inactive', redirigir a dashboard
    if (subscription.status === 'inactive') {
      console.log('[Middleware] Cuenta INACTIVE detectada, redirigiendo a /dashboard');

      const redirectUrl = new URL('/dashboard', req.url);
      return NextResponse.redirect(redirectUrl);
    }

    return null;
  } catch (error) {
    console.error('[handleInactiveAccountRedirect] Error:', error);
    return null; // Fail open
  }
}
