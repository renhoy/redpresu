"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { X, Copy } from "lucide-react";
import { toast } from "sonner";

interface ContactMessage {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  subject: string;
  message: string;
  status: "nuevo" | "leido" | "respondido";
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface ViewMessageDialogProps {
  message: ContactMessage | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ViewMessageDialog({
  message,
  open,
  onOpenChange,
}: ViewMessageDialogProps) {
  if (!message) return null;

  function formatDate(dateString: string) {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }

  async function handleCopy() {
    const fullMessage = `De: ${message.first_name} ${message.last_name}
Email: ${message.email}
Asunto: ${message.subject}
Fecha: ${formatDate(message.created_at)}

Mensaje:
${message.message}`;

    try {
      await navigator.clipboard.writeText(fullMessage);
      toast.success("Mensaje copiado al portapapeles");
    } catch (error) {
      toast.error("Error al copiar al portapapeles");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[80vw] max-h-[80vh] overflow-y-auto p-0">
        {/* Header con botón X */}
        <div className="sticky top-0 bg-white border-b p-4 flex justify-end">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            className="text-black hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Contenido del mensaje */}
        <div className="p-6 space-y-4">
          {/* Información del remitente */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div>
              <span className="text-sm text-gray-600">De: </span>
              <span className="font-medium text-gray-900">
                {message.first_name} {message.last_name}
              </span>
            </div>
            <div>
              <span className="text-sm text-gray-600">Email: </span>
              <a
                href={`mailto:${message.email}`}
                className="text-lime-600 hover:text-lime-700 underline"
              >
                {message.email}
              </a>
            </div>
            <div>
              <span className="text-sm text-gray-600">Asunto: </span>
              <span className="font-medium text-gray-900">{message.subject}</span>
            </div>
            <div>
              <span className="text-sm text-gray-600">Fecha: </span>
              <span className="text-gray-700">{formatDate(message.created_at)}</span>
            </div>
          </div>

          {/* Mensaje */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Mensaje:</h3>
            <div className="bg-gray-50 rounded-lg p-4 text-gray-900 whitespace-pre-wrap leading-relaxed">
              {message.message}
            </div>
          </div>
        </div>

        {/* Footer con botones */}
        <div className="sticky bottom-0 bg-white border-t p-4 flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-lime-500 text-lime-600 hover:bg-lime-500 hover:text-white"
          >
            <X className="mr-2 h-4 w-4" />
            Cancelar
          </Button>
          <Button
            onClick={handleCopy}
            className="bg-lime-600 hover:bg-lime-700"
          >
            <Copy className="mr-2 h-4 w-4" />
            Copiar al portapapeles
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
