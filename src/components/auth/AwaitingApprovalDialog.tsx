"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Clock } from "lucide-react";

interface AwaitingApprovalDialogProps {
  showDialog: boolean;
}

export function AwaitingApprovalDialog({ showDialog }: AwaitingApprovalDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (showDialog) {
      setOpen(true);
      console.log("[AwaitingApprovalDialog] Mostrando diálogo de aprobación pendiente");
    }
  }, [showDialog]);

  const handleClose = () => {
    setOpen(false);
    // Redirigir a la página principal
    router.replace("/");
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogContent>
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
              <a href="mailto:legal@redpresu.com" className="text-lime-600 hover:text-lime-700 underline">
                legal@redpresu.com
              </a>
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction
            onClick={handleClose}
            className="bg-lime-500 hover:bg-lime-600"
          >
            Entendido
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
