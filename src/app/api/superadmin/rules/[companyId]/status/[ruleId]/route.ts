// ============================================================
// API Route: PATCH Business Rule Status - Redpresu
// Cambia el estado activo/inactivo de una regla (solo superadmin)
// ============================================================

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { createRouteHandlerClient } from '@/lib/supabase/helpers';
import { logger } from '@/lib/logger';

/**
 * Verifica que el usuario es superadmin
 */
async function verifySuperadmin() {
  const supabase = await createRouteHandlerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (!user) {
    return { authorized: false, user: null };
  }

  // Usar supabaseAdmin para query (bypasea RLS, seguro porque filtramos por user.id autenticado)
  const { data: userData, error: dbError } = await supabaseAdmin
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  const isAuthorized = userData?.role === 'superadmin';

  return {
    authorized: isAuthorized,
    user
  };
}

// PATCH /api/superadmin/rules/[companyId]/status/[ruleId]
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ companyId: string; ruleId: string }> }
) {
  const { authorized, user } = await verifySuperadmin();

  if (!authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { companyId, ruleId } = await params;
    const { is_active } = body;

    if (typeof is_active !== 'boolean') {
      return NextResponse.json({ error: 'is_active debe ser un booleano' }, { status: 400 });
    }

    // Si se está activando una regla, desactivar todas las demás de la misma empresa
    if (is_active) {
      const isGlobal = companyId === 'global';

      const deactivateQuery = supabaseAdmin
        .from('business_rules')
        .update({ is_active: false })
        .eq('is_active', true)
        .neq('id', ruleId);

      if (isGlobal) {
        deactivateQuery.is('company_id', null);
      } else {
        deactivateQuery.eq('company_id', companyId);
      }

      await deactivateQuery;
    }

    // Actualizar el estado de la regla
    const { data, error } = await supabaseAdmin
      .from('business_rules')
      .update({ is_active })
      .eq('id', ruleId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Log
    logger.info({
      ruleId,
      companyId,
      is_active,
      changedBy: user!.email,
    }, 'Business rule status changed');

    return NextResponse.json(data);

  } catch (error) {
    logger.error({
      error,
      companyId: (await params).companyId,
      ruleId: (await params).ruleId
    }, 'Error changing business rule status');
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al cambiar estado' },
      { status: 400 }
    );
  }
}
