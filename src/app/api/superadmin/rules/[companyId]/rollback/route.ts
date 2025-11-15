// ============================================================
// API Route: Rollback Business Rules - Redpresu
// Restaura la versión anterior de reglas (solo superadmin)
// ============================================================

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { createRouteHandlerClient } from '@/lib/supabase/helpers';
import { invalidateRulesCache } from '@/lib/business-rules/evaluator.server';
import { logger } from '@/lib/logger';

export async function POST(
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
  const isGlobal = companyId === 'global';

  // Usar admin client para operaciones de base de datos
  const supabase = supabaseAdmin;

  // Construir query para obtener versión actual
  const currentQuery = supabase
    .from('business_rules')
    .select('previous_version, version')
    .eq('is_active', true);

  if (isGlobal) {
    currentQuery.is('company_id', null);
  } else {
    currentQuery.eq('company_id', companyId);
  }

  const { data: current } = await currentQuery.single();

  if (!current?.previous_version) {
    return NextResponse.json(
      { error: 'No previous version available' },
      { status: 404 }
    );
  }

  // Desactivar actual
  const deactivateQuery = supabase
    .from('business_rules')
    .update({ is_active: false })
    .eq('is_active', true);

  if (isGlobal) {
    deactivateQuery.is('company_id', null);
  } else {
    deactivateQuery.eq('company_id', companyId);
  }

  await deactivateQuery;

  // Restaurar anterior
  const { data: restored, error } = await supabase
    .from('business_rules')
    .insert({
      company_id: isGlobal ? null : parseInt(companyId),
      rules: current.previous_version,
      version: current.version + 1,
      is_active: true,
      updated_by: user.id
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  logger.info({
    companyId: isGlobal ? 'global' : companyId,
    version: restored.version,
    action: 'rollback'
  }, 'Business rules rolled back');

  await invalidateRulesCache(isGlobal ? null : companyId);

  return NextResponse.json({ message: 'Rollback successful', data: restored });
}
