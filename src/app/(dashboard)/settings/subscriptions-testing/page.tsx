import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth/server";
import { getMockTime, getTestCompanies, getAllTestSubscriptions } from "@/app/actions/testing/subscriptions-testing";
import { TestingHeader } from "@/components/subscriptions/testing/TestingHeader";
import { TimeSimulator } from "@/components/subscriptions/testing/TimeSimulator";
import { SubscriptionCreator } from "@/components/subscriptions/testing/SubscriptionCreator";
import { TestSubscriptionsTable } from "@/components/subscriptions/testing/TestSubscriptionsTable";
import { generatePageMetadata } from "@/lib/helpers/metadata-helpers";
import { FlaskConical } from "lucide-react";

export async function generateMetadata() {
  return generatePageMetadata(
    "Testing Suscripciones",
    "Panel de testing de suscripciones y tiempo mock (superadmin)"
  );
}

export default async function SubscriptionsTestingPage() {
  // ============================================
  // 1. Verificar autenticación y permisos
  // ============================================

  const user = await getServerUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "superadmin") {
    redirect("/dashboard");
  }

  // Verificar NODE_ENV
  if (process.env.NODE_ENV === 'production') {
    return (
      <div className="container mx-auto py-10">
        <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded">
          ⚠️ Testing de suscripciones no disponible en producción
        </div>
      </div>
    );
  }

  // ============================================
  // 2. Cargar datos necesarios
  // ============================================

  const [mockTimeResult, companiesResult, subscriptionsResult] = await Promise.all([
    getMockTime(),
    getTestCompanies(),
    getAllTestSubscriptions(),
  ]);

  // Manejar errores
  if (!mockTimeResult.success) {
    return (
      <div className="container mx-auto py-10">
        <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded">
          Error al cargar mock time: {mockTimeResult.error}
        </div>
      </div>
    );
  }

  if (!companiesResult.success) {
    return (
      <div className="container mx-auto py-10">
        <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded">
          Error al cargar empresas: {companiesResult.error}
        </div>
      </div>
    );
  }

  if (!subscriptionsResult.success) {
    return (
      <div className="container mx-auto py-10">
        <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded">
          Error al cargar suscripciones: {subscriptionsResult.error}
        </div>
      </div>
    );
  }

  const mockTime = mockTimeResult.data?.mockTime || null;
  const currentTime = mockTimeResult.data?.currentTime || new Date().toISOString();
  const companies = companiesResult.data || [];
  const subscriptions = subscriptionsResult.data || [];

  // ============================================
  // 3. Render UI
  // ============================================

  return (
    <div className="min-h-screen bg-lime-50">
      <div className="container mx-auto px-4 py-6">
        {/* Header con indicador Testing */}
        <TestingHeader
          mockTime={mockTime}
          currentTime={currentTime}
        />

        {/* Warning Banner */}
        <div className="mb-6 bg-orange-100 border border-orange-300 text-orange-900 px-4 py-3 rounded flex items-center gap-2">
          <FlaskConical className="h-5 w-5" />
          <div>
            <p className="font-semibold">Modo Testing Activado</p>
            <p className="text-sm">
              Esta página permite crear suscripciones de prueba y manipular el tiempo para testear
              flujos de expiración. Solo disponible en desarrollo.
            </p>
          </div>
        </div>

        {/* Grid de 2 columnas en desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Simulador de Tiempo */}
          <TimeSimulator
            mockTime={mockTime}
            currentTime={currentTime}
          />

          {/* Creador de Suscripciones */}
          <SubscriptionCreator companies={companies} />
        </div>

        {/* Tabla de Suscripciones */}
        <div className="mb-6">
          <h2 className="text-2xl font-semibold mb-4">Suscripciones de Prueba</h2>
          <TestSubscriptionsTable
            subscriptions={subscriptions}
            currentTime={currentTime}
          />
        </div>

        {/* Enlaces rápidos */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-3">Enlaces Rápidos</h3>
          <div className="flex flex-wrap gap-3">
            <a
              href="/settings/mock-emails"
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              📧 Ver Emails Mockeados
            </a>
            <a
              href="/settings"
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              ⚙️ Configuración General
            </a>
            <a
              href="/subscriptions"
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              💳 Página Suscripciones (vista usuario)
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
