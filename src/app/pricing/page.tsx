import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { STRIPE_PLANS } from "@/lib/stripe";
import { Header } from "@/components/layout/Header";

export const metadata = {
  title: "Precios - Redpresu",
  description: "Elige el plan que mejor se adapte a tus necesidades",
};

export default function PricingPage() {
  const plans = Object.values(STRIPE_PLANS);

  return (
    <div className="min-h-screen bg-background">
      <Header isAuthenticated={false} />

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
                    {plan.features.map((feature, index) => (
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
