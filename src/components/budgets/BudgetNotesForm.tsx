"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { TiptapEditor } from "@/components/shared/TiptapEditor";
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

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
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Editar Notas del Presupuesto</h1>
          <p className="text-muted-foreground mt-1">
            Presupuesto: {budgetNumber}
          </p>
        </div>
        <Link href="/budgets">
          <Button type="button" variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
        </Link>
      </div>

      {/* Nota Sumario */}
      <div className="space-y-2">
        <Label htmlFor="summary-note">
          Nota del Sumario
          <span className="text-muted-foreground ml-2 text-sm font-normal">
            (aparecerá en la página de resumen del PDF)
          </span>
        </Label>
        <TiptapEditor
          content={summaryNote}
          onChange={setSummaryNote}
          placeholder="Escribe la nota del sumario aquí..."
          className="min-h-[200px]"
        />
      </div>

      {/* Nota Condiciones */}
      <div className="space-y-2">
        <Label htmlFor="conditions-note">
          Nota de Condiciones
          <span className="text-muted-foreground ml-2 text-sm font-normal">
            (aparecerá en la página de condiciones del PDF)
          </span>
        </Label>
        <TiptapEditor
          content={conditionsNote}
          onChange={setConditionsNote}
          placeholder="Escribe las condiciones del presupuesto aquí..."
          className="min-h-[200px]"
        />
      </div>

      {/* Botones de acción */}
      <div className="flex justify-end gap-3 pt-4">
        <Link href="/budgets">
          <Button type="button" variant="outline" disabled={loading}>
            Cancelar
          </Button>
        </Link>
        <Button type="submit" disabled={loading}>
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
  );
}
