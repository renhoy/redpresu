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

  const client = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    ...supabaseConfig,
    cookies: {
      get(name: string) {
        const value = cookieStore.get(name)?.value
        console.log(`[ServerActionClient] GET cookie "${name}":`, value ? 'exists' : 'not found')
        return value
      },
      set(name: string, value: string, options: any) {
        try {
          console.log(`[ServerActionClient] SET cookie "${name}"`, { valueLength: value.length, options })
          cookieStore.set({ name, value, ...options })
          console.log(`[ServerActionClient] ✅ Cookie "${name}" set successfully`)
        } catch (error) {
          console.error(`[ServerActionClient] ❌ ERROR setting cookie "${name}":`, error)
          // En Server Actions, las cookies solo pueden establecerse dentro del request context
          // Este error es esperado si intentamos set después de que la respuesta fue enviada
        }
      },
      remove(name: string, options: any) {
        try {
          console.log(`[ServerActionClient] REMOVE cookie "${name}"`)
          cookieStore.set({ name, value: '', ...options })
        } catch (error) {
          console.error(`[ServerActionClient] ❌ ERROR removing cookie "${name}":`, error)
          // Ignorar errores al remover cookies
        }
      }
    }
  })

  // CRÍTICO: Restaurar sesión desde cookies manuales si existen
  const accessToken = cookieStore.get('sb-access-token')?.value
  const refreshToken = cookieStore.get('sb-refresh-token')?.value

  if (accessToken && refreshToken) {
    await client.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken
    })
  }

  return client
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

  const client = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    ...supabaseConfig,
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      }
    }
  })

  // CRÍTICO: Restaurar sesión desde cookies manuales si existen
  const accessToken = cookieStore.get('sb-access-token')?.value
  const refreshToken = cookieStore.get('sb-refresh-token')?.value

  if (accessToken && refreshToken) {
    await client.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken
    })
  }

  return client
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

  const client = createClient<Database>(supabaseUrl, supabaseAnonKey, {
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

  // CRÍTICO: Restaurar sesión desde cookies manuales si existen
  const accessToken = cookieStore.get('sb-access-token')?.value
  const refreshToken = cookieStore.get('sb-refresh-token')?.value

  if (accessToken && refreshToken) {
    await client.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken
    })
  }

  return client
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
        const value = req.cookies.get(name)?.value
        console.log(`[MiddlewareClient] GET cookie "${name}":`, value ? 'exists' : 'not found')
        return value
      },
      set(name: string, value: string, options: any) {
        console.log(`[MiddlewareClient] SET cookie "${name}"`)
        res.cookies.set({ name, value, ...options })
      },
      remove(name: string, options: any) {
        console.log(`[MiddlewareClient] REMOVE cookie "${name}"`)
        res.cookies.set({ name, value: '', ...options })
      }
    },
    global: {
      ...supabaseConfig.global,
      headers: {
        ...supabaseConfig.global.headers,
        // Intentar recuperar sesión de cookies personalizadas
        ...(req.cookies.get('sb-access-token')?.value ? {
          'Authorization': `Bearer ${req.cookies.get('sb-access-token').value}`
        } : {})
      }
    }
  })
}
