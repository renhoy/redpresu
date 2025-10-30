import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth/server";
import { getCurrentSubscription } from "@/app/actions/subscriptions";
import { isMultiEmpresa } from "@/lib/helpers/app-mode";
import {
  getSubscriptionsEnabled,
  getSubscriptionPlansFromConfig,
} from "@/lib/helpers/config-helpers";
import { SubscriptionsClient } from "@/components/subscriptions/SubscriptionsClient";
import { generatePageMetadata } from "@/lib/helpers/metadata-helpers";

export async function generateMetadata() {
  return generatePageMetadata("Suscripciones", "Gestiona tu plan de suscripción");
}

export default async function SubscriptionsPage() {
  const user = await getServerUser();

  if (!user) {
    redirect("/login");
  }

  // Solo admin/superadmin pueden ver suscripciones
  if (user.role === "comercial") {
    redirect("/dashboard");
  }

  // Verificar si la página debe estar disponible
  const multiempresa = await isMultiEmpresa();
  const subscriptionsEnabled = await getSubscriptionsEnabled();

  // Redirigir si:
  // 1. Modo monoempresa (no disponible), O
  // 2. Config subscriptions_enabled = false
  if (!multiempresa || !subscriptionsEnabled) {
    redirect("/dashboard");
  }

  // Obtener suscripción actual
  const subscriptionResult = await getCurrentSubscription();

  if (!subscriptionResult.success || !subscriptionResult.data) {
    return (
      <div className="min-h-screen bg-lime-50">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-lime-600 mb-4">
            Suscripciones
          </h1>
          <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
            <p className="text-gray-700">Error al cargar suscripción</p>
            <p className="text-sm text-gray-600 mt-2">
              {subscriptionResult.error}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Obtener planes desde config de BD
  const plansConfig = await getSubscriptionPlansFromConfig(true);

  // Ordenar planes por position
  const sortedPlans = Object.fromEntries(
    Object.entries(plansConfig).sort(([, a], [, b]) => a.position - b.position)
  ) as Record<typeof plansConfig extends Record<infer K, any> ? K : never, typeof plansConfig[keyof typeof plansConfig]>;

  return (
    <SubscriptionsClient
      currentSubscription={subscriptionResult.data}
      userRole={user.role}
      plans={sortedPlans}
    />
  );
}
