"use client";

import { useState } from "react";
import Link from "next/link";
import { Database } from "@/lib/types/database.types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pencil,
  Trash2,
  Plus,
  Receipt,
  Star,
  FileText,
  Eye,
  Copy,
  Lock,
} from "lucide-react";
import { formatDate } from "@/lib/validators";
import {
  toggleTariffStatus,
  deleteTariff,
  setTariffAsTemplate,
  unsetTariffAsTemplate,
  duplicateTariff,
} from "@/app/actions/tariffs";
import { shouldMarkResourceInactive } from "@/lib/helpers/subscription-status-checker";
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
import { toast } from "sonner";

type Tariff = Database["public"]["Tables"]["tariffs"]["Row"] & {
  creator?: {
    name: string;
    role: string;
  } | null;
  budget_count?: number;
};

interface TariffCardProps {
  tariff: Tariff;
  onStatusChange?: () => void;
  onDelete?: () => void;
  currentUserRole?: string;
  selected?: boolean;
  onSelectChange?: (checked: boolean) => void;
  resourceIndex?: number;
  currentPlan?: string;
}

const statusColors = {
  Borrador: "bg-yellow-100 text-yellow-800",
  Activa: "bg-green-100 text-green-800",
  Inactiva: "bg-gray-200 text-gray-700",
};

