"use server";

import { supabaseAdmin } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface Company {
  id: number;
  nombre: string;
  tipo: "empresa" | "autonomo";
  cif: string;
  direccion: string;
  telefono: string;
  email: string;
  created_at: string;
  updated_at: string;
  user_count?: number; // Número de usuarios asociados
  tariff_count?: number; // Número de tarifas
  budget_count?: number; // Número de presupuestos
}

export interface UpdateCompanyData {
  nombre?: string;
  tipo?: "empresa" | "autonomo";
  cif?: string;
  direccion?: string;
  telefono?: string;
  email?: string;
}

export interface ActionResult {
  success: boolean;
  data?: Company | Company[];
  error?: string;
}

/**
 * Obtener todas las empresas (solo superadmin)
 */
export async function getCompanies(): Promise<ActionResult> {
  try {
    console.log("[getCompanies] Iniciando...");

    // Obtener usuario actual
    const { getServerUser } = await import("@/lib/auth/server");
    const user = await getServerUser();

    if (!user) {
      return { success: false, error: "No autenticado" };
    }

    // Solo superadmin puede ver todas las empresas
    if (user.role !== "superadmin") {
      return { success: false, error: "Sin permisos" };
    }

    // Obtener empresas con contadores
    const { data: companies, error } = await supabaseAdmin
      .from("emisores")
      .select(
        `
        *,
        user_count:usuarios(count),
        tariff_count:tarifas(count),
        budget_count:presupuestos(count)
      `
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[getCompanies] Error DB:", error);
      return { success: false, error: error.message };
    }

    // Formatear contadores
    const formattedCompanies = (companies || []).map((company) => ({
      ...company,
      user_count: company.user_count?.[0]?.count || 0,
      tariff_count: company.tariff_count?.[0]?.count || 0,
      budget_count: company.budget_count?.[0]?.count || 0,
    }));

    console.log("[getCompanies] Éxito:", formattedCompanies.length, "empresas");

    return { success: true, data: formattedCompanies };
  } catch (error) {
    console.error("[getCompanies] Error inesperado:", error);
    return { success: false, error: "Error inesperado" };
  }
}

/**
 * Obtener empresa por ID
 */
export async function getCompanyById(companyId: string): Promise<ActionResult> {
  try {
    console.log("[getCompanyById] Iniciando...", companyId);

    // Obtener usuario actual
    const { getServerUser } = await import("@/lib/auth/server");
    const user = await getServerUser();

    if (!user) {
      return { success: false, error: "No autenticado" };
    }

    const id = parseInt(companyId, 10);

    if (isNaN(id)) {
      return { success: false, error: "ID inválido" };
    }

    // Verificar permisos:
    // - Superadmin puede ver cualquier empresa
    // - Admin solo puede ver su propia empresa
    if (user.role !== "superadmin" && user.company_id !== id) {
      return { success: false, error: "Sin permisos" };
    }

    const { data: company, error } = await supabaseAdmin
      .from("emisores")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("[getCompanyById] Error DB:", error);
      return { success: false, error: error.message };
    }

    if (!company) {
      return { success: false, error: "Empresa no encontrada" };
    }

    console.log("[getCompanyById] Éxito:", company.id);

    return { success: true, data: company };
  } catch (error) {
    console.error("[getCompanyById] Error inesperado:", error);
    return { success: false, error: "Error inesperado" };
  }
}

/**
 * Actualizar empresa
 */
export async function updateCompany(
  companyId: string,
  data: UpdateCompanyData
): Promise<ActionResult> {
  try {
    console.log("[updateCompany] Iniciando...", companyId, data);

    // Obtener usuario actual
    const { getServerUser } = await import("@/lib/auth/server");
    const user = await getServerUser();

    if (!user) {
      return { success: false, error: "No autenticado" };
    }

    const id = parseInt(companyId, 10);

    if (isNaN(id)) {
      return { success: false, error: "ID inválido" };
    }

    // Verificar permisos:
    // - Superadmin puede editar cualquier empresa
    // - Admin solo puede editar su propia empresa
    if (user.role !== "superadmin" && user.company_id !== id) {
      return { success: false, error: "Sin permisos" };
    }

    // Validaciones
    if (data.email && !data.email.includes("@")) {
      return { success: false, error: "Email inválido" };
    }

    if (data.cif && data.cif.trim().length < 9) {
      return { success: false, error: "CIF/NIF debe tener al menos 9 caracteres" };
    }

    // Actualizar empresa
    const { data: updatedCompany, error } = await supabaseAdmin
      .from("emisores")
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("[updateCompany] Error DB:", error);
      return { success: false, error: error.message };
    }

    console.log("[updateCompany] Éxito:", updatedCompany.id);

    // Revalidar rutas
    revalidatePath("/companies");
    revalidatePath(`/companies/${id}/edit`);
    revalidatePath("/companies/edit");

    return { success: true, data: updatedCompany };
  } catch (error) {
    console.error("[updateCompany] Error inesperado:", error);
    return { success: false, error: "Error inesperado" };
  }
}

/**
 * Eliminar empresa y todo su contenido (solo superadmin)
 * ADVERTENCIA: Esto eliminará:
 * - Todos los usuarios de la empresa
 * - Todas las tarifas
 * - Todos los presupuestos
 * - Todos los PDFs generados
 * Esta acción NO es reversible
 */
export async function deleteCompany(companyId: string): Promise<ActionResult> {
  try {
    console.log("[deleteCompany] Iniciando...", companyId);

    // Obtener usuario actual
    const { getServerUser } = await import("@/lib/auth/server");
    const user = await getServerUser();

    if (!user) {
      return { success: false, error: "No autenticado" };
    }

    // Solo superadmin puede eliminar empresas
    if (user.role !== "superadmin") {
      return { success: false, error: "Sin permisos" };
    }

    const id = parseInt(companyId, 10);

    if (isNaN(id)) {
      return { success: false, error: "ID inválido" };
    }

    // Obtener información de la empresa antes de eliminar
    const { data: company, error: companyError } = await supabaseAdmin
      .from("emisores")
      .select("*")
      .eq("id", id)
      .single();

    if (companyError || !company) {
      console.error("[deleteCompany] Empresa no encontrada:", companyError);
      return { success: false, error: "Empresa no encontrada" };
    }

    console.log(
      "[deleteCompany] Eliminando empresa:",
      company.nombre,
      "(ID:",
      company.id,
      ")"
    );

    // IMPORTANTE: Las eliminaciones en cascada están configuradas en la BD
    // Al eliminar el emisor, automáticamente se eliminan:
    // - usuarios (ON DELETE CASCADE)
    // - tarifas (ON DELETE CASCADE)
    // - presupuestos (ON DELETE CASCADE)
    // - versiones de presupuestos (ON DELETE CASCADE)
    // - notas de presupuestos (ON DELETE CASCADE)

    const { error: deleteError } = await supabaseAdmin
      .from("emisores")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error("[deleteCompany] Error al eliminar:", deleteError);
      return { success: false, error: deleteError.message };
    }

    console.log("[deleteCompany] Empresa eliminada exitosamente:", company.nombre);

    // Revalidar
    revalidatePath("/companies");

    return {
      success: true,
      data: company,
    };
  } catch (error) {
    console.error("[deleteCompany] Error inesperado:", error);
    return { success: false, error: "Error inesperado" };
  }
}
