/**
 * Server Actions para gestión de usuarios (CRUD)
 * Solo accesible por admin/superadmin
 */

"use server";

import { supabaseAdmin } from "@/lib/supabase/server";
import { z } from "zod";
import { getServerUser } from "@/lib/auth/server";
import { log } from "@/lib/logger";
import { requireValidCompanyId } from "@/lib/helpers/company-validation";
import { generateSecurePassword } from "@/lib/helpers/crypto-helpers";

// ============================================
// TIPOS
// ============================================

export interface User {
  id: string;
  email: string;
  name: string | null;
  last_name: string | null;
  role: "vendedor" | "admin" | "superadmin";
  company_id: number;
  status: "active" | "inactive" | "pending";
  invited_by: string | null;
  last_login: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserWithInviter extends User {
  inviter_name?: string;
  inviter_email?: string;
}

// ============================================
// SCHEMAS DE VALIDACIÓN
// ============================================

const createUserSchema = z.object({
  email: z.string().email("Email inválido").toLowerCase().trim(),
  name: z.string().min(1, "El nombre es requerido").max(100).trim(),
  last_name: z.string().min(1, "Los apellidos son requeridos").max(100).trim(),
  role: z.enum(["vendedor", "admin", "superadmin"], {
    required_error: "El rol es requerido",
  }),
  company_id: z.number().int().positive(),
});

const updateUserSchema = z.object({
  name: z.string().min(1, "El nombre es requerido").max(100).trim().optional(),
  last_name: z
    .string()
    .min(1, "Los apellidos son requeridos")
    .max(100)
    .trim()
    .optional(),
  role: z.enum(["vendedor", "admin", "superadmin"]).optional(),
  status: z.enum(["active", "inactive", "pending"]).optional(),
});

export type CreateUserData = z.infer<typeof createUserSchema>;
export type UpdateUserData = z.infer<typeof updateUserSchema>;

// ============================================
// HELPERS
// ============================================

/**
 * Verifica si el usuario actual es admin o superadmin
 */
async function checkAdminPermission(): Promise<{
  allowed: boolean;
  currentUser: { id: string; role: string; company_id: number } | null;
}> {
  const user = await getServerUser();

  if (!user || !["admin", "superadmin"].includes(user.role)) {
    return { allowed: false, currentUser: null };
  }

  return {
    allowed: true,
    currentUser: {
      id: user.id,
      role: user.role,
      company_id: user.company_id,
    },
  };
}

/**
 * Verifica si el usuario actual tiene acceso (incluye vendedor para lectura)
 */
async function checkUserAccess(): Promise<{
  allowed: boolean;
  currentUser: { id: string; role: string; company_id: number } | null;
}> {
  const user = await getServerUser();

  if (!user) {
    return { allowed: false, currentUser: null };
  }

  return {
    allowed: true,
    currentUser: {
      id: user.id,
      role: user.role,
      company_id: user.company_id,
    },
  };
}

/**
 * Genera password temporal segura
 * SECURITY (VULN-018): Usa crypto.getRandomValues() en lugar de Math.random()
 */
function generateTemporaryPassword(): string {
  return generateSecurePassword(12, true);
}

// ============================================
// ACTIONS
// ============================================

/**
 * Obtener lista de usuarios de la empresa
 */
export async function getUsers() {
  // Permitir acceso a todos (vendedor verá la lista pero solo podrá editar su perfil)
  const { allowed, currentUser } = await checkUserAccess();

  if (!allowed || !currentUser) {
    return {
      success: false,
      error: "No tienes permisos para ver usuarios",
    };
  }

  // Construir query base
  let query = supabaseAdmin
    .from("redpresu_users")
    .select(
      `
      *,
      inviter:invited_by (
        name,
        last_name,
        email
      )
    `
    )
    .eq("company_id", currentUser.company_id);

  // Si el usuario NO es superadmin, filtrar para NO mostrar superadmins
  if (currentUser.role !== "superadmin") {
    query = query.neq("role", "superadmin");
  }

  const { data: users, error } = await query.order("created_at", {
    ascending: false,
  });

  if (error) {
    log.error("Error fetching users:", error);
    return {
      success: false,
      error: "Error al obtener usuarios",
    };
  }

  // Formatear datos
  const formattedUsers: UserWithInviter[] = users.map((user) => ({
    ...user,
    inviter_name: user.inviter
      ? `${user.inviter.name} ${user.inviter.last_name}`
      : undefined,
    inviter_email: user.inviter?.email,
  }));

  log.info("[getUsers] Usuarios formateados:", formattedUsers.map(u => ({
    email: u.email,
    status: u.status,
    invited_by: u.invited_by,
    inviter_name: u.inviter_name,
    has_inviter_object: !!u.inviter
  })));

  return {
    success: true,
    data: formattedUsers,
  };
}

/**
 * Obtener un usuario por ID
 */
export async function getUserById(userId: string) {
  // Permitir acceso si es admin/superadmin O si es el mismo usuario (vendedor)
  const { allowed, currentUser } = await checkUserAccess();

  if (!allowed || !currentUser) {
    return {
      success: false,
      error: "No tienes permisos para ver este usuario",
    };
  }

  // Comercial solo puede ver su propio usuario
  if (currentUser.role === "vendedor" && userId !== currentUser.id) {
    return {
      success: false,
      error: "No tienes permisos para ver este usuario",
    };
  }

  const { data: user, error } = await supabaseAdmin
    .from("redpresu_users")
    .select(
      `
      *,
      inviter:invited_by (
        name,
        last_name,
        email
      )
    `
    )
    .eq("id", userId)
    .eq("company_id", currentUser.company_id)
    .single();

  if (error) {
    log.error("Error fetching user:", error);
    return {
      success: false,
      error: "Usuario no encontrado",
    };
  }

  const formattedUser: UserWithInviter = {
    ...user,
    inviter_name: user.inviter
      ? `${user.inviter.name} ${user.inviter.last_name}`
      : undefined,
    inviter_email: user.inviter?.email,
  };

  return {
    success: true,
    data: formattedUser,
  };
}

/**
 * Crear nuevo usuario (admin invita)
 */
export async function createUser(data: CreateUserData) {
  // Validar permisos
  const { allowed, currentUser } = await checkAdminPermission();

  if (!allowed || !currentUser) {
    return {
      success: false,
      error: "No tienes permisos para crear usuarios",
    };
  }

  // SECURITY: Validar company_id obligatorio
  let companyId: number;
  try {
    companyId = requireValidCompanyId(currentUser, '[createUser]');
  } catch (error) {
    log.error('[createUser] company_id inválido', { error });
    return {
      success: false,
      error: "Usuario sin empresa asignada"
    };
  }

  // Validar que sea de la misma empresa
  if (data.company_id !== companyId) {
    return {
      success: false,
      error: "No puedes crear usuarios de otra empresa",
    };
  }

  // Validar schema
  try {
    createUserSchema.parse(data);
  } catch (error) {
    const zodError = error as z.ZodError;
    return {
      success: false,
      error: zodError.errors?.[0]?.message || "Datos inválidos",
    };
  }

  // Generar password temporal
  const temporaryPassword = generateTemporaryPassword();

  try {
    // 1. Crear usuario en auth.users
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email: data.email,
        password: temporaryPassword,
        email_confirm: true, // Auto-confirmar email
      });

