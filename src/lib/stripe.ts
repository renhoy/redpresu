/**
 * Stripe Client y Helpers
 *
 * Configuración y utilidades para integración con Stripe
 */

import Stripe from "stripe";

// ============================================
// Stripe Client
// ============================================

let stripeInstance: Stripe | null = null;

/**
 * Obtiene instancia de Stripe (singleton)
 */
export function getStripeClient(): Stripe | null {
  if (!isSubscriptionsEnabled()) {
    console.warn("[Stripe] Feature deshabilitado");
    return null;
  }

  if (!stripeInstance) {
    const secretKey = process.env.STRIPE_SECRET_KEY;

    if (!secretKey) {
      console.error("[Stripe] STRIPE_SECRET_KEY no configurada");
      return null;
    }

    stripeInstance = new Stripe(secretKey, {
      apiVersion: "2024-12-18.acacia",
      typescript: true,
    });

    console.log("[Stripe] Cliente inicializado");
  }

  return stripeInstance;
}

// ============================================
// Feature Flag
// ============================================

/**
 * Verifica si las suscripciones están habilitadas
 */
export function isSubscriptionsEnabled(): boolean {
  return process.env.NEXT_PUBLIC_STRIPE_ENABLED === "true";
}

// ============================================
// Planes de Suscripción
// ============================================

export type PlanType = "free" | "pro" | "enterprise";

export interface StripePlan {
  id: PlanType;
  name: string;
  description: string;
  price: number; // Precio mensual en EUR
  priceId: string; // Stripe Price ID
  limits: {
    tariffs: number;
    budgets: number;
    users: number;
    storage_mb: number;
  };
  features: string[];
}

/**
 * Configuración de planes
 * IMPORTANTE: priceId debe actualizarse con IDs reales de Stripe Dashboard
 */
export const STRIPE_PLANS: Record<PlanType, StripePlan> = {
  free: {
    id: "free",
    name: "Free",
    description: "Plan gratuito para comenzar",
    price: 0,
    priceId: "", // No tiene Price ID en Stripe
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
    priceId: "price_REPLACE_WITH_REAL_PRICE_ID", // TODO: Actualizar con ID real
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
    priceId: "price_REPLACE_WITH_REAL_PRICE_ID", // TODO: Actualizar con ID real
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
 * Obtiene todos los planes (excluyendo free por defecto)
 */
export function getStripePlans(includeFree = false): StripePlan[] {
  const plans = Object.values(STRIPE_PLANS);
  return includeFree ? plans : plans.filter((p) => p.id !== "free");
}

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
