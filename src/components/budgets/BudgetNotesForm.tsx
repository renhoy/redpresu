"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RichTextEditorDialog } from "@/components/shared/RichTextEditorDialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import { updateBudgetNotes } from "@/app/actions/budgets";
import { toast } from "sonner";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";

interface BudgetNotesFormProps {
  budgetId: string;
  budgetNumber: string;
  initialSummaryNote: string;
  initialConditionsNote: string;
}

export function BudgetNotesForm({
  budgetId,
  budgetNumber,
  initialSummaryNote,
  initialConditionsNote,
}: BudgetNotesFormProps) {
  const router = useRouter();
  const [summaryNote, setSummaryNote] = useState(initialSummaryNote || "");
  const [conditionsNote, setConditionsNote] = useState(initialConditionsNote || "");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!summaryNote || summaryNote.trim() === "") {
      newErrors.summary_note = "La nota resumen es obligatoria";
    }
    if (!conditionsNote || conditionsNote.trim() === "") {
      newErrors.conditions_note = "Las condiciones son obligatorias";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!validateForm()) {
      toast.error("Por favor, complete todos los campos obligatorios");
      return;
    }

    setLoading(true);

    const result = await updateBudgetNotes(budgetId, {
      summary_note: summaryNote,
      conditions_note: conditionsNote,
    });

    setLoading(false);

    if (result.success) {
      toast.success("Notas actualizadas correctamente");
      router.push("/budgets");
      router.refresh();
    } else {
      toast.error(result.error || "Error al actualizar notas");
    }
  }

  return (
    <div className="min-h-screen bg-lime-50">
      <form onSubmit={handleSubmit} className="container mx-auto py-8 max-w-5xl space-y-6">
        {/* Header con botones superiores */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white rounded-lg p-6 shadow-sm">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-black">
              Editar Notas del Presupuesto
            </h1>
            <p className="text-muted-foreground mt-1">
              Presupuesto: <span className="font-mono font-semibold">{budgetNumber}</span>
            </p>
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            <Link href="/budgets" className="flex-1 md:flex-initial">
              <Button type="button" variant="outline" className="w-full">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver
              </Button>
            </Link>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 md:flex-initial bg-lime-500 hover:bg-lime-600"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Guardar Notas
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Card: Notas PDF */}
        <Card className="bg-lime-100">
          <CardHeader>
            <CardTitle>Notas PDF</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Nota Sumario */}
            <div id="summary_note">
              <div className="flex items-center gap-2 mb-2">
                <Label htmlFor="summary_note">Texto resumen PDF *</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">
                        Texto que aparecerá en la sección de resumen del PDF
                        generado. Puedes incluir información adicional sobre el
                        presupuesto.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <RichTextEditorDialog
                value={summaryNote}
                onChange={setSummaryNote}
                label="Texto resumen PDF"
                description="Texto que aparecerá en la sección de resumen del PDF generado"
                placeholder="Escribe el texto del resumen aquí..."
              />
              {errors.summary_note && (
                <p className="text-sm text-destructive mt-1">
                  {errors.summary_note}
                </p>
              )}
            </div>

            {/* Nota Condiciones */}
            <div id="conditions_note">
              <div className="flex items-center gap-2 mb-2">
                <Label htmlFor="conditions_note">Texto condiciones PDF *</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">
                        Condiciones generales que aparecerán en el PDF. Por
                        ejemplo: forma de pago, plazos de entrega, garantías, etc.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <RichTextEditorDialog
                value={conditionsNote}
                onChange={setConditionsNote}
                label="Texto condiciones PDF"
                description="Condiciones generales que aparecerán en el PDF (forma de pago, plazos, garantías, etc.)"
                placeholder="Escribe las condiciones del presupuesto aquí..."
              />
              {errors.conditions_note && (
                <p className="text-sm text-destructive mt-1">
                  {errors.conditions_note}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Botones inferiores (duplicados para mejor UX) */}
        <div className="flex flex-col md:flex-row justify-end gap-3 bg-white rounded-lg p-6 shadow-sm">
          <Link href="/budgets" className="w-full md:w-auto">
            <Button type="button" variant="outline" disabled={loading} className="w-full">
              Cancelar
            </Button>
          </Link>
          <Button
            type="submit"
            disabled={loading}
            className="w-full md:w-auto bg-lime-500 hover:bg-lime-600"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Guardando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Guardar Notas
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
