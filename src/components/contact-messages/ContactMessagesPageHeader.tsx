"use client";

import { Mail } from "lucide-react";
import { BackButton } from "@/components/shared/BackButton";

export function ContactMessagesPageHeader() {
  return (
    <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
      <div className="text-center md:text-left w-full md:w-auto">
        <h1 className="text-3xl font-bold flex items-center justify-center md:justify-start gap-2">
          <Mail className="h-6 w-6" />
          Mensajes de Contacto
        </h1>
        <p className="text-sm">Gestiona los mensajes recibidos desde el formulario web</p>
      </div>

      <div className="w-full md:w-auto flex justify-center md:justify-end">
        <BackButton />
      </div>
    </div>
  );
}
