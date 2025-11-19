import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Verificar variables de entorno (sin exponer valores sensibles)
    const envCheck = {
      NEXT_PUBLIC_SUPABASE_URL: {
        exists: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        value: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + '...',
      },
      NEXT_PUBLIC_SUPABASE_ANON_KEY: {
        exists: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        length: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length || 0,
        startsWith: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 10) + '...',
      },
      SUPABASE_SERVICE_ROLE_KEY: {
        exists: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        length: process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0,
        startsWith: process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 10) + '...',
      },
      NEXTAUTH_SECRET: {
        exists: !!process.env.NEXTAUTH_SECRET,
        length: process.env.NEXTAUTH_SECRET?.length || 0,
      },
      NODE_ENV: process.env.NODE_ENV,
      VERCEL_ENV: process.env.VERCEL_ENV,
    }

    // Intentar crear supabaseAdmin
    let supabaseAdminTest = {
      canCreate: false,
      error: null as string | null,
    }

    try {
      const { supabaseAdmin } = await import('@/lib/supabase/server')
      supabaseAdminTest.canCreate = true

      // Intentar una query simple
      const { data, error } = await supabaseAdmin
        .from('users')
        .select('count')
        .limit(1)

      supabaseAdminTest.error = error?.message || null
    } catch (error) {
      supabaseAdminTest.error = error instanceof Error ? error.message : String(error)
    }

    return NextResponse.json({
      status: 'ok',
      envCheck,
      supabaseAdminTest,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
