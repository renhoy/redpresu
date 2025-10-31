/**
 * Helper Central para Verificación de Estado de Suscripción
 *
 * Orden de verificación (parar cuando se encuentra verdadero):
 * 1. Inactive → Cuenta desactivada (sanción)
 * 2. Canceled → Cancelada por admin (downgrade a FREE)
 * 3. Past Due → Vencida (downgrade a FREE automático)
 * 4. Trialing → Período de prueba
 * 5. Active → Activa (acceso completo)
 */

import { getCurrentSubscription } from "@/app/actions/subscriptions";
import type { Subscription } from "@/lib/types/database";

export type SubscriptionStatusCheck = {
  status: 'inactive' | 'canceled' | 'past_due' | 'trialing' | 'active';
  blocked: boolean;
  redirectTo: string | null;
  message: string;
  canUpgrade: boolean;
  canCreateResources: boolean;
  showContactButton: boolean;
  currentPlan: string;
};

/**
 * Verifica el estado de la suscripción según el orden establecido
 *
 * @returns Estado completo de la suscripción con flags de comportamiento
 */
export async function checkSubscriptionStatus(): Promise<SubscriptionStatusCheck> {
  const result = await getCurrentSubscription();

  // Si no hay suscripción o error, asumir FREE activa
  if (!result.success || !result.data) {
    return {
      status: 'active',
      blocked: false,
      redirectTo: null,
      message: '',
      canUpgrade: true,
      canCreateResources: true,
      showContactButton: false,
      currentPlan: 'free',
    };
  }

  const subscription = result.data;

  // ============================================
  // 1. INACTIVE - Cuenta desactivada (sanción)
  // ============================================
  if (subscription.status === 'inactive') {
    return {
      status: 'inactive',
      blocked: true,
      redirectTo: '/dashboard', // Redirigir todo a dashboard
      message: 'Su cuenta ha sido Desactivada por un administrador. Debe haber recibido un mensaje en su correo con los motivos. Todos sus datos permanecen seguros y los puede recuperar cuando su cuenta sea Activada de nuevo. Póngase en contacto con un administrador.',
      canUpgrade: false, // NO puede adquirir planes
      canCreateResources: false,
      showContactButton: true,
      currentPlan: subscription.plan,
    };
  }

  // ============================================
  // 2. CANCELED - Cancelada por admin
  // ============================================
  if (subscription.status === 'canceled') {
    return {
      status: 'canceled',
      blocked: false,
      redirectTo: null,
      message: 'Su cuenta ha sido Cancelada por un Administrador. Debe haber recibido un mensaje en su correo con los motivos. Puede seguir usando los servicios en el plan FREE o pagar y pasar al plan superior. No se borrarán sus datos, pero para volver a usarlos tiene que ponerse en contacto con un administrador del sistema.',
      canUpgrade: true, // SÍ puede upgradear
      canCreateResources: subscription.plan === 'free', // Solo puede crear si respeta límites FREE
      showContactButton: true,
      currentPlan: 'free', // Forzar FREE aunque subscription.plan diga otra cosa
    };
  }

  // ============================================
  // 3. PAST DUE - Vencida (expiró por tiempo)
  // ============================================
  if (subscription.status === 'past_due') {
    return {
      status: 'past_due',
      blocked: false,
      redirectTo: null,
      message: 'Su suscripción ha expirado. Su cuenta ha pasado automáticamente al plan FREE. Para recuperar acceso a todas las funcionalidades, renueve su suscripción.',
      canUpgrade: true,
      canCreateResources: true, // Puede crear respetando límites FREE
      showContactButton: false,
      currentPlan: 'free', // Forzar FREE
    };
  }

  // ============================================
  // 4. TRIALING - Período de prueba
  // ============================================
  if (subscription.status === 'trialing') {
    return {
      status: 'trialing',
      blocked: false,
      redirectTo: null,
      message: `Está en período de prueba del plan ${subscription.plan.toUpperCase()}. Disfrute de todas las funcionalidades mientras dure su prueba.`,
      canUpgrade: true,
      canCreateResources: true, // Acceso completo durante trial
      showContactButton: false,
      currentPlan: subscription.plan,
    };
  }

  // ============================================
  // 5. ACTIVE - Activa (acceso completo)
  // ============================================
  return {
    status: 'active',
    blocked: false,
    redirectTo: null,
    message: '',
    canUpgrade: true,
    canCreateResources: true,
    showContactButton: false,
    currentPlan: subscription.plan,
  };
}

/**
 * Verifica si un recurso debe estar marcado como inactivo
 * por exceder los límites del plan FREE
 *
 * Usado cuando cuenta está en estado Canceled o Past Due
 */
export function shouldMarkResourceInactive(
  resourceIndex: number,
  resourceType: 'tariffs' | 'budgets' | 'users',
  currentPlan: string
): boolean {
  // Solo aplicar a cuentas forzadas a FREE
  if (currentPlan !== 'free') {
    return false;
  }

  // Límites del plan FREE
  const FREE_LIMITS = {
    tariffs: 3,
    budgets: 5,
    users: 1,
  };

  const limit = FREE_LIMITS[resourceType];

  // Si el índice (0-based) es >= límite, marcar como inactivo
  // Ejemplo: tariffs limit=3, entonces índices 0,1,2 activos, 3+ inactivos
  return resourceIndex >= limit;
}
