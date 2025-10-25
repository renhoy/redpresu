"use client";

import { UserWithInviter } from "@/app/actions/users";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pencil, Trash2, Mail, UserCheck, Plus } from "lucide-react";
import Link from "next/link";

interface UserCardProps {
  user: UserWithInviter;
  currentUserId: string;
  currentUserRole: string;
  onToggleStatus: (user: UserWithInviter) => void;
  onStatusChange: (userId: string, status: "active" | "inactive" | "pending") => void;
  onDelete: (user: UserWithInviter) => void;
  onInviteUser: (user: UserWithInviter) => void;
  formatDate: (date: string | null) => string;
}

export function UserCard({
  user,
  currentUserId,
  currentUserRole,
  onToggleStatus,
  onStatusChange,
  onDelete,
  onInviteUser,
  formatDate,
}: UserCardProps) {
  const statusColors = {
    active: "bg-green-100 text-green-800",
    inactive: "bg-gray-200 text-gray-700",
    pending: "bg-orange-100 text-orange-800",
  };

  const statusLabels = {
    active: "Activo",
    inactive: "Inactivo",
    pending: "Pendiente",
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      superadmin: "Super Admin",
      admin: "Admin",
      vendedor: "Comercial",
    };
    return labels[role] || role;
  };

  const canEdit = currentUserRole !== "vendedor" || user.id === currentUserId;
  const canDelete = currentUserRole === "admin" || currentUserRole === "superadmin";

  return (
    <Card className="w-full mb-3">
      <CardContent className="p-3">
        <div className="space-y-3">
          {/* Fila 1: Grid 2 columnas */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            {/* Columna 1 */}
            <div className="space-y-1">
              {/* Línea 1: Nombre usuario */}
              <div className="font-semibold text-sm truncate">
                {user.name} {user.apellidos}
              </div>
              {/* Línea 2: Email */}
              <div className="text-xs text-muted-foreground truncate">
                {user.email}
              </div>
              {/* Línea 3: Rol como texto */}
              <div className="text-xs text-muted-foreground capitalize">
                {getRoleLabel(user.role)}
              </div>
            </div>

            {/* Columna 2 - Línea 1: Selector Estado alineado derecha */}
            <div className="flex justify-end items-start">
              <Select
                value={user.status}
                onValueChange={(value) =>
                  onStatusChange(user.id, value as "active" | "inactive" | "pending")
                }
                disabled={
                  currentUserRole === "vendedor" && user.id !== currentUserId
                }
              >
                <SelectTrigger className="w-[110px] h-7 bg-white">
                  <SelectValue>
                    <Badge
                      className={
                        statusColors[user.status as keyof typeof statusColors] ||
                        "bg-gray-200 text-gray-700"
                      }
                    >
                      {statusLabels[user.status as keyof typeof statusLabels] ||
                        user.status}
                    </Badge>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="active">
                    <Badge className={statusColors.active}>
                      {statusLabels.active}
                    </Badge>
                  </SelectItem>
                  <SelectItem value="inactive">
                    <Badge className={statusColors.inactive}>
                      {statusLabels.inactive}
                    </Badge>
                  </SelectItem>
                  <SelectItem value="pending">
                    <Badge className={statusColors.pending}>
                      {statusLabels.pending}
                    </Badge>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Fila 2: Invitado por + Último acceso */}
          <div className="grid grid-cols-2 gap-2 text-xs border-t pt-3">
            <div className="min-w-0">
              <div className="text-muted-foreground mb-1">Invitado por</div>
              {user.inviter_name ? (
                <div className="space-y-0.5">
                  <div className="font-medium truncate">
                    {user.inviter_name}
                  </div>
                  <div className="text-muted-foreground truncate">
                    {user.inviter_email}
                  </div>
                </div>
              ) : (
                <div className="text-muted-foreground">-</div>
              )}
            </div>
            <div className="min-w-0 text-right">
              <div className="text-muted-foreground mb-1">Último acceso</div>
              <div className="text-sm font-medium">
                {formatDate(user.last_login)}
              </div>
            </div>
          </div>

          {/* Fila 3: Acciones */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:flex lg:justify-end gap-1.5 w-full border-t pt-3">
            {!canEdit ? (
              <span className="text-muted-foreground text-sm col-span-2 sm:col-span-3 text-center">
                Sin permisos
              </span>
            ) : (
              <>
                {/* Botón [+ email] - Solo si no tiene inviter y status=pending */}
                {!user.inviter_name &&
                 user.status === "pending" &&
                 currentUserRole !== "vendedor" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onInviteUser(user)}
                    className="w-full lg:w-auto h-7 px-2 gap-1.5 text-xs border-lime-500 text-lime-600 hover:bg-lime-50"
                  >
                    <Plus className="h-3.5 w-3.5 flex-shrink-0" />
                    <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                    <span>Email</span>
                  </Button>
                )}

                {/* Botón Editar */}
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="w-full lg:w-auto h-7 px-2 gap-1.5 text-xs"
                >
                  <Link href={`/users/${user.id}/edit`}>
                    <Pencil className="h-3.5 w-3.5 flex-shrink-0" />
                    <span>Editar</span>
                  </Link>
                </Button>

                {/* Botón Borrar - Solo admin/superadmin */}
                {canDelete && user.id !== currentUserId && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onDelete(user)}
                    className="w-full lg:w-auto h-7 px-2 gap-1.5 text-xs border-destructive text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-3.5 w-3.5 flex-shrink-0" />
                    <span>Borrar</span>
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
