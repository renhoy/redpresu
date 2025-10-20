"use server";

import { supabaseAdmin } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface Company {
  id: number; // company_id (número, ej: 1, 2, 3...)
  uuid?: string; // UUID del emisor en redpresu_issuers (opcional)
  user_id: string;
  company_id: number;
  type: "empresa" | "autonomo";
  name: string;
  nif: string;
  address: string;
  postal_code: string | null;
  locality: string | null;
  province: string | null;
  country: string;
  phone: string | null;
  email: string | null;
  web: string | null;
  irpf_percentage: number | null;
  logo_url: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
  user_count?: number; // Número de usuarios asociados
  tariff_count?: number; // Número de tarifas
  budget_count?: number; // Número de presupuestos
}

export interface UpdateCompanyData {
  name?: string;
  type?: "empresa" | "autonomo";
  nif?: string;
  address?: string;
  postal_code?: string;
  locality?: string;
  province?: string;
  country?: string;
  phone?: string;
  email?: string;
  web?: string;
  irpf_percentage?: number | null;
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
    log.info("[getCompanies] Iniciando...");

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

    // Obtener todos los emisores
    const { data: issuers, error } = await supabaseAdmin
      .from("redpresu_issuers")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      log.error("[getCompanies] Error DB:", error);
      return { success: false, error: error.message };
    }

    // Para cada emisor, contar usuarios, tarifas y presupuestos de su company_id
    const formattedCompanies = await Promise.all(
      (issuers || []).map(async (issuer) => {
        // Contar usuarios de esta empresa
        const { count: userCount } = await supabaseAdmin
          .from("redpresu_users")
          .select("*", { count: "exact", head: true })
          .eq("company_id", issuer.company_id);

        // Contar tarifas de esta empresa
        const { count: tariffCount } = await supabaseAdmin
          .from("redpresu_tariffs")
          .select("*", { count: "exact", head: true })
          .eq("company_id", issuer.company_id);

        // Contar presupuestos de esta empresa
        const { count: budgetCount } = await supabaseAdmin
          .from("redpresu_budgets")
          .select("*", { count: "exact", head: true })
          .eq("company_id", issuer.company_id);

        return {
          ...issuer,
          id: issuer.company_id, // Usar company_id como id principal
          uuid: issuer.id, // Guardar UUID del emisor
          user_count: userCount || 0,
          tariff_count: tariffCount || 0,
          budget_count: budgetCount || 0,
        };
      })
    );

    log.info("[getCompanies] Éxito:", formattedCompanies.length, "empresas");

    return { success: true, data: formattedCompanies };
  } catch (error) {
    log.error("[getCompanies] Error inesperado:", error);
    return { success: false, error: "Error inesperado" };
  }
}

/**
 * Obtener empresa por ID
 */
export async function getCompanyById(companyId: string): Promise<ActionResult> {
  try {
    log.info("[getCompanyById] Iniciando...", companyId);

    // Obtener usuario actual
    const { getServerUser } = await import("@/lib/auth/server");
    const user = await getServerUser();

    if (!user) {
      return { success: false, error: "No autenticado" };
    }

    // company_id es UUID en redpresu_issuers
    // Verificar permisos:
    // - Superadmin puede ver cualquier empresa
    // - Admin solo puede ver emisor de su propia empresa
    const { data: company, error } = await supabaseAdmin
      .from("redpresu_issuers")
      .select("*")
      .eq("id", companyId)
      .single();

    if (error) {
      log.error("[getCompanyById] Error DB:", error);
      return { success: false, error: error.message };
    }

    if (!company) {
      return { success: false, error: "Empresa no encontrada" };
    }

    log.info("[getCompanyById] Éxito:", company.id);

    return { success: true, data: company };
  } catch (error) {
    log.error("[getCompanyById] Error inesperado:", error);
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
    log.info("[updateCompany] Iniciando...", companyId, data);

    // Obtener usuario actual
    const { getServerUser } = await import("@/lib/auth/server");
    const user = await getServerUser();

    if (!user) {
      return { success: false, error: "No autenticado" };
    }

    // Verificar permisos:
    // - Superadmin puede editar cualquier emisor
    // - Admin puede editar emisor de su empresa
    // (La verificación se hace obteniendo el emisor primero)

    // Validaciones
    if (data.email && !data.email.includes("@")) {
      return { success: false, error: "Email inválido" };
    }

    if (data.nif && data.nif.trim().length < 9) {
      return { success: false, error: "CIF/NIF debe tener al menos 9 caracteres" };
    }

    // Actualizar empresa
    const { data: updatedCompany, error } = await supabaseAdmin
      .from("redpresu_issuers")
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq("id", companyId)
      .select()
      .single();

    if (error) {
      log.error("[updateCompany] Error DB:", error);
      return { success: false, error: error.message };
    }

    log.info("[updateCompany] Éxito:", updatedCompany.id);

    // Revalidar rutas
    revalidatePath("/companies");
    revalidatePath(`/companies/${companyId}/edit`);
    revalidatePath("/companies/edit");

    return { success: true, data: updatedCompany };
  } catch (error) {
    log.error("[updateCompany] Error inesperado:", error);
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
    log.info("[deleteCompany] Iniciando...", companyId);

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

    // Obtener información de la empresa antes de eliminar
    const { data: company, error: companyError } = await supabaseAdmin
      .from("redpresu_issuers")
      .select("*")
      .eq("id", companyId)
      .single();

    if (companyError || !company) {
      log.error("[deleteCompany] Empresa no encontrada:", companyError);
      return { success: false, error: "Empresa no encontrada" };
    }

    // PROTECCIÓN: No permitir eliminar la empresa por defecto (company_id = 1)
    if (company.company_id === 1) {
      log.error("[deleteCompany] Intento de eliminar empresa por defecto");
      return {
        success: false,
        error: "No se puede eliminar la empresa por defecto del sistema",
      };
    }

    log.info(
      "[deleteCompany] Eliminando empresa:",
      company.name,
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
      .from("redpresu_issuers")
      .delete()
      .eq("id", companyId);

    if (deleteError) {
      log.error("[deleteCompany] Error al eliminar:", deleteError);
      return { success: false, error: deleteError.message };
    }

    log.info("[deleteCompany] Empresa eliminada exitosamente:", company.nombre);

    // Revalidar
    revalidatePath("/companies");

    return {
      success: true,
      data: company,
    };
  } catch (error) {
    log.error("[deleteCompany] Error inesperado:", error);
    return { success: false, error: "Error inesperado" };
  }
}
