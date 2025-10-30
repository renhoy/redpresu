/**
 * Helpers para Verificación de Límites de Suscripción
 *
 * Funciones auxiliares para verificar límites del plan
 * antes de crear recursos (tarifas, presupuestos, usuarios)
 *
 * NUEVO: Incluye verificación de expiración y grace period
 */

import { checkPlanLimit, getCurrentSubscription, isSubscriptionExpired } from '@/app/actions/subscriptions';
import { isSubscriptionsEnabled, getLimitMessage } from '@/lib/stripe';
import { getCurrentTime, daysUntil } from '@/lib/helpers/time-helpers';
import { getConfigValue } from '@/lib/helpers/config-helpers';

// ============================================
// Helper: Verificar Estado de Suscripción
// ============================================

/**
 * Verifica si la suscripción está bloqueada por expiración
 * Considera grace period configurado
 *
 * @returns { blocked: boolean, message?: string, daysExpired?: number }
 */
async function checkSubscriptionStatus(): Promise<{
  blocked: boolean;
  message?: string;
  daysExpired?: number;
}> {
  try {
    // Obtener suscripción actual
    const subResult = await getCurrentSubscription();
    if (!subResult.success || !subResult.data) {
      // Si no hay suscripción, asumir plan free (no bloqueado)
      return { blocked: false };
    }

    const subscription = subResult.data;

    // Plan free nunca se bloquea
    if (subscription.plan === 'free') {
      return { blocked: false };
    }

    // Verificar si está expirada
    const expired = await isSubscriptionExpired(subscription);
    if (!expired) {
      return { blocked: false };
    }

    // Suscripción expirada - verificar grace period
    if (!subscription.current_period_end) {
      // Sin fecha de fin, no bloqueada
      return { blocked: false };
    }

    // Calcular días desde expiración
    const daysExpired = Math.abs(await daysUntil(subscription.current_period_end));

    // Obtener grace period de config (default: 3 días)
    let gracePeriodDays = 3;
    try {
      const gracePeriodConfig = await getConfigValue('subscription_grace_period_days');
      if (gracePeriodConfig && typeof gracePeriodConfig === 'number') {
        gracePeriodDays = gracePeriodConfig;
      } else if (gracePeriodConfig && typeof gracePeriodConfig === 'string') {
        gracePeriodDays = parseInt(gracePeriodConfig, 10);
      }
    } catch (error) {
      console.error('[checkSubscriptionStatus] Error obteniendo grace period, usando default:', error);
    }

    // Si aún está en grace period, no bloquear
    if (daysExpired <= gracePeriodDays) {
      return {
        blocked: false,
        daysExpired,
      };
    }

    // Grace period terminado - bloquear
    const expirationDate = new Date(subscription.current_period_end).toLocaleDateString('es-ES');
    return {
      blocked: true,
      daysExpired,
      message: `Tu suscripción ${subscription.plan.toUpperCase()} expiró el ${expirationDate} (hace ${daysExpired} días). El período de gracia de ${gracePeriodDays} días ha terminado. Por favor, renueva tu suscripción para continuar creando recursos.`,
    };
  } catch (error) {
    console.error('[checkSubscriptionStatus] Error verificando estado:', error);
    // En caso de error, no bloquear (fail open)
    return { blocked: false };
  }
}

// ============================================
// Funciones Públicas
// ============================================

/**
 * Verifica si el usuario puede crear una tarifa
 * @returns true si puede crear, false si alcanzó el límite o suscripción bloqueada
 */
export async function canCreateTariff(): Promise<{ canCreate: boolean; message?: string }> {
  // Si suscripciones están deshabilitadas, permitir siempre
  if (!isSubscriptionsEnabled()) {
    return { canCreate: true };
  }

  // NUEVO: Verificar estado de suscripción primero (expiración + grace period)
  const subscriptionStatus = await checkSubscriptionStatus();
  if (subscriptionStatus.blocked) {
    return {
      canCreate: false,
      message: subscriptionStatus.message,
    };
  }

  // Verificar límites del plan
  const result = await checkPlanLimit({ resourceType: 'tariffs' });

  if (!result.success || !result.data) {
    // En caso de error, permitir (fail open)
    return { canCreate: true };
  }

  const { canCreate, plan } = result.data;

  if (!canCreate) {
    return {
      canCreate: false,
      message: getLimitMessage(plan as 'free' | 'pro' | 'enterprise', 'tariffs'),
    };
  }

  return { canCreate: true };
}

/**
 * Verifica si el usuario puede crear un presupuesto
 * @returns true si puede crear, false si alcanzó el límite o suscripción bloqueada
 */
export async function canCreateBudget(): Promise<{ canCreate: boolean; message?: string }> {
  if (!isSubscriptionsEnabled()) {
    return { canCreate: true };
  }

  // NUEVO: Verificar estado de suscripción primero (expiración + grace period)
  const subscriptionStatus = await checkSubscriptionStatus();
  if (subscriptionStatus.blocked) {
    return {
      canCreate: false,
      message: subscriptionStatus.message,
    };
  }

  const result = await checkPlanLimit({ resourceType: 'budgets' });

  if (!result.success || !result.data) {
    return { canCreate: true };
  }

  const { canCreate, plan } = result.data;

  if (!canCreate) {
    return {
      canCreate: false,
      message: getLimitMessage(plan as 'free' | 'pro' | 'enterprise', 'budgets'),
    };
  }

  return { canCreate: true };
}

