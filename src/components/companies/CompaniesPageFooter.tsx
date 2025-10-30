"use client";

import { ActionButtons } from "@/components/shared/ActionButtons";
import { useRouter } from "next/navigation";

export function CompaniesPageFooter() {
  const router = useRouter();

  return (
    <div className="mt-6">
      <ActionButtons
        primaryAction="create"
        primaryText="Nueva Empresa"
        isLoading={false}
        isHeader={false}
        onPrimaryClick={() => router.push("/companies/create")}
      />
    </div>
  );
}
