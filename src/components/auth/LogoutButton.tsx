"use client";

import { useState } from "react";
import { signOutAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { LogOut, Loader2 } from "lucide-react";

interface LogoutButtonProps {
  variant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  showText?: boolean;
}

export default function LogoutButton({
  variant = "ghost",
  size = "default",
  className,
  showText = true,
}: LogoutButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = async () => {
    try {
      setIsLoading(true);

      const result = await signOutAction();

      if (!result.success) {
        // El error se maneja en el Server Action
        // pero podríamos mostrar un toast aquí si fuera necesario
        console.error("Logout error:", result.error);
      }

      // El Server Action maneja el redirect automáticamente
      // No necesitamos hacer nada más aquí
    } catch (error) {
      console.error("Error durante logout:", error);
    } finally {
      // Note: setIsLoading(false) podría no ejecutarse si hay redirect
      // pero está bien porque el componente se desmontará
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={handleLogout}
      disabled={isLoading}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <LogOut className="h-4 w-4" />
      )}

      {showText && (
        <span className={size === "icon" ? "sr-only" : "ml-2"}>
          {isLoading ? "Salir..." : "Salir"}
        </span>
      )}
    </Button>
  );
}
