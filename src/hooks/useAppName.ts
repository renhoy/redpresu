/**
 * Hook para obtener el nombre de la aplicación dinámicamente
 *
 * Permite que el nombre de la aplicación se obtenga desde la configuración
 * de BD (tabla redpresu_config, clave 'app_name') en lugar de estar hardcodeado.
 *
 * Uso:
 * ```tsx
 * const appName = useAppName(); // "Redpresu" (o valor personalizado)
 * ```
 */

"use client";

import { useState, useEffect } from "react";
import { getAppNameAction } from "@/app/actions/config";

/**
 * Hook para obtener el nombre de la aplicación desde config
 *
 * @param fallback - Nombre por defecto si falla la carga (default: 'Redpresu')
 * @returns Nombre de la aplicación
 */
export function useAppName(fallback: string = "Redpresu"): string {
  const [appName, setAppName] = useState<string>(fallback);

  useEffect(() => {
    async function loadAppName() {
      try {
        const result = await getAppNameAction();

        if (result.success && result.data) {
          setAppName(result.data);
        }
      } catch (error) {
        console.error("[useAppName] Error loading app name:", error);
        // Mantener fallback en caso de error
      }
    }

    loadAppName();
  }, []);

  return appName;
}
