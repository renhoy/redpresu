/**
 * Helpers para Verificación de Límites de Suscripción
 *
 * Funciones auxiliares para verificar límites del plan
 * antes de crear recursos (tarifas, presupuestos, usuarios)
 */

import { checkPlanLimit } from '@/app/actions/subscriptions';
import { isSubscriptionsEnabled, getLimitMessage } from '@/lib/stripe';

/**
 * Verifica si el usuario puede crear una tarifa
 * @returns true si puede crear, false si alcanzó el límite
 */
export async function canCreateTariff(): Promise<{ canCreate: boolean; message?: string }> {
  // Si suscripciones están deshabilitadas, permitir siempre
  if (!isSubscriptionsEnabled()) {
    return { canCreate: true };
  }

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
 * @returns true si puede crear, false si alcanzó el límite
 */
export async function canCreateBudget(): Promise<{ canCreate: boolean; message?: string }> {
  if (!isSubscriptionsEnabled()) {
    return { canCreate: true };
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
 * @returns true si puede crear, false si alcanzó el límite
 */
export async function canCreateUser(): Promise<{ canCreate: boolean; message?: string }> {
  if (!isSubscriptionsEnabled()) {
    return { canCreate: true };
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
