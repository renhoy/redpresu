"use client";

import React, { useState, useEffect } from "react";
import { Budget } from "@/lib/types/database";
import { formatCurrency } from "@/lib/helpers/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
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
import {
  Pencil,
  Trash2,
  FileStack,
  ChevronDown,
  ChevronRight,
  FileText,
  Download,
  Upload,
  Plus,
  Eye,
  Layers,
  FilePlus,
  Copy,
  Play,
} from "lucide-react";
import {
  startTour,
  checkAndStartPendingTour,
} from "@/lib/helpers/tour-helpers";
import {
  deleteBudget,
  deleteBudgetPDF,
  updateBudgetStatus,
  generateBudgetPDF,
  duplicateBudgetCopy,
  getBudgetPDFSignedUrl,
} from "@/app/actions/budgets";
import { exportBudgets } from "@/app/actions/export";
import { importBudgets } from "@/app/actions/import";
import { downloadFile } from "@/lib/helpers/export-helpers";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { validateJSONFile } from "@/lib/helpers/file-validation";
import Link from "next/link";
import { BudgetNotesIcon } from "./BudgetNotesIcon";
import { BudgetCard } from "./BudgetCard";

interface BudgetsTableProps {
  budgets: Budget[];
  tariffId?: string;
}

const statusColors = {
  borrador: "bg-black text-neutral-200",
  pendiente: "bg-orange-100 text-yellow-800",
  enviado: "bg-slate-100 text-lime-600",
  aprobado: "bg-lime-50 text-green-600",
  rechazado: "bg-pink-100 text-rose-600",
  caducado: "bg-neutral-200 text-black",
};

