import { supabaseAdmin } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { id, email, name } = body

    console.log('[api/auth/create-user] Creando usuario:', { id, email, name })

    if (!id || !email) {
      return NextResponse.json(
        { success: false, error: 'ID y email son requeridos' },
        { status: 400 }
      )
    }

    // Verificar si el usuario ya existe
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('id', id)
      .maybeSingle()

    if (existingUser) {
      console.log('[api/auth/create-user] Usuario ya existe:', id)
      return NextResponse.json({ success: true, message: 'Usuario ya existe' })
    }

    // Crear usuario
    const { data: insertedUser, error: insertError } = await supabaseAdmin
      .from('users')
      .insert({
        id,
        name: name || 'Usuario',
        last_name: '',
        email,
        role: 'admin',
        status: 'pending',
        company_id: null,
      })
      .select()
      .single()

    if (insertError) {
      console.error('[api/auth/create-user] Error insertando:', insertError)
      return NextResponse.json(
        { success: false, error: insertError.message },
        { status: 500 }
      )
    }

    console.log('[api/auth/create-user] ✅ Usuario creado:', insertedUser.id)
    return NextResponse.json({ success: true, user: insertedUser })

  } catch (error) {
    console.error('[api/auth/create-user] Error inesperado:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
