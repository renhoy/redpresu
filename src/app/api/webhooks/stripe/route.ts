/**
 * Stripe Webhook Handler
 *
 * Escucha eventos de Stripe y actualiza la base de datos:
 * - checkout.session.completed: Nueva suscripción
 * - customer.subscription.updated: Cambio de suscripción
 * - customer.subscription.deleted: Cancelación
 * - invoice.payment_failed: Pago fallido
 */

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { getStripeClient } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';
import type Stripe from 'stripe';

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

export async function POST(req: NextRequest) {
  console.log('[Stripe Webhook] Received event');

  const stripe = getStripeClient();
  if (!stripe) {
    console.error('[Stripe Webhook] Stripe not configured');
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
  }

  const body = await req.text();
  const signature = (await headers()).get('stripe-signature');

  if (!signature) {
    console.error('[Stripe Webhook] Missing signature');
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('[Stripe Webhook] Webhook secret not configured');
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error('[Stripe Webhook] Invalid signature:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  console.log('[Stripe Webhook] Event type:', event.type);

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
        console.log('[Stripe Webhook] Unhandled event type:', event.type);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[Stripe Webhook] Error processing event:', error);
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
  console.log('[handleCheckoutCompleted] Session:', session.id);

  const companyId = session.metadata?.company_id;
  const planId = session.metadata?.plan_id;

  if (!companyId || !planId) {
    console.error('[handleCheckoutCompleted] Missing metadata');
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
    console.error('[handleCheckoutCompleted] Error DB:', error);
    throw error;
  }

  console.log('[handleCheckoutCompleted] Subscription created:', subscriptionId);
}

/**
 * Suscripción actualizada
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log('[handleSubscriptionUpdated] Subscription:', subscription.id);

  const companyId = subscription.metadata?.company_id;

  if (!companyId) {
    console.error('[handleSubscriptionUpdated] Missing company_id');
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
    console.error('[handleSubscriptionUpdated] Error DB:', error);
    throw error;
  }

  console.log('[handleSubscriptionUpdated] Status updated:', status);
}

/**
 * Suscripción cancelada
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log('[handleSubscriptionDeleted] Subscription:', subscription.id);

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
    console.error('[handleSubscriptionDeleted] Error DB:', error);
    throw error;
  }

  console.log('[handleSubscriptionDeleted] Reverted to free plan');
}

/**
 * Pago fallido
 */
async function handlePaymentFailed(invoice: Stripe.Invoice) {
  console.log('[handlePaymentFailed] Invoice:', invoice.id);

  const subscriptionId = invoice.subscription as string;

  if (!subscriptionId) {
    console.log('[handlePaymentFailed] No subscription');
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
    console.error('[handlePaymentFailed] Error DB:', error);
    throw error;
  }

  console.log('[handlePaymentFailed] Marked as past_due');

  // TODO: Enviar email notificación al usuario
}
