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
  role: "comercial" | "admin" | "superadmin";
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
  company_name?: string;
}

// ============================================
// SCHEMAS DE VALIDACIÓN
// ============================================

const createUserSchema = z.object({
  email: z.string().email("Email inválido").toLowerCase().trim(),
  name: z.string().min(1, "El nombre es requerido").max(100).trim(),
  last_name: z.string().min(1, "Los apellidos son requeridos").max(100).trim(),
  role: z.enum(["comercial", "admin", "superadmin"], {
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
  role: z.enum(["comercial", "admin", "superadmin"]).optional(),
  status: z.enum(["active", "inactive", "pending"]).optional(),
  company_id: z.number().int().positive().optional(), // Solo superadmin puede cambiar empresa
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
 * Verifica si el usuario actual tiene acceso (incluye comercial para lectura)
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
 * Obtener lista de usuarios de la empresa (o todos si es superadmin)
 */
export async function getUsers() {
  // Permitir acceso a todos (comercial verá la lista pero solo podrá editar su perfil)
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
    );

  // Si el usuario NO es superadmin, filtrar por empresa
  if (currentUser.role !== "superadmin") {
    query = query.eq("company_id", currentUser.company_id);
    // Admin/comercial no ven otros superadmins
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

  // Obtener nombres de empresas
  const companyIds = [...new Set(users.map(u => u.company_id))];
  const { data: companies } = await supabaseAdmin
    .from("redpresu_companies")
    .select("id, name")
    .in("id", companyIds);

  const companiesMap = new Map(companies?.map(c => [c.id, c.name]) || []);

  // Formatear datos
  const formattedUsers: UserWithInviter[] = users.map((user) => ({
    ...user,
    inviter_name: user.inviter
      ? `${user.inviter.name} ${user.inviter.last_name}`
      : undefined,
    inviter_email: user.inviter?.email,
    company_name: companiesMap.get(user.company_id),
  }));

  return {
    success: true,
    data: formattedUsers,
  };
}

/**
 * Obtener un usuario por ID
 */
export async function getUserById(userId: string) {
  // Permitir acceso si es admin/superadmin O si es el mismo usuario (comercial)
  const { allowed, currentUser } = await checkUserAccess();

  if (!allowed || !currentUser) {
    return {
      success: false,
      error: "No tienes permisos para ver este usuario",
    };
  }

  // Comercial solo puede ver su propio usuario
  if (currentUser.role === "comercial" && userId !== currentUser.id) {
    return {
      success: false,
      error: "No tienes permisos para ver este usuario",
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
    .eq("id", userId);

  // Si NO es superadmin, filtrar por empresa
  if (currentUser.role !== "superadmin") {
    query = query.eq("company_id", currentUser.company_id);
  }

  const { data: user, error } = await query.single();

  if (error) {
    log.error("Error fetching user:", error);
    return {
      success: false,
      error: "Usuario no encontrado",
    };
  }

  // Obtener nombre de la empresa
  const { data: company } = await supabaseAdmin
    .from("redpresu_companies")
    .select("name")
    .eq("id", user.company_id)
    .single();

  const formattedUser: UserWithInviter = {
    ...user,
    inviter_name: user.inviter
      ? `${user.inviter.name} ${user.inviter.last_name}`
      : undefined,
    inviter_email: user.inviter?.email,
    company_name: company?.name,
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
    const { data: userData, error: userError } = await supabaseAdmin
      .from("redpresu_users")
      .insert({
        id: authData.user.id,
        email: data.email,
        name: data.name,
        last_name: data.last_name,
        role: data.role,
        company_id: data.company_id,
        status: "pending", // Usuario debe cambiar password en primer login
        invited_by: null, // Se asignará cuando acepte la invitación
      })
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

  // Solo superadmin puede cambiar company_id
  if (data.company_id !== undefined && currentUser.role !== "superadmin") {
    return {
      success: false,
      error: "Solo superadmin puede cambiar la empresa de un usuario",
    };
  }

  // Verificar que el usuario pertenece a la misma empresa (salvo que sea superadmin cambiando empresa)
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

  // Si no es superadmin, verificar misma empresa
  if (currentUser.role !== "superadmin" && targetUser.company_id !== companyId) {
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

  // Nota: No es posible invalidar la sesión del usuario desde el servidor
  // El middleware detectará el status='inactive' y redirigirá al login
  if (data.status === 'inactive') {
    log.info(`[updateUser] Usuario ${userId} desactivado. Middleware lo desconectará en su próximo request.`);
  }

  return {
    success: true,
    data: updatedUser,
  };
}

/**
 * Actualizar usuario completo (datos básicos + emisor + contraseña)
 * Función unificada para edición de usuarios desde /users/[id]/edit
 */
export async function updateUserComplete(params: {
  userId: string;
  basicData?: UpdateUserData;
  emisorData?: {
    nombre_comercial?: string;
    nif?: string;
    direccion_fiscal?: string;
    codigo_postal?: string;
    localidad?: string;
    provincia?: string;
    pais?: string;
    telefono?: string;
    emailContacto?: string;
    web?: string;
    irpf_percentage?: number;
  };
  passwordData?: {
    currentPassword?: string;
    newPassword: string;
  };
}) {
  const { userId, basicData, emisorData, passwordData } = params;

  try {
    log.info('[updateUserComplete] Iniciando...', {
      userId,
      hasBasicData: !!basicData,
      hasEmisorData: !!emisorData,
      hasPasswordData: !!passwordData,
    });

    // Obtener usuario actual
    const currentUser = await getServerUser();

    if (!currentUser) {
      return {
        success: false,
        error: "No estás autenticado",
      };
    }

    const isOwnProfile = currentUser.id === userId;

    // Verificar permisos
    if (!isOwnProfile && !["admin", "superadmin"].includes(currentUser.role)) {
      return {
        success: false,
        error: "No tienes permisos para editar usuarios",
      };
    }

    // 1. Actualizar datos básicos del usuario (si se proporcionaron)
    if (basicData && Object.keys(basicData).length > 0) {
      log.info('[updateUserComplete] Actualizando datos básicos...');

      const updateResult = await updateUser(userId, basicData);

      if (!updateResult.success) {
        return updateResult;
      }
    }

    // 2. Actualizar datos del emisor (si se proporcionaron)
    if (emisorData && Object.keys(emisorData).length > 0) {
      log.info('[updateUserComplete] Actualizando datos emisor...');

      // Construir objeto de actualización
      const updateData: any = {};

      if (emisorData.nombre_comercial) updateData.name = emisorData.nombre_comercial.trim();
      if (emisorData.nif) updateData.nif = emisorData.nif.trim().toUpperCase();
      if (emisorData.direccion_fiscal) updateData.address = emisorData.direccion_fiscal.trim();
      if (emisorData.codigo_postal !== undefined)
        updateData.postal_code = emisorData.codigo_postal?.trim() || null;
      if (emisorData.localidad !== undefined)
        updateData.locality = emisorData.localidad?.trim() || null;
      if (emisorData.provincia !== undefined)
        updateData.province = emisorData.provincia?.trim() || null;
      if (emisorData.pais !== undefined)
        updateData.country = emisorData.pais?.trim() || null;
      if (emisorData.telefono !== undefined)
        updateData.phone = emisorData.telefono?.trim() || null;
      if (emisorData.emailContacto !== undefined)
        updateData.email = emisorData.emailContacto?.trim() || null;
      if (emisorData.web !== undefined)
        updateData.web = emisorData.web?.trim() || null;
      if (emisorData.irpf_percentage !== undefined)
        updateData.irpf_percentage = emisorData.irpf_percentage;

      updateData.updated_at = new Date().toISOString();

      // Actualizar emisor usando supabaseAdmin
      const { error: issuerError } = await supabaseAdmin
        .from("redpresu_issuers")
        .update(updateData)
        .eq("user_id", userId);

      if (issuerError) {
        log.error('[updateUserComplete] Error al actualizar emisor:', issuerError);
        return {
          success: false,
          error: "Error al actualizar los datos del emisor",
        };
      }
    }

    // 3. Actualizar contraseña (si se proporcionó)
    if (passwordData) {
      log.info('[updateUserComplete] Actualizando contraseña...');

      // Validar contraseña nueva
      if (passwordData.newPassword.length < 8) {
        return {
          success: false,
          error: "La nueva contraseña debe tener al menos 8 caracteres",
        };
      }

      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;
      if (!passwordRegex.test(passwordData.newPassword)) {
        return {
          success: false,
          error: "La contraseña debe contener al menos una mayúscula, una minúscula y un número",
        };
      }

      // Si es propio perfil y se proporciona contraseña actual, verificarla
      if (isOwnProfile && passwordData.currentPassword) {
        const { data: userData } = await supabaseAdmin
          .from("redpresu_users")
          .select("email")
          .eq("id", userId)
          .single();

        if (!userData) {
          return {
            success: false,
            error: "Usuario no encontrado",
          };
        }

        // Verificar contraseña actual usando supabase client
        const { createServerActionClient } = require("@supabase/auth-helpers-nextjs");
        const { cookies } = require("next/headers");
        const cookieStore = await cookies();
        const supabase = createServerActionClient({ cookies: () => cookieStore });

        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: userData.email,
          password: passwordData.currentPassword,
        });

        if (signInError) {
          return {
            success: false,
            error: "La contraseña actual es incorrecta",
          };
        }
      }

      // Actualizar contraseña usando supabaseAdmin (bypass contraseña actual)
      const { error: updatePasswordError } =
        await supabaseAdmin.auth.admin.updateUserById(userId, {
          password: passwordData.newPassword,
        });

      if (updatePasswordError) {
        log.error('[updateUserComplete] Error al actualizar contraseña:', updatePasswordError);
        return {
          success: false,
          error: "Error al actualizar la contraseña",
        };
      }
    }

    log.info('[updateUserComplete] Usuario actualizado exitosamente');

    // Retornar usuario actualizado
    const userResult = await getUserById(userId);

    return {
      success: true,
      data: userResult.data,
    };
  } catch (error) {
    log.error('[updateUserComplete] Error crítico:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error inesperado al actualizar usuario",
    };
  }
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

  // Verificar que el usuario a eliminar existe
  const { data: targetUser, error: targetError } = await supabaseAdmin
    .from("redpresu_users")
    .select("company_id, role, email")
    .eq("id", userId)
    .single();

  if (targetError || !targetUser) {
    return {
      success: false,
      error: "Usuario no encontrado",
    };
  }

  // PROTECCIÓN: No permitir eliminar el superadmin principal del sistema
  if (targetUser.email === "josivela+super@gmail.com") {
    return {
      success: false,
      error: "Este usuario no puede ser eliminado del sistema",
    };
  }

  // Si el usuario actual NO es superadmin, verificar permisos adicionales
  if (currentUser.role !== "superadmin") {
    // Admin solo puede borrar usuarios de su misma empresa
    if (targetUser.company_id !== companyId) {
      return {
        success: false,
        error: "No puedes eliminar usuarios de otra empresa",
      };
    }

    // Admin no puede borrar superadmin
    if (targetUser.role === "superadmin") {
      return {
        success: false,
        error: "No tienes permisos para eliminar un superadmin",
      };
    }
  }

  // Si se va a reasignar, verificar que el usuario destino existe y es válido
  if (reassignToUserId) {
    const { data: reassignUser, error: reassignError } = await supabaseAdmin
      .from("redpresu_users")
      .select("id, company_id, status")
      .eq("id", reassignToUserId)
      .single();

    if (reassignError || !reassignUser) {
      return {
        success: false,
        error: "Usuario de reasignación no encontrado",
      };
    }

    // Si no es superadmin, verificar que el usuario de reasignación sea de la misma empresa
    if (currentUser.role !== "superadmin" && reassignUser.company_id !== companyId) {
      return {
        success: false,
        error: "El usuario de reasignación debe ser de la misma empresa",
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
    // Si no se reasigna, borrar datos explícitamente
    log.info(`[deleteUser] Se borrarán todos los datos del usuario ${userId}`);

    // IMPORTANTE: Borrar presupuestos ANTES porque tienen ON DELETE RESTRICT
    const { error: budgetsDeleteError } = await supabaseAdmin
      .from("redpresu_budgets")
      .delete()
      .eq("user_id", userId);

    if (budgetsDeleteError) {
      log.error("[deleteUser] Error borrando presupuestos:", budgetsDeleteError);
      return {
        success: false,
        error: "Error al borrar presupuestos del usuario",
      };
    }

    // Borrar tarifas (aunque tienen ON DELETE SET NULL, es mejor limpiar)
    const { error: tariffsDeleteError } = await supabaseAdmin
      .from("redpresu_tariffs")
      .delete()
      .eq("user_id", userId);

    if (tariffsDeleteError) {
      log.error("[deleteUser] Error borrando tarifas:", tariffsDeleteError);
    }
  }

  // Obtener email del usuario antes de borrarlo (para borrar invitaciones)
  const { data: userToDelete } = await supabaseAdmin
    .from("redpresu_users")
    .select("email")
    .eq("id", userId)
    .single();

  // Borrar invitaciones relacionadas con este usuario
  // 1. Donde el usuario es el invitador (inviter_id)
  const { error: inviterError } = await supabaseAdmin
    .from("redpresu_user_invitations")
    .delete()
    .eq("inviter_id", userId);

  if (inviterError) {
    log.error("[deleteUser] Error borrando invitaciones como invitador:", inviterError);
  }

  // 2. Donde el usuario es el invitado (email)
  if (userToDelete?.email) {
    const { error: invitedError } = await supabaseAdmin
      .from("redpresu_user_invitations")
      .delete()
      .eq("email", userToDelete.email);

    if (invitedError) {
      log.error("[deleteUser] Error borrando invitaciones como invitado:", invitedError);
    }
  }

  // Manejar registros de company_deletion_log donde el usuario es deleted_by
  // Actualizar a NULL en lugar de borrar (mantener auditoría)
  const { error: logError } = await supabaseAdmin
    .from("redpresu_company_deletion_log")
    .update({ deleted_by: null })
    .eq("deleted_by", userId);

  if (logError) {
    log.error("[deleteUser] Error actualizando company_deletion_log:", logError);
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
