"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { updateMockTime, advanceMockTime } from "@/app/actions/testing/subscriptions-testing";
import { toast } from "sonner";
import { Clock, Calendar, FastForward, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";

interface TimeSimulatorProps {
  mockTime: string | null;
  currentTime: string;
}

export function TimeSimulator({ mockTime, currentTime }: TimeSimulatorProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [customDate, setCustomDate] = useState("");

  // Handlers
  async function handleSetMockTime() {
    if (!customDate) {
      toast.error("Selecciona una fecha");
      return;
    }

    setLoading(true);

    try {
      const result = await updateMockTime({ mockTime: new Date(customDate).toISOString() });

      if (result.success) {
        toast.success("Mock time actualizado");
        router.refresh();
      } else {
        toast.error(result.error || "Error al actualizar mock time");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleAdvanceDays(days: number) {
    setLoading(true);

    try {
      const result = await advanceMockTime(days);

      if (result.success) {
        toast.success(`Tiempo avanzado ${days} días`);
        router.refresh();
      } else {
        toast.error(result.error || "Error al avanzar tiempo");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleResetToReal() {
    setLoading(true);

    try {
      const result = await updateMockTime({ mockTime: null });

      if (result.success) {
        toast.success("Vuelto a tiempo real");
        router.refresh();
      } else {
        toast.error(result.error || "Error al resetear tiempo");
      }
    } finally {
      setLoading(false);
    }
  }

  // Estado actual
  const isMockActive = mockTime !== null;
  const displayTime = isMockActive ? mockTime : currentTime;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Simulador de Tiempo
        </CardTitle>
        <CardDescription>
          Manipula el tiempo para testear flujos de expiración
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Tiempo actual */}
        <div className="bg-slate-100 rounded p-3">
          <p className="text-sm text-muted-foreground mb-1">Tiempo Actual:</p>
          <p className="font-mono text-lg font-semibold">
            {new Date(displayTime).toLocaleString("es-ES", {
              dateStyle: "full",
              timeStyle: "short",
            })}
          </p>
          {isMockActive && (
            <p className="text-xs text-orange-600 mt-1">
              ⚠️ Mock time activo
            </p>
          )}
        </div>

        {/* Fecha personalizada */}
        <div className="space-y-2">
          <Label htmlFor="custom-date">Establecer Fecha/Hora</Label>
          <div className="flex gap-2">
            <Input
              id="custom-date"
              type="datetime-local"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              disabled={loading}
            />
            <Button
              onClick={handleSetMockTime}
              disabled={loading || !customDate}
              size="sm"
            >
              <Calendar className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Botones rápidos */}
        <div className="space-y-2">
          <Label>Avanzar Tiempo</Label>
          <div className="grid grid-cols-3 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAdvanceDays(1)}
              disabled={loading}
            >
              +1 día
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAdvanceDays(7)}
              disabled={loading}
            >
              +7 días
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAdvanceDays(30)}
              disabled={loading}
            >
              +30 días
            </Button>
          </div>
        </div>

        {/* Resetear */}
        {isMockActive && (
          <Button
            variant="destructive"
            className="w-full"
            onClick={handleResetToReal}
            disabled={loading}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Volver a Tiempo Real
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
