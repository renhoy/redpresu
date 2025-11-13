"use server";

/**
 * Server Actions para Testing de Suscripciones (SOLO SUPERADMIN)
 *
 * Permite crear/modificar suscripciones de prueba sin Stripe
 * y manipular el tiempo mock para testear flujos de expiración.
 *
 * ⚠️ IMPORTANTE: Estas acciones solo funcionan en NODE_ENV !== 'production'
 */

import { createServerActionClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { getServerUser } from "@/lib/auth/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import {
  getCurrentTime,
  setMockTime,
  clearMockTime,
  addDays,
  subtractDays
} from "@/lib/helpers/time-helpers";
import { getConfigValue, setConfigValue } from "@/lib/helpers/config-helpers";
import type { Subscription } from "@/lib/types/database";
import { log } from "@/lib/logger";

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// ============================================
// Verificación de Permisos
// ============================================

/**
 * Verifica que el usuario sea superadmin Y no esté en producción
 */
async function checkSuperadminAndTestingMode(): Promise<{ allowed: boolean; error?: string }> {
  // 1. Verificar NODE_ENV
  if (process.env.NODE_ENV === 'production') {
    return {
      allowed: false,
      error: 'Testing de suscripciones no permitido en producción'
    };
  }

  // 2. Verificar autenticación
  const user = await getServerUser();
  if (!user) {
    return { allowed: false, error: 'No autenticado' };
  }

  // 3. Verificar rol superadmin
  if (user.role !== 'superadmin') {
    return { allowed: false, error: 'Solo superadmin puede usar testing de suscripciones' };
  }

  return { allowed: true };
}

// ============================================
// Mock Time Actions
// ============================================

export interface UpdateMockTimeParams {
  mockTime: string | null; // ISO 8601 date string or null to clear
}

/**
 * Establece el tiempo mock global (BD + memoria)
 * null = volver a tiempo real
 */
export async function updateMockTime(params: UpdateMockTimeParams): Promise<ActionResult<{ mockTime: string | null }>> {
  try {
    log.info('[updateMockTime] Actualizando mock time...', params.mockTime);

    const check = await checkSuperadminAndTestingMode();
    if (!check.allowed) {
      return { success: false, error: check.error };
    }

    // Validar formato si no es null
    if (params.mockTime !== null) {
      const date = new Date(params.mockTime);
      if (isNaN(date.getTime())) {
        return { success: false, error: 'Formato de fecha inválido' };
      }
    }

    // 1. Actualizar en memoria
    if (params.mockTime === null) {
      clearMockTime();
    } else {
      setMockTime(params.mockTime);
    }

    // 2. Actualizar en BD (para persistencia entre requests)
    await setConfigValue('mock_time', params.mockTime || 'null');

    log.info('[updateMockTime] Mock time actualizado:', params.mockTime || 'REAL TIME');

    return {
      success: true,
      data: { mockTime: params.mockTime }
    };
  } catch (error) {
    log.error('[updateMockTime] Error:', error);
    return { success: false, error: 'Error al actualizar mock time' };
  }
}

/**
 * Obtiene el tiempo mock actual
 */
export async function getMockTime(): Promise<ActionResult<{ mockTime: string | null; currentTime: string }>> {
  try {
    const check = await checkSuperadminAndTestingMode();
    if (!check.allowed) {
      return { success: false, error: check.error };
    }

    const mockTimeConfig = await getConfigValue('mock_time');
    const currentTime = await getCurrentTime();

    return {
      success: true,
      data: {
        mockTime: mockTimeConfig === 'null' || !mockTimeConfig ? null : String(mockTimeConfig),
        currentTime: currentTime.toISOString(),
      },
    };
  } catch (error) {
    log.error('[getMockTime] Error:', error);
    return { success: false, error: 'Error al obtener mock time' };
  }
}

/**
 * Avanza el tiempo mock N días
 */
export async function advanceMockTime(days: number): Promise<ActionResult<{ newMockTime: string }>> {
  try {
    log.info('[advanceMockTime] Avanzando', days, 'días...');

    const check = await checkSuperadminAndTestingMode();
    if (!check.allowed) {
      return { success: false, error: check.error };
    }

    const currentTime = await getCurrentTime();
    const newTime = await addDays(currentTime, days);

    setMockTime(newTime);
    await setConfigValue('mock_time', newTime.toISOString());

    log.info('[advanceMockTime] Nuevo mock time:', newTime.toISOString());

    return {
      success: true,
      data: { newMockTime: newTime.toISOString() },
    };
  } catch (error) {
    log.error('[advanceMockTime] Error:', error);
    return { success: false, error: 'Error al avanzar tiempo' };
  }
}

