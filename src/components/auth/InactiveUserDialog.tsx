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
    }
  }, [showDialog]);

  const handleClose = () => {
    setOpen(false);
    // Limpiar el parámetro reason de la URL
    router.replace("/login");
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
