"use client";

import { Mail, MailOpen, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

interface ContactMessagesPageHeaderProps {
  stats: {
    total: number;
    nuevo: number;
    leido: number;
    respondido: number;
  };
  currentFilter?: "nuevo" | "leido" | "respondido";
}

export function ContactMessagesPageHeader({
  stats,
  currentFilter,
}: ContactMessagesPageHeaderProps) {
  const router = useRouter();

  function handleFilterChange(filter?: "nuevo" | "leido" | "respondido") {
    if (filter) {
      router.push(`/contact-messages?status=${filter}`);
    } else {
      router.push("/contact-messages");
    }
  }

  return (
    <div className="space-y-4">
      {/* Título y descripción */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Mensajes de Contacto</h1>
        <p className="text-gray-600 mt-2">
          Gestiona los mensajes recibidos desde el formulario de contacto web
        </p>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div
          className={`bg-white rounded-lg border-2 p-4 cursor-pointer transition-all ${
            !currentFilter
              ? "border-lime-500 shadow-md"
              : "border-gray-200 hover:border-gray-300"
          }`}
          onClick={() => handleFilterChange()}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <Mail className="h-8 w-8 text-gray-400" />
          </div>
        </div>

        <div
          className={`bg-white rounded-lg border-2 p-4 cursor-pointer transition-all ${
            currentFilter === "nuevo"
              ? "border-lime-500 shadow-md"
              : "border-gray-200 hover:border-gray-300"
          }`}
          onClick={() => handleFilterChange("nuevo")}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Nuevos</p>
              <p className="text-2xl font-bold text-blue-600">{stats.nuevo}</p>
            </div>
            <Mail className="h-8 w-8 text-blue-400" />
          </div>
        </div>

        <div
          className={`bg-white rounded-lg border-2 p-4 cursor-pointer transition-all ${
            currentFilter === "leido"
              ? "border-lime-500 shadow-md"
              : "border-gray-200 hover:border-gray-300"
          }`}
          onClick={() => handleFilterChange("leido")}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Leídos</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.leido}</p>
            </div>
            <MailOpen className="h-8 w-8 text-yellow-400" />
          </div>
        </div>

        <div
          className={`bg-white rounded-lg border-2 p-4 cursor-pointer transition-all ${
            currentFilter === "respondido"
              ? "border-lime-500 shadow-md"
              : "border-gray-200 hover:border-gray-300"
          }`}
          onClick={() => handleFilterChange("respondido")}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Respondidos</p>
              <p className="text-2xl font-bold text-green-600">{stats.respondido}</p>
            </div>
            <CheckCircle2 className="h-8 w-8 text-green-400" />
          </div>
        </div>
      </div>

      {/* Filtro activo */}
      {currentFilter && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">
            Mostrando:{" "}
            <span className="font-medium text-gray-900">
              {currentFilter === "nuevo" && "Nuevos"}
              {currentFilter === "leido" && "Leídos"}
              {currentFilter === "respondido" && "Respondidos"}
            </span>
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleFilterChange()}
            className="text-lime-600 hover:text-lime-700"
          >
            Ver todos
          </Button>
        </div>
      )}
    </div>
  );
}
