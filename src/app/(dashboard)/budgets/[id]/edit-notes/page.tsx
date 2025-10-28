import { Metadata } from "next";
import { redirect } from "next/navigation";
import { createServerActionClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
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

  const cookieStore = await cookies();
  const supabase = createServerActionClient({ cookies: () => cookieStore });

  // Verificar autenticación
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Obtener presupuesto
  const { data: budget, error } = await supabase
    .from("redpresu_budgets")
    .select("id, budget_number, summary_note, conditions_note, user_id")
    .eq("id", id)
    .single();

  if (error || !budget) {
    redirect("/budgets");
  }

  // Verificar que el usuario sea el propietario
  if (budget.user_id !== user.id) {
    redirect("/budgets");
  }

  return (
    <div className="container mx-auto py-8 max-w-5xl">
      <BudgetNotesForm
        budgetId={budget.id}
        budgetNumber={budget.budget_number}
        initialSummaryNote={budget.summary_note || ""}
        initialConditionsNote={budget.conditions_note || ""}
      />
    </div>
  );
}
