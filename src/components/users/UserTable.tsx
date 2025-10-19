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

  const getRoleBadge = (role: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      superadmin: "destructive",
      admin: "default",
      vendedor: "secondary",
    };

    const labels: Record<string, string> = {
      superadmin: "Super Admin",
      admin: "Admin",
      vendedor: "Comercial",
    };

    return (
      <Badge variant={variants[role] || "secondary"}>
        {labels[role] || role}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "outline"> = {
      active: "default",
      inactive: "secondary",
      pending: "outline",
    };

    const labels: Record<string, string> = {
      active: "Activo",
      inactive: "Inactivo",
      pending: "Pendiente",
    };

    return (
      <Badge variant={variants[status] || "outline"}>
        {labels[status] || status}
      </Badge>
    );
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
              <TableHead>Usuario</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Invitado por</TableHead>
              <TableHead>Último acceso</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center text-muted-foreground py-8"
                >
                  No hay usuarios registrados
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow
                  key={user.id}
                  className="hover:bg-lime-50/30"
                >
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <span>
                        {user.name} {user.apellidos}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{user.email}</TableCell>
                  <TableCell>{getRoleBadge(user.role)}</TableCell>
                  <TableCell>{getStatusBadge(user.status)}</TableCell>
                  <TableCell>
                    {user.inviter_name ? (
                      <div className="text-sm">
                        <div>{user.inviter_name}</div>
                        <div className="text-muted-foreground text-xs">
                          {user.inviter_email}
                        </div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">
                      {formatDate(user.last_login)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
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