// ============================================
// Test Subscriptions CRUD
// ============================================

export interface CreateTestSubscriptionParams {
  companyId: number;
  plan: 'free' | 'pro' | 'enterprise';
  status: 'active' | 'canceled' | 'past_due' | 'trialing';
  durationDays?: number; // Duración desde ahora (default: 30)
  startDaysAgo?: number; // Inicio N días atrás (default: 0)
}

/**
 * Crea una suscripción de prueba sin Stripe
 */
export async function createTestSubscription(
  params: CreateTestSubscriptionParams
): Promise<ActionResult<Subscription>> {
  try {
    log.info('[createTestSubscription] Creando suscripción test...', params);

    const check = await checkSuperadminAndTestingMode();
    if (!check.allowed) {
      return { success: false, error: check.error };
    }

    // Validar company_id existe (verificar que hay al menos un issuer con ese company_id)
    const { data: issuer, error: issuerError } = await supabaseAdmin
      .from('issuers')
      .select('company_id')
      .eq('company_id', params.companyId)
      .limit(1)
      .single();

    if (issuerError || !issuer) {
      log.error('[createTestSubscription] Empresa no encontrada:', params.companyId, issuerError);
      return { success: false, error: 'Empresa no encontrada' };
    }

    // Calcular fechas
    const now = await getCurrentTime();
    const startDate = params.startDaysAgo
      ? await subtractDays(now, params.startDaysAgo)
      : now;

    const durationDays = params.durationDays || 30;
    const endDate = await addDays(startDate, durationDays);

    // Crear suscripción
    const subscriptionData = {
      company_id: params.companyId,
      plan: params.plan,
      status: params.status,
      stripe_customer_id: `test_cus_${Date.now()}`, // Fake customer ID
      stripe_subscription_id: `test_sub_${Date.now()}`, // Fake subscription ID
      current_period_start: startDate.toISOString(),
      current_period_end: endDate.toISOString(),
      cancel_at_period_end: false,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    };

    // Verificar si ya existe una suscripción activa para esta empresa
    const { data: existingSub } = await supabaseAdmin
      .from('subscriptions')
      .select('id, status')
      .eq('company_id', params.companyId)
      .eq('status', 'active')
      .single();

    if (existingSub) {
      // Actualizar existente
      const { data, error } = await supabaseAdmin
        .from('subscriptions')
        .update(subscriptionData)
        .eq('id', existingSub.id)
        .select()
        .single();

      if (error) {
        log.error('[createTestSubscription] Error actualizando:', error);
        return { success: false, error: error.message };
      }

      log.info('[createTestSubscription] Suscripción actualizada:', data.id);
      return { success: true, data };
    } else {
      // Crear nueva
      const { data, error } = await supabaseAdmin
        .from('subscriptions')
        .insert(subscriptionData)
        .select()
        .single();

      if (error) {
        log.error('[createTestSubscription] Error creando:', error);
        return { success: false, error: error.message };
      }

      log.info('[createTestSubscription] Suscripción creada:', data.id);
      return { success: true, data };
    }
  } catch (error) {
    log.error('[createTestSubscription] Error inesperado:', error);
    return { success: false, error: 'Error al crear suscripción de prueba' };
  }
}

export interface UpdateTestSubscriptionParams {
  subscriptionId: string;
  plan?: 'free' | 'pro' | 'enterprise';
  status?: 'active' | 'canceled' | 'past_due' | 'trialing';
  currentPeriodEnd?: string; // ISO 8601
}

/**
 * Actualiza una suscripción de prueba
 */
export async function updateTestSubscription(
  params: UpdateTestSubscriptionParams
): Promise<ActionResult<Subscription>> {
  try {
    log.info('[updateTestSubscription] Actualizando suscripción...', params.subscriptionId);

    const check = await checkSuperadminAndTestingMode();
    if (!check.allowed) {
      return { success: false, error: check.error };
    }

    const updates: Partial<Subscription> = {
      updated_at: (await getCurrentTime()).toISOString(),
    };

    if (params.plan) updates.plan = params.plan;
    if (params.status) updates.status = params.status;
    if (params.currentPeriodEnd) updates.current_period_end = params.currentPeriodEnd;

    const { data, error } = await supabaseAdmin
      .from('subscriptions')
      .update(updates)
      .eq('id', params.subscriptionId)
      .select()
      .single();

    if (error) {
      log.error('[updateTestSubscription] Error:', error);
      return { success: false, error: error.message };
    }

    log.info('[updateTestSubscription] Suscripción actualizada');
    return { success: true, data };
  } catch (error) {
    log.error('[updateTestSubscription] Error inesperado:', error);
    return { success: false, error: 'Error al actualizar suscripción' };
  }
}

