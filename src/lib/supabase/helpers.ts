/**
 * Helpers para crear clientes Supabase con configuración correcta de schema
 *
 * IMPORTANTE: Usar estos helpers en lugar de crear clientes directamente
 * para asegurar que todos usen el schema 'redpresu'
 *
 * NOTA: Estos helpers usan createClient directamente en lugar de los wrappers
 * de auth-helpers porque esos wrappers NO respetan la configuración de schema
 */

import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_URL')
}

if (!supabaseAnonKey) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_ANON_KEY')
}

// Configuración compartida
const supabaseConfig = {
  db: { schema: 'redpresu' },
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce' as const
  },
  global: {
    headers: {
      'x-client-info': 'redpresu-client'
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

  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    ...supabaseConfig,
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
      set(name: string, value: string, options: any) {
        cookieStore.set({ name, value, ...options })
      },
      remove(name: string, options: any) {
        cookieStore.set({ name, value: '', ...options })
      }
    }
  })
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

  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    ...supabaseConfig,
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      }
    }
  })
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

  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    ...supabaseConfig,
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
      set(name: string, value: string, options: any) {
        cookieStore.set({ name, value, ...options })
      },
      remove(name: string, options: any) {
        cookieStore.set({ name, value: '', ...options })
      }
    }
  })
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
export function createMiddlewareClient(req: any, res: any) {
  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    ...supabaseConfig,
    cookies: {
      get(name: string) {
        return req.cookies.get(name)?.value
      },
      set(name: string, value: string, options: any) {
        res.cookies.set({ name, value, ...options })
      },
      remove(name: string, options: any) {
        res.cookies.set({ name, value: '', ...options })
      }
    }
  })
}
