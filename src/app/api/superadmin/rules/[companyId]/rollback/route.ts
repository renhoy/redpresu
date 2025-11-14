// ============================================================
// API Route: Rollback Business Rules - Redpresu
// Restaura la versión anterior de reglas (solo superadmin)
// ============================================================

import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { invalidateRulesCache } from '@/lib/business-rules/evaluator';
import { logger } from '@/lib/logger';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ companyId: string }> }
) {
  const supabase = await createServerClient();

  // Verificar superadmin
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (userData?.role !== 'superadmin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { companyId } = await params;

  // Obtener versión actual
  const { data: current } = await supabase
    .from('business_rules')
    .select('previous_version, version')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .single();

  if (!current?.previous_version) {
    return NextResponse.json(
      { error: 'No previous version available' },
      { status: 404 }
    );
  }

  // Desactivar actual
  await supabase
    .from('business_rules')
    .update({ is_active: false })
    .eq('company_id', companyId)
    .eq('is_active', true);

  // Restaurar anterior
  const { data: restored, error } = await supabase
    .from('business_rules')
    .insert({
      company_id: companyId,
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
    companyId,
    version: restored.version,
    action: 'rollback'
  }, 'Business rules rolled back');

  invalidateRulesCache(companyId);

  return NextResponse.json({ message: 'Rollback successful', data: restored });
}
