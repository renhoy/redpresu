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
  expireSubscription,
  extendSubscription,
  deleteTestSubscription,
} from "@/app/actions/testing/subscriptions-testing";
import { toast } from "sonner";
import { Trash2, FastForward, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import type { Subscription } from "@/lib/types/database";

interface TestSubscriptionsTableProps {
  subscriptions: Subscription[];
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

  // Helper: Status badge
  function getStatusBadge(status: string) {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; text: string }> = {
      active: { variant: 'default', text: 'Activa' },
      canceled: { variant: 'destructive', text: 'Cancelada' },
      past_due: { variant: 'outline', text: 'Pago Atrasado' },
      trialing: { variant: 'secondary', text: 'Prueba' },
    };

    const config = variants[status] || { variant: 'secondary' as const, text: status };

    return (
      <Badge variant={config.variant}>
        {config.text}
      </Badge>
    );
  }

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
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Empresa ID</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Fecha Fin</TableHead>
              <TableHead>Estado Expiración</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {subscriptions.map((sub) => {
              const expirationStatus = getExpirationStatus(sub);
              const isLoading = loadingId === sub.id;

              return (
                <TableRow key={sub.id}>
                  {/* Empresa ID */}
                  <TableCell className="font-mono text-sm">
                    {sub.company_id}
                  </TableCell>

                  {/* Plan */}
                  <TableCell>
                    <Badge variant="outline" className="uppercase">
                      {sub.plan}
                    </Badge>
                  </TableCell>

                  {/* Estado */}
                  <TableCell>
                    {getStatusBadge(sub.status)}
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
                    <div className="flex items-center justify-end gap-1">
                      {/* Expirar ahora */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleExpire(sub.id)}
                        disabled={isLoading || sub.plan === 'free'}
                        title="Marcar como expirada (hace 10 días)"
                      >
                        <AlertCircle className="h-4 w-4" />
                      </Button>

                      {/* Extender 30 días */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleExtend(sub.id, 30)}
                        disabled={isLoading || sub.plan === 'free'}
                        title="Extender 30 días"
                      >
                        <FastForward className="h-4 w-4" />
                      </Button>

                      {/* Eliminar */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(sub.id)}
                        disabled={isLoading}
                        title="Eliminar"
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
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
  );
}
