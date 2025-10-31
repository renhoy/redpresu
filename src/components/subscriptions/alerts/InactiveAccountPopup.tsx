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
import { signOutAndRedirectToContact } from "@/app/actions/auth";

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

  async function handleContact() {
    console.log("[InactiveAccountPopup] Ejecutando logout y redirect a /contact...");
    setLoading(true);

    try {
      // Llamar al Server Action que hace logout y redirige a /contact
      await signOutAndRedirectToContact();

      // El Server Action maneja el redirect automáticamente
      // No se ejecutará código después del redirect
    } catch (error) {
      console.error("[InactiveAccountPopup] Error durante logout:", error);
      setLoading(false);
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
