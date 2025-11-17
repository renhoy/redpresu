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
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  console.log('[verifySuperadmin] auth.getUser() result:', {
    hasUser: !!user,
    userId: user?.id,
    userEmail: user?.email,
    authError: authError?.message
  });

  if (!user) {
    console.log('[verifySuperadmin] No user found - returning unauthorized');
    return { authorized: false, user: null };
  }

  // Usar supabaseAdmin para query (bypasea RLS, seguro porque filtramos por user.id autenticado)
  const { data: userData, error: dbError } = await supabaseAdmin
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  console.log('[verifySuperadmin] DB query result:', {
    role: userData?.role,
    dbError: dbError?.message
  });

  const isAuthorized = userData?.role === 'superadmin';
  console.log('[verifySuperadmin] Final authorization:', isAuthorized);

  return {
    authorized: isAuthorized,
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
  console.log('[GET /api/superadmin/rules] Handler started');

  const { authorized, user } = await verifySuperadmin();

  console.log('[GET /api/superadmin/rules] verifySuperadmin result:', { authorized, hasUser: !!user });

  if (!authorized) {
    console.log('[GET /api/superadmin/rules] Returning 403 - not authorized');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  console.log('[GET /api/superadmin/rules] Authorization passed, proceeding...');

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
  console.log('[PUT /api/superadmin/rules] Handler started');

  const { authorized, user } = await verifySuperadmin();

  console.log('[PUT /api/superadmin/rules] verifySuperadmin result:', { authorized, hasUser: !!user });

  if (!authorized || !user) {
    console.log('[PUT /api/superadmin/rules] Returning 403 - not authorized');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  console.log('[PUT /api/superadmin/rules] Authorization passed, proceeding...');

  try {
    const body = await request.json();
    const { companyId } = await params;

    console.log('[PUT] Body recibido:', JSON.stringify(body).substring(0, 200));

    // Validar con Zod
    let validated;
    try {
      validated = BusinessRulesConfigSchema.parse({
        ...body,
        updated_at: new Date().toISOString(),
        updated_by: user.email
      });
      console.log('[PUT] Validación Zod OK');
    } catch (zodError) {
      console.error('[PUT] Error en validación Zod:', zodError);
      throw zodError;
    }

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

    console.log('[PUT] Insertando nueva regla:', {
      companyId: isGlobal ? null : parseInt(companyId),
      version: (current?.version || 0) + 1,
      isGlobal,
      hasValidated: !!validated,
      userId: user.id,
      validatedKeys: Object.keys(validated),
      validatedRulesLength: validated.rules?.length,
      validatedPreview: JSON.stringify(validated).substring(0, 300)
    });

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

    if (error) {
      console.error('[PUT] Error en INSERT:', {
        error,
        errorCode: error.code,
        errorMessage: error.message,
        errorDetails: error.details,
        errorHint: error.hint
      });
      throw error;
    }

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
    const { companyId } = await params;
    console.error('[PUT] Error en catch:', error);
    logger.error({
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : error,
      companyId
    }, 'Error updating business rules');

    // Mensaje de error más descriptivo
    let errorMessage = 'Error al guardar reglas';
    if (error instanceof Error) {
      errorMessage = error.message;
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 400 }
    );
  }
}
