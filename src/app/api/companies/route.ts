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

    // Obtener solo empresas activas (mismo filtro que en /companies)
    const { data: companies, error: companiesError } = await supabaseAdmin
      .from('companies')
      .select('id, name')
      .eq('status', 'active')
      .order('name', { ascending: true });

    if (companiesError) {
      console.error('[API /companies] Error al obtener companies:', companiesError);
      return NextResponse.json(
        { error: 'Error al obtener empresas' },
        { status: 500 }
      );
    }

    // Obtener issuers solo de empresas activas y que no estén eliminados
    const companyIds = (companies || []).map((c: any) => c.id);
    const { data: issuers, error: issuersError } = await supabaseAdmin
      .from('issuers')
      .select('company_id, nif, type, address, locality, province, phone, email')
      .in('company_id', companyIds)
      .is('deleted_at', null);

    if (issuersError) {
      console.error('[API /companies] Error al obtener issuers:', issuersError);
      return NextResponse.json(
        { error: 'Error al obtener datos fiscales' },
        { status: 500 }
      );
    }

    // Hacer el JOIN manualmente en JavaScript
    const companiesWithIssuers = (companies || []).map((company: any) => {
      // Buscar el issuer correspondiente a esta company
      const issuer = issuers?.find((i: any) => i.company_id === company.id);

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