/**
 * Verifica si el admin puede crear un usuario
 * @returns true si puede crear, false si alcanzó el límite o suscripción bloqueada
 */
export async function canCreateUser(): Promise<{ canCreate: boolean; message?: string }> {
  if (!isSubscriptionsEnabled()) {
    return { canCreate: true };
  }

  // NUEVO: Verificar estado de suscripción primero (expiración + grace period)
  const subscriptionStatus = await checkSubscriptionStatus();
  if (subscriptionStatus.blocked) {
    return {
      canCreate: false,
      message: subscriptionStatus.message,
    };
  }

  const result = await checkPlanLimit({ resourceType: 'users' });

  if (!result.success || !result.data) {
    return { canCreate: true };
  }

  const { canCreate, plan } = result.data;

  if (!canCreate) {
    return {
      canCreate: false,
      message: getLimitMessage(plan as 'free' | 'pro' | 'enterprise', 'users'),
    };
  }

  return { canCreate: true };
}

/**
 * Obtiene información de uso actual
 */
export async function getUsageInfo(resourceType: 'tariffs' | 'budgets' | 'users') {
  const result = await checkPlanLimit({ resourceType });

  if (!result.success || !result.data) {
    return null;
  }

  const { limit, current, plan } = result.data;
  const percentage = (current / limit) * 100;

  return {
    current,
    limit,
    plan,
    percentage,
    remaining: limit - current,
  };
}

/**
 * Obtiene el estado de la suscripción (para mostrar alertas y banners)
 *
 * @returns {
 *   blocked: boolean,           // Si la cuenta está bloqueada por expiración
 *   expired: boolean,            // Si la suscripción está expirada
 *   inGracePeriod: boolean,      // Si está en período de gracia
 *   daysExpired?: number,        // Días desde expiración
 *   daysUntilExpiration?: number, // Días hasta expiración (negativo si ya expiró)
 *   message?: string,            // Mensaje de bloqueo
 *   plan?: string,               // Plan actual
 * }
 */
export async function getSubscriptionState(): Promise<{
  blocked: boolean;
  expired: boolean;
  inGracePeriod: boolean;
  daysExpired?: number;
  daysUntilExpiration?: number;
  message?: string;
  plan?: string;
  gracePeriodDays?: number;
}> {
  try {
    // Obtener suscripción actual
    const subResult = await getCurrentSubscription();
    if (!subResult.success || !subResult.data) {
      return { blocked: false, expired: false, inGracePeriod: false };
    }

    const subscription = subResult.data;
    const plan = subscription.plan;

    // Plan free nunca expira
    if (plan === 'free') {
      return { blocked: false, expired: false, inGracePeriod: false, plan };
    }

    // Sin fecha de fin
    if (!subscription.current_period_end) {
      return { blocked: false, expired: false, inGracePeriod: false, plan };
    }

    // Calcular días hasta expiración
    const daysUntilExpiration = await daysUntil(subscription.current_period_end);
    const expired = daysUntilExpiration < 0;

    if (!expired) {
      // No expirada aún
      return {
        blocked: false,
        expired: false,
        inGracePeriod: false,
        daysUntilExpiration,
        plan,
      };
    }

    // Suscripción expirada - verificar grace period
    const daysExpired = Math.abs(daysUntilExpiration);

    // Obtener grace period de config
    let gracePeriodDays = 3;
    try {
      const gracePeriodConfig = await getConfigValue('subscription_grace_period_days');
      if (gracePeriodConfig && typeof gracePeriodConfig === 'number') {
        gracePeriodDays = gracePeriodConfig;
      } else if (gracePeriodConfig && typeof gracePeriodConfig === 'string') {
        gracePeriodDays = parseInt(gracePeriodConfig, 10);
      }
    } catch (error) {
      console.error('[getSubscriptionState] Error obteniendo grace period:', error);
    }

    const inGracePeriod = daysExpired <= gracePeriodDays;
    const blocked = !inGracePeriod;

    // Mensaje de bloqueo
    let message;
    if (blocked) {
      const expirationDate = new Date(subscription.current_period_end).toLocaleDateString('es-ES');
      message = `Tu suscripción ${plan.toUpperCase()} expiró el ${expirationDate} (hace ${daysExpired} días). El período de gracia de ${gracePeriodDays} días ha terminado.`;
    }

    return {
      blocked,
      expired: true,
      inGracePeriod,
      daysExpired,
      daysUntilExpiration,
      message,
      plan,
      gracePeriodDays,
    };
  } catch (error) {
    console.error('[getSubscriptionState] Error:', error);
    return { blocked: false, expired: false, inGracePeriod: false };
  }
}
