"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { approveUser, rejectUser, type PendingUser } from "@/app/actions/user-approvals";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
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
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface PendingRegistrationsTableProps {
  users: PendingUser[];
}

export function PendingRegistrationsTable({ users }: PendingRegistrationsTableProps) {
  const router = useRouter();
  const [processingUserId, setProcessingUserId] = useState<string | null>(null);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<PendingUser | null>(null);

  const handleApprove = async () => {
    if (!selectedUser) return;

    setProcessingUserId(selectedUser.id);
    setShowApproveDialog(false);

    try {
      const result = await approveUser(selectedUser.id);

      if (result.success) {
        toast.success("Usuario aprobado exitosamente", {
          description: `${selectedUser.name} ${selectedUser.last_name} ahora puede acceder a la plataforma`,
        });
        router.refresh(); // Recargar la página para actualizar la lista
      } else {
        toast.error("Error al aprobar usuario", {
          description: result.error,
        });
      }
    } catch (error) {
      toast.error("Error inesperado", {
        description: "No se pudo aprobar el usuario",
      });
    } finally {
      setProcessingUserId(null);
      setSelectedUser(null);
    }
  };

  const handleReject = async () => {
    if (!selectedUser) return;

    setProcessingUserId(selectedUser.id);
    setShowRejectDialog(false);

    try {
      const result = await rejectUser(selectedUser.id);

      if (result.success) {
        toast.success("Usuario rechazado", {
          description: `Se ha rechazado la solicitud de ${selectedUser.name} ${selectedUser.last_name}`,
        });
        router.refresh(); // Recargar la página para actualizar la lista
      } else {
        toast.error("Error al rechazar usuario", {
          description: result.error,
        });
      }
    } catch (error) {
      toast.error("Error inesperado", {
        description: "No se pudo rechazar el usuario",
      });
    } finally {
      setProcessingUserId(null);
      setSelectedUser(null);
    }
  };

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuario</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Fecha de Registro</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">
                  {user.name} {user.last_name}
                </TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-lime-100 text-lime-800">
                    {user.role === "admin" ? "Admin" : user.role === "comercial" ? "Comercial" : "Usuario"}
                  </span>
                </TableCell>
                <TableCell className="text-sm text-gray-600">
                  {format(new Date(user.created_at), "d MMM yyyy, HH:mm", { locale: es })}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="default"
                      className="bg-lime-500 hover:bg-lime-600"
                      onClick={() => {
                        setSelectedUser(user);
                        setShowApproveDialog(true);
                      }}
                      disabled={processingUserId === user.id}
                    >
                      {processingUserId === user.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Aprobar
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        setSelectedUser(user);
                        setShowRejectDialog(true);
                      }}
                      disabled={processingUserId === user.id}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Rechazar
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Diálogo de confirmación de aprobación */}
      <AlertDialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Aprobar usuario?</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que quieres aprobar la solicitud de{" "}
              <span className="font-semibold">
                {selectedUser?.name} {selectedUser?.last_name}
              </span>
              ?
              <br />
              <br />
              El usuario recibirá un email de confirmación y podrá acceder a la plataforma inmediatamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleApprove}
              className="bg-lime-500 hover:bg-lime-600"
            >
              Aprobar Usuario
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Diálogo de confirmación de rechazo */}
      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Rechazar solicitud?</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que quieres rechazar la solicitud de{" "}
              <span className="font-semibold">
                {selectedUser?.name} {selectedUser?.last_name}
              </span>
              ?
              <br />
              <br />
              El usuario recibirá un email de notificación y no podrá acceder a la plataforma.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReject}
              className="bg-red-500 hover:bg-red-600"
            >
              Rechazar Solicitud
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
