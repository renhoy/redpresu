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

    // Obtener solo issuers activos (mismo approach que /companies)
    // Los issuers son las empresas reales, companies es solo metadata
    const { data: issuers, error: issuersError } = await supabaseAdmin
      .from('issuers')
      .select('company_id, name, nif, type, address, locality, province, phone, email')
      .is('deleted_at', null)
      .order('name', { ascending: true });

    if (issuersError) {
      console.error('[API /companies] Error al obtener issuers:', issuersError);
      return NextResponse.json(
        { error: 'Error al obtener empresas' },
        { status: 500 }
      );
    }

    // Obtener companies metadata solo para verificar status
    const companyIds = (issuers || []).map((i: any) => i.company_id);
    const { data: companies, error: companiesError } = await supabaseAdmin
      .from('companies')
      .select('id, status')
      .in('id', companyIds);

    if (companiesError) {
      console.error('[API /companies] Error al obtener companies metadata:', companiesError);
      // No es crítico, continuar sin filtrar por status
    }

    // Filtrar solo issuers cuya company esté activa
    const activeCompanyIds = new Set(
      (companies || [])
        .filter((c: any) => c.status === 'active')
        .map((c: any) => c.id)
    );

    const companiesWithIssuers = (issuers || [])
      .filter((issuer: any) => activeCompanyIds.has(issuer.company_id))
      .map((issuer: any) => ({
        id: issuer.company_id,
        name: issuer.name,
        nif: issuer.nif || '',
        type: issuer.type || '',
        address: issuer.address || '',
        locality: issuer.locality || '',
        province: issuer.province || '',
        phone: issuer.phone || '',
        email: issuer.email || '',
      }));

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
