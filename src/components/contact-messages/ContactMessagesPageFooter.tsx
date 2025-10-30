"use client";

import { ActionButtons } from "@/components/shared/ActionButtons";
import { useRouter } from "next/navigation";

export function ContactMessagesPageFooter() {
  const router = useRouter();

  return (
    <div className="mt-6">
      <ActionButtons
        primaryAction="cancel"
        primaryText="Cancelar"
        isLoading={false}
        isHeader={false}
        onPrimaryClick={() => router.back()}
      />
    </div>
  );
}
