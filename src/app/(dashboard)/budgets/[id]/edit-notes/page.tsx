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

  // Obtener rol del usuario
  const { data: userData, error: userError } = await supabase
    .from("redpresu_users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (userError || !userData) {
    console.error("[edit-notes] Error obteniendo rol usuario:", userError);
    redirect("/budgets");
  }

  const userRole = userData.role || "vendedor";
  console.log("[edit-notes] User role:", userRole);

  // Obtener presupuesto
  const { data: budget, error } = await supabase
    .from("redpresu_budgets")
    .select("id, budget_number, summary_note, conditions_note, user_id")
    .eq("id", id)
    .single();

  if (error || !budget) {
    console.error("[edit-notes] Error obteniendo presupuesto:", error);
    redirect("/budgets");
  }

  console.log("[edit-notes] Budget found:", budget.id, "Owner:", budget.user_id, "Current user:", user.id);

  // Verificar permisos: superadmin y admin pueden editar todo, otros solo sus presupuestos
  const canEdit =
    userRole === "superadmin" ||
    userRole === "admin" ||
    budget.user_id === user.id;

  console.log("[edit-notes] Can edit?", canEdit, "Role:", userRole);

  if (!canEdit) {
    console.error("[edit-notes] Usuario sin permisos para editar");
    redirect("/budgets");
  }

  console.log("[edit-notes] Renderizando BudgetNotesForm");

  return (
    <BudgetNotesForm
      budgetId={budget.id}
      budgetNumber={budget.budget_number}
      initialSummaryNote={budget.summary_note || ""}
      initialConditionsNote={budget.conditions_note || ""}
    />
  );
}
