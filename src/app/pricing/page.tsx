import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Header } from "@/components/layout/Header";
import {
  getAppName,
  getSubscriptionPlansFromConfig,
} from "@/lib/helpers/config-helpers";

export async function generateMetadata() {
  const appName = await getAppName();
  return {
    title: `Precios - ${appName}`,
    description: "Elige el plan que mejor se adapte a tus necesidades",
  };
}

export default async function PricingPage() {
  const plansConfig = await getSubscriptionPlansFromConfig(true); // Incluir plan free
  const plans = Object.values(plansConfig).sort((a, b) => a.position - b.position); // Ordenar por position
  const appName = await getAppName();

  // Helper para convertir features objeto a array
  function getFeaturesArray(plan: typeof plans[0]): string[] {
    const features = plan.features;

    // Si ya es array, devolverlo directamente
    if (Array.isArray(features)) {
      return features;
    }

    // Convertir objeto a array de strings
    const featuresArray: string[] = [
      features.tariffs_limit,
      features.budgets_limit,
      features.users_limit,
      features.storage,
      features.support,
    ];

    // Añadir features booleanas si están activas
    if (features.custom_templates) featuresArray.push("Plantillas personalizadas");
    if (features.priority_support) featuresArray.push("Soporte prioritario");
    if (features.remove_watermark) featuresArray.push("Sin marca de agua");
    if (features.multi_company) featuresArray.push("Multi-empresa");
    if (features.api_access) featuresArray.push("Acceso API");
    if (features.custom_branding) featuresArray.push("Branding completo");

    return featuresArray;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header isAuthenticated={false} appName={appName} />

      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Planes y Precios
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Elige el plan que mejor se adapte a tus necesidades. Todos los planes incluyen acceso completo a la plataforma.
          </p>
        </div>

        {/* Planes */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan) => {
            const isPopular = plan.id === 'pro';
            const isFree = plan.id === 'free';

            return (
              <Card
                key={plan.id}
                className={`relative flex flex-col ${
                  isPopular
                    ? "border-lime-500 border-2 shadow-lg"
                    : "border-gray-200"
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="bg-lime-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                      Más Popular
                    </span>
                  </div>
                )}

                <CardHeader className="text-center pb-8">
                  <CardTitle className="text-2xl mb-2">{plan.name}</CardTitle>
                  <CardDescription className="text-base">
                    {plan.description}
                  </CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold text-gray-900">
                      {plan.price === 0 ? "Gratis" : `${plan.price}€`}
                    </span>
                    {plan.price > 0 && (
                      <span className="text-gray-600 ml-2">/mes</span>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="flex-1">
                  <ul className="space-y-3">
                    {getFeaturesArray(plan).map((feature, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <Check className="h-5 w-5 text-lime-500 shrink-0 mt-0.5" />
                        <span className="text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>

                <CardFooter>
                  <Link href="/register" className="w-full">
                    <Button
                      className={`w-full ${
                        isPopular
                          ? "bg-lime-500 hover:bg-lime-600"
                          : isFree
                          ? "bg-gray-600 hover:bg-gray-700"
                          : "bg-yellow-600 hover:bg-yellow-700"
                      }`}
                    >
                      {isFree ? "Comenzar Gratis" : "Comenzar Ahora"}
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            );
          })}
        </div>

        {/* FAQs / Información adicional */}
        <div className="mt-16 text-center">
          <p className="text-gray-600 mb-4">
            ¿Tienes dudas? <Link href="/login" className="text-lime-600 hover:text-lime-700 font-medium">Contáctanos</Link>
          </p>
          <p className="text-sm text-gray-500">
            Todos los precios son en euros (€) y no incluyen IVA. Puedes cancelar o cambiar tu plan en cualquier momento.
          </p>
        </div>
      </div>
    </div>
  );
}
