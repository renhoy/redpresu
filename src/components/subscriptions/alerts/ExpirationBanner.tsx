import { getSubscriptionState } from "@/lib/helpers/subscription-helpers";
import { isSubscriptionsEnabled } from "@/lib/stripe";
import { AlertTriangle, Clock } from "lucide-react";
import Link from "next/link";

/**
 * Banner que muestra alertas cuando la suscripción está por expirar
 *
 * Niveles de urgencia:
 * - 7 días o más: Sin alerta
 * - 3-6 días: Amarillo (advertencia)
 * - 1-2 días: Naranja (urgente)
 * - En grace period: Rojo (crítico pero aún funcional)
 */
export async function ExpirationBanner() {
  // Solo mostrar si suscripciones están habilitadas
  if (!isSubscriptionsEnabled()) {
    return null;
  }

  // Obtener estado de la suscripción
  const state = await getSubscriptionState();

  // No mostrar nada si:
  // - No hay suscripción o es free
  // - Ya está bloqueada (BlockedAccountBanner se encarga)
  // - Faltan más de 7 días para expirar
  if (state.blocked) {
    return null; // BlockedAccountBanner se encarga
  }

  if (!state.expired && state.daysUntilExpiration !== undefined) {
    // Aún no expirada
    if (state.daysUntilExpiration > 7) {
      return null; // Más de 7 días, sin alerta
    }

    // Determinar nivel de urgencia
    let bgColor = "bg-yellow-100";
    let borderColor = "border-yellow-300";
    let textColor = "text-yellow-900";
    let urgencyText = "Tu suscripción vence pronto";

    if (state.daysUntilExpiration <= 2) {
      bgColor = "bg-orange-100";
      borderColor = "border-orange-300";
      textColor = "text-orange-900";
      urgencyText = "¡Tu suscripción vence muy pronto!";
    }

    return (
      <div className={`${bgColor} border ${borderColor} ${textColor} px-4 py-3`}>
        <div className="container mx-auto flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            <div>
              <p className="font-semibold">{urgencyText}</p>
              <p className="text-sm">
                Tu plan {state.plan?.toUpperCase()} expira en {state.daysUntilExpiration} día{state.daysUntilExpiration !== 1 ? 's' : ''}. Renueva para continuar sin interrupciones.
              </p>
            </div>
          </div>
          <Link
            href="/subscriptions"
            className="text-sm font-semibold underline hover:no-underline whitespace-nowrap"
          >
            Renovar ahora →
          </Link>
        </div>
      </div>
    );
  }

  // Expirada pero en grace period
  if (state.expired && state.inGracePeriod) {
    const daysLeft = (state.gracePeriodDays || 3) - (state.daysExpired || 0);

    return (
      <div className="bg-red-100 border border-red-300 text-red-900 px-4 py-3">
        <div className="container mx-auto flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            <div>
              <p className="font-semibold">¡Tu suscripción ha expirado!</p>
              <p className="text-sm">
                Estás en período de gracia ({daysLeft} día{daysLeft !== 1 ? 's' : ''} restante{daysLeft !== 1 ? 's' : ''}).
                Renueva antes de que se bloquee tu cuenta.
              </p>
            </div>
          </div>
          <Link
            href="/subscriptions"
            className="text-sm font-semibold underline hover:no-underline whitespace-nowrap bg-red-600 text-white px-4 py-2 rounded"
          >
            Renovar urgente →
          </Link>
        </div>
      </div>
    );
  }

  return null;
}
