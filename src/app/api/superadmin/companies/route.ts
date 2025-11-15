// ============================================================
// API Route: List Companies - Redpresu
// Lista todas las empresas con sus nombres reales (issuers)
// Solo superadmin
// ============================================================

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { createRouteHandlerClient } from '@/lib/supabase/helpers';

export async function GET() {
  // Verificar superadmin con cliente autenticado
  const supabaseAuth = await createRouteHandlerClient();
  const { data: { user } } = await supabaseAuth.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { data: userData } = await supabaseAuth
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (userData?.role !== 'superadmin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  // Usar admin client para queries de solo lectura
  const supabase = supabaseAdmin;

  // Obtener empresas con sus issuers para mostrar nombres reales
  const { data: companies, error } = await supabase
    .from('companies')
    .select('id, name, status')
    .order('name');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Obtener issuers para cada empresa
  const companiesWithNames = await Promise.all(
    companies.map(async (company) => {
      const { data: issuer } = await supabase
        .from('issuers')
        .select('name')
        .eq('company_id', company.id)
        .is('deleted_at', null)
        .limit(1)
        .maybeSingle();

      return {
        id: company.id,
        name: issuer?.name || company.name,
        status: company.status
      };
    })
  );

  return NextResponse.json(companiesWithNames);
}
