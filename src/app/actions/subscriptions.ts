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

import { createServerActionClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { getServerUser } from "@/lib/auth/server";
import { getStripeClient, isSubscriptionsEnabled, getStripePlan, type PlanType } from "@/lib/stripe";
import type { Subscription } from "@/lib/types/database";
import { log } from "@/lib/logger";

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// ============================================
// Obtener Suscripción Actual
// ============================================

/**
 * Obtiene la suscripción activa de la empresa del usuario
 */
export async function getCurrentSubscription(): Promise<ActionResult<Subscription>> {
  try {
    log.info('[getCurrentSubscription] Obteniendo suscripción...');

    const user = await getServerUser();
    if (!user) {
      return { success: false, error: 'No autenticado' };
    }

    const cookieStore = await cookies();
    const supabase = createServerActionClient({ cookies: () => cookieStore });

    const { data, error } = await supabase
      .from('redpresu_subscriptions')
      .select('*')
      .eq('company_id', user.company_id)
      .eq('status', 'active')
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
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        };
      }

      return { success: false, error: error.message };
    }

    log.info('[getCurrentSubscription] Suscripción encontrada:', data.plan);
    return { success: true, data };
  } catch (error) {
    log.error('[getCurrentSubscription] Error inesperado:', error);
    return { success: false, error: 'Error al obtener suscripción' };
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
    const supabase = createServerActionClient({ cookies: () => cookieStore });

    // Obtener o crear customer ID
    const { data: subscription } = await supabase
      .from('redpresu_subscriptions')
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
        .from('redpresu_subscriptions')
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
    const supabase = createServerActionClient({ cookies: () => cookieStore });

    const { data: subscription } = await supabase
      .from('redpresu_subscriptions')
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
    const supabase = createServerActionClient({ cookies: () => cookieStore });

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
    const tableName = `redpresu_${params.resourceType}`;
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