    if (authError) {
      log.error("Error creating auth user:", authError);

      // Traducir mensajes comunes de Supabase
      let errorMessage = "Error al crear usuario en sistema de autenticación";

      if (authError.message.includes("already registered") ||
          authError.message.includes("User already exists")) {
        errorMessage = "Este email ya está registrado en el sistema";
      }

      return {
        success: false,
        error: errorMessage,
      };
    }

    if (!authData.user) {
      return {
        success: false,
        error: "Error al crear usuario",
      };
    }

    // 2. Crear registro en public.users
    const userDataToInsert = {
      id: authData.user.id,
      email: data.email,
      name: data.name,
      last_name: data.last_name,
      role: data.role,
      company_id: data.company_id,
      status: "pending" as const, // Usuario debe cambiar password en primer login
      invited_by: null, // Se asignará cuando acepte la invitación
    };

    log.info("[createUser] Insertando usuario:", userDataToInsert);

    const { data: userData, error: userError } = await supabaseAdmin
      .from("redpresu_users")
      .insert(userDataToInsert)
      .select()
      .single();

    if (userError) {
      // Rollback: eliminar usuario de auth
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);

      log.error("Error creating user record:", userError);
      return {
        success: false,
        error: "Error al crear registro de usuario",
      };
    }

    log.info("[createUser] Usuario creado exitosamente:", {
      id: userData.id,
      email: userData.email,
      status: userData.status,
      invited_by: userData.invited_by
    });

    // TODO: Enviar email con password temporal
    // Por ahora retornamos el password para que el admin lo copie

    return {
      success: true,
      data: userData,
      temporaryPassword, // Retornar para mostrar al admin
    };
  } catch (error) {
    log.error("Unexpected error creating user:", error);
    return {
      success: false,
      error: "Error inesperado al crear usuario",
    };
  }
}

/**
 * Actualizar usuario existente
 */
