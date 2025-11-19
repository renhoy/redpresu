"use server";

import { supabaseAdmin } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { log } from "@/lib/logger";
import { requireValidCompanyId } from "@/lib/helpers/company-validation";
import { withAuthenticatedAction, actionError } from "@/lib/helpers/action-wrapper";
import { requireSuperAdmin } from "@/lib/helpers/permission-helpers";
import {
  validateEmailField,
  validateNIFField,
  validateRequiredString,
  validatePostalCodeField,
  getFirstValidationError
} from "@/lib/helpers/validation-helpers";

export interface Company {
  id: number; // company_id (número, ej: 1, 2, 3...)
  uuid?: string; // UUID del emisor en issuers (opcional)
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
  admin_count?: number; // Número de usuarios admin
  comercial_count?: number; // Número de usuarios comercial
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

export interface CreateCompanyData {
  name: string;
  type: "empresa" | "autonomo";
  nif: string;
  address: string;
  postal_code: string;
  locality: string;
  province: string;
  country: string;
  phone?: string | null;
  email?: string | null;
  web?: string | null;
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

    // OPTIMIZACIÓN: Obtener issuers con counts agregados en una sola query
    // Antes: N*5 queries (500 queries para 100 empresas)
    // Ahora: 1 query usando RPC con agregaciones SQL
    const { data: companiesWithCounts, error } = await supabaseAdmin.rpc(
      'get_companies_with_counts'
    );

    if (error) {
      log.error("[getCompanies] Error DB:", error);

      // Fallback a método anterior si RPC falla
      log.warn("[getCompanies] RPC falló, usando método de fallback");
      const { data: issuers, error: issuerError } = await supabaseAdmin
        .from("issuers")
        .select("*")
        .order("created_at", { ascending: false });

      if (issuerError) {
        return { success: false, error: issuerError.message };
      }

      // Método de fallback más eficiente: obtener todos los counts de una vez
      const companyIds = (issuers || []).map(i => i.company_id);

      // Query 1: Obtener counts de usuarios agrupados
      const { data: userCounts } = await supabaseAdmin
        .from("users")
        .select("company_id, role")
        .in("company_id", companyIds);

      // Query 2: Obtener counts de tarifas agrupados
      const { data: tariffCounts } = await supabaseAdmin
        .from("tariffs")
        .select("company_id")
        .in("company_id", companyIds);

      // Query 3: Obtener counts de presupuestos agrupados
      const { data: budgetCounts } = await supabaseAdmin
        .from("budgets")
        .select("company_id")
        .in("company_id", companyIds);

      // Procesar counts en memoria (más eficiente que N queries)
      const userCountsMap = new Map<number, { total: number; admin: number; comercial: number }>();
      (userCounts || []).forEach(u => {
        const current = userCountsMap.get(u.company_id) || { total: 0, admin: 0, comercial: 0 };
        current.total++;
        if (u.role === 'admin') current.admin++;
        if (u.role === 'comercial') current.comercial++;
        userCountsMap.set(u.company_id, current);
      });

      const tariffCountsMap = new Map<number, number>();
      (tariffCounts || []).forEach(t => {
        tariffCountsMap.set(t.company_id, (tariffCountsMap.get(t.company_id) || 0) + 1);
      });

      const budgetCountsMap = new Map<number, number>();
      (budgetCounts || []).forEach(b => {
        budgetCountsMap.set(b.company_id, (budgetCountsMap.get(b.company_id) || 0) + 1);
      });

      const formattedCompanies = (issuers || []).map(issuer => {
        const userStats = userCountsMap.get(issuer.company_id) || { total: 0, admin: 0, comercial: 0 };
        return {
          ...issuer,
          id: issuer.company_id,
          uuid: issuer.id,
          user_count: userStats.total,
          admin_count: userStats.admin,
          comercial_count: userStats.comercial,
          tariff_count: tariffCountsMap.get(issuer.company_id) || 0,
          budget_count: budgetCountsMap.get(issuer.company_id) || 0,
        };
      });

      log.info("[getCompanies] Éxito (fallback):", formattedCompanies.length, "empresas");
      return { success: true, data: formattedCompanies };
    }

    // Formatear resultado de RPC
    const formattedCompanies = (companiesWithCounts || []).map((company: any) => ({
      ...company,
      id: company.company_id,
      uuid: company.id,
    }));

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

    // Detectar si companyId es UUID o INTEGER
    // UUID tiene formato: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(companyId);

    // Verificar permisos:
    // - Superadmin puede ver cualquier empresa
    // - Admin solo puede ver emisor de su propia empresa
    let query = supabaseAdmin
      .from("issuers")
      .select("*")
      .is("deleted_at", null); // Solo empresas activas

    // Buscar por id (UUID) o company_id (INTEGER)
    if (isUUID) {
      query = query.eq("id", companyId);
    } else {
      query = query.eq("company_id", parseInt(companyId, 10));
    }

