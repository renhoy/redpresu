import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth/server";
import { getAllConfig } from "@/app/actions/config";
import { ConfigTable } from "@/components/settings/ConfigTable";
import { Settings } from "lucide-react";

export const metadata = {
  title: "Configuración del Sistema - Respresu",
  description: "Configuración global del sistema (solo superadmin)",
};

export default async function SettingsPage() {
  // Verificar autenticación y rol
  const user = await getServerUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "superadmin") {
    redirect("/dashboard");
  }

  // Cargar configuración
  const result = await getAllConfig();

  if (!result.success) {
    return (
      <div className="container mx-auto py-10">
        <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded">
          {result.error}
        </div>
      </div>
    );
  }

  const config = result.data || [];

  // Agrupar por categoría
  const configByCategory = config.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, typeof config>);

  return (
    <div className="min-h-screen bg-lime-50">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Settings className="h-6 w-6" />
            Configuración del Sistema
          </h1>
          <p className="text-sm">
            Gestión de configuración global (solo superadmin)
          </p>
        </div>

        {/* Configuración por categorías */}
        <div className="space-y-8">
          {Object.entries(configByCategory).map(([category, items]) => (
            <div key={category} className="space-y-4">
              <h2 className="text-2xl font-semibold capitalize">{category}</h2>
              <ConfigTable config={items} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
