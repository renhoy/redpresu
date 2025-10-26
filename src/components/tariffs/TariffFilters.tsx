"use client";

import { useState } from "react";
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

interface TariffFiltersProps {
  onFiltersChange: (filters: {
    status?: "Activa" | "Inactiva" | "all";
    search?: string;
    user_id?: string;
  }) => void;
  defaultStatus?: "Activa" | "Inactiva" | "all";
  defaultSearch?: string;
  defaultUserId?: string;
  users?: User[];
  currentUserRole?: string;
}

export function TariffFilters({
  onFiltersChange,
  defaultStatus = "all",
  defaultSearch = "",
  defaultUserId = "all",
  users = [],
  currentUserRole,
}: TariffFiltersProps) {
  const [status, setStatus] = useState<"Activa" | "Inactiva" | "all">(
    defaultStatus
  );
  const [search, setSearch] = useState(defaultSearch);
  const [userId, setUserId] = useState(defaultUserId);

  const handleStatusChange = (value: "Activa" | "Inactiva" | "all") => {
    setStatus(value);
    // Si el valor es "all", también limpiamos la búsqueda
    if (value === "all") {
      setSearch("");
      onFiltersChange({ status: value, search: "", user_id: userId || undefined });
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
          variant={status === "all" && search === "" ? "default" : "outline"}
          size="sm"
          onClick={() => handleStatusChange("all")}
          className={
            status === "all" && search === ""
              ? "bg-lime-500 hover:bg-lime-600"
              : "border-lime-500 text-lime-600 hover:bg-lime-50"
          }
        >
          Todas
        </Button>
        <Button
          variant={status === "Activa" ? "default" : "outline"}
          size="sm"
          onClick={() => handleStatusChange("Activa")}
          className={
            status === "Activa"
              ? "bg-lime-500 hover:bg-lime-600"
              : "border-lime-500 text-lime-600 hover:bg-lime-50"
          }
        >
          Activas
        </Button>
        <Button
          variant={status === "Inactiva" ? "default" : "outline"}
          size="sm"
          onClick={() => handleStatusChange("Inactiva")}
          className={
            status === "Inactiva"
              ? "bg-lime-500 hover:bg-lime-600"
              : "border-lime-500 text-lime-600 hover:bg-lime-50"
          }
        >
          Inactivas
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
