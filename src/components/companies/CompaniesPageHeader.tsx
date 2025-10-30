"use client";

import { Building2 } from "lucide-react";
import { ActionButtons } from "@/components/shared/ActionButtons";
import { useRouter } from "next/navigation";

export function CompaniesPageHeader() {
  const router = useRouter();

  return (
    <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
      <div className="text-center md:text-left w-full md:w-auto">
        <h1 className="text-3xl font-bold flex items-center justify-center md:justify-start gap-2">
          <Building2 className="h-6 w-6" />
          Empresas
        </h1>
        <p className="text-sm">Gestiona todas las empresas del sistema</p>
      </div>

      <div className="w-full md:w-auto">
        <ActionButtons
          primaryAction="create"
          primaryText="Nueva Empresa"
          isLoading={false}
          isHeader={true}
          onPrimaryClick={() => router.push("/companies/create")}
        />
      </div>
    </div>
  );
}
