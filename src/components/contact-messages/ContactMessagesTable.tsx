"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, Copy, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ViewMessageDialog } from "./ViewMessageDialog";
import { updateContactMessage, deleteContactMessage } from "@/app/actions/contact-messages";
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

interface ContactMessagesTableProps {
  messages: ContactMessage[];
}

export function ContactMessagesTable({ messages }: ContactMessagesTableProps) {
  const router = useRouter();
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<ContactMessage | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  function getStatusBadge(status: ContactMessage["status"]) {
    switch (status) {
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

  async function handleStatusChange(messageId: string, newStatus: string) {
    const result = await updateContactMessage({
      id: messageId,
      status: newStatus as "nuevo" | "leido" | "respondido",
    });

    if (result.success) {
      toast.success(`Estado actualizado a ${newStatus}`);
      router.refresh();
    } else {
      toast.error(result.error || "Error al actualizar estado");
    }
  }

  function handleViewMessage(message: ContactMessage, e: React.MouseEvent) {
    e.stopPropagation();
    setSelectedMessage(message);
    setViewDialogOpen(true);
  }

  async function handleCopyMessage(message: ContactMessage, e: React.MouseEvent) {
    e.stopPropagation();
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

  function handleDeleteClick(message: ContactMessage, e: React.MouseEvent) {
    e.stopPropagation();
    setMessageToDelete(message);
    setDeleteDialogOpen(true);
  }

  async function handleDeleteConfirm() {
    if (!messageToDelete || isDeleting) return;

    setIsDeleting(true);
    const result = await deleteContactMessage(messageToDelete.id);

    if (result.success) {
      toast.success("Mensaje eliminado");
      setDeleteDialogOpen(false);
      setMessageToDelete(null);
      router.refresh();
    } else {
      toast.error(result.error || "Error al eliminar mensaje");
    }

    setIsDeleting(false);
  }

  if (messages.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
        <p className="text-gray-500 text-lg">No hay mensajes para mostrar</p>
        <p className="text-gray-400 text-sm mt-2">
          Los mensajes recibidos desde el formulario de contacto aparecerán aquí
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="font-semibold">Nombre</TableHead>
              <TableHead className="font-semibold">Email</TableHead>
              <TableHead className="font-semibold">Asunto</TableHead>
              <TableHead className="font-semibold text-center">Estado</TableHead>
              <TableHead className="font-semibold text-center">Fecha</TableHead>
              <TableHead className="font-semibold text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {messages.map((message) => (
              <TableRow
                key={message.id}
                className="hover:bg-lime-50 transition-colors"
              >
                <TableCell className="font-medium text-gray-900">
                  {message.first_name} {message.last_name}
                </TableCell>
                <TableCell className="text-gray-600">{message.email}</TableCell>
                <TableCell className="max-w-xs truncate text-gray-700">
                  {message.subject}
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-center">
                    <Select
                      value={message.status}
                      onValueChange={(newStatus) => handleStatusChange(message.id, newStatus)}
                    >
                      <SelectTrigger className="w-[140px] bg-white">
                        <SelectValue>{getStatusBadge(message.status)}</SelectValue>
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        <SelectItem value="nuevo">
                          <Badge className="bg-blue-100 text-blue-700">Nuevo</Badge>
                        </SelectItem>
                        <SelectItem value="leido">
                          <Badge className="bg-yellow-100 text-yellow-700">Leído</Badge>
                        </SelectItem>
                        <SelectItem value="respondido">
                          <Badge className="bg-green-100 text-green-700">Respondido</Badge>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </TableCell>
                <TableCell className="text-gray-500 text-sm text-center">
                  {formatDate(message.created_at)}
                </TableCell>
                <TableCell>
                  <TooltipProvider>
                    <div className="flex justify-end gap-2">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={(e) => handleViewMessage(message, e)}
                            className="border-lime-500 text-lime-600 hover:bg-lime-500 hover:text-white"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Ver</p>
                        </TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={(e) => handleCopyMessage(message, e)}
                            className="border-lime-500 text-lime-600 hover:bg-lime-500 hover:text-white"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Copiar al portapapeles</p>
                        </TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={(e) => handleDeleteClick(message, e)}
                            className="border-red-500 text-red-600 hover:bg-red-500 hover:text-white"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Eliminar</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </TooltipProvider>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Modal Ver Mensaje */}
      <ViewMessageDialog
        message={selectedMessage}
        open={viewDialogOpen}
        onOpenChange={setViewDialogOpen}
      />

      {/* Dialog Confirmar Eliminación */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar mensaje?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente el mensaje
              de <strong>{messageToDelete?.first_name} {messageToDelete?.last_name}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
