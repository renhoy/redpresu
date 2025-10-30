"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Mail, Calendar, Save } from "lucide-react";
import { updateContactMessage } from "@/app/actions/contact-messages";
import { ContactMessageNotes } from "./ContactMessageNotes";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

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

interface ContactMessageDialogProps {
  message: ContactMessage;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (updatedMessage: ContactMessage) => void;
}

export function ContactMessageDialog({
  message,
  open,
  onOpenChange,
  onUpdate,
}: ContactMessageDialogProps) {
  const router = useRouter();
  const [status, setStatus] = useState(message.status);
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    setLoading(true);

    const result = await updateContactMessage({
      id: message.id,
      status,
    });

    if (result.success) {
      toast.success("Estado actualizado correctamente");
      onUpdate(result.data);
      router.refresh();
    } else {
      toast.error(result.error || "Error al actualizar estado");
    }

    setLoading(false);
  }

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

  function getStatusBadge(messageStatus: ContactMessage["status"]) {
    switch (messageStatus) {
      case "nuevo":
        return (
          <Badge variant="secondary" className="bg-blue-100 text-blue-700">
            Nuevo
          </Badge>
        );
      case "leido":
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">
            Leído
          </Badge>
        );
      case "respondido":
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-700">
            Respondido
          </Badge>
        );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Detalles del Mensaje</DialogTitle>
            {getStatusBadge(message.status)}
          </div>
          <DialogDescription>
            Mensaje de contacto recibido el {formatDate(message.created_at)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Información del remitente */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2 text-gray-700">
              <Mail className="h-4 w-4" />
              <span className="font-medium">Remitente</span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Nombre:</span>
                <p className="font-medium text-gray-900">
                  {message.first_name} {message.last_name}
                </p>
              </div>
              <div>
                <span className="text-gray-600">Email:</span>
                <p className="font-medium text-gray-900">
                  <a
                    href={`mailto:${message.email}`}
                    className="text-lime-600 hover:text-lime-700 underline"
                  >
                    {message.email}
                  </a>
                </p>
              </div>
            </div>
          </div>

          {/* Asunto */}
          <div>
            <Label className="text-gray-700 font-medium">Asunto</Label>
            <p className="mt-1 text-gray-900">{message.subject}</p>
          </div>

          {/* Mensaje */}
          <div>
            <Label className="text-gray-700 font-medium">Mensaje</Label>
            <div className="mt-1 bg-gray-50 rounded-lg p-4 text-gray-900 whitespace-pre-wrap">
              {message.message}
            </div>
          </div>

          {/* Estado */}
          <div>
            <Label htmlFor="status" className="text-gray-700 font-medium">
              Estado
            </Label>
            <Select value={status} onValueChange={(value: any) => setStatus(value)}>
              <SelectTrigger id="status" className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nuevo">Nuevo</SelectItem>
                <SelectItem value="leido">Leído</SelectItem>
                <SelectItem value="respondido">Respondido</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Notas internas con timeline */}
          <div className="border-t pt-4">
            <ContactMessageNotes messageId={message.id} />
          </div>

          {/* Fechas */}
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>Recibido: {formatDate(message.created_at)}</span>
            </div>
            {message.updated_at !== message.created_at && (
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>Actualizado: {formatDate(message.updated_at)}</span>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cerrar
          </Button>
          <Button onClick={handleSave} disabled={loading} className="bg-lime-600 hover:bg-lime-700">
            {loading ? (
              "Actualizando..."
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Actualizar Estado
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
