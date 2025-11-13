"use server";

/**
 * Server Actions para Suscripciones con Stripe
 *
 * Gestiona el ciclo de vida de suscripciones:
 * - Obtener suscripción actual
 * - Crear checkout session
 * - Actualizar suscripción
 * - Cancelar suscripción
 * - Verificar límites del plan
 */

import { createServerActionClient } from "@/lib/supabase/helpers";
import { cookies } from "next/headers";
import { getServerUser } from "@/lib/auth/server";
import { getStripeClient, isSubscriptionsEnabled, getStripePlan, type PlanType } from "@/lib/stripe";
import type { Subscription } from "@/lib/types/database";
import { log } from "@/lib/logger";
import { getCurrentTime, isPast } from "@/lib/helpers/time-helpers";
import { supabaseAdmin } from "@/lib/supabase/server";

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// ============================================
// Obtener Suscripción Actual
// ============================================

/**
 * Obtiene la suscripción más reciente de la empresa del usuario
 * NOTA: NO filtra por status, obtiene la más reciente (puede ser active, inactive, canceled, etc.)
 * IMPORTANTE: Usa supabaseAdmin para bypass RLS (server-side, seguro)
 */
export async function getCurrentSubscription(): Promise<ActionResult<Subscription>> {
  try {
    log.info('[getCurrentSubscription] Obteniendo suscripción...');

    const user = await getServerUser();
    if (!user) {
      return { success: false, error: 'No autenticado' };
    }

    // Usar supabaseAdmin para bypass RLS
    // NO filtrar por status - obtener la más reciente
    const { data, error } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('company_id', user.company_id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      log.error('[getCurrentSubscription] Error DB:', error);

      // Si no existe, retornar plan free por defecto
      if (error.code === 'PGRST116') {
        return {
          success: true,
          data: {
            id: '',
            company_id: user.company_id,
            plan: 'free',
            stripe_customer_id: null,
            stripe_subscription_id: null,
            status: 'active',
            current_period_start: null,
            current_period_end: null,
            cancel_at_period_end: false,
            created_at: (await getCurrentTime()).toISOString(),
            updated_at: (await getCurrentTime()).toISOString(),
          },
        };
      }

      return { success: false, error: error.message };
    }

    log.info('[getCurrentSubscription] Suscripción encontrada:', data.plan, 'status:', data.status);

    return { success: true, data };
  } catch (error) {
    log.error('[getCurrentSubscription] Error inesperado:', error);
    return { success: false, error: 'Error al obtener suscripción' };
  }
}

// ============================================
// Verificar Expiración de Suscripción
// ============================================

/**
 * Verifica si una suscripción ha expirado
 * Si está expirada y status='active', la marca como 'canceled' y crea suscripción FREE
 *
 * @param subscription - Suscripción a verificar
 * @returns true si la suscripción está expirada
 */
export async function isSubscriptionExpired(subscription: Subscription): Promise<boolean> {
  try {
    // Plan free nunca expira
    if (subscription.plan === 'free') {
      return false;
    }

    // Si no hay fecha de fin, no está expirada (ej: suscripción vitalicia)
    if (!subscription.current_period_end) {
      return false;
    }

    // Verificar si la fecha de fin ya pasó
    const isExpired = await isPast(subscription.current_period_end);

    // Si está expirada y status aún es 'active', actualizar a 'canceled' y crear FREE
    if (isExpired && subscription.status === 'active') {
      log.warn('[isSubscriptionExpired] Suscripción expirada detectada:', subscription.id);

      const now = await getCurrentTime();

      // 1. Actualizar suscripción expirada a 'canceled'
      const { error: updateError } = await supabaseAdmin
        .from('subscriptions')
        .update({
          status: 'canceled',
          updated_at: now.toISOString(),
        })
        .eq('id', subscription.id);

      if (updateError) {
        log.error('[isSubscriptionExpired] Error actualizando status:', updateError);
      } else {
        log.info('[isSubscriptionExpired] Status actualizado a canceled');
      }

      // 2. Crear nueva suscripción FREE activa para la empresa
      log.info('[isSubscriptionExpired] Creando suscripción FREE automática para company_id:', subscription.company_id);

      const { error: insertError } = await supabaseAdmin
        .from('subscriptions')
        .insert({
          company_id: subscription.company_id,
          plan: 'free',
          status: 'active',
          stripe_customer_id: subscription.stripe_customer_id, // Mantener customer_id si existe
          stripe_subscription_id: null, // FREE no tiene subscription_id de Stripe
          current_period_start: null,
          current_period_end: null,
          cancel_at_period_end: false,
          created_at: now.toISOString(),
          updated_at: now.toISOString(),
        });

      if (insertError) {
        log.error('[isSubscriptionExpired] Error creando suscripción FREE:', insertError);
      } else {
        log.info('[isSubscriptionExpired] Suscripción FREE creada exitosamente');
      }
    }

    return isExpired;
  } catch (error) {
    log.error('[isSubscriptionExpired] Error verificando expiración:', error);
    // En caso de error, asumir que NO está expirada (fail open)
    return false;
  }
}

// ============================================
// Crear Checkout Session (Stripe)
// ============================================

export interface CreateCheckoutSessionParams {
  planId: PlanType;
  successUrl: string;
  cancelUrl: string;
}

/**
 * Crea una sesión de checkout de Stripe
 */
