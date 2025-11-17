// ============================================================
// API Route: Validate Business Rules - Redpresu
// Valida reglas en dry-run sin aplicarlas (solo superadmin)
// ============================================================

import { NextResponse } from 'next/server';
import { validateRules } from '@/lib/business-rules/validator.server';
import { BusinessRulesConfigSchema } from '@/lib/types/business-rules';
import { createRouteHandlerClient } from '@/lib/supabase/helpers';
import { supabaseAdmin } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

/**
 * Verifica que el usuario es superadmin
 */
async function verifySuperadmin() {
  const supabase = await createRouteHandlerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  console.log('[verifySuperadmin/validate] Auth check:', {
    hasUser: !!user,
    userId: user?.id,
    email: user?.email,
    authError: authError?.message
  });

  logger.info({ user: user?.id, authError: authError?.message }, 'Verificando superadmin en validate');

  if (!user) {
    console.log('[verifySuperadmin/validate] No user found, unauthorized');
    return { authorized: false, user: null };
  }

  // Usar supabaseAdmin para evitar problemas con RLS
  const { data: userData, error: dbError } = await supabaseAdmin
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  console.log('[verifySuperadmin/validate] User data:', {
    userId: user.id,
    role: userData?.role,
    dbError: dbError?.message
  });

  logger.info({ userId: user.id, role: userData?.role }, 'Usuario verificado en validate');

  return {
    authorized: userData?.role === 'superadmin',
    user
  };
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ companyId: string }> }
) {
  // Verificar superadmin
  const { authorized, user } = await verifySuperadmin();

  if (!authorized) {
    logger.warn({ user: user?.id }, 'Intento de validación sin autorización');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const body = await request.json();

    // Validar schema
    const validated = BusinessRulesConfigSchema.parse(body);

    // Probar con contexto de ejemplo o el proporcionado
    const testContext = body.testContext || {
      plan: 'PRO' as const,
      users_count: 3,
      tariffs_count: 25,
      budgets_count: 100,
      days_since_payment: 15,
      days_since_signup: 10,
      is_trial: false,
      features_used: ['reports']
    };

    const result = validateRules(validated.rules, testContext);

    return NextResponse.json({
      valid: result.valid,
      matchedRule: result.matchedRule,
      error: result.error,
      testContext
    });

  } catch (error) {
    return NextResponse.json(
      { valid: false, error: error instanceof Error ? error.message : 'Invalid' },
      { status: 400 }
    );
  }
}
