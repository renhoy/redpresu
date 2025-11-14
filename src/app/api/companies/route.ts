import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { getServerUser } from '@/lib/auth/server';

/**
 * GET /api/companies
 * Obtiene lista de empresas (solo para superadmins)
 */
export async function GET() {
  try {
    // Verificar autenticación y permisos
    const user = await getServerUser();

    if (!user) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    // Solo superadmins pueden ver todas las empresas
    if (user.role !== 'superadmin') {
      return NextResponse.json(
        { error: 'Sin permisos' },
        { status: 403 }
      );
    }

    // Obtener todas las empresas con campos adicionales
    const { data: companies, error } = await supabaseAdmin
      .from('companies')
      .select('id, name, type, nif')
      .order('name', { ascending: true });

    if (error) {
      console.error('[API /companies] Error:', error);
      return NextResponse.json(
        { error: 'Error al obtener empresas' },
        { status: 500 }
      );
    }

    return NextResponse.json(companies || []);
  } catch (error) {
    console.error('[API /companies] Error inesperado:', error);
    return NextResponse.json(
      { error: 'Error inesperado' },
      { status: 500 }
    );
  }
}
