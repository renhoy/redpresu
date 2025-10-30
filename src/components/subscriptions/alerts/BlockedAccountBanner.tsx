import { getSubscriptionState } from "@/lib/helpers/subscription-helpers";
import { isSubscriptionsEnabled } from "@/lib/stripe";
import { Lock } from "lucide-react";
import Link from "next/link";

/**
 * Banner crítico que se muestra cuando la cuenta está bloqueada
 * por expiración de suscripción fuera del grace period.
 *
 * Este banner es sticky y prominente para que el usuario no pueda ignorarlo.
 */
export async function BlockedAccountBanner() {
  // Solo mostrar si suscripciones están habilitadas
  if (!isSubscriptionsEnabled()) {
    return null;
  }

  // Obtener estado de la suscripción
  const state = await getSubscriptionState();

  // Solo mostrar si la cuenta está bloqueada
  if (!state.blocked) {
    return null;
  }

  return (
    <div className="sticky top-0 z-50 bg-red-600 text-white px-4 py-4 shadow-lg">
      <div className="container mx-auto">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="bg-white rounded-full p-2">
              <Lock className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="font-bold text-lg">Cuenta Bloqueada por Expiración</p>
              <p className="text-sm opacity-90">
                {state.message || 'Tu suscripción ha expirado y el período de gracia ha terminado. No puedes crear recursos hasta que renueves.'}
              </p>
            </div>
          </div>
          <Link
            href="/subscriptions"
            className="bg-white text-red-600 font-semibold px-6 py-3 rounded hover:bg-red-50 transition-colors whitespace-nowrap"
          >
            Renovar Suscripción
          </Link>
        </div>
      </div>
    </div>
  );
}
