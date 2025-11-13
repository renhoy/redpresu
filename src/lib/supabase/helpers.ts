/**
 * Helpers para crear clientes Supabase con configuración correcta de schema
 *
 * IMPORTANTE: Usar estos helpers en lugar de crear clientes directamente
 * para asegurar que todos usen el schema 'redpresu'
 */

import { cookies } from 'next/headers'
import {
  createServerActionClient as createServerActionClientBase,
  createServerComponentClient as createServerComponentClientBase,
  createRouteHandlerClient as createRouteHandlerClientBase,
  createMiddlewareClient as createMiddlewareClientBase,
  type CookieOptions
} from '@supabase/auth-helpers-nextjs'
import type { NextRequest, NextResponse } from 'next/server'
import type { Database } from '@/lib/database.types'

// Configuración compartida
const supabaseConfig = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  options: {
    db: { schema: 'redpresu' },
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  }
}

/**
 * Crear cliente para Server Actions
 *
 * @example
 * const supabase = await createServerActionClient()
 * const { data } = await supabase.from('users').select()
 */
export async function createServerActionClient() {
  const cookieStore = await cookies()
  return createServerActionClientBase<Database>({
    cookies: () => cookieStore
  }, supabaseConfig)
}

/**
 * Crear cliente para Server Components
 *
 * @example
 * const supabase = await createServerComponentClient()
 * const { data } = await supabase.from('users').select()
 */
export async function createServerComponentClient() {
  const cookieStore = await cookies()
  return createServerComponentClientBase<Database>({
    cookies: () => cookieStore
  }, supabaseConfig)
}

/**
 * Crear cliente para Route Handlers (API routes)
 *
 * @example
 * const supabase = await createRouteHandlerClient()
 * const { data } = await supabase.from('users').select()
 */
export async function createRouteHandlerClient() {
  const cookieStore = await cookies()
  return createRouteHandlerClientBase<Database>({
    cookies: () => cookieStore
  }, supabaseConfig)
}

/**
 * Crear cliente para Middleware
 *
 * @param req - NextRequest
 * @param res - NextResponse
 * @example
 * const supabase = createMiddlewareClient(req, res)
 * const { data } = await supabase.auth.getUser()
 */
export function createMiddlewareClient(req: NextRequest, res: NextResponse) {
  return createMiddlewareClientBase<Database>({
    req,
    res
  }, supabaseConfig)
}
