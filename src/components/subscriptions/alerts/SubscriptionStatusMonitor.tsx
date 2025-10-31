"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

interface SubscriptionStatusMonitorProps {
  companyId: number;
  initialStatus: string;
}

/**
 * Client Component que monitorea cambios en el estado de la suscripción
 * Hace polling cada 30 segundos para detectar si el superadmin cambió el estado
 * Si detecta cambio a 'inactive', recarga la página para mostrar el popup
 */
export function SubscriptionStatusMonitor({
  companyId,
  initialStatus,
}: SubscriptionStatusMonitorProps) {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [lastStatus, setLastStatus] = useState(initialStatus);

  useEffect(() => {
    console.log("[SubscriptionMonitor] Iniciando monitor para company_id:", companyId);

    // Función para verificar el estado
    async function checkStatus() {
      try {
        const { data, error } = await supabase
          .from("redpresu_subscriptions")
          .select("status")
          .eq("company_id", companyId)
          .single();

        if (error) {
          console.error("[SubscriptionMonitor] Error al verificar estado:", error);
          return;
        }

        if (data && data.status !== lastStatus) {
          console.log(
            `[SubscriptionMonitor] ¡Cambio detectado! ${lastStatus} → ${data.status}`
          );

          // Si cambió a inactive, recargar página para mostrar popup
          if (data.status === "inactive") {
            console.log("[SubscriptionMonitor] Suscripción INACTIVE detectada, recargando...");
            window.location.reload();
          } else {
            // Para otros cambios, actualizar el estado y refrescar
            setLastStatus(data.status);
            router.refresh();
          }
        }
      } catch (error) {
        console.error("[SubscriptionMonitor] Error en checkStatus:", error);
      }
    }

    // Polling cada 30 segundos
    const interval = setInterval(checkStatus, 30000);

    // Cleanup al desmontar
    return () => {
      console.log("[SubscriptionMonitor] Limpiando monitor");
      clearInterval(interval);
    };
  }, [companyId, lastStatus, router, supabase]);

  // Este componente no renderiza nada
  return null;
}
