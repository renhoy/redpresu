import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth/server";
import { getAllConfig } from "@/app/actions/config";
import { ConfigTable } from "@/components/settings/ConfigTable";
import { Settings, Shield } from "lucide-react";
import { generatePageMetadata } from "@/lib/helpers/metadata-helpers";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export async function generateMetadata() {
  return generatePageMetadata(
    "Configuración del Sistema",
    "Configuración global del sistema (solo superadmin)"
  );
}

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

  // Definir categorías personalizadas con orden específico
  const categoryDefinitions = [
    {
      name: "General",
      keys: [
        "app_mode",
        "app_name",
        "contact_notification_emails",
        "default_empresa_id",
        "forms_legal_notice",
        "invitation_email_template",
        "invitation_token_expiration_days",
        "legal_page_content",
        "multiempresa",
        "public_registration_enabled",
      ],
    },
    {
      name: "PDF",
      keys: ["pdf_templates", "rapid_pdf_mode"],
    },
    {
      name: "Suscripciones",
      keys: ["subscription_plans", "subscriptions_enabled"],
    },
    {
      name: "Tarifas",
      keys: ["default_tariff", "iva_re_equivalences"],
    },
  ];

  // Crear mapa de configuraciones por key para acceso rápido
  const configMap = config.reduce((acc, item) => {
    acc[item.key] = item;
    return acc;
  }, {} as Record<string, (typeof config)[0]>);

  // Organizar configuraciones según categorías definidas
  const organizedCategories = categoryDefinitions
    .map((category) => {
      // Filtrar y ordenar alfabéticamente las claves que existen
      const items = category.keys
        .filter((key) => configMap[key]) // Solo claves que existen en BD
        .sort() // Orden alfabético
        .map((key) => configMap[key]);

      return {
        name: category.name,
        items,
      };
    })
    .filter((category) => category.items.length > 0); // Solo categorías con items

  return (
    <div className="min-h-screen bg-lime-50">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6 text-center md:text-left">
          <h1 className="text-3xl font-bold flex items-center justify-center md:justify-start gap-2">
            <Settings className="h-6 w-6" />
            Configuración del Sistema
          </h1>
          <p className="text-sm">
            Gestión de configuración global (solo superadmin)
          </p>
        </div>

        {/* Acceso rápido a Business Rules */}
        <div className="mb-8">
          <Link href="/settings/business-rules">
            <Button className="w-full md:w-auto" size="lg">
              <Shield className="mr-2 h-5 w-5" />
              Reglas de Negocio
            </Button>
          </Link>
        </div>

        {/* Configuración por categorías personalizadas */}
        <div className="space-y-8">
          {organizedCategories.map((category) => (
            <div key={category.name} className="space-y-4">
              <h2 className="text-2xl font-semibold">{category.name}</h2>
              <ConfigTable config={category.items} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
