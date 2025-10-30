"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ContactMessageDialog } from "./ContactMessageDialog";

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
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  function handleRowClick(message: ContactMessage) {
    setSelectedMessage(message);
    setDialogOpen(true);
  }

  function getStatusBadge(status: ContactMessage["status"]) {
    switch (status) {
      case "nuevo":
        return (
          <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-200">
            Nuevo
          </Badge>
        );
      case "leido":
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 hover:bg-yellow-200">
            Leído
          </Badge>
        );
      case "respondido":
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-200">
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
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Asunto</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Fecha</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {messages.map((message) => (
              <TableRow
                key={message.id}
                className="cursor-pointer hover:bg-gray-50"
                onClick={() => handleRowClick(message)}
              >
                <TableCell className="font-medium">
                  {message.first_name} {message.last_name}
                </TableCell>
                <TableCell className="text-gray-600">{message.email}</TableCell>
                <TableCell className="max-w-xs truncate">{message.subject}</TableCell>
                <TableCell>{getStatusBadge(message.status)}</TableCell>
                <TableCell className="text-gray-500 text-sm">
                  {formatDate(message.created_at)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {selectedMessage && (
        <ContactMessageDialog
          message={selectedMessage}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onUpdate={(updatedMessage) => {
            // Actualizar el mensaje en la lista
            setSelectedMessage(updatedMessage);
          }}
        />
      )}
    </>
  );
}
