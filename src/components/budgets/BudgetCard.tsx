"use client";

import { Budget } from "@/lib/types/database";
import { formatCurrency } from "@/lib/helpers/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Pencil, Trash2, FileStack, FileText, Eye, FilePlus, Copy, Layers } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BudgetNotesIcon } from "./BudgetNotesIcon";
import Link from "next/link";
import { getBudgetPDFSignedUrl } from "@/app/actions/budgets";
import { toast } from "sonner";

interface BudgetCardProps {
  budget: Budget;
  onStatusChange: (
    budgetId: string,
    currentStatus: string,
    newStatus: string,
    clientName: string
  ) => void;
  onDelete: (budgetId: string, clientName: string, hasPdf: boolean) => void;
  onGeneratePDF: (budgetId: string) => void;
  onDuplicate: (budgetId: string, clientName: string) => void;
  statusColors: Record<string, string>;
  getValidTransitions: (status: string) => string[];
  getUserName: (budget: Budget) => string;
  getUserRole: (budget: Budget) => string;
  formatDate: (date: string) => string;
  getDaysRemaining: (
    startDate: string | null,
    validityDays: number | null
  ) => any;
  generatingPdf: string | null;
  duplicating: string | null;
}

const statusColors = {
  borrador: "bg-black text-neutral-200",
  pendiente: "bg-orange-100 text-yellow-800",
  enviado: "bg-slate-100 text-lime-600",
  aprobado: "bg-lime-50 text-green-600",
  rechazado: "bg-pink-100 text-rose-600",
  caducado: "bg-neutral-200 text-black",
};

