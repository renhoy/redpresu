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

    // Obtener todas las empresas con sus datos fiscales (issuers)
    // El schema 'redpresu' ya está configurado globalmente en supabaseAdmin
    const { data: companies, error } = await supabaseAdmin
      .from('companies')
      .select(`
        id,
        name,
        issuers (
          nif,
          type,
          address,
          locality,
          province,
          phone,
          email
        )
      `)
      .order('name', { ascending: true });

    if (error) {
      console.error('[API /companies] Error:', error);
      return NextResponse.json(
        { error: 'Error al obtener empresas' },
        { status: 500 }
      );
    }

    // Transformar datos: aplanar issuers en el objeto company
    const companiesWithIssuers = (companies || []).map((company: any) => {
      const issuer = company.issuers?.[0]; // Tomar el primer issuer (cada empresa debería tener uno)
      return {
        id: company.id,
        name: company.name,
        nif: issuer?.nif || '',
        type: issuer?.type || '',
        address: issuer?.address || '',
        locality: issuer?.locality || '',
        province: issuer?.province || '',
        phone: issuer?.phone || '',
        email: issuer?.email || '',
      };
    });

    console.log('[API /companies] Empresas encontradas:', companiesWithIssuers.length, companiesWithIssuers);
    return NextResponse.json(companiesWithIssuers);
  } catch (error) {
    console.error('[API /companies] Error inesperado:', error);
    return NextResponse.json(
      { error: 'Error inesperado' },
      { status: 500 }
    );
  }
}