/**
 * Marca una suscripción como expirada (current_period_end = 10 días atrás)
 */
export async function expireSubscription(subscriptionId: string): Promise<ActionResult<Subscription>> {
  try {
    log.info('[expireSubscription] Expirando suscripción...', subscriptionId);

    const check = await checkSuperadminAndTestingMode();
    if (!check.allowed) {
      return { success: false, error: check.error };
    }

    const now = await getCurrentTime();
    const expiredDate = await subtractDays(now, 10); // 10 días atrás

    const { data, error } = await supabaseAdmin
      .from('subscriptions')
      .update({
        current_period_end: expiredDate.toISOString(),
        status: 'canceled',
        updated_at: now.toISOString(),
      })
      .eq('id', subscriptionId)
      .select()
      .single();

    if (error) {
      log.error('[expireSubscription] Error:', error);
      return { success: false, error: error.message };
    }

    log.info('[expireSubscription] Suscripción expirada');
    return { success: true, data };
  } catch (error) {
    log.error('[expireSubscription] Error inesperado:', error);
    return { success: false, error: 'Error al expirar suscripción' };
  }
}

/**
 * Extiende una suscripción N días desde su current_period_end actual
 */
export async function extendSubscription(
  subscriptionId: string,
  days: number
): Promise<ActionResult<Subscription>> {
  try {
    log.info('[extendSubscription] Extendiendo suscripción', days, 'días...');

    const check = await checkSuperadminAndTestingMode();
    if (!check.allowed) {
      return { success: false, error: check.error };
    }

    // Obtener suscripción actual
    const { data: currentSub, error: fetchError } = await supabaseAdmin
      .from('subscriptions')
      .select('current_period_end')
      .eq('id', subscriptionId)
      .single();

    if (fetchError || !currentSub) {
      return { success: false, error: 'Suscripción no encontrada' };
    }

    const currentEnd = new Date(currentSub.current_period_end || await getCurrentTime());
    const newEnd = await addDays(currentEnd, days);

    const { data, error } = await supabaseAdmin
      .from('subscriptions')
      .update({
        current_period_end: newEnd.toISOString(),
        status: 'active', // Reactivar si estaba expirada
        updated_at: (await getCurrentTime()).toISOString(),
      })
      .eq('id', subscriptionId)
      .select()
      .single();

    if (error) {
      log.error('[extendSubscription] Error:', error);
      return { success: false, error: error.message };
    }

    log.info('[extendSubscription] Suscripción extendida hasta:', newEnd.toISOString());
    return { success: true, data };
  } catch (error) {
    log.error('[extendSubscription] Error inesperado:', error);
    return { success: false, error: 'Error al extender suscripción' };
  }
}

/**
 * Elimina una suscripción de prueba
 * REGLA DE NEGOCIO:
 * - FREE plan NO se puede eliminar (es el plan por defecto)
 * - PRO/ENTERPRISE plan se CONVIERTE a FREE (no se elimina)
 */
