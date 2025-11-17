// ============================================================
// API Route: List All Business Rules - Redpresu
// Lista TODAS las reglas (activas e inactivas) para una empresa
// ============================================================

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { createRouteHandlerClient } from '@/lib/supabase/helpers';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ companyId: string }> }
) {
  // Verificar superadmin
  const supabaseAuth = await createRouteHandlerClient();
  const { data: { user } } = await supabaseAuth.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  // Usar supabaseAdmin para query (bypasea RLS)
  const { data: userData } = await supabaseAdmin
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (userData?.role !== 'superadmin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { companyId } = await params;
  const isGlobal = companyId === 'global';

  // Usar admin para queries
  const supabase = supabaseAdmin;

  // Construir query para obtener TODAS las reglas (activas e inactivas)
  const query = supabase
    .from('business_rules')
    .select('*')
    .order('version', { ascending: false }); // Más recientes primero

  if (isGlobal) {
    query.is('company_id', null);
  } else {
    query.eq('company_id', companyId);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data || []);
}
