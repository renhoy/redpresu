"use client";

import { ActionButtons } from "@/components/shared/ActionButtons";
import { useRouter } from "next/navigation";

interface UsersPageFooterProps {
  canCreateUsers: boolean;
}

export function UsersPageFooter({ canCreateUsers }: UsersPageFooterProps) {
  const router = useRouter();

  if (!canCreateUsers) {
    return null;
  }

  return (
    <div className="mt-6">
      <ActionButtons
        primaryAction="create"
        isLoading={false}
        isHeader={false}
        onPrimaryClick={() => router.push("/users/create")}
      />
    </div>
  );
}
