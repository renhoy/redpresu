"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  expireSubscription,
  extendSubscription,
  deleteTestSubscription,
  updateTestSubscription,
} from "@/app/actions/testing/subscriptions-testing";
import { toast } from "sonner";
import { Trash2, FastForward, AlertCircle, Building2 } from "lucide-react";
import { useRouter } from "next/navigation";
import type { Subscription } from "@/lib/types/database";

interface TestSubscriptionCardProps {
  subscription: Subscription & { company_name?: string };
  currentTime: string;
}

export function TestSubscriptionCard({ subscription: sub, currentTime }: TestSubscriptionCardProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  // Handlers
  async function handleExpire() {
    setIsLoading(true);

    try {
      const result = await expireSubscription(sub.id);

      if (result.success) {
        toast.success("Suscripción marcada como expirada");
        router.refresh();
      } else {
        toast.error(result.error || "Error al expirar");
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function handleExtend() {
    setIsLoading(true);

    try {
      const result = await extendSubscription(sub.id, 30);

      if (result.success) {
        toast.success("Suscripción extendida 30 días");
        router.refresh();
      } else {
        toast.error(result.error || "Error al extender");
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm("¿Convertir esta suscripción a plan FREE? Se eliminarán los datos de Stripe y pasará a plan gratuito.")) {
      return;
    }

    setIsLoading(true);

    try {
      const result = await deleteTestSubscription(sub.id);

      if (result.success) {
        toast.success("Suscripción convertida a plan FREE");
        router.refresh();
      } else {
        toast.error(result.error || "Error al procesar");
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function handleStatusChange(newStatus: string) {
    setIsLoading(true);

    try {
      const result = await updateTestSubscription({
        subscriptionId: sub.id,
        status: newStatus as 'active' | 'canceled' | 'past_due' | 'trialing' | 'inactive',
      });

      if (result.success) {
        toast.success(`Estado actualizado a ${newStatus}`);
        router.refresh();
      } else {
        toast.error(result.error || "Error al actualizar estado");
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function handlePlanChange(newPlan: string) {
    setIsLoading(true);

    try {
      const result = await updateTestSubscription({
        subscriptionId: sub.id,
        plan: newPlan as 'free' | 'pro' | 'enterprise',
      });

      if (result.success) {
        toast.success(`Plan actualizado a ${newPlan.toUpperCase()}`);
        router.refresh();
      } else {
        toast.error(result.error || "Error al actualizar plan");
      }
    } finally {
      setIsLoading(false);
    }
  }

  // Helper: Calcular estado de expiración
  function getExpirationStatus() {
    if (sub.plan === 'free') {
      return { text: 'Nunca expira', color: 'text-gray-600' };
    }

    if (!sub.current_period_end) {
      return { text: 'Sin fecha fin', color: 'text-gray-600' };
    }

    const endDate = new Date(sub.current_period_end);
    const now = new Date(currentTime);
    const diffMs = endDate.getTime() - now.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return {
        text: `Expirada hace ${Math.abs(diffDays)} días`,
        color: 'text-red-600',
      };
    } else if (diffDays === 0) {
      return { text: 'Expira hoy', color: 'text-orange-600' };
    } else if (diffDays <= 7) {
      return { text: `Expira en ${diffDays} días`, color: 'text-orange-600' };
    } else {
      return { text: `Expira en ${diffDays} días`, color: 'text-green-600' };
    }
  }

  const statusColors = {
    active: "bg-green-100 text-green-800",
    inactive: "bg-red-100 text-red-800",
    canceled: "bg-gray-200 text-gray-700",
    past_due: "bg-yellow-100 text-yellow-800",
    trialing: "bg-blue-100 text-blue-800",
  };

  const planColors = {
    free: "bg-gray-100 text-gray-800",
    pro: "bg-lime-100 text-lime-800",
    enterprise: "bg-yellow-100 text-yellow-800",
  };

  const expirationStatus = getExpirationStatus();

  return (
    <Card className="w-full mb-4">
      <CardContent className="p-3">
        {/* Vista Mobile: Layout vertical */}
        <div className="md:hidden space-y-3">
          {/* Header: Empresa */}
          <div className="flex items-start gap-2">
            <Building2 className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-base truncate">
                {sub.company_name || `Empresa ${sub.company_id}`}
              </h3>
              <p className="text-xs text-muted-foreground">ID: {sub.company_id}</p>
            </div>
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-2 border-t pt-3">
            {/* Plan */}
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground mb-1">Plan</p>
              <Select
                value={sub.plan}
                onValueChange={handlePlanChange}
                disabled={isLoading}
              >
                <SelectTrigger className="w-full h-7 text-xs">
                  <SelectValue>
                    <Badge className={planColors[sub.plan as keyof typeof planColors]}>
                      {sub.plan.toUpperCase()}
                    </Badge>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">
                    <Badge className="bg-gray-100 text-gray-800">FREE</Badge>
                  </SelectItem>
                  <SelectItem value="pro">
                    <Badge className="bg-lime-100 text-lime-800">PRO</Badge>
                  </SelectItem>
                  <SelectItem value="enterprise">
                    <Badge className="bg-yellow-100 text-yellow-800">ENTERPRISE</Badge>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Estado */}
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground mb-1">Estado</p>
              <Select
                value={sub.status}
                onValueChange={handleStatusChange}
                disabled={isLoading}
              >
                <SelectTrigger className="w-full h-7 text-xs">
                  <SelectValue>
                    <Badge className={statusColors[sub.status as keyof typeof statusColors]}>
                      {sub.status === 'active' ? 'Activa' :
                       sub.status === 'inactive' ? 'Inactiva' :
                       sub.status === 'canceled' ? 'Cancelada' :
                       sub.status === 'past_due' ? 'Pago Atrasado' :
                       sub.status === 'trialing' ? 'Prueba' : sub.status}
                    </Badge>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">
                    <Badge className="bg-green-100 text-green-800">Activa</Badge>
                  </SelectItem>
                  <SelectItem value="inactive">
                    <Badge className="bg-red-100 text-red-800">Inactiva</Badge>
                  </SelectItem>
                  <SelectItem value="canceled">
                    <Badge className="bg-gray-200 text-gray-700">Cancelada</Badge>
                  </SelectItem>
                  <SelectItem value="past_due">
                    <Badge className="bg-yellow-100 text-yellow-800">Pago Atrasado</Badge>
                  </SelectItem>
                  <SelectItem value="trialing">
                    <Badge className="bg-blue-100 text-blue-800">Prueba</Badge>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Fecha Fin */}
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground mb-1">Fecha Fin</p>
              <div className="text-sm font-medium">
                {sub.current_period_end ? (
                  <span className="font-mono text-xs">
                    {new Date(sub.current_period_end).toLocaleDateString("es-ES", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })}
                  </span>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </div>
            </div>

            {/* Estado Expiración */}
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground mb-1">Expiración</p>
              <div className={`text-xs font-medium ${expirationStatus.color}`}>
                {expirationStatus.text}
              </div>
            </div>
          </div>

          {/* Acciones Mobile */}
          <div className="flex justify-end flex-wrap gap-1.5 border-t pt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExpire}
              disabled={isLoading || sub.plan === 'free'}
              title="Expirar"
              className="border-lime-500 text-lime-600 hover:bg-lime-500 hover:text-white min-w-[20%] h-7 px-2 gap-1.5 text-xs"
            >
              <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
              <span>Expirar</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExtend}
              disabled={isLoading || sub.plan === 'free'}
              title="Extender"
              className="border-lime-500 text-lime-600 hover:bg-lime-500 hover:text-white min-w-[20%] h-7 px-2 gap-1.5 text-xs"
            >
              <FastForward className="h-3.5 w-3.5 flex-shrink-0" />
              <span>+30d</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleDelete}
              disabled={isLoading || sub.plan === 'free'}
              title={sub.plan === 'free' ? 'El plan FREE no se puede eliminar' : 'Convertir a FREE'}
              className="border-red-500 text-red-600 hover:bg-red-500 hover:text-white min-w-[20%] h-7 px-2 gap-1.5 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 className="h-3.5 w-3.5 flex-shrink-0" />
              <span>Borrar</span>
            </Button>
          </div>
        </div>

        {/* Vista Tablet: Layout horizontal 2 columnas */}
        <div className="hidden md:block lg:hidden space-y-3">
          {/* Fila 1: Empresa + Plan/Estado */}
          <div className="grid grid-cols-[1fr_auto] gap-4 items-start">
            {/* Columna 1: Empresa */}
            <div className="space-y-1">
              <h3 className="font-semibold text-base truncate">
                {sub.company_name || `Empresa ${sub.company_id}`}
              </h3>
              <p className="text-xs text-muted-foreground">ID: {sub.company_id}</p>
            </div>

            {/* Columna 2: Plan y Estado */}
            <div className="space-y-1">
              <Select
                value={sub.plan}
                onValueChange={handlePlanChange}
                disabled={isLoading}
              >
                <SelectTrigger className="w-auto h-7 text-xs">
                  <SelectValue>
                    <Badge className={planColors[sub.plan as keyof typeof planColors]}>
                      {sub.plan.toUpperCase()}
                    </Badge>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">
                    <Badge className="bg-gray-100 text-gray-800">FREE</Badge>
                  </SelectItem>
                  <SelectItem value="pro">
                    <Badge className="bg-lime-100 text-lime-800">PRO</Badge>
                  </SelectItem>
                  <SelectItem value="enterprise">
                    <Badge className="bg-yellow-100 text-yellow-800">ENTERPRISE</Badge>
                  </SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={sub.status}
                onValueChange={handleStatusChange}
                disabled={isLoading}
              >
                <SelectTrigger className="w-auto h-7 text-xs">
                  <SelectValue>
                    <Badge className={statusColors[sub.status as keyof typeof statusColors]}>
                      {sub.status === 'active' ? 'Activa' :
                       sub.status === 'inactive' ? 'Inactiva' :
                       sub.status === 'canceled' ? 'Cancelada' :
                       sub.status === 'past_due' ? 'Pago Atrasado' :
                       sub.status === 'trialing' ? 'Prueba' : sub.status}
                    </Badge>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">
                    <Badge className="bg-green-100 text-green-800">Activa</Badge>
                  </SelectItem>
                  <SelectItem value="inactive">
                    <Badge className="bg-red-100 text-red-800">Inactiva</Badge>
                  </SelectItem>
                  <SelectItem value="canceled">
                    <Badge className="bg-gray-200 text-gray-700">Cancelada</Badge>
                  </SelectItem>
                  <SelectItem value="past_due">
                    <Badge className="bg-yellow-100 text-yellow-800">Pago Atrasado</Badge>
                  </SelectItem>
                  <SelectItem value="trialing">
                    <Badge className="bg-blue-100 text-blue-800">Prueba</Badge>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Fila 2: Info adicional */}
          <div className="grid grid-cols-2 gap-4 text-sm border-t pt-3">
            <div>
              <p className="text-xs text-muted-foreground">Fecha Fin</p>
              <div className="font-medium">
                {sub.current_period_end ? (
                  <span className="font-mono text-sm">
                    {new Date(sub.current_period_end).toLocaleDateString("es-ES", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })}
                  </span>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Estado Expiración</p>
              <div className={`text-sm font-medium ${expirationStatus.color}`}>
                {expirationStatus.text}
              </div>
            </div>
          </div>

          {/* Acciones Tablet */}
          <div className="flex flex-wrap justify-end gap-1.5 border-t pt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExpire}
              disabled={isLoading || sub.plan === 'free'}
              title="Expirar"
              className="border-lime-500 text-lime-600 hover:bg-lime-500 hover:text-white min-w-[20%] h-7 px-2 gap-1.5 text-xs"
            >
              <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
              <span>Expirar</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExtend}
              disabled={isLoading || sub.plan === 'free'}
              title="Extender"
              className="border-lime-500 text-lime-600 hover:bg-lime-500 hover:text-white min-w-[20%] h-7 px-2 gap-1.5 text-xs"
            >
              <FastForward className="h-3.5 w-3.5 flex-shrink-0" />
              <span>+30 días</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleDelete}
              disabled={isLoading || sub.plan === 'free'}
              title={sub.plan === 'free' ? 'El plan FREE no se puede eliminar' : 'Convertir a FREE'}
              className="border-red-500 text-red-600 hover:bg-red-500 hover:text-white min-w-[20%] h-7 px-2 gap-1.5 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 className="h-3.5 w-3.5 flex-shrink-0" />
              <span>Borrar</span>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
