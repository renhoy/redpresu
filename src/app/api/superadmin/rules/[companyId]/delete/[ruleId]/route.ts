// ============================================================
// API Route: Delete Business Rule - Redpresu
// Borra una regla específica (solo superadmin)
// ============================================================

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { createRouteHandlerClient } from '@/lib/supabase/helpers';
import { invalidateRulesCache } from '@/lib/business-rules/evaluator.server';
import { logger } from '@/lib/logger';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ companyId: string; ruleId: string }> }
) {
  // Verificar superadmin con cliente autenticado
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

  const { companyId, ruleId } = await params;
  const isGlobal = companyId === 'global';

  // Usar admin para operaciones de BD
  const supabase = supabaseAdmin;

  // Primero verificar que la regla existe y pertenece a la empresa correcta
  const { data: existingRule, error: fetchError } = await supabase
    .from('business_rules')
    .select('*')
    .eq('id', ruleId)
    .single();

  if (fetchError || !existingRule) {
    return NextResponse.json({ error: 'Regla no encontrada' }, { status: 404 });
  }

  // Verificar que la regla pertenece a la empresa correcta
  if (isGlobal && existingRule.company_id !== null) {
    return NextResponse.json(
      { error: 'Esta regla no es global' },
      { status: 400 }
    );
  }

  if (!isGlobal && existingRule.company_id?.toString() !== companyId) {
    return NextResponse.json(
      { error: 'Esta regla no pertenece a la empresa especificada' },
      { status: 400 }
    );
  }

  // Borrar la regla
  const { error: deleteError } = await supabase
    .from('business_rules')
    .delete()
    .eq('id', ruleId);

  if (deleteError) {
    logger.error({ error: deleteError, ruleId }, 'Error deleting business rule');
    return NextResponse.json(
      { error: 'Error al borrar la regla' },
      { status: 500 }
    );
  }

  // Invalidar caché
  await invalidateRulesCache(isGlobal ? null : companyId);

  logger.info({
    ruleId,
    companyId: isGlobal ? 'global' : companyId,
    deletedBy: user.email,
    wasActive: existingRule.is_active
  }, 'Business rule deleted');

  return NextResponse.json({
    success: true,
    message: 'Regla borrada exitosamente'
  });
}
