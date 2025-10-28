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

interface InactiveUserDialogProps {
  showDialog: boolean;
}

export function InactiveUserDialog({ showDialog }: InactiveUserDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (showDialog) {
      setOpen(true);
      // El signOut ya se hizo desde el servidor (signInAction o middleware)
      // No intentamos hacer signOut aquí para evitar NetworkError
      console.log("[InactiveUserDialog] Mostrando diálogo de usuario inactivo");
    }
  }, [showDialog]);

  const handleClose = () => {
    setOpen(false);
    // Redirigir a la página principal (home)
    router.replace("/");
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-red-600">
            Usuario desactivado
          </AlertDialogTitle>
          <AlertDialogDescription className="text-base">
            Su cuenta ha sido desactivada por un administrador del sistema.
            <br />
            <br />
            Por favor, contacte con el administrador para solicitar la
            reactivación de su cuenta.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction
            onClick={handleClose}
            className="bg-lime-500 hover:bg-lime-600"
          >
            Aceptar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