export async function deleteTestSubscription(subscriptionId: string): Promise<ActionResult<void>> {
  try {
    log.info('[deleteTestSubscription] Procesando eliminación...', subscriptionId);

    const check = await checkSuperadminAndTestingMode();
    if (!check.allowed) {
      return { success: false, error: check.error };
    }

    // 1. Obtener suscripción actual para verificar el plan
    const { data: subscription, error: fetchError } = await supabaseAdmin
      .from('subscriptions')
      .select('plan, company_id')
      .eq('id', subscriptionId)
      .single();

    if (fetchError || !subscription) {
      log.error('[deleteTestSubscription] Suscripción no encontrada:', fetchError);
      return { success: false, error: 'Suscripción no encontrada' };
    }

    // 2. FREE plan no se puede eliminar
    if (subscription.plan === 'free') {
      log.warn('[deleteTestSubscription] Intento de eliminar plan FREE bloqueado');
      return {
        success: false,
        error: 'No se puede eliminar el plan FREE. Es el plan por defecto de todas las empresas.'
      };
    }

    // 3. PRO/ENTERPRISE: Convertir a FREE en lugar de eliminar
    log.info('[deleteTestSubscription] Convirtiendo plan', subscription.plan, 'a FREE...');

    const { error } = await supabaseAdmin
      .from('subscriptions')
      .update({
        plan: 'free',
        status: 'active',
        stripe_customer_id: null,
        stripe_subscription_id: null,
        current_period_start: null,
        current_period_end: null,
        cancel_at_period_end: false,
        updated_at: (await getCurrentTime()).toISOString(),
      })
      .eq('id', subscriptionId);

    if (error) {
      log.error('[deleteTestSubscription] Error convirtiendo a FREE:', error);
      return { success: false, error: error.message };
    }

    log.info('[deleteTestSubscription] Suscripción convertida a FREE exitosamente');
    return { success: true };
  } catch (error) {
    log.error('[deleteTestSubscription] Error inesperado:', error);
    return { success: false, error: 'Error al procesar suscripción' };
  }
}

// ============================================
// Utilities
// ============================================

/**
 * Obtiene todas las empresas (para selector en UI)
 * Agrupa por company_id para evitar duplicados (un company_id puede tener múltiples issuers/usuarios)
 */
export async function getTestCompanies(): Promise<ActionResult<Array<{ id: number; name: string; nif: string }>>> {
  try {
    const check = await checkSuperadminAndTestingMode();
    if (!check.allowed) {
      return { success: false, error: check.error };
    }

    // Obtener todos los issuers y agrupar por company_id
    const { data, error } = await supabaseAdmin
      .from('issuers')
      .select('company_id, name, nif')
      .order('name');

    if (error) {
      log.error('[getTestCompanies] Error:', error);
      return { success: false, error: error.message };
    }

    // Agrupar por company_id (tomar el primero de cada group)
    const uniqueCompanies = data?.reduce((acc, issuer) => {
      if (!acc.find((c) => c.id === issuer.company_id)) {
        acc.push({
          id: issuer.company_id,
          name: issuer.name,
          nif: issuer.nif,
        });
      }
      return acc;
    }, [] as Array<{ id: number; name: string; nif: string }>);

    return { success: true, data: uniqueCompanies || [] };
  } catch (error) {
    log.error('[getTestCompanies] Error inesperado:', error);
    return { success: false, error: 'Error al obtener empresas' };
  }
}

/**
 * Obtiene todas las suscripciones (para tabla en UI)
 */
export async function getAllTestSubscriptions(): Promise<ActionResult<Array<Subscription & { company_name?: string }>>> {
  try {
    const check = await checkSuperadminAndTestingMode();
    if (!check.allowed) {
      return { success: false, error: check.error };
    }

    const { data, error } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      log.error('[getAllTestSubscriptions] Error:', error);
      return { success: false, error: error.message };
    }

    // Obtener nombres de empresas para cada suscripción
    const subscriptionsWithNames = await Promise.all(
      (data || []).map(async (sub) => {
        const { data: issuer } = await supabaseAdmin
          .from('issuers')
          .select('name')
          .eq('company_id', sub.company_id)
          .single();

        return {
          ...sub,
          company_name: issuer?.name || `Empresa ${sub.company_id}`,
        };
      })
    );

    return { success: true, data: subscriptionsWithNames };
  } catch (error) {
    log.error('[getAllTestSubscriptions] Error inesperado:', error);
    return { success: false, error: 'Error al obtener suscripciones' };
  }
}

/**
 * Limpia todos los emails mockeados (útil para testing limpio)
 */
export async function clearMockEmails(): Promise<ActionResult<{ count: number }>> {
  try {
    const check = await checkSuperadminAndTestingMode();
    if (!check.allowed) {
      return { success: false, error: check.error };
    }

    const { count, error } = await supabaseAdmin
      .from('mock_emails')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (error) {
      log.error('[clearMockEmails] Error:', error);
      return { success: false, error: error.message };
    }

    log.info('[clearMockEmails] Emails limpiados:', count || 0);
    return { success: true, data: { count: count || 0 } };
  } catch (error) {
    log.error('[clearMockEmails] Error inesperado:', error);
    return { success: false, error: 'Error al limpiar emails' };
  }
}
