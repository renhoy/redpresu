import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server'

/**
 * API endpoint temporal para forzar el cambio de is_system a false
 * Solo accesible por superadmin
 * URL: /api/fix-config
 */
export async function POST() {
  try {
    // Verificar que sea superadmin
    const user = await getServerUser()

    if (!user || user.role !== 'superadmin') {
      return NextResponse.json(
        { error: 'Solo superadmin puede ejecutar esto' },
        { status: 403 }
      )
    }

    // Actualizar is_system a false
    const { error } = await supabaseAdmin
      .from('config')
      .update({
        is_system: false,
        value: {
          '4.00': 0.50,
          '10.00': 1.40,
          '21.00': 5.20
        },
        description: 'Equivalencias IVA a Recargo de Equivalencia según normativa española. Los valores de IVA deben tener 2 decimales (4.00, 10.00, 21.00) y los porcentajes de RE también (0.50, 1.40, 5.20).',
        updated_at: new Date().toISOString()
      })
      .eq('key', 'iva_re_equivalences')

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Configuración actualizada correctamente. Ahora iva_re_equivalences es editable.'
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    )
  }
}
