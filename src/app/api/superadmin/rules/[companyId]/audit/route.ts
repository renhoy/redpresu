// ============================================================
// API Route: Audit Log Business Rules - Redpresu
// Historial de cambios en reglas con paginación (solo superadmin)
// ============================================================

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { createRouteHandlerClient } from '@/lib/supabase/helpers';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ companyId: string }> }
) {
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

  const { companyId } = await params;
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '50');
  const offset = parseInt(searchParams.get('offset') || '0');

  const isGlobal = companyId === 'global';

  // Usar admin client para queries de solo lectura
  const supabase = supabaseAdmin;

  // Construir query con filtro apropiado
  const query = supabase
    .from('rules_audit_log')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (isGlobal) {
    query.is('company_id', null);
  } else {
    query.eq('company_id', companyId);
  }

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    data,
    pagination: {
      total: count,
      limit,
      offset,
      hasMore: (offset + limit) < (count || 0)
    }
  });
}