export async function createCheckoutSession(
  params: CreateCheckoutSessionParams
): Promise<ActionResult<{ url: string }>> {
  try {
    log.info('[createCheckoutSession] Creando sesión...', params.planId);

    // Verificar feature flag
    if (!isSubscriptionsEnabled()) {
      return { success: false, error: 'Suscripciones deshabilitadas' };
    }

    const user = await getServerUser();
    if (!user) {
      return { success: false, error: 'No autenticado' };
    }

    // Solo admin/superadmin pueden cambiar plan
    if (user.role === 'comercial') {
      return { success: false, error: 'Sin permisos para cambiar plan' };
    }

    const stripe = getStripeClient();
    if (!stripe) {
      return { success: false, error: 'Stripe no configurado' };
    }

    const plan = getStripePlan(params.planId);
    if (!plan.priceId) {
      return { success: false, error: 'Plan no tiene Price ID configurado' };
    }

    const cookieStore = await cookies();
    const supabase = await createServerActionClient();

    // Obtener o crear customer ID
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('company_id', user.company_id)
      .single();

    let customerId = subscription?.stripe_customer_id;

    // Si no existe customer, crear uno
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          company_id: user.company_id.toString(),
          user_id: user.id,
        },
      });
      customerId = customer.id;

      // Guardar customer ID
      await supabase
        .from('subscriptions')
        .upsert({
          company_id: user.company_id,
          stripe_customer_id: customerId,
          plan: 'free',
          status: 'active',
        });
    }

    // Crear sesión de checkout
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: plan.priceId,
          quantity: 1,
        },
      ],
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      metadata: {
        company_id: user.company_id.toString(),
        plan_id: params.planId,
      },
    });

    log.info('[createCheckoutSession] Sesión creada:', session.id);
    return { success: true, data: { url: session.url! } };
  } catch (error) {
    log.error('[createCheckoutSession] Error:', error);
    return { success: false, error: 'Error al crear sesión de pago' };
  }
}

// ============================================
// Portal de Cliente (Stripe)
// ============================================

export interface CreatePortalSessionParams {
  returnUrl: string;
}

/**
 * Crea una sesión del portal de cliente de Stripe
 * Permite al usuario gestionar su suscripción (cambiar método pago, cancelar, etc.)
 */
export async function createPortalSession(
  params: CreatePortalSessionParams
): Promise<ActionResult<{ url: string }>> {
  try {
    log.info('[createPortalSession] Creando sesión portal...');

    if (!isSubscriptionsEnabled()) {
      return { success: false, error: 'Suscripciones deshabilitadas' };
    }

    const user = await getServerUser();
    if (!user) {
      return { success: false, error: 'No autenticado' };
    }

    if (user.role === 'comercial') {
      return { success: false, error: 'Sin permisos' };
    }

    const stripe = getStripeClient();
    if (!stripe) {
      return { success: false, error: 'Stripe no configurado' };
    }

    const cookieStore = await cookies();
    const supabase = await createServerActionClient();

    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('company_id', user.company_id)
      .single();

    if (!subscription?.stripe_customer_id) {
      return { success: false, error: 'No hay customer de Stripe' };
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: params.returnUrl,
    });

    log.info('[createPortalSession] Sesión portal creada');
    return { success: true, data: { url: session.url } };
  } catch (error) {
    log.error('[createPortalSession] Error:', error);
    return { success: false, error: 'Error al crear portal' };
  }
}

// ============================================
// Verificar Límites del Plan
// ============================================

export interface CheckPlanLimitParams {
  resourceType: 'tariffs' | 'budgets' | 'users';
}

/**
 * Verifica si el usuario puede crear más recursos según su plan
 */
export async function checkPlanLimit(
  params: CheckPlanLimitParams
): Promise<ActionResult<{ canCreate: boolean; limit: number; current: number; plan: string }>> {
  try {
    log.info('[checkPlanLimit] Verificando límite:', params.resourceType);

    const user = await getServerUser();
    if (!user) {
      return { success: false, error: 'No autenticado' };
    }

    const cookieStore = await cookies();
    const supabase = await createServerActionClient();

    // Llamar función SQL que verifica límites
    const { data, error } = await supabase.rpc('check_plan_limit', {
      p_company_id: user.company_id,
      p_resource_type: params.resourceType,
    });

    if (error) {
      log.error('[checkPlanLimit] Error DB:', error);
      // Si falla, permitir por defecto (fail open)
      return {
        success: true,
        data: { canCreate: true, limit: 9999, current: 0, plan: 'unknown' },
      };
    }

    // Obtener plan actual y límites
    const subscriptionResult = await getCurrentSubscription();
    const plan = subscriptionResult.data?.plan || 'free';
    const planConfig = getStripePlan(plan as PlanType);
    const limit = planConfig.limits[params.resourceType];

    // Contar recursos actuales
    const tableName = params.resourceType;
    const { count } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true })
      .eq('company_id', user.company_id);

    const current = count || 0;
    const canCreate = data === true;

    log.info('[checkPlanLimit] Resultado:', { canCreate, limit, current, plan });

    return {
      success: true,
      data: { canCreate, limit, current, plan },
    };
  } catch (error) {
    log.error('[checkPlanLimit] Error inesperado:', error);
    // Fail open: permitir en caso de error
    return {
      success: true,
      data: { canCreate: true, limit: 9999, current: 0, plan: 'unknown' },
    };
  }
}