export async function updateUser(userId: string, data: UpdateUserData) {
  // Validar permisos
  const { allowed, currentUser } = await checkAdminPermission();

  if (!allowed || !currentUser) {
    return {
      success: false,
      error: "No tienes permisos para actualizar usuarios",
    };
  }

  // SECURITY: Validar company_id obligatorio
  let companyId: number;
  try {
    companyId = requireValidCompanyId(currentUser, '[updateUser]');
  } catch (error) {
    log.error('[updateUser] company_id inválido', { error });
    return {
      success: false,
      error: "Usuario sin empresa asignada"
    };
  }

  // Validar schema
  try {
    updateUserSchema.parse(data);
  } catch (error) {
    const zodError = error as z.ZodError;
    return {
      success: false,
      error: zodError.errors?.[0]?.message || "Datos inválidos",
    };
  }

  // Verificar que el usuario pertenece a la misma empresa
  const { data: targetUser, error: checkError } = await supabaseAdmin
    .from("redpresu_users")
    .select("company_id, role")
    .eq("id", userId)
    .single();

  if (checkError || !targetUser) {
    return {
      success: false,
      error: "Usuario no encontrado",
    };
  }

  if (targetUser.company_id !== companyId) {
    return {
      success: false,
      error: "No puedes actualizar usuarios de otra empresa",
    };
  }

  // Prevenir que admin se quite sus propios permisos
  if (
    userId === currentUser.id &&
    data.role &&
    data.role !== currentUser.role
  ) {
    return {
      success: false,
      error: "No puedes cambiar tu propio rol",
    };
  }

  // Actualizar usuario
  const { data: updatedUser, error: updateError } = await supabaseAdmin
    .from("redpresu_users")
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId)
    .select()
    .single();

  if (updateError) {
    log.error("Error updating user:", updateError);
    return {
      success: false,
      error: "Error al actualizar usuario",
    };
  }

  return {
    success: true,
    data: updatedUser,
  };
}

/**
 * Cambiar status de usuario (soft delete)
 */
export async function toggleUserStatus(
  userId: string,
  newStatus: "active" | "inactive"
) {
  return updateUser(userId, { status: newStatus });
}

/**
 * Eliminar usuario permanentemente
 * @param userId - ID del usuario a eliminar
 * @param reassignToUserId - ID del usuario al que reasignar datos (null para borrar datos)
 */
export async function deleteUser(userId: string, reassignToUserId: string | null) {
  const { allowed, currentUser } = await checkAdminPermission();

  if (!allowed || !currentUser) {
    return {
      success: false,
      error: "No tienes permisos para eliminar usuarios",
    };
  }

  // SECURITY: Validar company_id obligatorio
  let companyId: number;
  try {
    companyId = requireValidCompanyId(currentUser, '[deleteUser]');
  } catch (error) {
    log.error('[deleteUser] company_id inválido', { error });
    return {
      success: false,
      error: "Usuario sin empresa asignada"
    };
  }

  // No permitir auto-eliminación
  if (userId === currentUser.id) {
    return {
      success: false,
      error: "No puedes eliminarte a ti mismo",
    };
  }

  // Verificar que el usuario a eliminar pertenece a la misma empresa
  const { data: targetUser, error: targetError } = await supabaseAdmin
    .from("redpresu_users")
    .select("company_id, role")
    .eq("id", userId)
    .single();

  if (targetError || !targetUser || targetUser.company_id !== companyId) {
    return {
      success: false,
      error: "Usuario no encontrado",
    };
  }

  // Admin no puede borrar superadmin
  if (currentUser.role === "admin" && targetUser.role === "superadmin") {
    return {
      success: false,
      error: "No tienes permisos para eliminar un superadmin",
    };
  }

  // Si se va a reasignar, verificar que el usuario destino existe y es de la misma empresa
  if (reassignToUserId) {
    const { data: reassignUser, error: reassignError } = await supabaseAdmin
      .from("redpresu_users")
      .select("id, company_id, status")
      .eq("id", reassignToUserId)
      .single();

    if (reassignError || !reassignUser || reassignUser.company_id !== companyId) {
      return {
        success: false,
        error: "Usuario de reasignación no válido",
      };
    }

    if (reassignUser.status !== "active") {
      return {
        success: false,
        error: "El usuario de reasignación debe estar activo",
      };
    }

    // Reasignar tarifas
    const { error: tariffsError } = await supabaseAdmin
      .from("redpresu_tariffs")
      .update({ user_id: reassignToUserId })
      .eq("user_id", userId);

    if (tariffsError) {
      log.error("[deleteUser] Error reasignando tarifas:", tariffsError);
      return {
        success: false,
        error: "Error al reasignar tarifas",
      };
    }

    // Reasignar presupuestos
    const { error: budgetsError } = await supabaseAdmin
      .from("redpresu_budgets")
      .update({ user_id: reassignToUserId })
      .eq("user_id", userId);

    if (budgetsError) {
      log.error("[deleteUser] Error reasignando presupuestos:", budgetsError);
      return {
        success: false,
        error: "Error al reasignar presupuestos",
      };
    }

    log.info(`[deleteUser] Datos reasignados de ${userId} a ${reassignToUserId}`);
  } else {
    // Si no se reasigna, borrar datos en cascada
    // Las tablas con ON DELETE CASCADE se encargarán automáticamente
    log.info(`[deleteUser] Se borrarán todos los datos del usuario ${userId}`);
  }

  // Eliminar de auth.users (cascada eliminará de public.redpresu_users)
  const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);

  if (authError) {
    log.error("[deleteUser] Error eliminando usuario de auth:", authError);
    return {
      success: false,
      error: "Error al eliminar usuario del sistema de autenticación",
    };
  }

  log.info(`[deleteUser] Usuario ${userId} eliminado correctamente`);

  return {
    success: true,
  };
}