export function BudgetsTable({ budgets, tariffId }: BudgetsTableProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedBudgets, setExpandedBudgets] = useState<Set<string>>(
    new Set()
  );
  const [selectedBudgets, setSelectedBudgets] = useState<string[]>([]);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState<string | null>(null);
  const [duplicating, setDuplicating] = useState<string | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{
    budgetId: string;
    clientName: string;
    hasPdf: boolean;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editDialogBudget, setEditDialogBudget] = useState<Budget | null>(null);
  const [editAction, setEditAction] = useState<"presupuesto" | "notas">(
    "presupuesto"
  );

  // Calcular contadores por estado
  const statusCounts = budgets.reduce((acc, budget) => {
    acc[budget.status] = (acc[budget.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Filtrado local
  const filteredBudgets = budgets.filter((budget) => {
    const matchesSearch =
      !search ||
      budget.client_name.toLowerCase().includes(search.toLowerCase()) ||
      (budget.client_nif_nie &&
        budget.client_nif_nie.toLowerCase().includes(search.toLowerCase())) ||
      (budget.budget_number &&
        budget.budget_number.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus =
      statusFilter === "all" || budget.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleDelete = (
    budgetId: string,
    clientName: string,
    hasPdf: boolean
  ) => {
    setDeleteDialog({ budgetId, clientName, hasPdf });
  };

  const handleDeletePDF = async () => {
    if (!deleteDialog) return;

    setIsDeleting(true);
    const result = await deleteBudgetPDF(deleteDialog.budgetId);

    if (result.success) {
      toast.success("PDF eliminado");
      setDeleteDialog(null);
      router.refresh();
    } else {
      toast.error(result.error || "Error al eliminar PDF");
    }
    setIsDeleting(false);
  };

  const handleDeleteBudget = async () => {
    if (!deleteDialog) return;

    setIsDeleting(true);
    const result = await deleteBudget(deleteDialog.budgetId);

    if (result.success) {
      toast.success("Presupuesto eliminado");
      setDeleteDialog(null);
      router.refresh();
    } else {
      toast.error(result.error || "Error al eliminar");
    }
    setIsDeleting(false);
  };

  const handleGeneratePDF = async (budgetId: string) => {
    setGeneratingPdf(budgetId);
    toast.info("Generando PDF... Esto puede tardar hasta 60 segundos");

    try {
      const result = await generateBudgetPDF(budgetId);

      if (result.success && result.pdf_url) {
        toast.success("PDF generado exitosamente");
        // Abrir PDF en nueva pestaña
        window.open(result.pdf_url, "_blank");
        // Refrescar la tabla para mostrar el nuevo PDF
        router.refresh();
      } else if (result.success && result.debug) {
        toast.success("Payload generado (modo desarrollo)");
      } else {
        toast.error(result.error || "Error generando PDF");
      }
    } catch (error) {
      toast.error("Error inesperado al generar PDF");
    } finally {
      setGeneratingPdf(null);
    }
  };

  const handleDuplicate = async (budgetId: string, clientName: string) => {
    if (duplicating) return;

    setDuplicating(budgetId);
    try {
      const result = await duplicateBudgetCopy(budgetId);

      if (result.success) {
        toast.success(`Presupuesto de "${clientName}" duplicado exitosamente`);
        router.refresh();
      } else {
        toast.error(result.error || "Error al duplicar presupuesto");
      }
    } catch {
      toast.error("Error inesperado al duplicar");
    } finally {
      setDuplicating(null);
    }
  };

  const handleEditAction = () => {
    if (!editDialogBudget) return;

    if (editAction === "presupuesto") {
      window.open(
        `/budgets/create?tariff_id=${editDialogBudget.tariff_id}&budget_id=${editDialogBudget.id}`,
        "_blank"
      );
    } else {
      window.open(`/budgets/${editDialogBudget.id}/edit-notes`, "_blank");
    }

    setEditDialogBudget(null);
    setEditAction("presupuesto"); // Reset to default
  };

  const getDaysRemaining = (
    startDate: string | null,
    validityDays: number | null
  ) => {
    if (!startDate || !validityDays) return null;

    const start = new Date(startDate);
    const end = new Date(start);
    end.setDate(end.getDate() + validityDays);

    const today = new Date();
    const daysLeft = Math.ceil(
      (end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    return {
      current: Math.max(0, validityDays - daysLeft),
      total: validityDays,
      remaining: Math.max(0, daysLeft),
      isExpiring: daysLeft < 7 && daysLeft > 0,
    };
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const getUserName = (budget: Budget) => {
    if (
      budget.users &&
      typeof budget.users === "object" &&
      "name" in budget.users
    ) {
      return (budget.users as { name: string; role?: string }).name;
    }
    return "N/A";
  };

  const getUserRole = (budget: Budget) => {
    if (
      budget.users &&
      typeof budget.users === "object" &&
      "role" in budget.users
    ) {
      return (budget.users as { name: string; role: string }).role;
    }
    return "N/A";
  };

  // Selección múltiple
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      // Aplanar todos los presupuestos (padres e hijos)
      const allBudgetIds: string[] = [];
      const collectIds = (budgets: Budget[]) => {
        budgets.forEach((b) => {
          allBudgetIds.push(b.id);
          if (b.children && b.children.length > 0) {
            collectIds(b.children);
          }
        });
      };
      collectIds(filteredBudgets);
      setSelectedBudgets(allBudgetIds);
    } else {
      setSelectedBudgets([]);
    }
  };

  const handleSelectBudget = (budgetId: string, checked: boolean) => {
    if (checked) {
      setSelectedBudgets((prev) => [...prev, budgetId]);
    } else {
      setSelectedBudgets((prev) => prev.filter((id) => id !== budgetId));
    }
  };

  // Aplanar estructura para calcular total de presupuestos
  const getAllBudgetIds = (budgets: Budget[]): string[] => {
    const ids: string[] = [];
    const collectIds = (budgets: Budget[]) => {
      budgets.forEach((b) => {
        ids.push(b.id);
        if (b.children && b.children.length > 0) {
          collectIds(b.children);
        }
      });
    };
    collectIds(budgets);
    return ids;
  };

  const allBudgetIds = getAllBudgetIds(filteredBudgets);
  const isAllSelected =
    allBudgetIds.length > 0 && selectedBudgets.length === allBudgetIds.length;
  const isSomeSelected = selectedBudgets.length > 0;

  // Detectar y ejecutar tour pendiente
  useEffect(() => {
    checkAndStartPendingTour();
  }, []);

  // Exportación
  const handleExport = async () => {
    if (selectedBudgets.length === 0) {
      toast.error("Selecciona al menos un presupuesto");
      return;
    }

    setExporting(true);
    const result = await exportBudgets(selectedBudgets, "json");

    if (result.success && result.data) {
      // Detectar si es un array de archivos o un único archivo
      if ("files" in result.data) {
        // Múltiples archivos: descargar con delay
        for (const file of result.data.files) {
          downloadFile(file.content, file.filename, file.mimeType);
          await new Promise((resolve) => setTimeout(resolve, 300)); // delay 300ms
        }
        toast.success(`${result.data.files.length} archivo(s) exportado(s)`);
      } else {
        // Un único archivo
        downloadFile(
          result.data.content,
          result.data.filename,
          result.data.mimeType
        );
        toast.success(`Presupuesto exportado`);
      }
      setSelectedBudgets([]);
    } else {
      toast.error(result.error || "Error al exportar");
    }

    setExporting(false);
  };

  // Importación
  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // SECURITY (VULN-015): Validar tipo y tamaño de archivo
    const validation = validateJSONFile(file);
    if (!validation.valid) {
      toast.error(validation.error || "Archivo no válido");
      e.target.value = ""; // Limpiar input
      return;
    }

    setImporting(true);

    try {
      // Leer contenido del archivo
      const content = await file.text();

      // Importar presupuestos
      const result = await importBudgets(content);

      if (result.success && result.data) {
        toast.success(
          `${result.data.count} presupuesto(s) importado(s) correctamente`
        );
        // Recargar página
        router.refresh();
      } else {
        toast.error(result.error || "Error al importar presupuestos");
      }
    } catch (error) {
      toast.error("Error al leer el archivo");
    } finally {
      setImporting(false);
      // Limpiar input
      e.target.value = "";
    }
  };

  // Transiciones válidas de estado - Permitir cambiar a cualquier estado
  const getValidTransitions = (currentStatus: string): string[] => {
    // Todos los estados disponibles
    const allStatuses = [
      "borrador",
      "pendiente",
      "enviado",
      "aprobado",
      "rechazado",
      "caducado",
    ];
    // Retornar todos los estados (incluyendo el actual, ya que el Select lo necesita)
    return allStatuses;
  };

  const handleStatusChange = async (
    budgetId: string,
    currentStatus: string,
    newStatus: string,
    clientName: string
  ) => {
    // Confirmar cambios críticos
    const criticalTransitions = ["aprobado", "rechazado"];
    if (criticalTransitions.includes(newStatus)) {
      const action = newStatus === "aprobado" ? "aprobar" : "rechazar";
      if (
        !confirm(`¿Estás seguro de ${action} el presupuesto de ${clientName}?`)
      ) {
        return;
      }
    }

    const result = await updateBudgetStatus(budgetId, newStatus);

    if (result.success) {
      toast.success(`Estado actualizado a ${newStatus}`);
      router.refresh();
    } else {
      toast.error(result.error || "Error al actualizar estado");
    }
  };

  const toggleExpanded = (budgetId: string) => {
    setExpandedBudgets((prev) => {
      const next = new Set(prev);
      if (next.has(budgetId)) {
        next.delete(budgetId);
      } else {
        next.add(budgetId);
      }
      return next;
    });
  };

  const renderBudgetRow = (budget: Budget, depth: number = 0) => {
    const days = getDaysRemaining(budget.start_date, budget.validity_days);
    const tariffTitle =
      (budget as any).redpresu_tariffs &&
      typeof (budget as any).redpresu_tariffs === "object" &&
      "title" in (budget as any).redpresu_tariffs
        ? ((budget as any).redpresu_tariffs as { title: string }).title
        : "N/A";
    const hasChildren = budget.children && budget.children.length > 0;
    const isExpanded = expandedBudgets.has(budget.id);
    const isChild = depth > 0;

    return (
      <React.Fragment key={budget.id}>
        <tr
          className={`bg-white border-t hover:bg-lime-100/100 ${
            isChild ? "bg-lime-50/30" : ""
          }`}
        >
          {/* Checkbox */}
          <td className="p-4 w-12">
            <Checkbox
              checked={selectedBudgets.includes(budget.id)}
              onCheckedChange={(checked) =>
                handleSelectBudget(budget.id, !!checked)
              }
            />
          </td>

          {/* Cliente */}
          <td className="p-4">
            <div className="flex items-center gap-2">
              {/* Indentación visual + icono expandir/colapsar */}
              {hasChildren && (
                <div
                  style={{ marginLeft: `${depth * 24}px` }}
                  className="flex items-center gap-1"
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 p-0"
                    onClick={() => toggleExpanded(budget.id)}
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              )}

              {/* Datos del cliente - Grid 2 columnas */}
              <div
                className="grid grid-cols-[1fr_auto] gap-2 flex-1"
                style={{ marginLeft: depth > 0 ? `${depth * 24}px` : "0" }}
              >
                {/* Columna 1: Info cliente */}
                <div className="space-y-1">
                  {/* Fila 1: Número + Nombre + NIF + Tipo */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-semibold text-primary">
                      {budget.budget_number}
                    </span>
                    <span className="font-medium text-xs">
                      {budget.client_name} ({budget.client_nif_nie || "N/A"})
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {budget.client_type}
                    </Badge>
                    {isChild && (
                      <Badge variant="outline" className="text-xs">
                        v{budget.version_number}
                      </Badge>
                    )}
                  </div>
                  {/* Fila 2: Fecha y días restantes */}
                  {days && budget.start_date && budget.end_date && (
                    <div
                      className={`text-xs ${
                        days.isExpiring
                          ? "text-orange-600 font-medium"
                          : "text-muted-foreground"
                      }`}
                    >
                      {formatDate(budget.start_date)} -{" "}
                      {formatDate(budget.end_date)} ({days.remaining} de{" "}
                      {days.total} días restantes)
                    </div>
                  )}
                </div>

                {/* Columna 2: Icono de notas (alineado derecha) */}
                <div className="flex items-start justify-end">
                  <BudgetNotesIcon data-tour="btn-nota" budgetId={budget.id} />
                </div>
              </div>
            </div>
          </td>

          <td className="p-4 text-center">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    data-tour="btn-tarifa"
                    variant="outline"
                    size="icon"
                    asChild
                    className="border-lime-500 text-lime-600 hover:bg-lime-500 hover:text-white"
                  >
                    <Link href={`/tariffs?tariff_id=${budget.tariff_id}`}>
                      <Layers className="h-4 w-4" />
                    </Link>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{tariffTitle}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </td>

          <td className="p-4 text-right font-mono">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span
                    data-tour="columna-total"
                    className="cursor-help"
                    style={{ fontSize: "12px" }}
                  >
                    {formatCurrency(budget.total || 0)}
                  </span>
                </TooltipTrigger>
                <TooltipContent className="text-sm">
                  <div className="space-y-1">
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">
                        Base Imponible:
                      </span>
                      <span className="font-medium">
                        {formatCurrency(budget.base || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">IVA:</span>
                      <span className="font-medium">
                        {formatCurrency(budget.iva || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between gap-4 border-t pt-1">
                      <span className="font-semibold">Total:</span>
                      <span className="font-semibold">
                        {formatCurrency(budget.total || 0)}
                      </span>
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </td>

          <td className="p-4">
            <Select
              value={budget.status}
              onValueChange={(newStatus) =>
                handleStatusChange(
                  budget.id,
                  budget.status,
                  newStatus,
                  budget.client_name
                )
              }
            >
              <SelectTrigger
                data-tour="select-estado-presupuesto"
                className="w-[140px] bg-white"
              >
                <SelectValue>
                  <Badge
                    className={
                      statusColors[budget.status as keyof typeof statusColors]
                    }
                  >
                    {budget.status}
                  </Badge>
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="borrador">
                  <Badge className={statusColors["borrador"]}>borrador</Badge>
                </SelectItem>
                <SelectItem value="pendiente">
                  <Badge className={statusColors["pendiente"]}>pendiente</Badge>
                </SelectItem>
                <SelectItem value="enviado">
                  <Badge className={statusColors["enviado"]}>enviado</Badge>
                </SelectItem>
                <SelectItem value="aprobado">
                  <Badge className={statusColors["aprobado"]}>aprobado</Badge>
                </SelectItem>
                <SelectItem value="rechazado">
                  <Badge className={statusColors["rechazado"]}>rechazado</Badge>
                </SelectItem>
                <SelectItem value="caducado">
                  <Badge className={statusColors["caducado"]}>caducado</Badge>
                </SelectItem>
              </SelectContent>
            </Select>
          </td>

          <td className="p-4">
            <div className="space-y-0.5">
              <div className="text-sm font-medium">{getUserName(budget)}</div>
              <div className="text-xs text-muted-foreground capitalize">
                {getUserRole(budget)}
              </div>
            </div>
          </td>

          <td className="p-4 text-center">
            {/* Si NO es borrador */}
            {budget.status !== "borrador" && (
              <>
                {/* Si tiene PDF: botón Ver PDF */}
                {budget.pdf_url ? (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          data-tour="btn-generar-pdf"
                          variant="outline"
                          size="icon"
                          onClick={async () => {
                            const result = await getBudgetPDFSignedUrl(
                              budget.id
                            );
                            if (result.success && result.signedUrl) {
                              window.open(result.signedUrl, "_blank");
                            } else {
                              toast.error(
                                result.error || "Error obteniendo PDF"
                              );
                            }
                          }}
                          className="border-lime-500 text-lime-600 hover:bg-lime-500 hover:text-white"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Ver PDF</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : (
                  /* Si NO tiene PDF: botón Generar PDF */
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          data-tour="btn-generar-pdf"
                          variant="outline"
                          size="icon"
                          onClick={() => handleGeneratePDF(budget.id)}
                          disabled={generatingPdf === budget.id}
                          className="border-lime-500 text-lime-600 hover:bg-lime-500 hover:text-white"
                        >
                          <FilePlus className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Generar PDF</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </>
            )}
          </td>

          <td className="p-4">
            <TooltipProvider>
              <div className="flex justify-end gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      data-tour="btn-editar-presupuesto"
                      variant="outline"
                      size="icon"
                      onClick={() => setEditDialogBudget(budget)}
                      className="border-lime-500 text-lime-600 hover:bg-lime-500 hover:text-white"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Editar</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      data-tour="btn-duplicar-presupuesto"
                      variant="outline"
                      size="icon"
                      onClick={() =>
                        handleDuplicate(budget.id, budget.client_name)
                      }
                      disabled={duplicating === budget.id}
                      className="border-lime-500 text-lime-600 hover:bg-lime-500 hover:text-white"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Duplicar</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      data-tour="btn-eliminar-presupuesto"
                      variant="outline"
                      size="icon"
                      onClick={() =>
                        handleDelete(
                          budget.id,
                          budget.client_name,
                          !!budget.pdf_url
                        )
                      }
                      className="border-red-500 text-red-600 hover:bg-red-500 hover:text-white"
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
          </td>
        </tr>

        {/* Renderizar hijos si está expandido */}
        {hasChildren &&
          isExpanded &&
          budget.children!.map((child) => renderBudgetRow(child, depth + 1))}
      </React.Fragment>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header con botones */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="text-center md:text-left w-full md:w-auto">
          <div className="flex items-center justify-center md:justify-start gap-3">
            <h1 className="text-3xl font-bold text-black flex items-center gap-2">
              <FileText className="h-6 w-6" />
              Presupuestos
            </h1>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const tourId =
                  filteredBudgets.length === 0
                    ? "presupuestos-page-vacia"
                    : "presupuestos-page";
                startTour(tourId);
              }}
              className="border-lime-500 text-lime-600 hover:bg-lime-500 hover:text-white0 hover:text-white h-8 px-3 gap-1.5"
            >
              <Play className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">Guía</span>
            </Button>
          </div>
          <p className="text-sm text-black">
            Gestiona tus presupuestos creados
          </p>
        </div>
        <div className="flex flex-wrap gap-2 justify-center md:justify-end w-full md:w-auto">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  id="btn-exportar-presupuesto"
                  variant="outline"
                  disabled={!isSomeSelected || exporting}
                  onClick={handleExport}
                  className="border-lime-500 text-lime-600 hover:bg-lime-500 hover:text-white"
                >
                  <Download className="mr-2 h-4 w-4" />
                  {isSomeSelected
                    ? `Exportar (${selectedBudgets.length})`
                    : "Exportar"}
                </Button>
              </TooltipTrigger>
              {!isSomeSelected && (
                <TooltipContent>
                  <p>
                    Selecciona uno o varios elementos de la lista para exportar
                  </p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>

          <>
            <input
              id="import-budget-file-input"
              type="file"
              accept=".json"
              onChange={handleFileImport}
              className="hidden"
              disabled={importing}
            />
            <Button
              id="btn-importar-presupuesto"
              variant="outline"
              className="border-lime-500 text-lime-600 hover:bg-lime-500 hover:text-white"
              onClick={() =>
                document.getElementById("import-budget-file-input")?.click()
              }
              disabled={importing}
            >
              <Upload className="mr-2 h-4 w-4" />
              {importing ? "Importando..." : "Importar"}
            </Button>
          </>

          <Button
            id="btn-nuevo-presupuesto-list"
            asChild
            className="bg-lime-500 hover:bg-lime-600"
          >
            <Link href="/budgets/create" target="_blank">
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Presupuesto
            </Link>
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <div
        id="filtros-presupuesto"
        className="flex gap-4 mb-4 flex-wrap items-center"
      >
        <Input
          placeholder="Buscar por número, cliente o NIF..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs bg-white"
        />

        {/* Botones de filtro de estado */}
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={
              statusFilter === "all" && search === "" && !tariffId ? "default" : "outline"
            }
            size="sm"
            onClick={() => {
              setStatusFilter("all");
              setSearch("");
              // Si hay tariffId, navegar a /budgets para limpiar filtro
              if (tariffId) {
                router.push("/budgets");
              }
            }}
            className={
              statusFilter === "all" && search === "" && !tariffId
                ? "bg-lime-500 hover:bg-lime-600"
                : "border-lime-500 text-lime-600 hover:bg-lime-500 hover:text-white"
            }
          >
            Todos ({budgets.length})
          </Button>
          <Button
            variant={statusFilter === "borrador" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("borrador")}
            disabled={!statusCounts["borrador"]}
            className={
              statusFilter === "borrador"
                ? "bg-lime-500 hover:bg-lime-600"
                : "border-lime-500 text-lime-600 hover:bg-lime-500 hover:text-white"
            }
          >
            Borradores
            {statusCounts["borrador"] ? ` (${statusCounts["borrador"]})` : ""}
          </Button>
          <Button
            variant={statusFilter === "pendiente" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("pendiente")}
            disabled={!statusCounts["pendiente"]}
            className={
              statusFilter === "pendiente"
                ? "bg-lime-500 hover:bg-lime-600"
                : "border-lime-500 text-lime-600 hover:bg-lime-500 hover:text-white"
            }
          >
            Pendientes
            {statusCounts["pendiente"] ? ` (${statusCounts["pendiente"]})` : ""}
          </Button>
          <Button
            variant={statusFilter === "enviado" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("enviado")}
            disabled={!statusCounts["enviado"]}
            className={
              statusFilter === "enviado"
                ? "bg-lime-500 hover:bg-lime-600"
                : "border-lime-500 text-lime-600 hover:bg-lime-500 hover:text-white"
            }
          >
            Enviados
            {statusCounts["enviado"] ? ` (${statusCounts["enviado"]})` : ""}
          </Button>
          <Button
            variant={statusFilter === "aprobado" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("aprobado")}
            disabled={!statusCounts["aprobado"]}
            className={
              statusFilter === "aprobado"
                ? "bg-lime-500 hover:bg-lime-600"
                : "border-lime-500 text-lime-600 hover:bg-lime-500 hover:text-white"
            }
          >
            Aprobados
            {statusCounts["aprobado"] ? ` (${statusCounts["aprobado"]})` : ""}
          </Button>
          <Button
            variant={statusFilter === "rechazado" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("rechazado")}
            disabled={!statusCounts["rechazado"]}
            className={
              statusFilter === "rechazado"
                ? "bg-lime-500 hover:bg-lime-600"
                : "border-lime-500 text-lime-600 hover:bg-lime-500 hover:text-white"
            }
          >
            Rechazados
            {statusCounts["rechazado"] ? ` (${statusCounts["rechazado"]})` : ""}
          </Button>
          <Button
            variant={statusFilter === "caducado" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("caducado")}
            disabled={!statusCounts["caducado"]}
            className={
              statusFilter === "caducado"
                ? "bg-lime-500 hover:bg-lime-600"
                : "border-lime-500 text-lime-600 hover:bg-lime-500 hover:text-white"
            }
          >
            Caducados
            {statusCounts["caducado"] ? ` (${statusCounts["caducado"]})` : ""}
          </Button>
        </div>
      </div>

      {/* Contador de resultados */}
      {budgets.length > 0 && (
        <div className="mb-4 text-sm text-muted-foreground">
          Mostrando {filteredBudgets.length} de {budgets.length} Presupuestos
        </div>
      )}

      {/* Vista Desktop - Tabla */}
      <div className="hidden lg:block border rounded-lg overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted bg-lime-200">
              <tr>
                <th className="text-left p-4 font-medium w-12">
                  <Checkbox
                    checked={isAllSelected}
                    onCheckedChange={handleSelectAll}
                  />
                </th>
                <th className="text-left p-4 font-medium w-[40%]">Cliente</th>
                <th className="text-center p-4 font-medium w-[60px]">Tarifa</th>
                <th className="text-right p-4 font-medium w-[150px]">Total</th>
                <th className="text-center p-4 font-medium w-[120px]">
                  Estado
                </th>
                <th className="text-center p-4 font-medium w-[120px]">
                  Usuario
                </th>
                <th className="text-center p-4 font-medium w-[60px]">PDF</th>
                <th className="text-right p-4 font-medium w-[120px]">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredBudgets.map((budget) => renderBudgetRow(budget))}
            </tbody>
          </table>
        </div>

        {filteredBudgets.length === 0 && (
          <div id="nota-crear-tarifa" className="text-center py-12 bg-white">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No hay presupuestos</h3>
            <p className="text-muted-foreground mb-2">
              {search || statusFilter !== "all"
                ? "No se encontraron presupuestos con los filtros aplicados"
                : "Aún no has creado ningún presupuesto"}
            </p>
            {!search && statusFilter === "all" && (
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Para crear presupuestos, primero necesitas tener al menos una
                tarifa activa.{" "}
                <Link href="/tariffs" className="text-lime-600 hover:underline">
                  Ve a la página de Tarifas
                </Link>
                , crea una nueva tarifa, y luego podrás generar presupuestos
                basados en ella.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Vista Mobile/Tablet - Cards */}
      <div className="lg:hidden">
        {filteredBudgets.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No hay presupuestos</h3>
            <p className="text-muted-foreground mb-2">
              {search || statusFilter !== "all"
                ? "No se encontraron presupuestos con los filtros aplicados"
                : "Aún no has creado ningún presupuesto"}
            </p>
            {!search && statusFilter === "all" && (
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Para crear presupuestos, primero necesitas tener al menos una
                tarifa activa.{" "}
                <Link href="/tariffs" className="text-lime-600 hover:underline">
                  Ve a la página de Tarifas
                </Link>
                , crea una nueva tarifa, y luego podrás generar presupuestos
                basados en ella.
              </p>
            )}
          </div>
        ) : (
          filteredBudgets.map((budget) => (
            <BudgetCard
              key={budget.id}
              budget={budget}
              onStatusChange={handleStatusChange}
              onDelete={handleDelete}
              onGeneratePDF={handleGeneratePDF}
              onDuplicate={handleDuplicate}
              statusColors={statusColors}
              getValidTransitions={getValidTransitions}
              getUserName={getUserName}
              getUserRole={getUserRole}
              formatDate={formatDate}
              getDaysRemaining={getDaysRemaining}
              generatingPdf={generatingPdf}
              duplicating={duplicating}
            />
          ))
        )}
      </div>

      {/* Dialog para confirmar eliminación */}
      <AlertDialog
        open={!!deleteDialog}
        onOpenChange={() => setDeleteDialog(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteDialog?.hasPdf
                ? "¿Qué deseas eliminar?"
                : "¿Eliminar presupuesto?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteDialog?.hasPdf ? (
                <>
                  El presupuesto de <strong>{deleteDialog.clientName}</strong>{" "}
                  tiene un PDF generado. Puedes eliminar solo el PDF o eliminar
                  el presupuesto completo (incluido el PDF).
                </>
              ) : (
                <>
                  Esta acción no se puede deshacer. Se eliminará permanentemente
                  el presupuesto de <strong>{deleteDialog?.clientName}</strong>{" "}
                  y todos sus datos asociados.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              Cancelar
            </AlertDialogCancel>
            {deleteDialog?.hasPdf ? (
              <>
                <AlertDialogAction
                  onClick={handleDeletePDF}
                  disabled={isDeleting}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  {isDeleting ? "Eliminando..." : "Borrar PDF"}
                </AlertDialogAction>
                <AlertDialogAction
                  onClick={handleDeleteBudget}
                  disabled={isDeleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isDeleting ? "Eliminando..." : "Borrar Presupuesto"}
                </AlertDialogAction>
              </>
            ) : (
              <AlertDialogAction
                onClick={handleDeleteBudget}
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting ? "Eliminando..." : "Eliminar"}
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog para elegir acción de edición */}
      <AlertDialog
        open={!!editDialogBudget}
        onOpenChange={() => {
          setEditDialogBudget(null);
          setEditAction("presupuesto");
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Editar Presupuesto</AlertDialogTitle>
            <AlertDialogDescription>
              Selecciona qué deseas editar:
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-3 py-4">
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="radio"
                name="edit-action"
                value="presupuesto"
                checked={editAction === "presupuesto"}
                onChange={(e) =>
                  setEditAction(e.target.value as "presupuesto" | "notas")
                }
                className="h-4 w-4 text-lime-600 focus:ring-lime-500"
              />
              <span className="text-sm font-medium">Editar Presupuesto</span>
            </label>

            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="radio"
                name="edit-action"
                value="notas"
                checked={editAction === "notas"}
                onChange={(e) =>
                  setEditAction(e.target.value as "presupuesto" | "notas")
                }
                className="h-4 w-4 text-lime-600 focus:ring-lime-500"
              />
              <span className="text-sm font-medium">
                Editar Notas del Presupuesto
              </span>
            </label>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleEditAction}
              className="bg-lime-500 hover:bg-lime-600"
            >
              Aceptar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
