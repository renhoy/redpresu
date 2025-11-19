import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth/server";
import { getAllConfig } from "@/app/actions/config";
import { ConfigTable } from "@/components/settings/ConfigTable";
import { Settings, Shield, ArrowLeft } from "lucide-react";
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
      name: "Aplicación",
      description: "Configuración general de la aplicación",
      keys: [
        "app_name",
        "app_mode",
        "multiempresa",
        "public_registration_enabled",
        "registration_requires_approval",
      ],
    },
    {
      name: "Suscripciones y Pagos",
      description: "Configuración de Stripe y planes de suscripción",
      keys: [
        "subscriptions_enabled",
        "subscription_plans",
        "subscription_grace_period_days",
      ],
    },
    {
      name: "Usuarios e Invitaciones",
      description: "Gestión de usuarios y sistema de invitaciones",
      keys: [
        "default_empresa_id",
        "invitation_email_template",
        "invitation_token_expiration_days",
      ],
    },
    {
      name: "Tarifas y Presupuestos",
      description: "Configuración de tarifas, IVA y RE",
      keys: ["default_tariff", "iva_re_equivalences"],
    },
    {
      name: "PDF",
      description: "Plantillas y generación de PDFs",
      keys: ["pdf_templates", "rapid_pdf_mode"],
    },
    {
      name: "Contacto y Legal",
      description: "Formularios de contacto y contenidos legales",
      keys: [
        "contact_notification_emails",
        "forms_legal_notice",
        "legal_page_content",
      ],
    },
  ];

  // Crear mapa de configuraciones por key para acceso rápido
  const configMap = config.reduce((acc, item) => {
    acc[item.key] = item;
    return acc;
  }, {} as Record<string, (typeof config)[0]>);

  // Verificar si el registro público está habilitado
  const registrationEnabled = configMap['public_registration_enabled']?.value === true;

  // Organizar configuraciones según categorías definidas
  const organizedCategories = categoryDefinitions
    .map((category) => {
      // Filtrar claves según dependencias
      let filteredKeys = category.keys;

      // Si es la categoría Aplicación, filtrar registration_requires_approval según dependencia
      if (category.name === "Aplicación") {
        filteredKeys = category.keys.filter((key) => {
          // Mostrar registration_requires_approval solo si el registro está habilitado
          if (key === "registration_requires_approval") {
            return registrationEnabled;
          }
          return true;
        });
      }

      // Filtrar y ordenar alfabéticamente las claves que existen
      const items = filteredKeys
        .filter((key) => configMap[key]) // Solo claves que existen en BD
        .sort() // Orden alfabético
        .map((key) => configMap[key]);

      return {
        name: category.name,
        description: category.description,
        items,
      };
    })
    .filter((category) => category.items.length > 0); // Solo categorías con items

  return (
    <div className="min-h-screen bg-lime-50">
      <div className="container mx-auto px-4 py-6">
        {/* Header con botones */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
          <div className="text-center md:text-left w-full md:w-auto">
            <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
              <Link href="/dashboard">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Volver
                </Button>
              </Link>
            </div>
            <h1 className="text-3xl font-bold flex items-center justify-center md:justify-start gap-2">
              <Settings className="h-6 w-6" />
              Configuración del Sistema
            </h1>
            <p className="text-sm">
              Gestión de configuración global (solo superadmin)
            </p>
          </div>
          <div className="flex flex-wrap gap-2 justify-center md:justify-end w-full md:w-auto">
            <Link href="/settings/business-rules">
              <Button className="bg-lime-500 hover:bg-lime-600">
                <Shield className="mr-2 h-5 w-5" />
                Reglas de Negocio
              </Button>
            </Link>
          </div>
        </div>

        {/* Configuración por categorías personalizadas */}
        <div className="space-y-8">
          {organizedCategories.map((category) => (
            <div key={category.name} className="space-y-4">
              <div>
                <h2 className="text-2xl font-semibold">{category.name}</h2>
                {category.description && (
                  <p className="text-sm text-gray-600 mt-1">
                    {category.description}
                  </p>
                )}
              </div>
              <ConfigTable config={category.items} />
            </div>
          ))}
        </div>

        {/* Botón volver (inferior) */}
        <div className="flex justify-center pt-8">
          <Link href="/dashboard">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
