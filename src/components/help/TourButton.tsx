"use client";

import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";
import { setPendingTour, loadToursConfig, startTour } from "@/lib/helpers/tour-helpers";
import { useState } from "react";
import { toast } from "sonner";

interface TourButtonProps {
  tourId: string;
  targetPath?: string; // Ruta a la que redirigir (ej: "/tariffs/create")
}

export function TourButton({ tourId, targetPath }: TourButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleStartTour() {
    setLoading(true);

    try {
      // Verificar que el tour existe
      const toursData = await loadToursConfig();

      if (!toursData[tourId]) {
        toast.error(`Tour "${tourId}" no encontrado en la configuración`);
        setLoading(false);
        return;
      }

      // Si no hay targetPath, iniciar tour directamente (ya estamos en la página)
      if (!targetPath) {
        toast.info("Iniciando tour interactivo...");
        await startTour(tourId, toursData);
        setLoading(false);
        return;
      }

      // Si hay targetPath, guardar tour pendiente y redirigir
      setPendingTour(tourId);
      toast.info("Iniciando tour interactivo...");
      window.location.href = targetPath;
    } catch (error) {
      console.error("[TourButton] Error:", error);
      toast.error("Error al iniciar el tour");
      setLoading(false);
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleStartTour}
      disabled={loading}
      className="border-lime-500 text-lime-600 hover:bg-lime-50 h-8 px-3 gap-1.5"
    >
      <Play className="h-3.5 w-3.5" />
      <span className="text-xs font-medium">{loading ? "Iniciando..." : "Guía"}</span>
    </Button>
  );
}
