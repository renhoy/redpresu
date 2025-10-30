import { getConfigValue } from "@/lib/helpers/config-helpers";
import { FlaskConical, Clock } from "lucide-react";

/**
 * Banner sticky que se muestra cuando el mock time está activo
 * para recordar al superadmin que está en modo testing.
 *
 * Solo se muestra en NODE_ENV !== 'production'
 */
export async function TestingModeBanner() {
  // Solo en desarrollo/testing
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  // Verificar si mock time está activo
  const mockTime = await getConfigValue('mock_time');

  // null o 'null' = tiempo real
  if (!mockTime || mockTime === 'null') {
    return null;
  }

  const mockDate = new Date(mockTime as string);

  return (
    <div className="sticky top-0 z-40 bg-orange-500 text-white px-3 py-2 text-sm shadow-md">
      <div className="container mx-auto flex items-center justify-center gap-3">
        <FlaskConical className="h-4 w-4" />
        <div className="flex items-center gap-2">
          <span className="font-semibold">MODO TESTING ACTIVO</span>
          <span>|</span>
          <Clock className="h-4 w-4" />
          <span className="font-mono">
            Mock Time: {mockDate.toLocaleDateString("es-ES")} {mockDate.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
      </div>
    </div>
  );
}
