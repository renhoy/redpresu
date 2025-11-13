"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { UserWithInviter, toggleUserStatus } from "@/app/actions/users";
import { createUserInvitation, cancelInvitation } from "@/app/actions/invitations";
import { checkAndStartPendingTour } from "@/lib/helpers/tour-helpers";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Pencil, Trash2, UserCheck, Mail, Plus, Copy, ExternalLink, Loader2, User } from "lucide-react";
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
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [reassignUserId, setReassignUserId] = useState<string>("");
  const [deleteAction, setDeleteAction] = useState<"delete" | "reassign">("reassign");
  const [invitationMessage, setInvitationMessage] = useState("");
  const [invitationId, setInvitationId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [search, setSearch] = useState("");
  const router = useRouter();

  // Detectar y ejecutar tour pendiente
  useEffect(() => {
    checkAndStartPendingTour();
  }, []);

  // Calcular contadores por estado
  const statusCounts = users.reduce((acc, user) => {
    acc[user.status] = (acc[user.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const handleStatusChange = async (
    userId: string,
    newStatus: "active" | "inactive" | "pending"
  ) => {
    setIsLoading(true);

    const result = await toggleUserStatus(userId, newStatus);

    if (result.success) {
      toast.success(
        `Estado actualizado a ${
          newStatus === "active"
            ? "Activo"
            : newStatus === "inactive"
            ? "Inactivo"
            : "Pendiente"
        }`
      );

      // Actualizar lista local
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, status: newStatus } : u))
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
      comercial: "Comercial",
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

  const handleDeleteFromCard = (user: UserWithInviter) => {
    setSelectedUser(user);
    setReassignUserId("");
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) {
      toast.error("No se ha seleccionado ningún usuario");
      return;
    }

    if (deleteAction === "reassign" && !reassignUserId) {
      toast.error("Debe seleccionar un usuario para reasignar los registros");
      return;
    }

    setIsLoading(true);

    // Importar deleteUser desde actions
    const { deleteUser } = await import("@/app/actions/users");

    const result = await deleteUser(
      selectedUser.id,
      deleteAction === "reassign" ? reassignUserId : null
    );

    if (result.success) {
      toast.success("Usuario borrado correctamente");

      // Actualizar lista local
      setUsers((prev) => prev.filter((u) => u.id !== selectedUser.id));

      router.refresh();
    } else {
      toast.error(result.error || "Error al borrar usuario");
    }

    setIsLoading(false);
    setIsDeleteDialogOpen(false);
    setSelectedUser(null);
    setReassignUserId("");
    setDeleteAction("reassign");
  };

  const handleInviteUser = async (user: UserWithInviter) => {
    setSelectedUser(user);
    setIsLoading(true);

    // Crear invitación para obtener token real y mensaje completo
    const result = await createUserInvitation(user.email);

    if (!result.success) {
      toast.error(result.error || "Error al crear invitación");
      setIsLoading(false);
      return;
    }

    // Guardar mensaje real con enlace completo e ID de invitación
    setInvitationMessage(result.data?.emailMessage || "");
    setInvitationId(result.data?.id || "");
    setIsLoading(false);
    setIsInviteDialogOpen(true);
  };

  const handleCancelInvitation = async () => {
    // Si hay una invitación creada, cancelarla al cerrar el diálogo
    if (invitationId) {
      await cancelInvitation(invitationId);
      setInvitationId("");
    }

    setIsInviteDialogOpen(false);
    setSelectedUser(null);
    setInvitationMessage("");
  };

  const handleSendInvitation = async () => {
    if (!selectedUser || !invitationMessage) return;

    setIsLoading(true);

    try {
      // La invitación ya está creada, solo enviar el email
      const subject = "Invitación al Sistema de Presupuestos";
      const body = encodeURIComponent(invitationMessage);
      const mailtoLink = `mailto:${selectedUser.email}?subject=${encodeURIComponent(subject)}&body=${body}`;

      // Copiar al portapapeles como fallback
      try {
        await navigator.clipboard.writeText(invitationMessage);
        toast.success("Mensaje copiado al portapapeles");
      } catch (clipboardError) {
        console.error("Error al copiar al portapapeles:", clipboardError);
      }

      // Intentar abrir cliente de email
      window.location.href = mailtoLink;

      toast.success(`Invitación enviada a ${selectedUser.email}`);

      // Cerrar diálogo y limpiar
      setIsInviteDialogOpen(false);
      setSelectedUser(null);
      setInvitationMessage("");
      setInvitationId("");

      // Refresh para actualizar lista
      router.refresh();
    } catch (error) {
      toast.error("Error al enviar invitación");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(invitationMessage);
      toast.success("Mensaje copiado al portapapeles");
    } catch (error) {
      toast.error("Error al copiar al portapapeles");
    }
  };

  // Filtrar usuarios por estado y búsqueda
  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      !search ||
      user.email.toLowerCase().includes(search.toLowerCase()) ||
      (user.name && user.name.toLowerCase().includes(search.toLowerCase())) ||
      (user.last_name && user.last_name.toLowerCase().includes(search.toLowerCase())) ||
      (user.company_name && user.company_name.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus = statusFilter === "all" || user.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <>
      {/* Filtros */}
      <div className="flex gap-4 mb-4 flex-wrap items-center" data-tour="filtro-estado-usuarios">
        <Input
          placeholder="Buscar por email, nombre o empresa..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs bg-white"
        />

        {/* Botones de filtro de estado */}
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={statusFilter === "all" && search === "" ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setStatusFilter("all");
              setSearch("");
            }}
            className={
              statusFilter === "all" && search === ""
                ? "bg-lime-500 hover:bg-lime-600"
                : "border-lime-500 text-lime-600 hover:bg-lime-500 hover:text-white"
            }
          >
            Todos ({users.length})
          </Button>
          <Button
            variant={statusFilter === "active" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("active")}
            disabled={!statusCounts["active"]}
            className={
              statusFilter === "active"
                ? "bg-lime-500 hover:bg-lime-600"
                : "border-lime-500 text-lime-600 hover:bg-lime-500 hover:text-white"
            }
          >
            Activos{statusCounts["active"] ? ` (${statusCounts["active"]})` : ""}
          </Button>
          <Button
            variant={statusFilter === "inactive" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("inactive")}
            disabled={!statusCounts["inactive"]}
            className={
              statusFilter === "inactive"
                ? "bg-lime-500 hover:bg-lime-600"
                : "border-lime-500 text-lime-600 hover:bg-lime-500 hover:text-white"
            }
          >
            Inactivos{statusCounts["inactive"] ? ` (${statusCounts["inactive"]})` : ""}
          </Button>
        </div>
      </div>

      {/* Contador de resultados */}
      {users.length > 0 && (
        <div className="mb-4 text-sm text-muted-foreground">
          Mostrando {filteredUsers.length} de {users.length} Usuarios
        </div>
      )}

      {/* Vista Desktop - Tabla */}
      <div className="hidden lg:block rounded-md border bg-gray-100" data-tour="tabla-usuarios">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="p-4">Email</TableHead>
              <TableHead className="p-4 text-center">Usuario</TableHead>
              <TableHead className="p-4 text-center">Empresa</TableHead>
              <TableHead className="p-4 text-center">Estado</TableHead>
              <TableHead className="p-4 text-center">Invitado por</TableHead>
              <TableHead className="p-4 text-center">Último acceso</TableHead>
              <TableHead className="p-4 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center text-muted-foreground py-4"
                >
                  {search || statusFilter !== "all"
                    ? "No se encontraron usuarios con los filtros aplicados"
                    : "No hay usuarios registrados"}
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => (
                <TableRow
                  key={user.id}
                  className="bg-white border-t hover:bg-lime-100/100"
                >
                  {/* Columna Email */}
                  <TableCell className="p-4">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span
                          className="font-medium"
                          style={{ fontSize: "12px" }}
                        >
                          {user.email}
                        </span>
                      </div>

                      {/* Botón [+ email] - Solo si no tiene inviter y status=pending */}
                      {!user.inviter_name &&
                       user.status === "pending" &&
                       currentUserRole !== "comercial" && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleInviteUser(user)}
                                disabled={isLoading}
                                className="border-lime-500 text-lime-600 hover:bg-lime-500 hover:text-white ml-2"
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                <Mail className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Invitar por email</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  </TableCell>

                  {/* Columna Usuario (Nombre + Rol) */}
                  <TableCell className="p-4 text-center">
                    <div className="space-y-0.5">
                      <div className="text-xs font-medium">
                        {user.name} {user.apellidos}
                      </div>
                      <div className="text-xs text-muted-foreground capitalize">
                        {getRoleLabel(user.role)}
                      </div>
                    </div>
                  </TableCell>

                  {/* Columna Empresa */}
                  <TableCell className="p-4 text-center">
                    <div className="text-xs font-medium">
                      {user.company_name || "-"}
                    </div>
                  </TableCell>

                  {/* Columna Estado con Selector */}
                  <TableCell className="p-4">
                    <div className="flex justify-center" data-tour="select-estado-usuario">
                      <Select
                        value={user.status}
                        onValueChange={(value) =>
                          handleStatusChange(
                            user.id,
                            value as "active" | "inactive" | "pending"
                          )
                        }
                        disabled={
                          currentUserRole === "comercial" &&
                          user.id !== currentUserId
                        }
                      >
                        <SelectTrigger className="w-[140px] bg-white">
                          <SelectValue>
                            <Badge
                              className={
                                statusColors[
                                  user.status as keyof typeof statusColors
                                ] || "bg-gray-200 text-gray-700"
                              }
                            >
                              {statusLabels[
                                user.status as keyof typeof statusLabels
                              ] || user.status}
                            </Badge>
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="bg-white">
                          <SelectItem value="active">
                            <Badge className="bg-green-100 text-green-800">
                              Activo
                            </Badge>
                          </SelectItem>
                          <SelectItem value="inactive">
                            <Badge className="bg-gray-200 text-gray-700">
                              Inactivo
                            </Badge>
                          </SelectItem>
                          <SelectItem value="pending">
                            <Badge className="bg-orange-100 text-orange-800">
                              Pendiente
                            </Badge>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </TableCell>

                  {/* Columna Invitado por */}
                  <TableCell className="p-4 text-center">
                    {user.inviter_name ? (
                      <div className="space-y-0.5">
                        <div className="text-xs font-medium">
                          {user.inviter_name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {user.inviter_email}
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>

                  {/* Columna Último acceso */}
                  <TableCell
                    className="p-4 text-center text-muted-foreground"
                    style={{ fontSize: "12px" }}
                  >
                    {formatDate(user.last_login)}
                  </TableCell>

                  {/* Columna Acciones */}
                  <TableCell className="p-4">
                    <TooltipProvider>
                      <div className="flex justify-end gap-2">
                        {/* Comercial solo puede editar su propio usuario */}
                        {currentUserRole === "comercial" &&
                        user.id !== currentUserId ? (
                          <span className="text-muted-foreground text-sm">
                            -
                          </span>
                        ) : (
                          <>
                            {/* Botón Editar Usuario */}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  asChild
                                  data-tour="btn-editar-usuario"
                                  className="border-lime-500 text-lime-600 hover:bg-lime-500 hover:text-white"
                                >
                                  <Link href={`/users/${user.id}/edit`}>
                                    <Pencil className="h-4 w-4" />
                                  </Link>
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Editar Usuario</p>
                              </TooltipContent>
                            </Tooltip>

                            {/* Botón Borrar Usuario - Solo admin/superadmin, excepto el superadmin protegido y el propio usuario */}
                            {currentUserRole !== "comercial" &&
                             user.id !== currentUserId &&
                             user.email !== "josivela+super@gmail.com" && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    data-tour="btn-borrar-usuario"
                                    onClick={() => {
                                      setSelectedUser(user);
                                      setReassignUserId("");
                                      setIsDeleteDialogOpen(true);
                                    }}
                                    className="border-red-500 text-red-600 hover:bg-red-500 hover:text-white"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Borrar usuario</p>
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
        {filteredUsers.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground border rounded-lg">
            {search || statusFilter !== "all"
              ? "No se encontraron usuarios con los filtros aplicados"
              : "No hay usuarios registrados"}
          </div>
        ) : (
          filteredUsers.map((user) => (
            <UserCard
              key={user.id}
              user={user}
              currentUserId={currentUserId}
              currentUserRole={currentUserRole}
              onToggleStatus={handleToggleStatusFromCard}
              onStatusChange={handleStatusChange}
              onDelete={handleDeleteFromCard}
              onInviteUser={handleInviteUser}
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
                {selectedUser?.name} {selectedUser?.last_name}
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

      {/* Dialog confirmar borrado de usuario */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600">
              ⚠️ Borrar Usuario
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <div>
                ¿Estás seguro de que quieres borrar a{" "}
                <strong className="text-foreground">
                  {selectedUser?.name} {selectedUser?.last_name}
                </strong>
                ?
              </div>

              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <div className="text-sm text-red-800">
                  <strong>⚠️ Advertencia:</strong> Esta acción no se puede deshacer.
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground">
                  ¿Qué hacer con los datos del usuario? (tarifas, presupuestos, etc.):
                </label>

                <RadioGroup value={deleteAction} onValueChange={(value: "delete" | "reassign") => setDeleteAction(value)}>
                  <div className="flex items-start space-x-3 p-3 rounded-lg border-2 border-gray-200 hover:border-gray-300">
                    <RadioGroupItem value="delete" id="delete" className="mt-1" />
                    <Label htmlFor="delete" className="flex-1 cursor-pointer">
                      <div className="space-y-1">
                        <div className="font-semibold text-base">Borrar todos los datos</div>
                        <div className="text-sm text-gray-600">
                          Se eliminarán permanentemente todas las tarifas, presupuestos y demás datos creados por este usuario.
                        </div>
                      </div>
                    </Label>
                  </div>

                  <div className="flex items-start space-x-3 p-3 rounded-lg border-2 border-gray-200 hover:border-gray-300">
                    <RadioGroupItem value="reassign" id="reassign" className="mt-1" />
                    <Label htmlFor="reassign" className="flex-1 cursor-pointer">
                      <div className="space-y-1">
                        <div className="font-semibold text-base">Reasignar datos a otro usuario</div>
                        <div className="text-sm text-gray-600">
                          Los datos del usuario (tarifas, presupuestos, etc.) se asignarán al usuario que selecciones.
                        </div>
                      </div>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {deleteAction === "reassign" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Reasignar registros a:
                  </label>
                  <Select value={reassignUserId} onValueChange={setReassignUserId}>
                    <SelectTrigger className="w-full bg-white">
                      <SelectValue placeholder="Selecciona un usuario" />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      {users
                        .filter(
                          (u) =>
                            u.id !== selectedUser?.id &&
                            u.status === "active"
                        )
                        .map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.name} {user.last_name} ({user.email})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  {!reassignUserId && (
                    <div className="text-xs text-muted-foreground">
                      Debes seleccionar un usuario para continuar
                    </div>
                  )}
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              disabled={isLoading || (deleteAction === "reassign" && !reassignUserId)}
              className="bg-red-600 hover:bg-red-700"
            >
              {isLoading ? "Borrando..." : "Sí, borrar usuario"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog invitar usuario */}
      <AlertDialog
        open={isInviteDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            handleCancelInvitation();
          }
        }}
      >
        <AlertDialogContent className="w-[80vw] max-w-[80vw] sm:w-[80vw] sm:max-w-[80vw] h-[80vh] max-h-[80vh] flex flex-col overflow-hidden">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lime-600 flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Invitar Usuario
            </AlertDialogTitle>
          </AlertDialogHeader>

          <div className="space-y-3 overflow-y-auto overflow-x-hidden flex-1 px-1">
            <div className="text-sm text-muted-foreground break-words">
              Se enviará un email a{" "}
              <strong className="text-foreground">{selectedUser?.email}</strong>{" "}
              con un enlace para que configure su contraseña y acceda al sistema.
            </div>

            <div className="bg-lime-50 border border-lime-200 rounded-md p-3">
              <div className="text-sm font-medium text-lime-900 mb-2">
                Vista previa del mensaje:
              </div>
              <div className="bg-white border border-lime-100 rounded p-3 text-sm text-gray-700 whitespace-pre-wrap break-words max-h-60 overflow-y-auto overflow-x-hidden">
                {invitationMessage}
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyToClipboard}
                className="flex-1"
              >
                <Copy className="h-4 w-4 mr-2" />
                Copiar al portapapeles
              </Button>
            </div>

            <div className="bg-lime-50 border border-blue-200 rounded-md p-3">
              <div className="text-xs text-blue-800 break-words">
                ℹ️ <strong>Nota:</strong> Al confirmar, se intentará abrir tu aplicación
                de email predeterminada con el mensaje prellenado. Si no funciona,
                el mensaje ya estará copiado en tu portapapeles para que puedas
                pegarlo manualmente.
              </div>
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading} onClick={handleCancelInvitation}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSendInvitation}
              disabled={isLoading}
              className="bg-lime-600 hover:bg-lime-700"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Enviar Invitación
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
