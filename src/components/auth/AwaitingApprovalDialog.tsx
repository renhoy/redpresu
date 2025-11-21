"use client";

import { useEffect, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Clock, Loader2 } from "lucide-react";
import { signOutAction } from "@/app/actions/auth";

interface AwaitingApprovalDialogProps {
  showDialog: boolean;
}

export function AwaitingApprovalDialog({ showDialog }: AwaitingApprovalDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    if (showDialog) {
      setOpen(true);
      console.log("[AwaitingApprovalDialog] Mostrando diálogo de aprobación pendiente");
    }
  }, [showDialog]);

  const handleClose = async () => {
    console.log("[AwaitingApprovalDialog] Iniciando cierre de sesión...");
    setIsLoggingOut(true);

    // Llamar a signOutAction - el redirect interno lanzará un error (comportamiento normal de Next.js)
    // No usar try-catch porque interfiere con el redirect
    const result = await signOutAction();

    if (!result.success) {
      console.error("[AwaitingApprovalDialog] Error al cerrar sesión:", result.error);
    }
    // El signOutAction redirige automáticamente a "/"
  };

  return (
    <AlertDialog open={open} onOpenChange={() => {}}>
      <AlertDialogContent
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <AlertDialogHeader>
          <div className="mx-auto mb-4 w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center">
            <Clock className="h-8 w-8 text-amber-600" />
          </div>
          <AlertDialogTitle className="text-amber-700 text-center text-xl">
            Cuenta pendiente de aprobación
          </AlertDialogTitle>
          <AlertDialogDescription className="text-base text-center space-y-3">
            <p>
              Tu cuenta ha sido creada exitosamente y está pendiente de aprobación por el equipo de Redpresu.
            </p>
            <p className="font-medium text-gray-700">
              Recibirás un email cuando tu cuenta sea activada y puedas acceder a la plataforma.
            </p>
            <p className="text-sm text-gray-600">
              Si tienes alguna pregunta, puedes contactarnos en{" "}
              <a href="mailto:soporte@redpresu.com" className="text-lime-600 hover:text-lime-700 underline">
                soporte@redpresu.com
              </a>{" "}
              o a través del{" "}
              <a
                href="https://redpresu.com/contact"
                target="_blank"
                rel="noopener noreferrer"
                className="text-lime-600 hover:text-lime-700 underline"
              >
                formulario de contacto
              </a>
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction
            onClick={handleClose}
            disabled={isLoggingOut}
            className="bg-lime-500 hover:bg-lime-600"
          >
            {isLoggingOut ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Cerrando sesión...
              </>
            ) : (
              "Entendido"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
