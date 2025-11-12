"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface User {
  id: string;
  name: string | null;
  last_name: string | null;
}

interface Tariff {
  id: string;
  status: string;
}

interface TariffFiltersProps {
  onFiltersChange: (filters: {
    status?: "Borrador" | "Activa" | "Inactiva" | "all";
    search?: string;
    user_id?: string;
  }) => void;
  defaultStatus?: "Borrador" | "Activa" | "Inactiva" | "all";
  defaultSearch?: string;
  defaultUserId?: string;
  users?: User[];
  currentUserRole?: string;
  tariffs?: Tariff[];
  tariffId?: string;
}

export function TariffFilters({
  onFiltersChange,
  defaultStatus = "all",
  defaultSearch = "",
  defaultUserId = "all",
  users = [],
  currentUserRole,
  tariffs = [],
  tariffId,
}: TariffFiltersProps) {
  const router = useRouter();
  const [status, setStatus] = useState<"Borrador" | "Activa" | "Inactiva" | "all">(
    defaultStatus
  );
  const [search, setSearch] = useState(defaultSearch);
  const [userId, setUserId] = useState(defaultUserId);

  // Calcular contadores por estado
  const statusCounts = tariffs.reduce((acc, tariff) => {
    acc[tariff.status] = (acc[tariff.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const handleStatusChange = (value: "Borrador" | "Activa" | "Inactiva" | "all") => {
    setStatus(value);
    // Si el valor es "all", también limpiamos la búsqueda
    if (value === "all") {
      setSearch("");
      // Si hay tariff_id, navegar a /tariffs para limpiar todos los filtros
      if (tariffId) {
        router.push("/tariffs");
      } else {
        onFiltersChange({ status: value, search: "", user_id: userId || undefined });
      }
    } else {
      onFiltersChange({ status: value, search, user_id: userId || undefined });
    }
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    onFiltersChange({ status, search: value, user_id: userId || undefined });
  };

  const handleUserChange = (value: string) => {
    setUserId(value);
    // Si value es 'all', pasar undefined para no filtrar
    onFiltersChange({
      status,
      search,
      user_id: value === "all" ? undefined : value,
    });
  };

  // Solo mostrar filtro de usuario si es admin/superadmin
  const showUserFilter =
    currentUserRole && ["admin", "superadmin"].includes(currentUserRole);

  return (
    <div id="filtros-tarifa" className="flex gap-4 mb-4 flex-wrap items-center">
      <Input
        placeholder="Buscar por título o descripción..."
        value={search}
        onChange={(e) => handleSearchChange(e.target.value)}
        className="max-w-xs bg-white"
      />

      {/* Botones de filtro de estado */}
      <div data-tour="filtro-estado-tarifas" className="flex gap-2">
        <Button
          variant={status === "all" && search === "" && !tariffId ? "default" : "outline"}
          size="sm"
          onClick={() => handleStatusChange("all")}
          className={
            status === "all" && search === "" && !tariffId
              ? "bg-lime-500 hover:bg-lime-600"
              : "border-lime-500 text-lime-600 hover:bg-lime-500 hover:text-white"
          }
        >
          Todas ({tariffs.length})
        </Button>
        <Button
          variant={status === "Borrador" ? "default" : "outline"}
          size="sm"
          onClick={() => handleStatusChange("Borrador")}
          disabled={!statusCounts["Borrador"]}
          className={
            status === "Borrador"
              ? "bg-lime-500 hover:bg-lime-600"
              : "border-lime-500 text-lime-600 hover:bg-lime-500 hover:text-white"
          }
        >
          Borradores{statusCounts["Borrador"] ? ` (${statusCounts["Borrador"]})` : ""}
        </Button>
        <Button
          variant={status === "Activa" ? "default" : "outline"}
          size="sm"
          onClick={() => handleStatusChange("Activa")}
          disabled={!statusCounts["Activa"]}
          className={
            status === "Activa"
              ? "bg-lime-500 hover:bg-lime-600"
              : "border-lime-500 text-lime-600 hover:bg-lime-500 hover:text-white"
          }
        >
          Activas{statusCounts["Activa"] ? ` (${statusCounts["Activa"]})` : ""}
        </Button>
        <Button
          variant={status === "Inactiva" ? "default" : "outline"}
          size="sm"
          onClick={() => handleStatusChange("Inactiva")}
          disabled={!statusCounts["Inactiva"]}
          className={
            status === "Inactiva"
              ? "bg-lime-500 hover:bg-lime-600"
              : "border-lime-500 text-lime-600 hover:bg-lime-500 hover:text-white"
          }
        >
          Inactivas{statusCounts["Inactiva"] ? ` (${statusCounts["Inactiva"]})` : ""}
        </Button>
      </div>

      {showUserFilter && users.length > 0 && (
        <Select value={userId} onValueChange={handleUserChange}>
          <SelectTrigger className="max-w-[200px] bg-white">
            <SelectValue placeholder="Todos los usuarios" />
          </SelectTrigger>
          <SelectContent className="bg-white">
            <SelectItem value="all">Todos los usuarios</SelectItem>
            {users.map((user) => (
              <SelectItem key={user.id} value={user.id}>
                {user.name} {user.last_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
