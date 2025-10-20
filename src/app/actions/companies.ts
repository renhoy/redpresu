"use server";

import { supabaseAdmin } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { log } from "@/lib/logger";
import { requireValidCompanyId } from "@/lib/helpers/company-validation";

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
  deleted_at: string | null; // VULN-007: Soft-delete timestamp
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
 * Obtener todas las empresas activas (solo superadmin)
 * NOTA: Solo retorna empresas NO eliminadas (deleted_at IS NULL)
 * Para ver empresas eliminadas, usar getDeletedCompanies()
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

    // Obtener todos los emisores ACTIVOS (no eliminados)
    const { data: issuers, error } = await supabaseAdmin
      .from("redpresu_issuers")
      .select("*")
      .is("deleted_at", null) // Solo empresas activas
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

    // SECURITY: Validar company_id obligatorio
    let userCompanyId: number;
    try {
      userCompanyId = requireValidCompanyId(user, '[getCompanyById]');
    } catch (error) {
      log.error('[getCompanyById] company_id inválido', { error });
      return { success: false, error: "Usuario sin empresa asignada" };
    }

    // company_id es UUID en redpresu_issuers
    // Verificar permisos:
    // - Superadmin puede ver cualquier empresa
    // - Admin solo puede ver emisor de su propia empresa
    const { data: company, error } = await supabaseAdmin
      .from("redpresu_issuers")
      .select("*")
      .eq("id", companyId)
      .is("deleted_at", null) // Solo empresas activas
      .single();

    if (error) {
      log.error("[getCompanyById] Error DB:", error);
      return { success: false, error: error.message };
    }

    if (!company) {
      return { success: false, error: "Empresa no encontrada" };
    }

    // Admin solo puede ver su propia empresa
    if (user.role !== "superadmin" && company.company_id !== userCompanyId) {
      log.error("[getCompanyById] Intento de acceso cross-company", {
        userId: user.id,
        userCompanyId,
        targetCompanyId: company.company_id
      });
      return { success: false, error: "Sin permisos para ver esta empresa" };
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

    // SECURITY: Validar company_id obligatorio
    let userCompanyId: number;
    try {
      userCompanyId = requireValidCompanyId(user, '[updateCompany]');
    } catch (error) {
      log.error('[updateCompany] company_id inválido', { error });
      return { success: false, error: "Usuario sin empresa asignada" };
    }

    // Verificar permisos:
    // - Superadmin puede editar cualquier emisor
    // - Admin puede editar emisor de su empresa

    // Primero obtener el emisor para verificar permisos
    const { data: existingCompany, error: fetchError } = await supabaseAdmin
      .from("redpresu_issuers")
      .select("company_id")
      .eq("id", companyId)
      .is("deleted_at", null) // Solo empresas activas
      .single();

    if (fetchError || !existingCompany) {
      log.error("[updateCompany] Empresa no encontrada:", fetchError);
      return { success: false, error: "Empresa no encontrada" };
    }

    // Admin solo puede editar su propia empresa
    if (user.role !== "superadmin" && existingCompany.company_id !== userCompanyId) {
      log.error("[updateCompany] Intento de edición cross-company", {
        userId: user.id,
        userCompanyId,
        targetCompanyId: existingCompany.company_id
      });
      return { success: false, error: "Sin permisos para editar esta empresa" };
    }

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
 * Eliminar empresa (soft-delete) - Solo superadmin
 * NOTA: Usa soft-delete (marca deleted_at) para permitir recuperación
 * Los datos relacionados (usuarios, tarifas, presupuestos) NO se eliminan
 * pero quedan inaccesibles vía RLS policies
 *
 * Para eliminación física permanente, ver hardDeleteCompany()
 */
export async function deleteCompany(companyId: string): Promise<ActionResult> {
  try {
    log.info("[deleteCompany] Iniciando soft-delete...", companyId);

    // Obtener usuario actual
    const { getServerUser } = await import("@/lib/auth/server");
    const user = await getServerUser();

    if (!user) {
      return { success: false, error: "No autenticado" };
    }

    // SECURITY: Validar company_id obligatorio (aunque sea superadmin)
    try {
      requireValidCompanyId(user, '[deleteCompany]');
    } catch (error) {
      log.error('[deleteCompany] company_id inválido', { error });
      return { success: false, error: "Usuario sin empresa asignada" };
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
      .is("deleted_at", null) // Solo empresas activas
      .single();

    if (companyError || !company) {
      log.error("[deleteCompany] Empresa no encontrada o ya eliminada:", companyError);
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
      "[deleteCompany] Soft-delete empresa:",
      company.name,
      "(ID:",
      company.id,
      ")"
    );

    // SOFT DELETE: Marcar como eliminada en lugar de borrar físicamente
    // Ventajas:
    // - Permite recuperación si fue error
    // - Mantiene integridad referencial
    // - Auditoría completa de eliminaciones
    const { error: deleteError } = await supabaseAdmin
      .from("redpresu_issuers")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", companyId);

    if (deleteError) {
      log.error("[deleteCompany] Error al soft-delete:", deleteError);
      return { success: false, error: deleteError.message };
    }

    log.info("[deleteCompany] Empresa marcada como eliminada exitosamente:", company.name);

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

/**
 * Restaurar empresa eliminada (revertir soft-delete) - Solo superadmin
 * Permite recuperar una empresa marcada como eliminada
 */
export async function restoreCompany(companyId: string): Promise<ActionResult> {
  try {
    log.info("[restoreCompany] Iniciando restauración...", companyId);

    // Obtener usuario actual
    const { getServerUser } = await import("@/lib/auth/server");
    const user = await getServerUser();

    if (!user) {
      return { success: false, error: "No autenticado" };
    }

    // SECURITY: Validar company_id obligatorio
    try {
      requireValidCompanyId(user, '[restoreCompany]');
    } catch (error) {
      log.error('[restoreCompany] company_id inválido', { error });
      return { success: false, error: "Usuario sin empresa asignada" };
    }

    // Solo superadmin puede restaurar empresas
    if (user.role !== "superadmin") {
      return { success: false, error: "Sin permisos" };
    }

    // Obtener información de la empresa eliminada
    const { data: company, error: companyError } = await supabaseAdmin
      .from("redpresu_issuers")
      .select("*")
      .eq("id", companyId)
      .not("deleted_at", "is", null) // Solo empresas eliminadas
      .single();

    if (companyError || !company) {
      log.error("[restoreCompany] Empresa no encontrada o no está eliminada:", companyError);
      return { success: false, error: "Empresa no encontrada o ya activa" };
    }

    log.info(
      "[restoreCompany] Restaurando empresa:",
      company.name,
      "(ID:",
      company.id,
      ")"
    );

    // Restaurar: quitar marca de eliminación
    const { data: restoredCompany, error: restoreError } = await supabaseAdmin
      .from("redpresu_issuers")
      .update({ deleted_at: null })
      .eq("id", companyId)
      .select()
      .single();

    if (restoreError) {
      log.error("[restoreCompany] Error al restaurar:", restoreError);
      return { success: false, error: restoreError.message };
    }

    log.info("[restoreCompany] Empresa restaurada exitosamente:", restoredCompany.name);

    // Revalidar
    revalidatePath("/companies");

    return {
      success: true,
      data: restoredCompany,
    };
  } catch (error) {
    log.error("[restoreCompany] Error inesperado:", error);
    return { success: false, error: "Error inesperado" };
  }
}

/**
 * Listar empresas eliminadas (soft-deleted) - Solo superadmin
 * Útil para ver qué empresas pueden ser restauradas
 */
export async function getDeletedCompanies(): Promise<ActionResult> {
  try {
    log.info("[getDeletedCompanies] Obteniendo empresas eliminadas...");

    // Obtener usuario actual
    const { getServerUser } = await import("@/lib/auth/server");
    const user = await getServerUser();

    if (!user) {
      return { success: false, error: "No autenticado" };
    }

    // Solo superadmin puede ver empresas eliminadas
    if (user.role !== "superadmin") {
      return { success: false, error: "Sin permisos" };
    }

    // Obtener empresas eliminadas
    const { data: deletedCompanies, error } = await supabaseAdmin
      .from("redpresu_issuers")
      .select("*")
      .not("deleted_at", "is", null)
      .order("deleted_at", { ascending: false });

    if (error) {
      log.error("[getDeletedCompanies] Error DB:", error);
      return { success: false, error: error.message };
    }

    // Contar datos asociados a cada empresa eliminada
    const companiesWithCounts = await Promise.all(
      (deletedCompanies || []).map(async (company) => {
        const { count: userCount } = await supabaseAdmin
          .from("redpresu_users")
          .select("*", { count: "exact", head: true })
          .eq("company_id", company.company_id);

        const { count: tariffCount } = await supabaseAdmin
          .from("redpresu_tariffs")
          .select("*", { count: "exact", head: true })
          .eq("company_id", company.company_id);

        const { count: budgetCount } = await supabaseAdmin
          .from("redpresu_budgets")
          .select("*", { count: "exact", head: true })
          .eq("company_id", company.company_id);

        return {
          ...company,
          id: company.company_id,
          uuid: company.id,
          user_count: userCount || 0,
          tariff_count: tariffCount || 0,
          budget_count: budgetCount || 0,
        };
      })
    );

    log.info("[getDeletedCompanies] Éxito:", companiesWithCounts.length, "empresas eliminadas");

    return { success: true, data: companiesWithCounts };
  } catch (error) {
    log.error("[getDeletedCompanies] Error inesperado:", error);
    return { success: false, error: "Error inesperado" };
  }
}
