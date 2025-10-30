"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { X, Save, Plus } from "lucide-react";

interface ActionButtonsProps {
  /** Tipo de botón primario */
  primaryAction: "save" | "create";
  /** Texto del botón primario (opcional, por defecto basado en tipo) */
  primaryText?: string;
  /** Si está cargando/procesando */
  isLoading?: boolean;
  /** Función onClick del botón primario */
  onPrimaryClick?: () => void;
  /** Función onClick del botón cancelar (por defecto vuelve atrás) */
  onCancelClick?: () => void;
  /** Mostrar en layout de header (responsive mobile) */
  isHeader?: boolean;
  /** Tipo de formulario (para submit automático) */
  formId?: string;
}

export function ActionButtons({
  primaryAction,
  primaryText,
  isLoading = false,
  onPrimaryClick,
  onCancelClick,
  isHeader = false,
  formId,
}: ActionButtonsProps) {
  const router = useRouter();

  // Determinar texto e icono del botón primario
  const getPrimaryConfig = () => {
    switch (primaryAction) {
      case "save":
        return {
          text: primaryText || "Guardar",
          icon: Save,
          className: "bg-lime-500 hover:bg-lime-600",
        };
      case "create":
        return {
          text: primaryText || "Nuevo Usuario",
          icon: Plus,
          className: "bg-lime-500 hover:bg-lime-600",
        };
    }
  };

  const primaryConfig = getPrimaryConfig();
  const PrimaryIcon = primaryConfig.icon;

  // Handler para cancelar (por defecto vuelve atrás)
  const handleCancel = () => {
    if (onCancelClick) {
      onCancelClick();
    } else {
      router.back();
    }
  };

  // Layout responsive:
  // - Desktop/Tablet: flex-row justify-end
  // - Mobile (si isHeader): flex-col items-center
  const containerClass = isHeader
    ? "flex flex-col md:flex-row items-center md:justify-end gap-2 md:gap-3"
    : "flex flex-row justify-end gap-2 md:gap-3";

  return (
    <div className={containerClass}>
      {/* Botón Cancelar */}
      <Button
        type="button"
        variant="outline"
        onClick={handleCancel}
        disabled={isLoading}
        className="border-lime-500 text-lime-600 hover:bg-lime-500 hover:text-white"
      >
        <X className="mr-2 h-4 w-4" />
        Cancelar
      </Button>

      {/* Botón Primario */}
      <Button
        type={formId ? "submit" : "button"}
        form={formId}
        onClick={!formId ? onPrimaryClick : undefined}
        disabled={isLoading}
        className={primaryConfig.className}
      >
        <PrimaryIcon className="mr-2 h-4 w-4" />
        {isLoading ? "Procesando..." : primaryConfig.text}
      </Button>
    </div>
  );
}
