import { checkSubscriptionStatus } from "@/lib/helpers/subscription-status-checker";
import { InactiveAccountPopup } from "./InactiveAccountPopup";
import { CanceledAccountBanner } from "./CanceledAccountBanner";
import { PastDueAccountBanner } from "./PastDueAccountBanner";
import { TrialingBanner } from "./TrialingBanner";

/**
 * Componente Manager que verifica el estado de la suscripción
 * y muestra el banner/popup correspondiente
 *
 * Orden de verificación:
 * 1. Inactive → Popup modal bloqueante
 * 2. Canceled → Banner naranja con botón contactar
 * 3. Past Due → Banner amarillo con botón renovar
 * 4. Trialing → Banner azul informativo
 * 5. Active → Sin banner
 */
export async function SubscriptionStatusManager() {
  const statusCheck = await checkSubscriptionStatus();

  // Inactive: Popup modal bloqueante (Client Component)
  if (statusCheck.status === 'inactive') {
    return <InactiveAccountPopup message={statusCheck.message} />;
  }

  // Canceled: Banner naranja
  if (statusCheck.status === 'canceled') {
    return <CanceledAccountBanner message={statusCheck.message} />;
  }

  // Past Due: Banner amarillo
  if (statusCheck.status === 'past_due') {
    return <PastDueAccountBanner message={statusCheck.message} />;
  }

  // Trialing: Banner azul
  if (statusCheck.status === 'trialing') {
    return <TrialingBanner message={statusCheck.message} plan={statusCheck.currentPlan} />;
  }

  // Active: Sin alertas
  return null;
}
