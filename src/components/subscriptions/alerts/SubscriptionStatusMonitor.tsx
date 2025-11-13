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
    // Validar que tenemos un company_id válido
    if (!companyId || companyId <= 0) {
      console.warn("[SubscriptionMonitor] company_id inválido, monitor desactivado");
      return;
    }

    console.log("[SubscriptionMonitor] Iniciando monitor para company_id:", companyId);

    // Función para verificar el estado
    async function checkStatus() {
      try {
        const { data, error } = await supabase
          .from("subscriptions")
          .select("status")
          .eq("company_id", companyId)
          .maybeSingle(); // Usar maybeSingle() en vez de single() para manejar caso de no existe

        if (error) {
          // Si hay error, verificar si es un error vacío (problema RLS)
          // o un error real que debemos loguear
          const errorCode = error?.code;
          const errorMessage = error?.message;
          const errorDetails = error?.details;
          const hasErrorInfo = errorCode || errorMessage || errorDetails;

          if (!hasErrorInfo) {
            // Error vacío (probablemente RLS bloqueando acceso)
            // Esto es esperado si el usuario no tiene acceso a la tabla
            // No loguear para evitar spam en consola
            return;
          }

          // Solo loguear errores que no sean de "no encontrado"
          if (errorCode !== 'PGRST116') {
            console.error("[SubscriptionMonitor] Error al verificar estado:", {
              code: errorCode,
              message: errorMessage,
              details: errorDetails,
              hint: error?.hint
            });
          }
          return;
        }

        // Si no hay datos, significa que no existe suscripción (plan free)
        if (!data) {
          // No loguear en cada polling para evitar spam
          return;
        }

        if (data.status !== lastStatus) {
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
        // Solo loguear errores inesperados que tengan información real
        if (error && typeof error === 'object' && Object.keys(error).length > 0) {
          console.error("[SubscriptionMonitor] Error inesperado en checkStatus:", error);
        }
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
