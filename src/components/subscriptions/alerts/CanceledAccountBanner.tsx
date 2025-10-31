import Link from "next/link";
import { AlertCircle } from "lucide-react";

interface CanceledAccountBannerProps {
  message: string;
}

/**
 * Banner para cuentas CANCELED (canceladas por admin)
 * Permite seguir usando en plan FREE y upgradear
 */
export function CanceledAccountBanner({ message }: CanceledAccountBannerProps) {
  return (
    <div className="bg-orange-100 border-b border-orange-300 text-orange-900 px-4 py-4">
      <div className="container mx-auto">
        <div className="flex items-start md:items-center justify-between flex-col md:flex-row gap-3">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-sm md:text-base">Cuenta Cancelada</p>
              <p className="text-sm opacity-90 mt-1">{message}</p>
            </div>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <Link href="/subscriptions" className="flex-1 md:flex-none">
              <button className="w-full md:w-auto bg-orange-600 hover:bg-orange-700 text-white font-semibold px-4 py-2 rounded transition-colors text-sm whitespace-nowrap">
                Ver Planes
              </button>
            </Link>
            <Link href="/contact" className="flex-1 md:flex-none">
              <button className="w-full md:w-auto border-2 border-orange-600 text-orange-900 hover:bg-orange-200 font-semibold px-4 py-2 rounded transition-colors text-sm whitespace-nowrap">
                Contactar
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
