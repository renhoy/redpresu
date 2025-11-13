import { NextResponse } from 'next/server'
import { getServerUser } from '@/lib/auth/server'
import { supabaseAdmin } from '@/lib/supabase/server'

/**
 * API endpoint para obtener datos del emisor del usuario actual
 * GET /api/user/issuer
 */
export async function GET() {
  try {
    const user = await getServerUser()

    if (!user) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      )
    }

    // Verificar que el usuario tenga company_id
    if (!user.company_id) {
      return NextResponse.json({
        issuer: {
          type: 'empresa',
          irpf_percentage: 15
        }
      })
    }

    // Buscar en issuers por company_id
    const { data: issuer, error } = await supabaseAdmin
      .from('issuers')
      .select('type, irpf_percentage')
      .eq('company_id', user.company_id)
      .is('deleted_at', null)
      .single()

    if (error || !issuer) {
      console.log('[GET /api/user/issuer] No se encontró emisor para company_id:', user.company_id, error)
      // Si no tiene emisor, retornar valores por defecto
      return NextResponse.json({
        issuer: {
          type: 'empresa',
          irpf_percentage: 15
        }
      })
    }

    return NextResponse.json({ issuer })
  } catch (error) {
    console.error('[GET /api/user/issuer] Error:', error)
    return NextResponse.json(
      { error: 'Error obteniendo datos del emisor' },
      { status: 500 }
    )
  }
}
