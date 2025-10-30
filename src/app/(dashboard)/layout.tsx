import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth/server";
import { Header } from "@/components/layout/Header";
import { TourDetector } from "@/components/help/TourDetector";
import { getCurrentSubscription } from "@/app/actions/subscriptions";
import { isMultiEmpresa } from "@/lib/helpers/app-mode";
import { getAppName, getSubscriptionsEnabled } from "@/lib/helpers/config-helpers";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getServerUser();

  // El middleware ya verificó autenticación, si no hay usuario aquí
  // es un problema de cookies entre middleware y layout
  // Mostrar loading en lugar de redirect para evitar bucle
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-lime-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  // Obtener modo de operación
  const multiempresa = await isMultiEmpresa();

  // Obtener configuración de suscripciones
  const subscriptionsEnabled = await getSubscriptionsEnabled();

  // Determinar si mostrar módulo de suscripciones
  // Solo si: modo multiempresa + suscripciones habilitadas + usuario admin/superadmin
  const showSubscriptions =
    multiempresa &&
    subscriptionsEnabled &&
    (user.role === "admin" || user.role === "superadmin");

  // Obtener suscripción actual (solo si showSubscriptions)
  const subscriptionResult = showSubscriptions
    ? await getCurrentSubscription()
    : { data: null };
  const currentPlan = subscriptionResult.data?.plan || "free";

  // Obtener nombre de la aplicación desde config
  const appName = await getAppName();

  // Obtener nombre de empresa/autónomo del emisor
  const supabase = createServerComponentClient({ cookies });

  const { data: issuer } = await supabase
    .from("redpresu_issuers")
    .select("name, type")
    .eq("user_id", user.id)
    .single();

  // Nombre del emisor y tipo
  const companyName = issuer?.name || user.name;
  const issuerType = issuer?.type === "empresa" ? "Empresa" : "Autónomo";

  return (
    <div className="min-h-screen bg-background">
      <Header
        userId={user.id}
        userRole={user.role}
        userName={user.name}
        appName={appName}
        companyName={companyName}
        issuerType={issuerType}
        currentPlan={currentPlan}
        multiempresa={multiempresa}
        showSubscriptions={showSubscriptions}
      />
      <TourDetector />
      <main>{children}</main>
    </div>
  );
}