export function TariffCard({
  tariff,
  onStatusChange,
  onDelete,
  currentUserRole,
  selected = false,
  onSelectChange,
  resourceIndex = 0,
  currentPlan = 'free',
}: TariffCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [isTogglingTemplate, setIsTogglingTemplate] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);

  // Determinar si este recurso debe mostrarse como inactivo por límites del plan
  const isLimitedByPlan = shouldMarkResourceInactive(resourceIndex, 'tariffs', currentPlan);

  const handleStatusChange = async (newStatus: string) => {
    try {
      const result = await toggleTariffStatus(
        tariff.id,
        tariff.status as "Borrador" | "Activa" | "Inactiva"
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
        onStatusChange?.();
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

  const handleDuplicate = async () => {
    if (isDuplicating) return;

    setIsDuplicating(true);
    try {
      const result = await duplicateTariff(tariff.id);

      if (result.success) {
        toast.success(`Tarifa "${tariff.title}" duplicada exitosamente`);
        onStatusChange?.();
      } else {
        toast.error(result.error || "Error al duplicar tarifa");
      }
    } catch {
      toast.error("Error inesperado al duplicar");
    } finally {
      setIsDuplicating(false);
    }
  };

  const isAdmin =
    currentUserRole && ["admin", "superadmin"].includes(currentUserRole);

  return (
    <>
      <Card className={`w-full mb-4 ${isLimitedByPlan ? 'opacity-50 bg-gray-50' : ''}`}>
        <CardContent className="p-3">
          {/* Vista Mobile: Layout vertical */}
          <div className="md:hidden space-y-3">
            {/* Header: Checkbox + Título + Icono */}
            <div className="flex items-start gap-2">
              {onSelectChange && (
                <Checkbox
                  checked={selected}
                  onCheckedChange={onSelectChange}
                  className="mt-1"
                />
              )}
              <FileText className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-base truncate">
                    {tariff.title}
                  </h3>
                  {tariff.status === 'Borrador' && (
                    <Badge variant="outline" className="border-yellow-500 text-yellow-700 gap-1 flex-shrink-0">
                      <span className="text-xs">⚠️ Incompleta</span>
                    </Badge>
                  )}
                  {isLimitedByPlan && (
                    <Badge variant="outline" className="border-orange-500 text-orange-700 gap-1">
                      <Lock className="h-3 w-3" />
                      <span className="text-xs">Upgrade</span>
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {tariff.description || "Sin descripción"}
                </p>
              </div>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-2 border-t pt-3">
              <div className="min-w-0">
                <Select
                  value={tariff.status || "Activa"}
                  onValueChange={handleStatusChange}
                >
                  <SelectTrigger
                    data-tour="select-estado"
                    className="w-full h-7 text-xs"
                  >
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
                  <SelectContent>
                    <SelectItem value="Activa">
                      <Badge className="bg-green-100 text-green-800">
                        Activa
                      </Badge>
                    </SelectItem>
                    <SelectItem value="Inactiva">
                      <Badge className="bg-gray-200 text-gray-700">
                        Inactiva
                      </Badge>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Validez */}
              <div className="min-w-0 text-right">
                <div className="text-sm font-medium">
                  {tariff.validity ? `${tariff.validity} días` : "-"}
                </div>
              </div>

              {/* Usuario */}
              <div className="min-w-0">
                {tariff.creator ? (
                  <div className="space-y-0.5">
                    <div className="text-sm font-medium truncate">
                      {tariff.creator.name}
                    </div>
                    <div className="text-xs text-muted-foreground capitalize truncate">
                      {tariff.creator.role}
                    </div>
                  </div>
                ) : (
                  <div className="text-sm">-</div>
                )}
              </div>

              {/* Fecha */}
              <div className="min-w-0 text-right">
                <div className="text-sm">{formatDate(tariff.created_at)}</div>
              </div>
            </div>

            {/* Acciones Mobile */}
            <div className="flex justify-end flex-wrap gap-1.5 border-t pt-3">
              {tariff.status === "Activa" && !isLimitedByPlan ? (
                <Button
                  data-tour="btn-crear-presupuesto"
                  variant="outline"
                  size="sm"
                  asChild
                  className="min-w-[20%] h-7 px-2 gap-1.5 text-xs"
                >
                  <Link
                    href={`/budgets/create?tariff_id=${tariff.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Plus className="h-3.5 w-3.5 flex-shrink-0" />
                    <span>Presupuesto</span>
                  </Link>
                </Button>
              ) : (
                <Button
                  data-tour="btn-crear-presupuesto"
                  variant="outline"
                  size="sm"
                  disabled
                  className="min-w-[20%] h-7 px-2 gap-1.5 text-xs"
                >
                  <Plus className="h-3.5 w-3.5 flex-shrink-0" />
                  <span>Presupuesto</span>
                </Button>
              )}

              {/* Contador de presupuestos */}
              {tariff.budget_count !== undefined && tariff.budget_count > 0 && (
                <Button
                  data-tour="btn-ver-presupuestos"
                  variant="outline"
                  size="sm"
                  asChild
                  className="min-w-[20%] h-7 px-2 gap-1.5 text-xs"
                >
                  <Link href={`/budgets?tariff_id=${tariff.id}`}>
                    <Eye className="h-3.5 w-3.5 flex-shrink-0" />
                    <span>{tariff.budget_count} Ver</span>
                  </Link>
                </Button>
              )}

              {isAdmin && (
                <Button
                  data-tour="btn-marcar-plantilla"
                  variant={tariff.is_template ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowTemplateDialog(true)}
                  disabled={isLimitedByPlan}
                  className="min-w-[20%] h-7 px-2 gap-1.5 text-xs"
                >
                  <Star
                    className={`h-3.5 w-3.5 flex-shrink-0 ${
                      tariff.is_template ? "fill-current" : ""
                    }`}
                  />
                  <span>Plantilla</span>
                </Button>
              )}

              {!isLimitedByPlan ? (
                <Button
                  data-tour="btn-editar"
                  variant="outline"
                  size="sm"
                  asChild
                  className="min-w-[20%] h-7 px-2 gap-1.5 text-xs"
                >
                  <Link href={`/tariffs/edit/${tariff.id}`}>
                    <Pencil className="h-3.5 w-3.5 flex-shrink-0" />
                    <span>Editar</span>
                  </Link>
                </Button>
              ) : (
                <Button
                  data-tour="btn-editar"
                  variant="outline"
                  size="sm"
                  disabled
                  className="min-w-[20%] h-7 px-2 gap-1.5 text-xs"
                >
                  <Pencil className="h-3.5 w-3.5 flex-shrink-0" />
                  <span>Editar</span>
                </Button>
              )}

              <Button
                data-tour="btn-duplicar"
                variant="outline"
                size="sm"
                onClick={handleDuplicate}
                disabled={isDuplicating || isLimitedByPlan}
                className="min-w-[20%] h-7 px-2 gap-1.5 text-xs"
              >
                <Copy className="h-3.5 w-3.5 flex-shrink-0" />
                <span>Duplicar</span>
              </Button>

              <Button
                data-tour="btn-eliminar"
                variant="outline"
                size="sm"
                onClick={() => setShowDeleteDialog(true)}
                disabled={isLimitedByPlan}
                className="border-destructive text-destructive hover:bg-destructive/10 min-w-[20%] h-7 px-2 gap-1.5 text-xs"
              >
                <Trash2 className="h-3.5 w-3.5 flex-shrink-0" />
                <span>Borrar</span>
              </Button>
            </div>
          </div>

          {/* Vista Tablet: Layout horizontal 2 columnas */}
          <div className="hidden md:block space-y-3">
            {/* Fila 1: Checkbox + Título/Descripción + Estado/Validez */}
            <div className="grid grid-cols-[auto_1fr_auto] gap-4 items-start">
              {/* Columna 0: Checkbox */}
              {onSelectChange && (
                <div className="pt-1">
                  <Checkbox
                    checked={selected}
                    onCheckedChange={onSelectChange}
                  />
                </div>
              )}

              {/* Columna 1: Título y Descripción */}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-base truncate">
                    {tariff.title}
                  </h3>
                  {isLimitedByPlan && (
                    <Badge variant="outline" className="border-orange-500 text-orange-700 gap-1">
                      <Lock className="h-3 w-3" />
                      <span className="text-xs">Upgrade</span>
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {tariff.description || "Sin descripción"}
                </p>
              </div>

              {/* Columna 3: Estado y Validez */}
              <div className="space-y-1">
                <div className="flex items-center justify-end">
                  <Select
                    value={tariff.status || "Activa"}
                    onValueChange={handleStatusChange}
                  >
                    <SelectTrigger
                      data-tour="select-estado"
                      className="w-auto h-7 text-xs"
                    >
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
                    <SelectContent>
                      <SelectItem value="Activa">
                        <Badge className="bg-green-100 text-green-800">
                          Activa
                        </Badge>
                      </SelectItem>
                      <SelectItem value="Inactiva">
                        <Badge className="bg-gray-200 text-gray-700">
                          Inactiva
                        </Badge>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="text-sm font-medium text-right">
                  {tariff.validity ? `${tariff.validity} días` : "-"}
                </div>
              </div>
            </div>

            {/* Fila 2: Usuario y Fecha (info adicional) */}
            <div className="grid grid-cols-2 gap-4 text-sm border-t pt-3">
              <div>
                {tariff.creator ? (
                  <div className="space-y-0.5">
                    <div className="font-medium truncate">
                      {tariff.creator.name}
                    </div>
                    <div className="text-xs text-muted-foreground capitalize truncate">
                      {tariff.creator.role}
                    </div>
                  </div>
                ) : (
                  <div>-</div>
                )}
              </div>
              <div className="text-right">{formatDate(tariff.created_at)}</div>
            </div>

            {/* Acciones Tablet */}
            <div className="flex flex-wrap justify-end gap-1.5 border-t pt-3">
              {tariff.status === "Activa" && !isLimitedByPlan ? (
                <Button
                  data-tour="btn-crear-presupuesto"
                  variant="outline"
                  size="sm"
                  asChild
                  className="min-w-[20%] h-7 px-2 gap-1.5 text-xs"
                >
                  <Link
                    href={`/budgets/create?tariff_id=${tariff.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Plus className="h-3.5 w-3.5 flex-shrink-0" />
                    <span>Presupuesto</span>
                  </Link>
                </Button>
              ) : (
                <Button
                  data-tour="btn-crear-presupuesto"
                  variant="outline"
                  size="sm"
                  disabled
                  className="min-w-[20%] h-7 px-2 gap-1.5 text-xs"
                >
                  <Plus className="h-3.5 w-3.5 flex-shrink-0" />
                  <span>Presupuesto</span>
                </Button>
              )}

              {/* Contador de presupuestos */}
              {tariff.budget_count !== undefined && tariff.budget_count > 0 && (
                <Button
                  data-tour="btn-ver-presupuestos"
                  variant="outline"
                  size="sm"
                  asChild
                  className="min-w-[20%] h-7 px-2 gap-1.5 text-xs"
                >
                  <Link href={`/budgets?tariff_id=${tariff.id}`}>
                    <Eye className="h-3.5 w-3.5 flex-shrink-0" />
                    <span>{tariff.budget_count} Ver</span>
                  </Link>
                </Button>
              )}

              {isAdmin && (
                <Button
                  data-tour="btn-marcar-plantilla"
                  variant={tariff.is_template ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowTemplateDialog(true)}
                  disabled={isLimitedByPlan}
                  className="min-w-[20%] h-7 px-2 gap-1.5 text-xs"
                >
                  <Star
                    className={`h-3.5 w-3.5 flex-shrink-0 ${
                      tariff.is_template ? "fill-current" : ""
                    }`}
                  />
                  <span>Plantilla</span>
                </Button>
              )}

              {!isLimitedByPlan ? (
                <Button
                  data-tour="btn-editar"
                  variant="outline"
                  size="sm"
                  asChild
                  className="min-w-[20%] h-7 px-2 gap-1.5 text-xs"
                >
                  <Link href={`/tariffs/edit/${tariff.id}`}>
                    <Pencil className="h-3.5 w-3.5 flex-shrink-0" />
                    <span>Editar</span>
                  </Link>
                </Button>
              ) : (
                <Button
                  data-tour="btn-editar"
                  variant="outline"
                  size="sm"
                  disabled
                  className="min-w-[20%] h-7 px-2 gap-1.5 text-xs"
                >
                  <Pencil className="h-3.5 w-3.5 flex-shrink-0" />
                  <span>Editar</span>
                </Button>
              )}

              <Button
                data-tour="btn-duplicar"
                variant="outline"
                size="sm"
                onClick={handleDuplicate}
                disabled={isDuplicating || isLimitedByPlan}
                className="min-w-[20%] h-7 px-2 gap-1.5 text-xs"
              >
                <Copy className="h-3.5 w-3.5 flex-shrink-0" />
                <span>Duplicar</span>
              </Button>

              <Button
                data-tour="btn-eliminar"
                variant="outline"
                size="sm"
                onClick={() => setShowDeleteDialog(true)}
                disabled={isLimitedByPlan}
                className="border-destructive text-destructive hover:bg-destructive/10 min-w-[20%] h-7 px-2 gap-1.5 text-xs"
              >
                <Trash2 className="h-3.5 w-3.5 flex-shrink-0" />
                <span>Borrar</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

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
