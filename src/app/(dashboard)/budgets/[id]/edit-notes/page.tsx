import { Metadata } from "next";
import { redirect } from "next/navigation";
import { createServerActionClient } from "@/lib/supabase/helpers";
import { BudgetNotesForm } from "@/components/budgets/BudgetNotesForm";

export const metadata: Metadata = {
  title: "Editar Notas - Presupuesto",
  description: "Editar notas del presupuesto",
};

export default async function BudgetEditNotesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createServerActionClient();

  // Verificar autenticación
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Obtener rol del usuario
  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (userError || !userData) {
    redirect("/budgets");
  }

  const userRole = userData.role || "vendedor";

  // Obtener presupuesto
  const { data: budget, error } = await supabase
    .from("budgets")
    .select("id, budget_number, summary_note, conditions_note, user_id")
    .eq("id", id)
    .single();

  if (error || !budget) {
    redirect("/budgets");
  }

  // Verificar permisos: superadmin y admin pueden editar todo, otros solo sus presupuestos
  const canEdit =
    userRole === "superadmin" ||
    userRole === "admin" ||
    budget.user_id === user.id;

  if (!canEdit) {
    redirect("/budgets");
  }

  return (
    <BudgetNotesForm
      budgetId={budget.id}
      budgetNumber={budget.budget_number}
      initialSummaryNote={budget.summary_note || ""}
      initialConditionsNote={budget.conditions_note || ""}
    />
  );
}
