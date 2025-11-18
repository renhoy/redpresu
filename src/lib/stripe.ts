/**
 * Stripe Client y Helpers
 *
 * Configuración y utilidades para integración con Stripe
 */

import Stripe from "stripe";
import { getStripeConfig, isLiveMode } from "@/lib/env-config";

// ============================================
// Stripe Client
// ============================================

let stripeInstance: Stripe | null = null;

/**
 * Obtiene instancia de Stripe (singleton)
 * Usa automáticamente las keys correctas según el entorno (test/live)
 */
export function getStripeClient(): Stripe | null {
  if (!isSubscriptionsEnabled()) {
    console.warn("[Stripe] Feature deshabilitado");
    return null;
  }

  if (!stripeInstance) {
    const config = getStripeConfig();

    if (!config.secretKey) {
      console.error(
        `[Stripe] ${config.mode.toUpperCase()} secret key no configurada`
      );
      return null;
    }

    stripeInstance = new Stripe(config.secretKey, {
      apiVersion: "2024-12-18.acacia",
      typescript: true,
    });

    console.log(
      `[Stripe] Cliente inicializado en modo ${config.mode.toUpperCase()}`
    );
  }

  return stripeInstance;
}

/**
 * Obtiene la publishable key de Stripe según el entorno
 * Úsala en componentes de cliente para inicializar Stripe Elements
 */
export function getStripePublishableKey(): string | null {
  const config = getStripeConfig();
  return config.publishableKey || null;
}

/**
 * Obtiene el webhook secret según el entorno
 */
export function getStripeWebhookSecret(): string | null {
  const config = getStripeConfig();
  return config.webhookSecret || null;
}

// ============================================
// Feature Flag
// ============================================

/**
 * Verifica si las suscripciones están habilitadas (solo env var)
 * @deprecated Usar isSubscriptionsEnabledAsync() para verificación completa
 */
export function isSubscriptionsEnabled(): boolean {
  return process.env.NEXT_PUBLIC_STRIPE_ENABLED === "true";
}

/**
 * Verifica si las suscripciones están habilitadas (verificación completa)
 * Requisitos:
 * 1. Variable entorno NEXT_PUBLIC_STRIPE_ENABLED = "true"
 * 2. Modo multiempresa activo (isMultiEmpresa = true)
 * 3. Config 'subscriptions_enabled' = true
 *
 * @returns Promise<boolean> - true si todas las condiciones se cumplen
 */
export async function isSubscriptionsEnabledAsync(): Promise<boolean> {
  // 1. Verificar variable de entorno
  if (process.env.NEXT_PUBLIC_STRIPE_ENABLED !== "true") {
    return false;
  }

  // 2. Verificar modo multiempresa
  const { isMultiEmpresa } = await import("@/lib/helpers/app-mode");
  const multiempresa = await isMultiEmpresa();
  if (!multiempresa) {
    return false;
  }

  // 3. Verificar config en BD
  const { getConfigValue } = await import("@/lib/helpers/config-helpers");
  const subscriptionsEnabled = await getConfigValue<boolean>(
    "subscriptions_enabled"
  );

  return subscriptionsEnabled === true;
}

// ============================================
// Planes de Suscripción
// ============================================

export type PlanType = "free" | "pro" | "enterprise";

export interface PlanFeatures {
  tariffs_limit: string;
  budgets_limit: string;
  users_limit: string;
  storage: string;
  support: string;
  custom_templates: boolean;
  priority_support: boolean;
  remove_watermark: boolean;
  multi_company: boolean;
  api_access: boolean;
  custom_branding: boolean;
}

export interface StripePlan {
  id: PlanType;
  name: string;
  description: string;
  price: number; // Precio mensual en EUR
  priceId: string; // Stripe Price ID (deprecated, usar priceIds)
  priceIds: {
    test: string; // Price ID para modo TEST
    live: string; // Price ID para modo LIVE
  };
  limits: {
    tariffs: number;
    budgets: number;
    users: number;
    storage_mb: number;
  };
  features: PlanFeatures | string[]; // Puede ser objeto detallado o array de strings
}

/**
 * Configuración de planes
 * IMPORTANTE: Actualizar priceIds con IDs reales de Stripe Dashboard
 * - Modo TEST: Stripe Dashboard (Test mode) → Products → Price ID
 * - Modo LIVE: Stripe Dashboard (Live mode) → Products → Price ID
 */
