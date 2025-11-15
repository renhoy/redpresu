// ============================================================
// API Route: GET/PUT Business Rules - Redpresu
// Gestiona reglas de negocio por empresa (solo superadmin)
// ============================================================

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { createRouteHandlerClient } from '@/lib/supabase/helpers';
import { BusinessRulesConfigSchema } from '@/lib/types/business-rules';
import { invalidateRulesCache } from '@/lib/business-rules/evaluator.server';
import { logger } from '@/lib/logger';
import { headers } from 'next/headers';

/**
 * Verifica que el usuario es superadmin
 */
async function verifySuperadmin() {
  const supabase = await createRouteHandlerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { authorized: false, user: null };
  }

  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  return {
    authorized: userData?.role === 'superadmin',
    user
  };
}

/**
 * Obtiene IP y User-Agent para auditoría
 */
async function getRequestMetadata() {
  const headersList = await headers();
  return {
    ip: headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || 'unknown',
    userAgent: headersList.get('user-agent') || 'unknown'
  };
}

// GET /api/superadmin/rules/[companyId]
// companyId puede ser 'global' para reglas que aplican a todas las empresas
export async function GET(
  request: Request,
  { params }: { params: Promise<{ companyId: string }> }
) {
  const { authorized, user } = await verifySuperadmin();

  if (!authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { companyId } = await params;
  const supabase = supabaseAdmin; // Usar admin para queries de solo lectura

  // Si es 'global', buscar reglas con company_id IS NULL
  const isGlobal = companyId === 'global';

  const query = supabase
    .from('business_rules')
    .select('*')
    .eq('is_active', true);

  if (isGlobal) {
    query.is('company_id', null);
  } else {
    query.eq('company_id', companyId);
  }

  const { data, error } = await query.single();

  if (error) {
    // Si no existe, retornar config por defecto
    if (error.code === 'PGRST116') {
      return NextResponse.json({
        company_id: isGlobal ? null : companyId,
        rules: {
          version: 1,
          updated_at: new Date().toISOString(),
          updated_by: user!.email,
          rules: []
        }
      });
    }
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  return NextResponse.json(data);
}

// PUT /api/superadmin/rules/[companyId]
// companyId puede ser 'global' para reglas que aplican a todas las empresas
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ companyId: string }> }
) {
  const { authorized, user } = await verifySuperadmin();

  if (!authorized || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { companyId } = await params;

    // Validar con Zod
    const validated = BusinessRulesConfigSchema.parse({
      ...body,
      updated_at: new Date().toISOString(),
      updated_by: user.email
    });

    const supabase = supabaseAdmin;
    const isGlobal = companyId === 'global';

    // Construir query para obtener regla actual
    const currentQuery = supabase
      .from('business_rules')
      .select('rules, version')
      .eq('is_active', true);

    if (isGlobal) {
      currentQuery.is('company_id', null);
    } else {
      currentQuery.eq('company_id', companyId);
    }

    const { data: current } = await currentQuery.single();

    // Desactivar regla actual
    if (current) {
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
    }

    // Insertar nueva versión
    const metadata = await getRequestMetadata();
    const { data: newRule, error } = await supabase
      .from('business_rules')
      .insert({
        company_id: isGlobal ? null : parseInt(companyId),
        rules: validated,
        version: (current?.version || 0) + 1,
        is_active: true,
        updated_by: user.id,
        previous_version: current?.rules || null
      })
      .select()
      .single();

    if (error) throw error;

    // Log adicional en Pino
    logger.info({
      companyId: isGlobal ? 'global' : companyId,
      version: newRule.version,
      changedBy: user.email,
      ip: metadata.ip
    }, 'Business rules updated');

    // Invalidar caché (si es global, invalida TODA la caché)
    await invalidateRulesCache(isGlobal ? null : companyId);

    return NextResponse.json(newRule);

  } catch (error) {
    logger.error({ error, companyId: (await params).companyId }, 'Error updating business rules');
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Invalid rules' },
      { status: 400 }
    );
  }
}
