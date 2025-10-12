"use client";

import { useState } from "react";
import Link from "next/link";
import { Pencil, Trash2, FileText, Plus, Receipt, Star, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
import { TableCell, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/validators";
import {
  toggleTariffStatus,
  deleteTariff,
  setTariffAsTemplate,
  unsetTariffAsTemplate,
} from "@/app/actions/tariffs";
import { Database } from "@/lib/types/database.types";
import { toast } from "sonner";

type Tariff = Database["public"]["Tables"]["tariffs"]["Row"] & {
  creator?: {
    nombre: string | null;
    apellidos: string | null;
    email: string | null;
  } | null;
  budget_count?: number;
};

interface TariffRowProps {
  tariff: Tariff;
  onStatusChange?: () => void;
  onDelete?: () => void;
  currentUserRole?: string;
}

export function TariffRow({
  tariff,
  onStatusChange,
  onDelete,
  currentUserRole,
}: TariffRowProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [isTogglingTemplate, setIsTogglingTemplate] = useState(false);

  const handleStatusChange = async (newStatus: string) => {
    try {
      const result = await toggleTariffStatus(
        tariff.id,
        tariff.status as "Activa" | "Inactiva"
      );
      if (result.success) {
        toast.success(`Estado actualizado a ${newStatus}`);
        onStatusChange?.();
      } else {
        toast.error(result.error || "Error al actualizar estado");
      }
    } catch {
      toast.error("Error inesperado al actualizar estado");
    }
  };

  const handleDelete = async () => {
    if (isDeleting) return;

    setIsDeleting(true);
    try {
      const result = await deleteTariff(tariff.id);
      if (result.success) {
        toast.success("Tarifa eliminada");
        onDelete?.();
        setShowDeleteDialog(false);
      } else {
        toast.error(result.error || "Error al eliminar");
      }
    } catch {
      toast.error("Error inesperado al eliminar");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleTemplate = async () => {
    if (isTogglingTemplate) return;

    setIsTogglingTemplate(true);
    try {
      const result = tariff.is_template
        ? await unsetTariffAsTemplate(tariff.id)
        : await setTariffAsTemplate(tariff.id);

      if (result.success) {
        toast.success(
          tariff.is_template
            ? "Plantilla desmarcada"
            : "Tarifa marcada como plantilla"
        );
        onStatusChange?.(); // Refrescar lista
        setShowTemplateDialog(false);
      } else {
        toast.error(result.error || "Error al cambiar plantilla");
      }
    } catch {
      toast.error("Error inesperado");
    } finally {
      setIsTogglingTemplate(false);
    }
  };

  const isAdmin =
    currentUserRole && ["admin", "superadmin"].includes(currentUserRole);

  const statusColors = {
    Activa: "bg-green-100 text-green-800",
    Inactiva: "bg-gray-200 text-gray-700",
  };

  return (
    <>
      <TableRow className="bg-white border-t hover:bg-lime-50/50">
        {/* Columna Tarifa (Nombre + Descripción) */}
        <TableCell className="p-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium" style={{ fontSize: "12px" }}>
                {tariff.title}
              </span>
            </div>
            <div
              className="text-muted-foreground max-w-xs truncate"
              style={{ fontSize: "12px" }}
            >
              {tariff.description || "Sin descripción"}
            </div>
          </div>
        </TableCell>

        {/* Columna Presupuesto */}
        <TableCell className="p-4 text-center">
          <div className="flex items-center justify-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                {tariff.status === "Activa" ? (
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    className="h-9 px-2 border-cyan-600 text-cyan-600 hover:bg-cyan-50"
                  >
                    <Link
                      href={`/budgets/create?tariff_id=${tariff.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      <Receipt className="h-4 w-4" />
                    </Link>
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled
                    className="h-9 px-2 cursor-not-allowed"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    <Receipt className="h-4 w-4" />
                  </Button>
                )}
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  {tariff.status === "Activa"
                    ? "Crear Presupuesto"
                    : "Tarifa inactiva"}
                </p>
              </TooltipContent>
            </Tooltip>

            {/* Contador de presupuestos */}
            {tariff.budget_count !== undefined && tariff.budget_count > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    className="h-9 px-2 border-cyan-600 text-cyan-600 hover:bg-cyan-50"
                  >
                    <Link href={`/budgets?tariff_id=${tariff.id}`}>
                      <span className="font-medium">{tariff.budget_count}</span>
                      <Eye className="h-4 w-4 ml-1" />
                    </Link>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Ver {tariff.budget_count} presupuesto{tariff.budget_count !== 1 ? 's' : ''}</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </TableCell>

        {/* Columna Estado */}
        <TableCell className="p-4">
          <div className="flex justify-center">
            <Select
              value={tariff.status || "Activa"}
              onValueChange={handleStatusChange}
            >
              <SelectTrigger className="w-[140px] bg-white">
                <SelectValue>
                  <Badge
                    className={
                      statusColors[
                        tariff.status as keyof typeof statusColors
                      ] || "bg-gray-200 text-gray-700"
                    }
                  >
                    {tariff.status || "Activa"}
                  </Badge>
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="Activa">
                  <Badge className="bg-green-100 text-green-800">Activa</Badge>
                </SelectItem>
                <SelectItem value="Inactiva">
                  <Badge className="bg-gray-200 text-gray-700">Inactiva</Badge>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </TableCell>

        {/* Columna Usuario */}
        <TableCell className="p-4 text-center" style={{ fontSize: "12px" }}>
          {tariff.creator ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-muted-foreground cursor-help">
                  {tariff.creator.nombre}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p>{tariff.creator.email}</p>
              </TooltipContent>
            </Tooltip>
          ) : (
            <span className="text-muted-foreground">-</span>
          )}
        </TableCell>

        {/* Columna Validez */}
        <TableCell className="p-4 text-center" style={{ fontSize: "12px" }}>
          <div>
            {tariff.validity ? (
              <span>{tariff.validity} días</span>
            ) : (
              <span className="text-muted-foreground">-</span>
            )}
          </div>
        </TableCell>

        {/* Columna Fecha */}
        <TableCell
          className="p-4 text-center text-muted-foreground"
          style={{ fontSize: "12px" }}
        >
          {formatDate(tariff.created_at)}
        </TableCell>

        <TableCell className="p-4">
          <TooltipProvider>
            <div className="flex justify-end gap-2">
              {/* Botón Plantilla (solo admin/superadmin) */}
              {isAdmin && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={tariff.is_template ? "default" : "outline"}
                      size="icon"
                      onClick={() => setShowTemplateDialog(true)}
                      className={
                        tariff.is_template
                          ? "bg-cyan-600 hover:bg-cyan-700"
                          : "border-cyan-600 text-cyan-600 hover:bg-cyan-50"
                      }
                    >
                      <Star
                        className={`h-4 w-4 ${
                          tariff.is_template ? "fill-current" : ""
                        }`}
                      />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      {tariff.is_template
                        ? "Plantilla actual"
                        : "Marcar como plantilla"}
                    </p>
                  </TooltipContent>
                </Tooltip>
              )}

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    asChild
                    className="border-cyan-600 text-cyan-600 hover:bg-cyan-50"
                  >
                    <Link href={`/tariffs/edit/${tariff.id}`}>
                      <Pencil className="h-4 w-4" />
                    </Link>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Editar</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setShowDeleteDialog(true)}
                    className="border-destructive text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Eliminar</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        </TableCell>
      </TableRow>

      {/* Dialog para confirmar cambio de plantilla */}
      <AlertDialog
        open={showTemplateDialog}
        onOpenChange={setShowTemplateDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {tariff.is_template
                ? "¿Desmarcar plantilla?"
                : "¿Marcar como plantilla?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {tariff.is_template ? (
                <>
                  La tarifa <strong>&quot;{tariff.title}&quot;</strong> dejará
                  de ser la plantilla por defecto. Las nuevas tarifas no se
                  pre-cargarán con estos datos.
                </>
              ) : (
                <>
                  La tarifa <strong>&quot;{tariff.title}&quot;</strong> se
                  marcará como plantilla por defecto. Si existe otra plantilla
                  activa, será reemplazada automáticamente. Las nuevas tarifas
                  se pre-cargarán con los datos de esta tarifa (excepto el CSV).
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleToggleTemplate}
              disabled={isTogglingTemplate}
            >
              {isTogglingTemplate ? "Procesando..." : "Confirmar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar tarifa?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente la
              tarifa
              <strong> &quot;{tariff.title}&quot;</strong> y todos sus datos
              asociados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
