"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

interface InactiveAccountPopupProps {
  message: string;
}

/**
 * Popup modal para cuentas INACTIVE (desactivadas/sanción)
 * Bloquea toda interacción y solo permite ir a contacto
 */
export function InactiveAccountPopup({ message }: InactiveAccountPopupProps) {
  const [open, setOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const supabase = createClientComponentClient();

  async function handleContact() {
    setLoading(true);

    try {
      // Cerrar sesión
      await supabase.auth.signOut();

      // Redirigir a contacto usando window.location para forzar recarga completa
      // Esto asegura que el middleware vea al usuario como no autenticado
      window.location.href = "/contact";
    } catch (error) {
      console.error("[InactiveAccountPopup] Error al cerrar sesión:", error);
      // Redirigir de todas formas
      window.location.href = "/contact";
    }
  }

  return (
    <Dialog open={open} onOpenChange={() => {}} modal>
      <DialogContent
        className="sm:max-w-md"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-red-100 rounded-full p-3">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <DialogTitle className="text-xl">Cuenta Desactivada</DialogTitle>
          </div>
          <DialogDescription className="text-base text-gray-700 leading-relaxed">
            {message}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="mt-4">
          <Button
            onClick={handleContact}
            disabled={loading}
            className="w-full bg-red-600 hover:bg-red-700"
            size="lg"
          >
            {loading ? "Redirigiendo..." : "Contactar con Administrador"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
