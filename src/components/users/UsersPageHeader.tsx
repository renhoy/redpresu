"use client";

import { Users } from "lucide-react";
import { TourButton } from "@/components/help/TourButton";
import { ActionButtons } from "@/components/shared/ActionButtons";
import { useRouter } from "next/navigation";

interface UsersPageHeaderProps {
  canCreateUsers: boolean;
}

export function UsersPageHeader({ canCreateUsers }: UsersPageHeaderProps) {
  const router = useRouter();

  return (
    <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
      <div className="text-center md:text-left w-full md:w-auto">
        <div className="flex items-center justify-center md:justify-start gap-3">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6" />
            Usuarios
          </h1>
          <TourButton tourId="usuarios-page" />
        </div>
        <p className="text-sm">Gestiona tus usuarios de la empresa</p>
      </div>

      {canCreateUsers && (
        <div className="w-full md:w-auto">
          <ActionButtons
            primaryAction="create"
            isLoading={false}
            isHeader={true}
            onPrimaryClick={() => router.push("/users/create")}
          />
        </div>
      )}
    </div>
  );
}