    const { data: company, error } = await query.single();

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
 * Crear nueva empresa (solo superadmin)
 * Crea registro en companies y issuers
 */
export async function createCompany(data: CreateCompanyData): Promise<ActionResult> {
  return withAuthenticatedAction('createCompany', async (user) => {
    // Verificar permisos de superadmin
    const permissionCheck = requireSuperAdmin(user);
    if (!permissionCheck.allowed) {
      return { error: permissionCheck.reason };
    }

    // Validaciones usando helpers
    const validationErrors = getFirstValidationError([
      validateRequiredString(data.name, "nombre", 1),
      validateNIFField(data.nif),
      validateRequiredString(data.address, "dirección", 1),
      validatePostalCodeField(data.postal_code),
      validateRequiredString(data.locality, "localidad", 1),
      validateRequiredString(data.province, "provincia", 1),
      data.email ? validateEmailField(data.email) : { valid: true },
    ]);

    if (validationErrors) {
      return { error: validationErrors };
    }

    // Validación específica para autónomos
    if (data.type === "autonomo" && !data.irpf_percentage) {
      return { error: "El % IRPF es obligatorio para autónomos" };
    }

    // 1. Crear registro en companies
    const { data: newCompany, error: companyError } = await supabaseAdmin
      .from("companies")
      .insert({
        name: data.name.trim(),
        status: "active",
      })
      .select()
      .single();

    if (companyError || !newCompany) {
      log.error("[createCompany] Error creando company:", companyError);
      return { error: "Error al crear la empresa" };
    }

    const companyId = newCompany.id;
    log.info("[createCompany] Company creada con ID:", companyId);

    // 2. Crear registro en issuers
    const { data: newIssuer, error: issuerError } = await supabaseAdmin
      .from("issuers")
      .insert({
        user_id: user.id, // Superadmin que crea la empresa
        company_id: companyId,
        type: data.type,
        name: data.name.trim(),
        nif: data.nif.trim(),
        address: data.address.trim(),
        postal_code: data.postal_code.trim(),
        locality: data.locality.trim(),
        province: data.province.trim(),
        country: data.country || "España",
        phone: data.phone || null,
        email: data.email || null,
        web: data.web || null,
        irpf_percentage: data.irpf_percentage || null,
      })
      .select()
      .single();

    if (issuerError || !newIssuer) {
      log.error("[createCompany] Error creando issuer:", issuerError);

      // Rollback: eliminar company creada
      await supabaseAdmin
        .from("companies")
        .delete()
        .eq("id", companyId);

      return { error: "Error al crear los datos fiscales de la empresa" };
    }

    log.info("[createCompany] Issuer creado con ID:", newIssuer.id);

    // 3. Crear suscripción FREE por defecto
    const { error: subscriptionError } = await supabaseAdmin
      .from("subscriptions")
      .insert({
        company_id: companyId,
        plan: "free",
        status: "active",
      });

    if (subscriptionError) {
      log.error("[createCompany] Error creando suscripción FREE:", subscriptionError);
      // No fallar completamente, solo advertir
      log.warn("[createCompany] Empresa creada sin suscripción, se puede añadir después");
    } else {
      log.info("[createCompany] Suscripción FREE creada para company_id:", companyId);
    }

    // Revalidar rutas
    revalidatePath("/companies");

    return {
      data: {
        ...newIssuer,
        id: companyId,
        uuid: newIssuer.id,
        user_count: 0,
        tariff_count: 0,
        budget_count: 0,
      },
    };
  });
}

/**
 * Actualizar empresa
 */
export async function updateCompany(
  companyId: string,
  data: UpdateCompanyData
): Promise<ActionResult> {
  return withAuthenticatedAction('updateCompany', async (user) => {
    // Verificar company_id del usuario
    const companyCheck = requireCompany(user, user.companyId);
    if (!companyCheck.allowed) {
      return { error: companyCheck.reason };
    }

    // Obtener el emisor para verificar permisos
    const { data: existingCompany, error: fetchError } = await supabaseAdmin
      .from("issuers")
      .select("company_id")
      .eq("id", companyId)
      .is("deleted_at", null) // Solo empresas activas
      .single();

    if (fetchError || !existingCompany) {
      log.error("[updateCompany] Empresa no encontrada:", fetchError);
      return { error: "Empresa no encontrada" };
    }

    // Verificar permisos: Admin solo puede editar su propia empresa
    const deletePermission = canDeleteFromCompany(user, existingCompany.company_id);
    if (!deletePermission.allowed) {
      log.error("[updateCompany] Intento de edición cross-company", {
        userId: user.id,
        userCompanyId: user.companyId,
        targetCompanyId: existingCompany.company_id
      });
      return { error: deletePermission.reason };
    }

    // Validaciones usando helpers
    const validationErrors = getFirstValidationError([
      data.email ? validateEmailField(data.email) : { valid: true },
      data.nif ? validateNIFField(data.nif) : { valid: true },
    ]);

    if (validationErrors) {
      return { error: validationErrors };
    }

    // Actualizar empresa
    const { data: updatedCompany, error } = await supabaseAdmin
      .from("issuers")
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq("id", companyId)
      .select()
      .single();

    if (error) {
      log.error("[updateCompany] Error DB:", error);
      return { error: error.message };
    }

    log.info("[updateCompany] Éxito:", updatedCompany.id);

    // Revalidar rutas
    revalidatePath("/companies");
    revalidatePath(`/companies/${companyId}/edit`);
    revalidatePath("/companies/edit");

    return { data: updatedCompany };
  });
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
      .from("issuers")
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

    // SECURITY (VULN-007): Obtener estadísticas antes de eliminar para auditoría
    const { data: companyData } = await supabaseAdmin
      .from("companies")
      .select("*")
      .eq("id", company.company_id)
      .single();

    const { count: usersCount } = await supabaseAdmin
      .from("users")
      .select("*", { count: "exact", head: true })
      .eq("company_id", company.company_id);

    const { count: tariffsCount } = await supabaseAdmin
      .from("tariffs")
      .select("*", { count: "exact", head: true })
      .eq("company_id", company.company_id);

    const { count: budgetsCount } = await supabaseAdmin
      .from("budgets")
      .select("*", { count: "exact", head: true })
      .eq("company_id", company.company_id);

    // SOFT DELETE: Marcar como eliminada en lugar de borrar físicamente
    // Ventajas:
    // - Permite recuperación si fue error
    // - Mantiene integridad referencial
    // - Auditoría completa de eliminaciones
    const { error: deleteError } = await supabaseAdmin
      .from("issuers")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", companyId);

    if (deleteError) {
      log.error("[deleteCompany] Error al soft-delete:", deleteError);
      return { success: false, error: deleteError.message };
    }

    // SECURITY (VULN-007): Registrar en log de auditoría
    const { error: auditError } = await supabaseAdmin
      .from("company_deletion_log")
      .insert({
        company_id: company.company_id,
        issuer_id: company.id,
        deleted_by: user.id,
        deletion_type: "soft_delete",
        company_snapshot: companyData || {},
        issuer_snapshot: company,
        users_count: usersCount || 0,
        tariffs_count: tariffsCount || 0,
        budgets_count: budgetsCount || 0,
      });

    if (auditError) {
      log.warn("[deleteCompany] Error registrando auditoría (no crítico):", auditError);
      // No fallar la operación si falla el audit log
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
      .from("issuers")
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

    // SECURITY (VULN-007): Obtener estadísticas para auditoría
    const { data: companyData } = await supabaseAdmin
      .from("companies")
      .select("*")
      .eq("id", company.company_id)
      .single();

    // Restaurar: quitar marca de eliminación
    const { data: restoredCompany, error: restoreError } = await supabaseAdmin
      .from("issuers")
      .update({ deleted_at: null })
      .eq("id", companyId)
      .select()
      .single();

    if (restoreError) {
      log.error("[restoreCompany] Error al restaurar:", restoreError);
      return { success: false, error: restoreError.message };
    }

    // SECURITY (VULN-007): Registrar restauración en log de auditoría
    const { error: auditError } = await supabaseAdmin
      .from("company_deletion_log")
      .insert({
        company_id: company.company_id,
        issuer_id: company.id,
        deleted_by: user.id,
        deletion_type: "restore",
        company_snapshot: companyData || {},
        issuer_snapshot: restoredCompany,
        users_count: 0,
        tariffs_count: 0,
        budgets_count: 0,
        deletion_reason: "Restauración manual por superadmin",
      });

    if (auditError) {
      log.warn("[restoreCompany] Error registrando auditoría (no crítico):", auditError);
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
 * Eliminar empresa de forma PERMANENTE - Solo superadmin
 * PELIGRO: Esta operación NO se puede deshacer
 *
 * Proceso:
 * 1. Verificar que la empresa esté soft-deleted (deleted_at NOT NULL)
 * 2. Crear backup completo en company_deletion_log
 * 3. Eliminar FÍSICAMENTE todos los datos relacionados:
 *    - Usuarios (users)
 *    - Tarifas (tariffs)
 *    - Presupuestos (budgets)
 *    - Emisor (issuers)
 *    - Entrada company (companies)
 *
 * NOTA: Solo se pueden eliminar permanentemente empresas ya soft-deleted
 *
 * @param companyId - UUID del emisor en issuers
 * @param confirmationText - El usuario debe escribir el nombre de la empresa para confirmar
 * @returns ActionResult con información de datos eliminados
 */
export async function permanentlyDeleteCompany(
  companyId: string,
  confirmationText: string
): Promise<ActionResult> {
  try {
    log.info("[permanentlyDeleteCompany] INICIANDO ELIMINACIÓN PERMANENTE...", companyId);

    // ============================================
    // 1. AUTENTICACIÓN Y AUTORIZACIÓN
    // ============================================

    const { getServerUser } = await import("@/lib/auth/server");
    const user = await getServerUser();

    if (!user) {
      return { success: false, error: "No autenticado" };
    }

    // SECURITY: Validar company_id obligatorio
    try {
      requireValidCompanyId(user, '[permanentlyDeleteCompany]');
    } catch (error) {
      log.error('[permanentlyDeleteCompany] company_id inválido', { error });
      return { success: false, error: "Usuario sin empresa asignada" };
    }

    // Solo superadmin puede eliminar permanentemente
    if (user.role !== "superadmin") {
      log.error("[permanentlyDeleteCompany] Intento sin permisos por usuario:", user.id);
      return { success: false, error: "Solo superadmin puede eliminar empresas permanentemente" };
    }

    // ============================================
    // 2. OBTENER Y VALIDAR EMPRESA
    // ============================================

    // La empresa DEBE estar soft-deleted para poder eliminarla permanentemente
    const { data: company, error: companyError } = await supabaseAdmin
      .from("issuers")
      .select("*")
      .eq("id", companyId)
      .not("deleted_at", "is", null) // Solo empresas YA eliminadas (soft-delete)
      .single();

    if (companyError || !company) {
      log.error("[permanentlyDeleteCompany] Empresa no encontrada o no está soft-deleted:", companyError);
      return {
        success: false,
        error: "Empresa no encontrada o no está marcada como eliminada. Primero debes eliminarla (soft-delete).",
      };
    }

    // PROTECCIÓN: No permitir eliminar la empresa por defecto
    if (company.company_id === 1) {
      log.error("[permanentlyDeleteCompany] Intento de eliminar empresa por defecto");
      return {
        success: false,
        error: "No se puede eliminar la empresa por defecto del sistema",
      };
    }

    // ============================================
    // 3. VERIFICAR CONFIRMACIÓN
    // ============================================

    // El usuario DEBE escribir el nombre exacto de la empresa
    if (confirmationText.trim() !== company.name.trim()) {
      log.error("[permanentlyDeleteCompany] Confirmación incorrecta:", {
        expected: company.name,
        received: confirmationText,
      });
      return {
        success: false,
        error: `Debes escribir exactamente "${company.name}" para confirmar la eliminación permanente`,
      };
    }

    log.warn("[permanentlyDeleteCompany] CONFIRMACIÓN VALIDADA - Procediendo con eliminación permanente de:", company.name);

    // ============================================
    // 4. CREAR BACKUP COMPLETO (CRÍTICO)
    // ============================================

    log.info("[permanentlyDeleteCompany] Creando backup completo...");

    // Obtener company data
    const { data: companyData } = await supabaseAdmin
      .from("companies")
      .select("*")
      .eq("id", company.company_id)
      .single();

    // Obtener TODOS los usuarios de esta empresa
    const { data: allUsers } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("company_id", company.company_id);

    // ============================================
    // PROTECCIÓN: Verificar usuarios protegidos
    // ============================================

    // Lista de emails protegidos que NUNCA deben ser eliminados
    const PROTECTED_EMAILS = ['josivela+super@gmail.com'];

    // Verificar si hay usuarios protegidos
    const protectedUsers = allUsers?.filter(u =>
      PROTECTED_EMAILS.includes(u.email) || u.role === 'superadmin'
    ) || [];

    if (protectedUsers.length > 0) {
      log.warn("[permanentlyDeleteCompany] DETECTADO: Usuarios protegidos en la empresa a eliminar:", {
        count: protectedUsers.length,
        emails: protectedUsers.map(u => u.email)
      });

      // REASIGNAR usuarios protegidos a empresa 1 en lugar de eliminarlos
      for (const protectedUser of protectedUsers) {
        log.warn("[permanentlyDeleteCompany] Reasignando usuario protegido a empresa 1:", protectedUser.email);

        const { error: reassignError } = await supabaseAdmin
          .from("users")
          .update({
            company_id: 1,
            updated_at: new Date().toISOString()
          })
          .eq("id", protectedUser.id);

        if (reassignError) {
          log.error("[permanentlyDeleteCompany] ERROR CRÍTICO: No se pudo reasignar usuario protegido:", {
            email: protectedUser.email,
            error: reassignError
          });
          return {
            success: false,
            error: `Error crítico: No se puede eliminar empresa con usuarios protegidos. Usuario ${protectedUser.email} no pudo ser reasignado.`
          };
        }

        log.info("[permanentlyDeleteCompany] ✓ Usuario protegido reasignado exitosamente a empresa 1:", protectedUser.email);
      }

      // Actualizar allUsers para excluir usuarios reasignados
      const reassignedUserIds = protectedUsers.map(u => u.id);
      const remainingUsers = allUsers?.filter(u => !reassignedUserIds.includes(u.id)) || [];

      log.info("[permanentlyDeleteCompany] Usuarios reasignados:", protectedUsers.length);
      log.info("[permanentlyDeleteCompany] Usuarios que SE eliminarán:", remainingUsers.length);
    }

    // Obtener TODAS las tarifas de esta empresa
    const { data: allTariffs } = await supabaseAdmin
      .from("tariffs")
      .select("*")
      .eq("company_id", company.company_id);

    // Obtener TODOS los presupuestos de esta empresa
    const { data: allBudgets } = await supabaseAdmin
      .from("budgets")
      .select("*")
      .eq("company_id", company.company_id);

    // SECURITY (VULN-007): Registrar backup ANTES de eliminar (crítico)
    const { error: backupError } = await supabaseAdmin
      .from("company_deletion_log")
      .insert({
        company_id: company.company_id,
        issuer_id: company.id,
        deleted_by: user.id,
        deletion_type: "permanent_delete",
        company_snapshot: companyData || {},
        issuer_snapshot: company,
        users_count: allUsers?.length || 0,
        tariffs_count: allTariffs?.length || 0,
        budgets_count: allBudgets?.length || 0,
        deletion_reason: `Eliminación permanente confirmada por superadmin ${user.email}`,
        // Guardar snapshot completo de TODOS los datos para recuperación de emergencia
        full_backup: {
          users: allUsers || [],
          tariffs: allTariffs || [],
          budgets: allBudgets || [],
          company: companyData,
          issuer: company,
          deleted_at: new Date().toISOString(),
          deleted_by: user.id,
          deleted_by_email: user.email,
        },
      });

    if (backupError) {
      log.error("[permanentlyDeleteCompany] ERROR CRÍTICO creando backup:", backupError);
      return {
        success: false,
        error: "Error crítico creando backup. Operación cancelada por seguridad.",
      };
    }

    log.info("[permanentlyDeleteCompany] Backup creado exitosamente");

    // ============================================
    // 5. ELIMINACIÓN FÍSICA EN CASCADA
    // ============================================

    log.warn("[permanentlyDeleteCompany] INICIANDO eliminación física de datos...");

    const deletionStats = {
      users: 0,
      tariffs: 0,
      budgets: 0,
      issuer: false,
      company: false,
    };

    // 5.1. Eliminar presupuestos
    const { error: budgetsDeleteError, count: budgetsDeleted } = await supabaseAdmin
      .from("budgets")
      .delete({ count: "exact" })
      .eq("company_id", company.company_id);

    if (budgetsDeleteError) {
      log.error("[permanentlyDeleteCompany] Error eliminando presupuestos:", budgetsDeleteError);
      return {
        success: false,
        error: `Error eliminando presupuestos: ${budgetsDeleteError.message}. Backup guardado.`,
      };
    }
    deletionStats.budgets = budgetsDeleted || 0;
    log.info("[permanentlyDeleteCompany] Presupuestos eliminados:", deletionStats.budgets);

    // 5.2. Eliminar tarifas
    const { error: tariffsDeleteError, count: tariffsDeleted } = await supabaseAdmin
      .from("tariffs")
      .delete({ count: "exact" })
      .eq("company_id", company.company_id);

    if (tariffsDeleteError) {
      log.error("[permanentlyDeleteCompany] Error eliminando tarifas:", tariffsDeleteError);
      return {
        success: false,
        error: `Error eliminando tarifas: ${tariffsDeleteError.message}. Backup guardado.`,
      };
    }
    deletionStats.tariffs = tariffsDeleted || 0;
    log.info("[permanentlyDeleteCompany] Tarifas eliminadas:", deletionStats.tariffs);

    // 5.3. Eliminar usuarios
    const { error: usersDeleteError, count: usersDeleted } = await supabaseAdmin
      .from("users")
      .delete({ count: "exact" })
      .eq("company_id", company.company_id);

    if (usersDeleteError) {
      log.error("[permanentlyDeleteCompany] Error eliminando usuarios:", usersDeleteError);
      return {
        success: false,
        error: `Error eliminando usuarios: ${usersDeleteError.message}. Backup guardado.`,
      };
    }
    deletionStats.users = usersDeleted || 0;
    log.info("[permanentlyDeleteCompany] Usuarios eliminados:", deletionStats.users);

    // 5.4. Eliminar emisor
    const { error: issuerDeleteError } = await supabaseAdmin
      .from("issuers")
      .delete()
      .eq("id", companyId);

    if (issuerDeleteError) {
      log.error("[permanentlyDeleteCompany] Error eliminando emisor:", issuerDeleteError);
      return {
        success: false,
        error: `Error eliminando emisor: ${issuerDeleteError.message}. Backup guardado.`,
      };
    }
    deletionStats.issuer = true;
    log.info("[permanentlyDeleteCompany] Emisor eliminado");

    // 5.5. Eliminar company
    const { error: companyDeleteError } = await supabaseAdmin
      .from("companies")
      .delete()
      .eq("id", company.company_id);

    if (companyDeleteError) {
      log.error("[permanentlyDeleteCompany] Error eliminando company:", companyDeleteError);
      return {
        success: false,
        error: `Error eliminando company: ${companyDeleteError.message}. Backup guardado.`,
      };
    }
    deletionStats.company = true;
    log.info("[permanentlyDeleteCompany] Company eliminada");

    // ============================================
    // 6. CONFIRMACIÓN FINAL
    // ============================================

    log.warn("[permanentlyDeleteCompany] ✅ ELIMINACIÓN PERMANENTE COMPLETADA:", {
      companyName: company.name,
      companyId: company.company_id,
      stats: deletionStats,
    });

    // Revalidar
    revalidatePath("/companies");

    return {
      success: true,
      data: {
        message: `Empresa "${company.name}" eliminada permanentemente`,
        stats: deletionStats,
        backupCreated: true,
      } as any,
    };
  } catch (error) {
    log.error("[permanentlyDeleteCompany] Error inesperado:", error);
    return {
      success: false,
      error: "Error inesperado durante la eliminación permanente. Verifica el backup en logs.",
    };
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
      .from("issuers")
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
          .from("users")
          .select("*", { count: "exact", head: true })
          .eq("company_id", company.company_id);

        const { count: tariffCount } = await supabaseAdmin
          .from("tariffs")
          .select("*", { count: "exact", head: true })
          .eq("company_id", company.company_id);

        const { count: budgetCount } = await supabaseAdmin
          .from("budgets")
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

/**
 * Duplicar empresa - Solo superadmin
 * Crea una nueva empresa copiando los datos de una empresa existente
 * Útil cuando public_registration_enabled = false
 *
 * @param sourceCompanyUuid - UUID del emisor (company) a duplicar
 * @returns ActionResult con la nueva empresa creada
 */
export async function duplicateCompany(sourceCompanyUuid: string): Promise<ActionResult> {
  try {
    log.info("[duplicateCompany] Iniciando duplicación...", { sourceCompanyUuid });

    // 1. Autenticación y autorización
    const { getServerUser } = await import("@/lib/auth/server");
    const user = await getServerUser();

    if (!user) {
      return { success: false, error: "No autenticado" };
    }

    // Solo superadmin puede duplicar empresas
    if (user.role !== "superadmin") {
      log.error("[duplicateCompany] Intento sin permisos por usuario:", user.id);
      return { success: false, error: "Solo superadmin puede duplicar empresas" };
    }

    // 2. Obtener empresa origen
    const { data: sourceCompany, error: fetchError } = await supabaseAdmin
      .from("issuers")
      .select("*")
      .eq("id", sourceCompanyUuid)
      .is("deleted_at", null)
      .single();

    if (fetchError || !sourceCompany) {
      log.error("[duplicateCompany] Error al obtener empresa origen:", fetchError);
      return { success: false, error: "Empresa origen no encontrada" };
    }

    // 3. Obtener el id más alto para generar el siguiente
    // NOTA: En companies la columna se llama 'id', no 'company_id'
    const { data: companiesData, error: maxError } = await supabaseAdmin
      .from("companies")
      .select("id")
      .order("id", { ascending: false })
      .limit(1);

    if (maxError) {
      log.error("[duplicateCompany] Error al obtener max id:", maxError);
      return { success: false, error: "Error al generar nuevo id de empresa" };
    }

    // Si hay empresas, tomar el máximo + 1, sino empezar en 2 (1 es la empresa por defecto)
    const maxCompanyId = companiesData && companiesData.length > 0 ? companiesData[0].id : 1;
    const newCompanyId = maxCompanyId + 1;

    // 4. Crear entrada en companies
    // La columna 'id' es auto-generada (serial), así que no la pasamos
    const { data: newCompany, error: companyError } = await supabaseAdmin
      .from("companies")
      .insert({
        name: `${sourceCompany.name} (Copia)`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (companyError || !newCompany) {
      log.error("[duplicateCompany] Error al crear company:", companyError);
      return { success: false, error: "Error al crear nueva empresa" };
    }

    // 5. Crear emisor duplicado (copia de datos)
    const { data: newIssuer, error: issuerError } = await supabaseAdmin
      .from("issuers")
      .insert({
        user_id: user.id, // Asignar al superadmin que crea la copia
        company_id: newCompany.id, // Usar el id generado automáticamente
        type: sourceCompany.type,
        name: `${sourceCompany.name} (Copia)`,
        nif: sourceCompany.nif,
        address: sourceCompany.address,
        postal_code: sourceCompany.postal_code,
        locality: sourceCompany.locality,
        province: sourceCompany.province,
        country: sourceCompany.country,
        phone: sourceCompany.phone,
        email: sourceCompany.email,
        web: sourceCompany.web,
        irpf_percentage: sourceCompany.irpf_percentage,
        logo_url: null, // No copiar logo (podría requerir copia de archivo)
        note: `Duplicado de: ${sourceCompany.name}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (issuerError || !newIssuer) {
      log.error("[duplicateCompany] Error al crear emisor:", issuerError);
      // Rollback: eliminar company creada
      await supabaseAdmin
        .from("companies")
        .delete()
        .eq("id", newCompany.id);
      return { success: false, error: "Error al crear emisor de la nueva empresa" };
    }

    log.info("[duplicateCompany] Empresa duplicada exitosamente:", {
      newCompanyId: newCompany.id,
      newIssuerId: newIssuer.id,
    });

    revalidatePath("/companies");

    // Retornar objeto completo para actualizar UI sin recargar
    return {
      success: true,
      data: {
        id: newCompany.id,
        uuid: newIssuer.id,
        name: newIssuer.name,
        type: newIssuer.type,
        nif: newIssuer.nif,
        address: newIssuer.address,
        email: newIssuer.email,
        phone: newIssuer.phone,
        created_at: newIssuer.created_at,
        // Nueva empresa sin datos aún
        user_count: 0,
        tariff_count: 0,
        budget_count: 0,
      },
    };
  } catch (error) {
    log.error("[duplicateCompany] Error inesperado:", error);
    return { success: false, error: "Error inesperado al duplicar empresa" };
  }
}

/**
 * Eliminar empresa de forma PERMANENTE (hard delete) - Solo superadmin
 * ADVERTENCIA: Esta operación es IRREVERSIBLE
 * Solo se puede aplicar a empresas ya marcadas como eliminadas (deleted_at != null)
 */
export async function permanentDeleteCompany(companyUuid: string): Promise<ActionResult> {
  try {
    log.info("[permanentDeleteCompany] Iniciando eliminación permanente...", { companyUuid });

    // 1. Autenticación y autorización
    const { getServerUser } = await import("@/lib/auth/server");
    const user = await getServerUser();

    if (!user) {
      return { success: false, error: "No autenticado" };
    }

    // Solo superadmin puede eliminar permanentemente
    if (user.role !== "superadmin") {
      log.error("[permanentDeleteCompany] Intento sin permisos por usuario:", user.id);
      return { success: false, error: "Solo superadmin puede eliminar empresas permanentemente" };
    }

    // 2. Obtener empresa a eliminar (debe estar ya marcada como eliminada)
    const { data: issuer, error: fetchError } = await supabaseAdmin
      .from("issuers")
      .select("*")
      .eq("id", companyUuid)
      .not("deleted_at", "is", null) // Solo empresas YA eliminadas (soft-deleted)
      .single();

    if (fetchError || !issuer) {
      log.error("[permanentDeleteCompany] Empresa no encontrada o no está eliminada:", fetchError);
      return {
        success: false,
        error: "Solo se pueden eliminar permanentemente empresas ya marcadas como eliminadas"
      };
    }

    // PROTECCIÓN: No permitir eliminar la empresa por defecto (company_id = 1)
    if (issuer.company_id === 1) {
      log.error("[permanentDeleteCompany] Intento de eliminar empresa por defecto");
      return {
        success: false,
        error: "No se puede eliminar la empresa por defecto del sistema",
      };
    }

    log.info("[permanentDeleteCompany] Eliminando permanentemente empresa:", {
      name: issuer.name,
      company_id: issuer.company_id,
      issuer_id: issuer.id
    });

    // 3. Obtener estadísticas para auditoría final
    const { data: companyData } = await supabaseAdmin
      .from("companies")
      .select("*")
      .eq("id", issuer.company_id)
      .single();

    const { count: usersCount } = await supabaseAdmin
      .from("users")
      .select("*", { count: "exact", head: true })
      .eq("company_id", issuer.company_id);

    const { count: tariffsCount } = await supabaseAdmin
      .from("tariffs")
      .select("*", { count: "exact", head: true })
      .eq("company_id", issuer.company_id);

    const { count: budgetsCount } = await supabaseAdmin
      .from("budgets")
      .select("*", { count: "exact", head: true })
      .eq("company_id", issuer.company_id);

    // 4. Registrar en audit log ANTES de eliminar
    const { error: auditError } = await supabaseAdmin
      .from("company_deletion_log")
      .insert({
        company_id: issuer.company_id,
        issuer_id: issuer.id,
        deleted_by: user.id,
        deletion_type: "permanent_delete",
        company_snapshot: companyData || {},
        issuer_snapshot: issuer,
        users_count: usersCount || 0,
        tariffs_count: tariffsCount || 0,
        budgets_count: budgetsCount || 0,
      });

    if (auditError) {
      log.error("[permanentDeleteCompany] Error registrando auditoría:", auditError);
      return { success: false, error: "Error al registrar auditoría de eliminación" };
    }

    // 5. HARD DELETE EN CASCADA: Eliminar TODOS los datos relacionados
    log.info("[permanentDeleteCompany] Eliminando datos en cascada...");

    // 5.1. Obtener todos los presupuestos para eliminar sus notas y versiones
    const { data: budgets } = await supabaseAdmin
      .from("budgets")
      .select("id")
      .eq("company_id", issuer.company_id);

    if (budgets && budgets.length > 0) {
      const budgetIds = budgets.map(b => b.id);

      // Eliminar notas de presupuestos
      const { error: notesError } = await supabaseAdmin
        .from("budget_notes")
        .delete()
        .in("budget_id", budgetIds);

      if (notesError) {
        log.warn("[permanentDeleteCompany] Error al eliminar notas:", notesError);
      }

      // Eliminar versiones de presupuestos
      const { error: versionsError } = await supabaseAdmin
        .from("budget_versions")
        .delete()
        .in("budget_id", budgetIds);

      if (versionsError) {
        log.warn("[permanentDeleteCompany] Error al eliminar versiones:", versionsError);
      }
    }

    // 5.2. Eliminar presupuestos
    const { error: budgetsError } = await supabaseAdmin
      .from("budgets")
      .delete()
      .eq("company_id", issuer.company_id);

    if (budgetsError) {
      log.error("[permanentDeleteCompany] Error al eliminar presupuestos:", budgetsError);
      return { success: false, error: "Error al eliminar presupuestos" };
    }

    // 5.3. Eliminar tarifas
    const { error: tariffsError } = await supabaseAdmin
      .from("tariffs")
      .delete()
      .eq("company_id", issuer.company_id);

    if (tariffsError) {
      log.error("[permanentDeleteCompany] Error al eliminar tarifas:", tariffsError);
      return { success: false, error: "Error al eliminar tarifas" };
    }

    // 5.4. Eliminar suscripción de la empresa
    const { error: subscriptionError } = await supabaseAdmin
      .from("subscriptions")
      .delete()
      .eq("company_id", issuer.company_id);

    if (subscriptionError) {
      log.warn("[permanentDeleteCompany] Error al eliminar suscripción:", subscriptionError);
      // No es crítico, continuar
    }

    // 5.5. Obtener usuarios para eliminar sus cuentas de auth
    const { data: users } = await supabaseAdmin
      .from("users")
      .select("id, email, role")
      .eq("company_id", issuer.company_id);

    // ============================================
    // PROTECCIÓN: Verificar usuarios protegidos
    // ============================================

    // Lista de emails protegidos que NUNCA deben ser eliminados
    const PROTECTED_EMAILS = ['josivela+super@gmail.com'];

    // Verificar si hay usuarios protegidos
    const protectedUsers = users?.filter(u =>
      PROTECTED_EMAILS.includes(u.email) || u.role === 'superadmin'
    ) || [];

    if (protectedUsers.length > 0) {
      log.warn("[permanentDeleteCompany] DETECTADO: Usuarios protegidos en la empresa a eliminar:", {
        count: protectedUsers.length,
        emails: protectedUsers.map(u => u.email)
      });

      // REASIGNAR usuarios protegidos a empresa 1 en lugar de eliminarlos
      for (const protectedUser of protectedUsers) {
        log.warn("[permanentDeleteCompany] Reasignando usuario protegido a empresa 1:", protectedUser.email);

        const { error: reassignError } = await supabaseAdmin
          .from("users")
          .update({
            company_id: 1,
            updated_at: new Date().toISOString()
          })
          .eq("id", protectedUser.id);

        if (reassignError) {
          log.error("[permanentDeleteCompany] ERROR CRÍTICO: No se pudo reasignar usuario protegido:", {
            email: protectedUser.email,
            error: reassignError
          });
          return {
            success: false,
            error: `Error crítico: No se puede eliminar empresa con usuarios protegidos. Usuario ${protectedUser.email} no pudo ser reasignado.`
          };
        }

        log.info("[permanentDeleteCompany] ✓ Usuario protegido reasignado exitosamente a empresa 1:", protectedUser.email);
      }

      // Filtrar usuarios protegidos de la lista de usuarios a eliminar
      const remainingUsers = users?.filter(u =>
        !protectedUsers.some(pu => pu.id === u.id)
      ) || [];

      log.info("[permanentDeleteCompany] Usuarios reasignados:", protectedUsers.length);
      log.info("[permanentDeleteCompany] Usuarios que SE eliminarán:", remainingUsers.length);

      // Actualizar users con solo los usuarios NO protegidos
      if (remainingUsers.length > 0) {
        // Eliminar solo usuarios NO protegidos de Supabase Auth
        for (const userRecord of remainingUsers) {
          const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(
            userRecord.id
          );

          if (authError) {
            log.warn(`[permanentDeleteCompany] Error al eliminar auth user ${userRecord.id}:`, authError);
          }
        }

        // Eliminar registros de usuarios en users (si quedan, solo NO protegidos)
        const { error: usersError } = await supabaseAdmin
          .from("users")
          .delete()
          .eq("company_id", issuer.company_id);

        if (usersError) {
          log.warn("[permanentDeleteCompany] Error al eliminar users:", usersError);
        }
      }
    } else if (users && users.length > 0) {
      // No hay usuarios protegidos, eliminar todos normalmente
      for (const userRecord of users) {
        const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(
          userRecord.id
        );

        if (authError) {
          log.warn(`[permanentDeleteCompany] Error al eliminar auth user ${userRecord.id}:`, authError);
        }
      }

      // Eliminar registros de usuarios en users (si quedan)
      const { error: usersError } = await supabaseAdmin
        .from("users")
        .delete()
        .eq("company_id", issuer.company_id);

      if (usersError) {
        log.warn("[permanentDeleteCompany] Error al eliminar users:", usersError);
      }
    }

    // 5.6. Eliminar registro de auditoría que referencia al issuer
    // (Necesario para poder eliminar el issuer por FK constraint)
    const { error: deleteAuditError } = await supabaseAdmin
      .from("company_deletion_log")
      .delete()
      .eq("issuer_id", companyUuid);

    if (deleteAuditError) {
      log.warn("[permanentDeleteCompany] Error al eliminar registro de auditoría:", deleteAuditError);
      // No es crítico, continuar con la eliminación
    }

    // 5.7. Eliminar emisor
    const { error: deleteIssuerError } = await supabaseAdmin
      .from("issuers")
      .delete()
      .eq("id", companyUuid);

    if (deleteIssuerError) {
      log.error("[permanentDeleteCompany] Error al eliminar emisor:", deleteIssuerError);
      return { success: false, error: "Error al eliminar emisor permanentemente" };
    }

    // 5.8. Eliminar entrada en companies
    const { error: deleteCompanyError } = await supabaseAdmin
      .from("companies")
      .delete()
      .eq("id", issuer.company_id);

    if (deleteCompanyError) {
      log.error("[permanentDeleteCompany] Error al eliminar company:", deleteCompanyError);
      return { success: false, error: "Error al eliminar company" };
    }

    log.info("[permanentDeleteCompany] Empresa eliminada permanentemente:", issuer.name);

    revalidatePath("/companies");

    return {
      success: true,
      data: {
        id: issuer.company_id,
        name: issuer.name,
      },
    };
  } catch (error) {
    log.error("[permanentDeleteCompany] Error inesperado:", error);
    return { success: false, error: "Error inesperado al eliminar empresa permanentemente" };
  }
}
