"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
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
  const supabase = createClientComponentClient();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (showDialog) {
      setOpen(true);
      // Cerrar sesión silenciosamente cuando se muestra el diálogo
      supabase.auth.signOut().catch((error) => {
        console.error("[InactiveUserDialog] Error en signOut:", error);

        // Si falla el signOut (problemas de red, token inválido, etc.),
        // limpiar cookies manualmente como fallback
        try {
          document.cookie.split(";").forEach((c) => {
            document.cookie = c
              .replace(/^ +/, "")
              .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
          });
          console.log("[InactiveUserDialog] Cookies limpiadas manualmente");
        } catch (cookieError) {
          console.error("[InactiveUserDialog] Error limpiando cookies:", cookieError);
        }
      });
    }
  }, [showDialog, supabase.auth]);

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
