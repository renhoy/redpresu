"use client";

import { useState } from "react";
import Link from "next/link";
import { UserWithInviter, toggleUserStatus } from "@/app/actions/users";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Pencil, Trash2, UserCheck, Mail } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { UserCard } from "./UserCard";

interface UserTableProps {
  users: UserWithInviter[];
  currentUserId: string;
  currentUserRole: string;
}

export default function UserTable({
  users: initialUsers,
  currentUserId,
  currentUserRole,
}: UserTableProps) {
  const [users, setUsers] = useState(initialUsers);
  const [selectedUser, setSelectedUser] = useState<UserWithInviter | null>(
    null
  );
  const [isToggleDialogOpen, setIsToggleDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleStatusChange = async (userId: string, newStatus: "active" | "inactive" | "pending") => {
    setIsLoading(true);

    const result = await toggleUserStatus(userId, newStatus);

    if (result.success) {
      toast.success(`Estado actualizado a ${newStatus === "active" ? "Activo" : newStatus === "inactive" ? "Inactivo" : "Pendiente"}`);

      // Actualizar lista local
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, status: newStatus } : u
        )
      );

      router.refresh();
    } else {
      toast.error(result.error || "Error al cambiar estado");
    }

    setIsLoading(false);
  };

  const handleToggleStatus = async () => {
    if (!selectedUser) return;

    setIsLoading(true);

    const newStatus = selectedUser.status === "active" ? "inactive" : "active";

    const result = await toggleUserStatus(selectedUser.id, newStatus);

    if (result.success) {
      toast.success(
        `Usuario ${
          newStatus === "active" ? "activado" : "desactivado"
        } correctamente`
      );

      // Actualizar lista local
      setUsers((prev) =>
        prev.map((u) =>
          u.id === selectedUser.id ? { ...u, status: newStatus } : u
        )
      );

      router.refresh();
    } else {
      toast.error(result.error || "Error al cambiar estado");
    }

    setIsLoading(false);
    setIsToggleDialogOpen(false);
    setSelectedUser(null);
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      superadmin: "Super Admin",
      admin: "Admin",
      vendedor: "Comercial",
    };
    return labels[role] || role;
  };

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

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";

    return new Date(dateString).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleToggleStatusFromCard = (user: UserWithInviter) => {
    setSelectedUser(user);
    setIsToggleDialogOpen(true);
  };

  return (
    <>
      {/* Vista Desktop - Tabla */}
      <div className="hidden lg:block rounded-md border bg-white">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="p-4">Email</TableHead>
              <TableHead className="p-4 text-center">Usuario</TableHead>
              <TableHead className="p-4 text-center">Estado</TableHead>
              <TableHead className="p-4 text-center">Invitado por</TableHead>
              <TableHead className="p-4 text-center">Último acceso</TableHead>
              <TableHead className="p-4 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center text-muted-foreground py-8"
                >
                  No hay usuarios registrados
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow
                  key={user.id}
                  className="bg-white border-t hover:bg-lime-50/50"
                >
                  {/* Columna Email */}
                  <TableCell className="p-4">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium" style={{ fontSize: "12px" }}>
                        {user.email}
                      </span>
                    </div>
                  </TableCell>

                  {/* Columna Usuario (Nombre + Rol) */}
                  <TableCell className="p-4 text-center">
                    <div className="space-y-0.5">
                      <div className="text-sm font-medium">
                        {user.name} {user.apellidos}
                      </div>
                      <div className="text-xs text-muted-foreground capitalize">
                        {getRoleLabel(user.role)}
                      </div>
                    </div>
                  </TableCell>

                  {/* Columna Estado con Selector */}
                  <TableCell className="p-4">
                    <div className="flex justify-center">
                      <Select
                        value={user.status}
                        onValueChange={(value) => handleStatusChange(user.id, value as "active" | "inactive" | "pending")}
                        disabled={currentUserRole === "vendedor" && user.id !== currentUserId}
                      >
                        <SelectTrigger className="w-[140px] bg-white">
                          <SelectValue>
                            <Badge
                              className={
                                statusColors[user.status as keyof typeof statusColors] || "bg-gray-200 text-gray-700"
                              }
                            >
                              {statusLabels[user.status as keyof typeof statusLabels] || user.status}
                            </Badge>
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="bg-white">
                          <SelectItem value="active">
                            <Badge className="bg-green-100 text-green-800">Activo</Badge>
                          </SelectItem>
                          <SelectItem value="inactive">
                            <Badge className="bg-gray-200 text-gray-700">Inactivo</Badge>
                          </SelectItem>
                          <SelectItem value="pending">
                            <Badge className="bg-orange-100 text-orange-800">Pendiente</Badge>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </TableCell>

                  {/* Columna Invitado por */}
                  <TableCell className="p-4 text-center">
                    {user.inviter_name ? (
                      <div className="space-y-0.5">
                        <div className="text-sm font-medium">{user.inviter_name}</div>
                        <div className="text-xs text-muted-foreground">
                          {user.inviter_email}
                        </div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>

                  {/* Columna Último acceso */}
                  <TableCell className="p-4 text-center text-muted-foreground" style={{ fontSize: "12px" }}>
                    {formatDate(user.last_login)}
                  </TableCell>

                  {/* Columna Acciones */}
                  <TableCell className="p-4">
                    <TooltipProvider>
                      <div className="flex justify-end gap-2">
                        {/* Comercial solo puede editar su propio usuario */}
                        {currentUserRole === "vendedor" &&
                        user.id !== currentUserId ? (
                          <span className="text-muted-foreground text-sm">
                            -
                          </span>
                        ) : (
                          <>
                            {/* Botón Editar */}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="outline" size="icon" asChild>
                                  <Link href={`/users/${user.id}/edit`}>
                                    <Pencil className="h-4 w-4" />
                                  </Link>
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Editar</p>
                              </TooltipContent>
                            </Tooltip>

                            {/* Botón Activar/Desactivar - Solo admin/superadmin */}
                            {currentUserRole !== "vendedor" && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => {
                                      setSelectedUser(user);
                                      setIsToggleDialogOpen(true);
                                    }}
                                    className={
                                      user.status === "active"
                                        ? "border-orange-500 text-orange-600 hover:bg-orange-50"
                                        : "border-green-600 text-green-600 hover:bg-green-50"
                                    }
                                  >
                                    {user.status === "active" ? (
                                      <Trash2 className="h-4 w-4" />
                                    ) : (
                                      <UserCheck className="h-4 w-4" />
                                    )}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>
                                    {user.status === "active"
                                      ? "Desactivar"
                                      : "Activar"}
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            )}

                            {/* Botón Reenviar invitación - Solo si pending */}
                            {user.status === "pending" &&
                              currentUserRole !== "vendedor" && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      className="border-blue-500 text-blue-600 hover:bg-blue-50"
                                    >
                                      <Mail className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Reenviar invitación</p>
                                  </TooltipContent>
                                </Tooltip>
                              )}
                          </>
                        )}
                      </div>
                    </TooltipProvider>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Vista Mobile/Tablet - Cards */}
      <div className="lg:hidden">
        {users.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground border rounded-lg">
            No hay usuarios registrados
          </div>
        ) : (
          users.map((user) => (
            <UserCard
              key={user.id}
              user={user}
              currentUserId={currentUserId}
              currentUserRole={currentUserRole}
              onToggleStatus={handleToggleStatusFromCard}
              formatDate={formatDate}
            />
          ))
        )}
      </div>

      {/* Dialog confirmar cambio de estado */}
      <AlertDialog
        open={isToggleDialogOpen}
        onOpenChange={setIsToggleDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {selectedUser?.status === "active" ? "Desactivar" : "Activar"}{" "}
              usuario
            </AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que quieres{" "}
              {selectedUser?.status === "active" ? "desactivar" : "activar"} a{" "}
              <strong>
                {selectedUser?.nombre} {selectedUser?.apellidos}
              </strong>
              ?
              {selectedUser?.status === "active" && (
                <span className="block mt-2 text-destructive">
                  El usuario no podrá acceder al sistema hasta que sea
                  reactivado.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleToggleStatus}
              disabled={isLoading}
            >
              {isLoading ? "Procesando..." : "Confirmar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
