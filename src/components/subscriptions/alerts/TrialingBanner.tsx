import { Sparkles } from "lucide-react";

interface TrialingBannerProps {
  message: string;
  plan: string;
}

/**
 * Banner para cuentas TRIALING (período de prueba)
 * Info positiva, acceso completo temporal
 */
export function TrialingBanner({ message, plan }: TrialingBannerProps) {
  return (
    <div className="bg-blue-100 border-b border-blue-300 text-blue-900 px-4 py-3">
      <div className="container mx-auto">
        <div className="flex items-center gap-3">
          <Sparkles className="h-5 w-5 flex-shrink-0" />
          <div>
            <p className="text-sm md:text-base">
              <span className="font-semibold">Período de Prueba Activo</span> - {message}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
