import Link from "next/link";
import { Clock } from "lucide-react";

interface PastDueAccountBannerProps {
  message: string;
}

/**
 * Banner para cuentas PAST DUE (vencidas automáticamente)
 * Downgrade a FREE, puede renovar
 */
export function PastDueAccountBanner({ message }: PastDueAccountBannerProps) {
  return (
    <div className="bg-yellow-100 border-b border-yellow-300 text-yellow-900 px-4 py-4">
      <div className="container mx-auto">
        <div className="flex items-start md:items-center justify-between flex-col md:flex-row gap-3">
          <div className="flex items-start gap-3">
            <Clock className="h-5 w-5 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-sm md:text-base">Suscripción Vencida</p>
              <p className="text-sm opacity-90 mt-1">{message}</p>
            </div>
          </div>
          <Link href="/subscriptions">
            <button className="w-full md:w-auto bg-yellow-600 hover:bg-yellow-700 text-white font-semibold px-6 py-2 rounded transition-colors text-sm whitespace-nowrap">
              Renovar Suscripción
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
