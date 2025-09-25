import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function GET() {
  try {
    // Test basic connection
    const { data: publicTest, error: publicError } = await supabase
      .from('users')
      .select('count')
      .limit(1)
      .single()

    // Test admin connection
    const { data: adminTest, error: adminError } = await supabaseAdmin
      .from('users')
      .select('count')
      .limit(1)
      .single()

    const response = {
      status: 'success',
      timestamp: new Date().toISOString(),
      tests: {
        public_client: {
          success: !publicError,
          error: publicError?.message || null
        },
        admin_client: {
          success: !adminError,
          error: adminError?.message || null
        }
      },
      database_info: {
        url: process.env.NEXT_PUBLIC_SUPABASE_URL,
        has_anon_key: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        has_service_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY
      }
    }

    return NextResponse.json(response, { status: 200 })
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
        database_info: {
          url: process.env.NEXT_PUBLIC_SUPABASE_URL,
          has_anon_key: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          has_service_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY
        }
      },
      { status: 500 }
    )
  }
}