export function BudgetCard({
  budget,
  onStatusChange,
  onDelete,
  onGeneratePDF,
  onDuplicate,
  getValidTransitions,
  getUserName,
  getUserRole,
  formatDate,
  getDaysRemaining,
  generatingPdf,
  duplicating,
}: BudgetCardProps) {
  const days = getDaysRemaining(budget.start_date, budget.validity_days);

  // Obtener título de la tarifa desde la relación redpresu_tariffs
  const tariffTitle =
    (budget as any).redpresu_tariffs &&
    typeof (budget as any).redpresu_tariffs === "object" &&
    "title" in (budget as any).redpresu_tariffs
      ? ((budget as any).redpresu_tariffs as { title: string }).title
      : "N/A";

  return (
    <Card className="w-full mb-3">
      <CardContent className="p-3">
        <div className="space-y-3">
          {/* Fila 1: Nombre/Datos Cliente + Total */}
          <div className="flex justify-between gap-3">
            {/* Fila 1 Columna 1: Nombre y datos cliente */}
            <div className="flex-1 min-w-0 space-y-1">
              {/* Fila 1: Nombre */}
              <div className="font-semibold text-sm truncate">
                {budget.client_name}
              </div>
              {/* Fila 2: (NIF) [tipo] [versión] */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs text-muted-foreground">
                  ({budget.client_nif_nie || "N/A"})
                </span>
                <Badge variant="secondary" className="text-xs flex-shrink-0">
                  {budget.client_type}
                </Badge>
                {budget.parent_budget_id && (
                  <Badge variant="outline" className="text-xs flex-shrink-0">
                    v{budget.version_number}
                  </Badge>
                )}
              </div>
            </div>

            {/* Fila 1 Columna 2: Total e Importe */}
            <div className="flex-shrink-0 text-right space-y-1">
              {/* Fila 1: Total */}
              <div className="text-xs text-muted-foreground">Total</div>
              {/* Fila 2: Importe € */}
              <div data-tour="columna-total" className="font-semibold text-base whitespace-nowrap">
                {formatCurrency(budget.total || 0)}
              </div>
            </div>
          </div>

          {/* Fila 2: Fechas */}
          <div className="flex justify-start gap-3">
            {days && budget.start_date && budget.end_date && (
              <div
                className={`text-xs ${
                  days.isExpiring
                    ? "text-orange-600 font-medium"
                    : "text-muted-foreground"
                }`}
              >
                {formatDate(budget.start_date)} -{" "}
                {formatDate(budget.end_date)} ({days.remaining}/{days.total}{" "}
                días)
              </div>
            )}
          </div>

          {/* Fila 3: Estado + Usuario y Role */}
          <div className="flex justify-between items-center gap-3 border-t pt-3">
            {/* Estado */}
            <div className="flex-shrink-0">
              <Select
                value={budget.status}
                onValueChange={(newStatus) =>
                  onStatusChange(
                    budget.id,
                    budget.status,
                    newStatus,
                    budget.client_name
                  )
                }
              >
                <SelectTrigger data-tour="select-estado-presupuesto" className="w-[110px] h-7 text-xs">
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
                <SelectContent>
                  <SelectItem value="borrador">
                    <Badge className={statusColors["borrador"]}>borrador</Badge>
                  </SelectItem>
                  <SelectItem value="pendiente">
                    <Badge className={statusColors["pendiente"]}>
                      pendiente
                    </Badge>
                  </SelectItem>
                  <SelectItem value="enviado">
                    <Badge className={statusColors["enviado"]}>enviado</Badge>
                  </SelectItem>
                  <SelectItem value="aprobado">
                    <Badge className={statusColors["aprobado"]}>aprobado</Badge>
                  </SelectItem>
                  <SelectItem value="rechazado">
                    <Badge className={statusColors["rechazado"]}>
                      rechazado
                    </Badge>
                  </SelectItem>
                  <SelectItem value="caducado">
                    <Badge className={statusColors["caducado"]}>caducado</Badge>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Usuario y Role */}
            <div className="flex flex-col gap-0.5 text-right">
              <span className="text-xs font-medium text-foreground">
                {getUserName(budget)}
              </span>
              <span className="text-[10px] text-muted-foreground capitalize">
                {getUserRole(budget)}
              </span>
            </div>
          </div>

          {/* Fila 4: Botones de acción */}
          <div className="grid grid-cols-2 sm:grid-cols-5 lg:flex lg:justify-end gap-1.5 w-full">
            {/* Notas */}
            <BudgetNotesIcon budgetId={budget.id} className="w-full" />

            {/* Tarifa */}
            <Button
              data-tour="btn-tarifa"
              variant="outline"
              size="sm"
              onClick={() => window.open(`/tariffs?id=${budget.tariff_id}`, "_blank")}
              className="h-7 px-2 gap-1.5 text-xs w-full lg:w-auto"
              title={tariffTitle}
            >
              <Layers className="h-3.5 w-3.5 flex-shrink-0" />
              <span>Tarifa</span>
            </Button>

            {/* Botón PDF - Solo si NO es borrador */}
            {budget.status !== "borrador" && (
              <>
                {budget.pdf_url ? (
                  <Button
                    data-tour="btn-generar-pdf"
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      const result = await getBudgetPDFSignedUrl(budget.id);
                      if (result.success && result.signedUrl) {
                        window.open(result.signedUrl, "_blank");
                      } else {
                        toast.error(result.error || "Error obteniendo PDF");
                      }
                    }}
                    className="h-7 px-2 gap-1.5 text-xs w-full lg:w-auto"
                  >
                    <Eye className="h-3.5 w-3.5 flex-shrink-0" />
                    <span>Ver</span>
                  </Button>
                ) : (
                  <Button
                    data-tour="btn-generar-pdf"
                    variant="outline"
                    size="sm"
                    onClick={() => onGeneratePDF(budget.id)}
                    disabled={generatingPdf === budget.id}
                    className="h-7 px-2 gap-1.5 text-xs w-full lg:w-auto"
                  >
                    <FilePlus className="h-3.5 w-3.5 flex-shrink-0" />
                    <span>PDF</span>
                  </Button>
                )}
              </>
            )}

            {/* Editar */}
            <Button
              data-tour="btn-editar-presupuesto"
              variant="outline"
              size="sm"
              onClick={() =>
                window.open(
                  `/budgets/create?tariff_id=${budget.tariff_id}&budget_id=${budget.id}`,
                  "_blank"
                )
              }
              className="h-7 px-2 gap-1.5 text-xs w-full lg:w-auto"
            >
              <Pencil className="h-3.5 w-3.5 flex-shrink-0" />
              <span>Editar</span>
            </Button>

            {/* Duplicar */}
            <Button
              data-tour="btn-duplicar-presupuesto"
              variant="outline"
              size="sm"
              onClick={() => onDuplicate(budget.id, budget.client_name)}
              disabled={duplicating === budget.id}
              className="h-7 px-2 gap-1.5 text-xs w-full lg:w-auto"
            >
              <Copy className="h-3.5 w-3.5 flex-shrink-0" />
              <span>Duplicar</span>
            </Button>

            {/* Borrar */}
            <Button
              data-tour="btn-eliminar-presupuesto"
              variant="outline"
              size="sm"
              onClick={() => onDelete(budget.id, budget.client_name, !!budget.pdf_url)}
              className="h-7 px-2 gap-1.5 text-xs border-destructive text-destructive hover:bg-destructive/10 w-full lg:w-auto"
            >
              <Trash2 className="h-3.5 w-3.5 flex-shrink-0" />
              <span>Borrar</span>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
