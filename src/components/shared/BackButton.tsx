"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface BackButtonProps {
  className?: string;
}

export function BackButton({ className = "" }: BackButtonProps) {
  const router = useRouter();

  return (
    <Button
      variant="outline"
      onClick={() => router.back()}
      className={`bg-white ${className}`}
    >
      <X className="h-4 w-4 mr-2" />
      Cancelar
    </Button>
  );
}