export const STRIPE_PLANS: Record<PlanType, StripePlan> = {
  free: {
    id: "free",
    name: "Free",
    description: "Plan gratuito para comenzar",
    price: 0,
    priceId: "", // Deprecated
    priceIds: {
      test: "", // No tiene Price ID en Stripe
      live: "",
    },
    limits: {
      tariffs: 3,
      budgets: 10,
      users: 1,
      storage_mb: 100,
    },
    features: [
      "Hasta 3 tarifas",
      "Hasta 10 presupuestos",
      "1 usuario",
      "100 MB almacenamiento",
      "Soporte por email",
    ],
  },

  pro: {
    id: "pro",
    name: "Pro",
    description: "Plan profesional para negocios",
    price: 29,
    priceId: "price_REPLACE_WITH_REAL_PRICE_ID", // Deprecated
    priceIds: {
      test: "price_REPLACE_WITH_TEST_PRICE_ID", // TODO: Actualizar con ID de TEST mode
      live: "price_REPLACE_WITH_LIVE_PRICE_ID", // TODO: Actualizar con ID de LIVE mode
    },
    limits: {
      tariffs: 50,
      budgets: 500,
      users: 5,
      storage_mb: 5000,
    },
    features: [
      "Hasta 50 tarifas",
      "Hasta 500 presupuestos",
      "Hasta 5 usuarios",
      "5 GB almacenamiento",
      "Plantillas personalizadas",
      "Soporte prioritario",
      "Sin marca de agua",
    ],
  },

  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    description: "Plan empresarial sin límites",
    price: 99,
    priceId: "price_REPLACE_WITH_REAL_PRICE_ID", // Deprecated
    priceIds: {
      test: "price_REPLACE_WITH_TEST_PRICE_ID", // TODO: Actualizar con ID de TEST mode
      live: "price_REPLACE_WITH_LIVE_PRICE_ID", // TODO: Actualizar con ID de LIVE mode
    },
    limits: {
      tariffs: 9999,
      budgets: 9999,
      users: 50,
      storage_mb: 50000,
    },
    features: [
      "Tarifas ilimitadas",
      "Presupuestos ilimitados",
      "Hasta 50 usuarios",
      "50 GB almacenamiento",
      "Plantillas personalizadas",
      "Multi-empresa",
      "Soporte dedicado 24/7",
      "API access",
      "Branding completo",
    ],
  },
};

/**
 * Obtiene configuración de un plan
 */
export function getStripePlan(planId: PlanType): StripePlan {
  return STRIPE_PLANS[planId];
}

/**
 * Obtiene el Price ID correcto según el entorno actual (test/live)
 */
export function getStripePriceId(planId: PlanType): string {
  const plan = getStripePlan(planId);
  const mode = isLiveMode() ? "live" : "test";
  return plan.priceIds[mode];
}

/**
 * Obtiene todos los planes (excluyendo free por defecto)
 */
export function getStripePlans(includeFree = false): StripePlan[] {
  const plans = Object.values(STRIPE_PLANS);
  return includeFree ? plans : plans.filter((p) => p.id !== "free");
}

/**
 * @deprecated Usar getSubscriptionPlansFromConfig() desde config-helpers.ts en server components
 * Esta función mantiene compatibilidad con código existente que usa STRIPE_PLANS
 */

// ============================================
// Helpers de Precios
// ============================================

/**
 * Formatea precio para mostrar
 */
export function formatPrice(price: number): string {
  if (price === 0) return "Gratis";
  return `${price}€/mes`;
}

/**
 * Calcula precio anual con descuento
 */
export function calculateAnnualPrice(
  monthlyPrice: number,
  discountPercent = 20
): number {
  const annual = monthlyPrice * 12;
  const discount = annual * (discountPercent / 100);
  return annual - discount;
}

// ============================================
// Validación de Límites
// ============================================

/**
 * Verifica si un plan permite crear más recursos
 */
export function canCreateResource(
  plan: PlanType,
  resourceType: "tariffs" | "budgets" | "users",
  currentCount: number
): boolean {
  const planConfig = getStripePlan(plan);
  const limit = planConfig.limits[resourceType];
  return currentCount < limit;
}

/**
 * Obtiene mensaje de límite alcanzado
 */
export function getLimitMessage(
  plan: PlanType,
  resourceType: "tariffs" | "budgets" | "users"
): string {
  const planConfig = getStripePlan(plan);
  const limit = planConfig.limits[resourceType];

  const resourceNames = {
    tariffs: "tarifas",
    budgets: "presupuestos",
    users: "usuarios",
  };

  return `Has alcanzado el límite de ${limit} ${resourceNames[resourceType]} del plan ${planConfig.name}. Actualiza tu plan para crear más.`;
}
