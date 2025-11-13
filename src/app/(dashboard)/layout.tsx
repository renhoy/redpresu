import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth/server";
import { Header } from "@/components/layout/Header";
import { TourDetector } from "@/components/help/TourDetector";
import { getCurrentSubscription } from "@/app/actions/subscriptions";
import { isMultiEmpresa } from "@/lib/helpers/app-mode";
import { getAppName, getSubscriptionsEnabled, getConfigValue } from "@/lib/helpers/config-helpers";
import { cookies } from "next/headers";
import { TestingModeBanner } from "@/components/subscriptions/alerts/TestingModeBanner";
import { SubscriptionStatusManager } from "@/components/subscriptions/alerts/SubscriptionStatusManager";
import { SubscriptionStatusMonitor } from "@/components/subscriptions/alerts/SubscriptionStatusMonitor";

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
  // NOTA: Obtener la más reciente sin filtrar por status
  // La lógica de estados (inactive/canceled/past_due/etc.) se maneja en subscription-status-checker
  // IMPORTANTE: Usar supabaseAdmin para bypass RLS (server-side, seguro)
  let currentPlan = "free";
  let subscriptionStatus = "active"; // Default para el monitor
  if (showSubscriptions) {
    const { supabaseAdmin } = await import('@/lib/supabase/server');

    // Debug: Log company_id del usuario
    console.log('[Layout] User company_id:', user.company_id);

    const { data: subscription, error } = await supabaseAdmin
      .from('redpresu_subscriptions')
      .select('plan, company_id, status, updated_at')
      .eq('company_id', user.company_id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Debug: Log resultado de suscripción
    console.log('[Layout] Subscription found:', subscription);
    console.log('[Layout] Error:', error);

    // Guardar el status para el monitor
    if (subscription) {
      subscriptionStatus = subscription.status;
    }

    // Si status es canceled o past_due, forzar a FREE (según nueva lógica)
    if (subscription && (subscription.status === 'canceled' || subscription.status === 'past_due')) {
      currentPlan = "free";
    } else {
      currentPlan = subscription?.plan || "free";
    }
  }

  // Obtener nombre de la aplicación desde config
  const appName = await getAppName();

  // Obtener nombre de empresa/autónomo del emisor
  // Usar supabaseAdmin para bypass RLS
  const { supabaseAdmin: supabaseAdminForIssuer } = await import('@/lib/supabase/server');

  const { data: issuer } = await supabaseAdminForIssuer
    .from("redpresu_issuers")
    .select("name, type")
    .eq("user_id", user.id)
    .single();

  // Nombre del emisor y tipo
  const companyName = issuer?.name || user.name;
  const issuerType = issuer?.type === "empresa" ? "Empresa" : "Autónomo";

  // Detectar modo testing (mock time activo)
  // Solo en desarrollo/testing
  let testingMode = false;
  if (process.env.NODE_ENV !== 'production') {
    const mockTime = await getConfigValue('mock_time');
    testingMode = mockTime !== null && mockTime !== 'null';
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Testing Mode Banner (sticky arriba de todo) */}
      <TestingModeBanner />

      {/* Header con badge TEST si aplica */}
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
        subscriptionsEnabled={subscriptionsEnabled}
        testingMode={testingMode}
      />

      {/* Subscription Status Manager (Inactive/Canceled/PastDue/Trialing banners) */}
      <SubscriptionStatusManager />

      {/* Subscription Status Monitor (polling para detectar cambios en tiempo real) */}
      {showSubscriptions && user.company_id && (
        <SubscriptionStatusMonitor
          companyId={user.company_id}
          initialStatus={subscriptionStatus}
        />
      )}

      <TourDetector />
      <main>{children}</main>
    </div>
  );
}
