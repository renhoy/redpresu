/**
 * Stripe Webhook Handler
 *
 * Escucha eventos de Stripe y actualiza la base de datos:
 * - checkout.session.completed: Nueva suscripción
 * - customer.subscription.updated: Cambio de suscripción
 * - customer.subscription.deleted: Cancelación
 * - invoice.payment_failed: Pago fallido
 *
 * SECURITY: Rate limiting implementado para prevenir DoS
 */

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { getStripeClient } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';
import type Stripe from 'stripe';
import { log } from '@/lib/logger';

// Cliente Supabase con service_role para bypass RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// ============================================
// SECURITY: Rate Limiter In-Memory
// ============================================

interface RateLimitEntry {
  timestamps: number[];
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Configuración: 10 requests por 10 segundos
const RATE_LIMIT_MAX_REQUESTS = 10;
const RATE_LIMIT_WINDOW_MS = 10000; // 10 segundos

/**
 * Verifica si la IP ha excedido el rate limit
 * @param ip - IP del cliente
 * @returns true si permite la request, false si excede límite
 */
function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(ip);

  if (!entry) {
    // Primera request de esta IP
    rateLimitStore.set(ip, { timestamps: [now] });
    return true;
  }

  // Filtrar timestamps fuera de la ventana (sliding window)
  entry.timestamps = entry.timestamps.filter(
    timestamp => now - timestamp < RATE_LIMIT_WINDOW_MS
  );

  // Verificar si excede el límite
  if (entry.timestamps.length >= RATE_LIMIT_MAX_REQUESTS) {
    log.warn('[Rate Limiter] IP blocked', { ip, requests: entry.timestamps.length });
    return false;
  }

  // Añadir timestamp actual
  entry.timestamps.push(now);
  rateLimitStore.set(ip, entry);

  return true;
}

/**
 * Limpia entradas antiguas del store (ejecutar periódicamente)
 */
function cleanupRateLimitStore() {
  const now = Date.now();
  for (const [ip, entry] of rateLimitStore.entries()) {
    entry.timestamps = entry.timestamps.filter(
      timestamp => now - timestamp < RATE_LIMIT_WINDOW_MS
    );

    // Eliminar entrada si no hay timestamps recientes
    if (entry.timestamps.length === 0) {
      rateLimitStore.delete(ip);
    }
  }
}

// Cleanup cada minuto
setInterval(cleanupRateLimitStore, 60000);

// ============================================
// Webhook Handler
// ============================================

export async function POST(req: NextRequest) {
  // SECURITY: Rate limiting por IP
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : req.ip || 'unknown';

  if (!checkRateLimit(ip)) {
    log.warn('[Stripe Webhook] Rate limit exceeded', { ip });
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': '10', // Reintentar después de 10 segundos
        }
      }
    );
  }

  log.info('[Stripe Webhook] Received event', { ip });

  const stripe = getStripeClient();
  if (!stripe) {
    log.error('[Stripe Webhook] Stripe not configured');
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
  }

  const body = await req.text();
  const signature = (await headers()).get('stripe-signature');

  if (!signature) {
    log.error('[Stripe Webhook] Missing signature');
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    log.error('[Stripe Webhook] Webhook secret not configured');
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    log.error('[Stripe Webhook] Invalid signature', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  log.info('[Stripe Webhook] Event received', { eventType: event.type });

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        log.info('[Stripe Webhook] Unhandled event type', { eventType: event.type });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    log.error('[Stripe Webhook] Error processing event', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}

// ============================================
// Event Handlers
// ============================================

/**
 * Checkout completado - Nueva suscripción
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  log.info('[handleCheckoutCompleted] Processing session', { sessionId: session.id });

  const companyId = session.metadata?.company_id;
  const planId = session.metadata?.plan_id;

  if (!companyId || !planId) {
    log.error('[handleCheckoutCompleted] Missing metadata');
    return;
  }

  const subscriptionId = session.subscription as string;

  // Actualizar suscripción en BD
  const { error } = await supabaseAdmin
    .from('redpresu_subscriptions')
    .upsert({
      company_id: parseInt(companyId),
      plan: planId,
      stripe_customer_id: session.customer as string,
      stripe_subscription_id: subscriptionId,
      status: 'active',
      updated_at: new Date().toISOString(),
    });

  if (error) {
    log.error('[handleCheckoutCompleted] Database error', error);
    throw error;
  }

  log.info('[handleCheckoutCompleted] Subscription created', { subscriptionId });
}

/**
 * Suscripción actualizada
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  log.info('[handleSubscriptionUpdated] Processing subscription', { subscriptionId: subscription.id });

  const companyId = subscription.metadata?.company_id;

  if (!companyId) {
    log.error('[handleSubscriptionUpdated] Missing company_id');
    return;
  }

  // Mapear status de Stripe a nuestro status
  let status: 'active' | 'canceled' | 'past_due' | 'trialing' = 'active';

  switch (subscription.status) {
    case 'active':
    case 'trialing':
      status = subscription.status;
      break;
    case 'past_due':
      status = 'past_due';
      break;
    case 'canceled':
    case 'incomplete_expired':
    case 'unpaid':
      status = 'canceled';
      break;
  }

  const { error } = await supabaseAdmin
    .from('redpresu_subscriptions')
    .update({
      status,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id);

  if (error) {
    log.error('[handleSubscriptionUpdated] Database error', error);
    throw error;
  }

  log.info('[handleSubscriptionUpdated] Status updated', { status });
}

/**
 * Suscripción cancelada
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  log.info('[handleSubscriptionDeleted] Processing deletion', { subscriptionId: subscription.id });

  // Revertir a plan free
  const { error } = await supabaseAdmin
    .from('redpresu_subscriptions')
    .update({
      plan: 'free',
      status: 'canceled',
      stripe_subscription_id: null,
      current_period_start: null,
      current_period_end: null,
      cancel_at_period_end: false,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id);

  if (error) {
    log.error('[handleSubscriptionDeleted] Database error', error);
    throw error;
  }

  log.info('[handleSubscriptionDeleted] Reverted to free plan');
}

/**
 * Pago fallido
 */
async function handlePaymentFailed(invoice: Stripe.Invoice) {
  log.warn('[handlePaymentFailed] Payment failed', { invoiceId: invoice.id });

  const subscriptionId = invoice.subscription as string;

  if (!subscriptionId) {
    log.info('[handlePaymentFailed] No subscription found');
    return;
  }

  // Marcar como past_due
  const { error } = await supabaseAdmin
    .from('redpresu_subscriptions')
    .update({
      status: 'past_due',
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscriptionId);

  if (error) {
    log.error('[handlePaymentFailed] Database error', error);
    throw error;
  }

  log.warn('[handlePaymentFailed] Marked as past_due');

  // TODO: Enviar email notificación al usuario
}
