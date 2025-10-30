"use client";

import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

export function RegisterClosedDialog() {
  const router = useRouter();

  const handleCancel = () => {
    router.back();
  };

  const handleContact = () => {
    router.push("/contact");
  };

  return (
    <Dialog open={true}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="flex items-center gap-2 text-amber-600">
            <AlertCircle className="h-5 w-5" />
            <DialogTitle>Registro temporalmente deshabilitado</DialogTitle>
          </div>
          <DialogDescription className="text-base pt-2">
            El registro público no está disponible en este momento. Si necesitas
            acceso al sistema, contacta con el administrador.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleCancel}
            className="w-full sm:w-auto"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleContact}
            className="w-full sm:w-auto bg-lime-500 hover:bg-lime-600"
          >
            Contactar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
