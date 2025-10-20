import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth/server";
import { Header } from "@/components/layout/Header";
import { TourDetector } from "@/components/help/TourDetector";
import { getCurrentSubscription } from "@/app/actions/subscriptions";
import { isMultiEmpresa } from "@/lib/helpers/app-mode";
import { createServerActionClient } from "@supabase/auth-helpers-nextjs";
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

  // Obtener suscripción actual
  const subscriptionResult = await getCurrentSubscription();
  const currentPlan = subscriptionResult.data?.plan || "free";

  // Obtener nombre de empresa/autónomo del emisor
  const cookieStore = await cookies();
  const supabase = createServerActionClient({ cookies: () => cookieStore });

  const { data: issuer } = await supabase
    .from("redpresu_issuers")
    .select("name, type")
    .eq("user_id", user.id)
    .single();

  // Nombre del emisor y tipo
  const companyName = issuer?.name || user.nombre;
  const issuerType = issuer?.type === "empresa" ? "Empresa" : "Autónomo";

  return (
    <div className="min-h-screen bg-background">
      <Header
        userRole={user.role}
        userName={user.nombre}
        companyName={companyName}
        issuerType={issuerType}
        currentPlan={currentPlan}
        multiempresa={multiempresa}
      />
      <TourDetector />
      <main>{children}</main>
    </div>
  );
}
