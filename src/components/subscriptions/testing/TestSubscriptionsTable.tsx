"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Trash2, FastForward, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import type { Subscription } from "@/lib/types/database";
import { TestSubscriptionCard } from "./TestSubscriptionCard";

interface TestSubscriptionsTableProps {
  subscriptions: Array<Subscription & { company_name?: string }>;
  currentTime: string;
}

export function TestSubscriptionsTable({ subscriptions, currentTime }: TestSubscriptionsTableProps) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  // Handlers
  async function handleExpire(subscriptionId: string) {
    setLoadingId(subscriptionId);

    try {
      const result = await expireSubscription(subscriptionId);

      if (result.success) {
        toast.success("Suscripción marcada como expirada");
        router.refresh();
      } else {
        toast.error(result.error || "Error al expirar");
      }
    } finally {
      setLoadingId(null);
    }
  }

  async function handleExtend(subscriptionId: string, days: number) {
    setLoadingId(subscriptionId);

    try {
      const result = await extendSubscription(subscriptionId, days);

      if (result.success) {
        toast.success(`Suscripción extendida ${days} días`);
        router.refresh();
      } else {
        toast.error(result.error || "Error al extender");
      }
    } finally {
      setLoadingId(null);
    }
  }

  async function handleDelete(subscriptionId: string) {
    if (!confirm("¿Eliminar esta suscripción de prueba?")) {
      return;
    }

    setLoadingId(subscriptionId);

    try {
      const result = await deleteTestSubscription(subscriptionId);

      if (result.success) {
        toast.success("Suscripción eliminada");
        router.refresh();
      } else {
        toast.error(result.error || "Error al eliminar");
      }
    } finally {
      setLoadingId(null);
    }
  }

  async function handleStatusChange(subscriptionId: string, newStatus: string) {
    setLoadingId(subscriptionId);

    try {
      const result = await updateTestSubscription({
        subscriptionId,
        status: newStatus as 'active' | 'canceled' | 'past_due' | 'trialing' | 'inactive',
      });

      if (result.success) {
        toast.success(`Estado actualizado a ${newStatus}`);
        router.refresh();
      } else {
        toast.error(result.error || "Error al actualizar estado");
      }
    } finally {
      setLoadingId(null);
    }
  }

  async function handlePlanChange(subscriptionId: string, newPlan: string) {
    setLoadingId(subscriptionId);

    try {
      const result = await updateTestSubscription({
        subscriptionId,
        plan: newPlan as 'free' | 'pro' | 'enterprise',
      });

      if (result.success) {
        toast.success(`Plan actualizado a ${newPlan.toUpperCase()}`);
        router.refresh();
      } else {
        toast.error(result.error || "Error al actualizar plan");
      }
    } finally {
      setLoadingId(null);
    }
  }

  // Helper: Calcular estado de expiración
  function getExpirationStatus(sub: Subscription) {
    if (sub.plan === 'free') {
      return { text: 'Nunca expira', color: 'text-gray-600', variant: 'secondary' as const };
    }

    if (!sub.current_period_end) {
      return { text: 'Sin fecha fin', color: 'text-gray-600', variant: 'secondary' as const };
    }

    const endDate = new Date(sub.current_period_end);
    const now = new Date(currentTime);
    const diffMs = endDate.getTime() - now.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return {
        text: `Expirada hace ${Math.abs(diffDays)} días`,
        color: 'text-red-600',
        variant: 'destructive' as const,
      };
    } else if (diffDays === 0) {
      return { text: 'Expira hoy', color: 'text-orange-600', variant: 'default' as const };
    } else if (diffDays <= 7) {
      return { text: `Expira en ${diffDays} días`, color: 'text-orange-600', variant: 'default' as const };
    } else {
      return { text: `Expira en ${diffDays} días`, color: 'text-green-600', variant: 'outline' as const };
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

  // Sin suscripciones
  if (subscriptions.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center text-muted-foreground">
        <p>No hay suscripciones de prueba.</p>
        <p className="text-sm mt-2">Crea una usando el formulario de arriba.</p>
      </div>
    );
  }

  return (
    <>
      {/* Vista Mobile/Tablet - Cards */}
      <div className="lg:hidden space-y-4">
        {subscriptions.map((sub) => (
          <TestSubscriptionCard
            key={sub.id}
            subscription={sub}
            currentTime={currentTime}
            onRefresh={() => router.refresh()}
          />
        ))}
      </div>

      {/* Vista Desktop - Table */}
      <div className="hidden lg:block bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-indigo-50">
              <TableRow>
                <TableHead className="min-w-[150px]">Empresa</TableHead>
                <TableHead className="min-w-[120px]">Plan</TableHead>
                <TableHead className="min-w-[140px]">Estado</TableHead>
                <TableHead className="min-w-[100px]">Fecha Fin</TableHead>
                <TableHead className="min-w-[150px]">Estado Expiración</TableHead>
                <TableHead className="text-right min-w-[180px]">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subscriptions.map((sub) => {
                const expirationStatus = getExpirationStatus(sub);
                const isLoading = loadingId === sub.id;

                return (
                  <TableRow key={sub.id} className="bg-white border-t hover:bg-lime-100/100">
                    {/* Empresa */}
                    <TableCell className="font-medium">
                      <div className="flex flex-col">
                        <span className="text-sm">{sub.company_name || `Empresa ${sub.company_id}`}</span>
                        <span className="text-xs text-muted-foreground">({sub.company_id})</span>
                      </div>
                    </TableCell>

                    {/* Plan - Selector */}
                    <TableCell>
                      <Select
                        value={sub.plan}
                        onValueChange={(value) => handlePlanChange(sub.id, value)}
                        disabled={isLoading}
                      >
                        <SelectTrigger className="w-[120px] bg-white">
                          <SelectValue>
                            <Badge className={planColors[sub.plan as keyof typeof planColors] || "bg-gray-200 text-gray-700"}>
                              {sub.plan.toUpperCase()}
                            </Badge>
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="bg-white">
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
                    </TableCell>

                    {/* Estado - Selector */}
                    <TableCell>
                      <Select
                        value={sub.status}
                        onValueChange={(value) => handleStatusChange(sub.id, value)}
                        disabled={isLoading}
                      >
                        <SelectTrigger className="w-[140px] bg-white">
                          <SelectValue>
                            <Badge className={statusColors[sub.status as keyof typeof statusColors] || "bg-gray-200 text-gray-700"}>
                              {sub.status === 'active' ? 'Activa' :
                               sub.status === 'inactive' ? 'Inactiva' :
                               sub.status === 'canceled' ? 'Cancelada' :
                               sub.status === 'past_due' ? 'Pago Atrasado' :
                               sub.status === 'trialing' ? 'Prueba' : sub.status}
                            </Badge>
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="bg-white">
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
                    </TableCell>

                    {/* Fecha Fin */}
                    <TableCell className="text-sm">
                      {sub.current_period_end ? (
                        <span className="font-mono">
                          {new Date(sub.current_period_end).toLocaleDateString("es-ES", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                          })}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>

                    {/* Estado Expiración */}
                    <TableCell>
                      <span className={`text-sm font-medium ${expirationStatus.color}`}>
                        {expirationStatus.text}
                      </span>
                    </TableCell>

                    {/* Acciones */}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1 flex-wrap">
                        {/* Expirar ahora */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleExpire(sub.id)}
                          disabled={isLoading || sub.plan === 'free'}
                          title="Marcar como expirada (hace 10 días)"
                          className="border-lime-500 text-lime-600 hover:bg-lime-500 hover:text-white h-9 px-2 min-w-[44px] touch-manipulation"
                        >
                          <AlertCircle className="h-4 w-4" />
                        </Button>

                        {/* Extender 30 días */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleExtend(sub.id, 30)}
                          disabled={isLoading || sub.plan === 'free'}
                          title="Extender 30 días"
                          className="border-lime-500 text-lime-600 hover:bg-lime-500 hover:text-white h-9 px-2 min-w-[44px] touch-manipulation"
                        >
                          <FastForward className="h-4 w-4" />
                        </Button>

                        {/* Eliminar */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(sub.id)}
                          disabled={isLoading}
                          title="Eliminar"
                          className="border-red-500 text-red-600 hover:bg-red-500 hover:text-white h-9 px-2 min-w-[44px] touch-manipulation"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Leyenda de acciones */}
        <div className="border-t p-4 bg-slate-50">
          <p className="text-xs text-muted-foreground mb-2">Acciones rápidas:</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-3 w-3" />
              <span>Expirar ahora (hace 10 días)</span>
            </div>
            <div className="flex items-center gap-2">
              <FastForward className="h-3 w-3" />
              <span>Extender 30 días desde fecha fin</span>
            </div>
            <div className="flex items-center gap-2">
              <Trash2 className="h-3 w-3" />
              <span>Eliminar suscripción de prueba</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
