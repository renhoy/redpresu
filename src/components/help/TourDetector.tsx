"use client";

import { useEffect } from "react";
import { checkAndStartPendingTour } from "@/lib/helpers/tour-helpers";

/**
 * Componente que detecta y ejecuta tours pendientes automáticamente
 * Se debe incluir en el layout principal de la aplicación
 */
export function TourDetector() {
  useEffect(() => {
    // Verificar si hay un tour pendiente al montar el componente
    checkAndStartPendingTour();
  }, []);

  // Este componente no renderiza nada visible
  return null;
}
