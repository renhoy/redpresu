"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, CreditCard, Zap, Crown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  createCheckoutSession,
  createPortalSession,
} from "@/app/actions/subscriptions";
import { formatPrice, type PlanType } from "@/lib/stripe";
import type { Subscription } from "@/lib/types/database";
import type { SubscriptionPlan } from "@/lib/helpers/config-helpers";

interface SubscriptionsClientProps {
  currentSubscription: Subscription;
  userRole: string;
  plans: Record<PlanType, SubscriptionPlan>;
}

export function SubscriptionsClient({
  currentSubscription,
  userRole,
  plans: plansConfig,
}: SubscriptionsClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<PlanType | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  // Convertir Record a Array para mapear
  const plans = Object.values(plansConfig);
  const currentPlan = currentSubscription.plan;

  async function handleSelectPlan(planId: PlanType) {
    if (planId === "free") {
      toast.error("Para cancelar tu suscripción, usa el portal de cliente");
      return;
    }

    setLoading(planId);

    const result = await createCheckoutSession({
      planId,
      successUrl: `${window.location.origin}/subscriptions?success=true`,
      cancelUrl: `${window.location.origin}/subscriptions?canceled=true`,
    });

    if (result.success && result.data) {
      // Redirigir a Stripe Checkout
      window.location.href = result.data.url;
    } else {
      toast.error(result.error || "Error al crear sesión de pago");
      setLoading(null);
    }
  }

  async function handleManageSubscription() {
    setPortalLoading(true);

    const result = await createPortalSession({
      returnUrl: `${window.location.origin}/subscriptions`,
    });

    if (result.success && result.data) {
      window.location.href = result.data.url;
    } else {
      toast.error(result.error || "Error al abrir portal");
      setPortalLoading(false);
    }
  }

  function getPlanIcon(planId: PlanType) {
    switch (planId) {
      case "free":
        return <Check className="w-6 h-6" />;
      case "pro":
        return <Zap className="w-6 h-6" />;
      case "enterprise":
        return <Crown className="w-6 h-6" />;
    }
  }

  function getPlanColor(planId: PlanType) {
    switch (planId) {
      case "free":
        return "border-gray-200";
      case "pro":
        return "border-lime-500 ring-2 ring-lime-500";
      case "enterprise":
        return "border-yellow-500";
    }
  }

  // Convertir objeto de features a array de strings para mostrar
  function getFeaturesArray(plan: SubscriptionPlan): string[] {
    const features = plan.features;

    // Si features ya es un array, devolverlo directamente
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
    if (features.custom_templates) {
      featuresArray.push("Plantillas personalizadas");
    }
    if (features.priority_support) {
      featuresArray.push("Soporte prioritario");
    }
    if (features.remove_watermark) {
      featuresArray.push("Sin marca de agua");
    }
    if (features.multi_company) {
      featuresArray.push("Multi-empresa");
    }
    if (features.api_access) {
      featuresArray.push("Acceso API");
    }
    if (features.custom_branding) {
      featuresArray.push("Branding completo");
    }

    return featuresArray;
  }

  return (
    <div className="min-h-screen bg-lime-50">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-black flex items-center gap-2">
            <CreditCard className="h-6 w-6" />
            Suscripciones
          </h1>

          <p className="text-sm">Gestiona tu plan de suscripción y límites</p>
        </div>

        {/* Plan Actual */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Plan Actual</CardTitle>
            <CardDescription>
              Estás en el plan{" "}
              <span className="font-semibold text-lime-700">
                {currentPlan.toUpperCase()}
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Badge
                variant={
                  currentSubscription.status === "active"
                    ? "default"
                    : "destructive"
                }
              >
                {currentSubscription.status}
              </Badge>

              {currentSubscription.current_period_end && (
                <p className="text-sm text-gray-600">
                  Renueva el{" "}
                  {new Date(
                    currentSubscription.current_period_end
                  ).toLocaleDateString("es-ES")}
                </p>
              )}

              {currentSubscription.cancel_at_period_end && (
                <Badge variant="outline" className="bg-yellow-50">
                  Se cancelará al final del periodo
                </Badge>
              )}
            </div>
          </CardContent>
          {currentPlan !== "free" && (
            <CardFooter>
              <Button
                variant="outline"
                onClick={handleManageSubscription}
                disabled={portalLoading}
              >
                {portalLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Cargando...
                  </>
                ) : (
                  "Gestionar Suscripción"
                )}
              </Button>
            </CardFooter>
          )}
        </Card>

        {/* Planes Disponibles */}
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Planes Disponibles
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const isCurrent = plan.id === currentPlan;
            const isLoadingThis = loading === plan.id;

            return (
              <Card
                key={plan.id}
                className={`relative ${getPlanColor(plan.id)} ${
                  plan.id === "pro" ? "shadow-lg" : ""
                }`}
              >
                {plan.id === "pro" && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-lime-600">Más Popular</Badge>
                  </div>
                )}

                <CardHeader>
                  <div className="flex items-center gap-2 mb-2">
                    {getPlanIcon(plan.id)}
                    <CardTitle className="text-xl">{plan.name}</CardTitle>
                  </div>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="mt-4">
                    <span className="text-3xl font-bold">
                      {formatPrice(plan.price)}
                    </span>
                  </div>
                </CardHeader>

                <CardContent>
                  <ul className="space-y-2">
                    {getFeaturesArray(plan).map((feature, index) => (
                      <li
                        key={index}
                        className="flex items-start gap-2 text-sm"
                      >
                        <Check className="w-4 h-4 text-lime-600 flex-shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>

                <CardFooter>
                  {isCurrent ? (
                    <Button disabled className="w-full">
                      Plan Actual
                    </Button>
                  ) : (
                    <Button
                      onClick={() => handleSelectPlan(plan.id)}
                      disabled={isLoadingThis || plan.id === "free"}
                      className="w-full"
                      variant={plan.id === "pro" ? "default" : "outline"}
                    >
                      {isLoadingThis ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Procesando...
                        </>
                      ) : plan.id === "free" ? (
                        "Plan Gratuito"
                      ) : (
                        `Cambiar a ${plan.name}`
                      )}
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>

        {/* Información adicional */}
        <div className="mt-8 p-4 bg-lime-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-gray-700">
            💡 <strong>Nota:</strong> Los cambios de plan se aplicarán
            inmediatamente. Si cambias de un plan superior a uno inferior, los
            cambios se aplicarán al final del periodo de facturación actual.
          </p>
        </div>
      </div>
    </div>
  );
}
