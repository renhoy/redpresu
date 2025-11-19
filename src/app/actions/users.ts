/**
 * Server Actions para gestión de usuarios (CRUD)
 * Solo accesible por admin/superadmin
 */

"use server";

import { supabaseAdmin } from "@/lib/supabase/server";
import { createServerActionClient } from "@/lib/supabase/helpers";
import { z } from "zod";
import { log } from "@/lib/logger";
import { requireValidCompanyId } from "@/lib/helpers/company-validation";
import { generateSecurePassword } from "@/lib/helpers/crypto-helpers";
import { getAuthenticatedUser } from "@/lib/helpers/auth-helpers";
import { requireAdmin, canModifyUser } from "@/lib/helpers/permission-helpers";
import { withAuthenticatedAction } from "@/lib/helpers/action-wrapper";

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
  const { success, user, error } = await getAuthenticatedUser('[getUsers]');

  if (!success || !user) {
    return {
      success: false,
      error: error || "No tienes permisos para ver usuarios",
    };
  }

  // Construir query base
  let query = supabaseAdmin
    .from("users")
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
  if (user.role !== "superadmin") {
    query = query.eq("company_id", user.companyId);
    // Admin/comercial no ven otros superadmins
    query = query.neq("role", "superadmin");
  }

  const { data: users, error: queryError } = await query.order("created_at", {
    ascending: false,
  });

  if (queryError) {
    log.error("[getUsers] Error fetching users:", queryError);
    return {
      success: false,
      error: "Error al obtener usuarios",
    };
  }

  // Obtener nombres de empresas
  const companyIds = [...new Set(users.map(u => u.company_id))];
  const { data: companies } = await supabaseAdmin
    .from("companies")
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
  const { success, user: currentUser, error } = await getAuthenticatedUser('[getUserById]');

  if (!success || !currentUser) {
    return {
      success: false,
      error: error || "No tienes permisos para ver este usuario",
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
    .from("users")
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
    query = query.eq("company_id", currentUser.companyId);
  }

  const { data: user, error: queryError } = await query.single();

  if (queryError) {
    log.error("[getUserById] Error fetching user:", queryError);
    return {
      success: false,
      error: "Usuario no encontrado",
    };
  }

  // Obtener nombre de la empresa
  const { data: company } = await supabaseAdmin
    .from("companies")
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
  return withAuthenticatedAction('createUser', async (user) => {
    // Verificar permisos de admin
    const permission = requireAdmin(user);
    if (!permission.allowed) {
      return { error: permission.error || 'No tienes permisos para crear usuarios' };
    }

    // Verificar límites del plan (si suscripciones están habilitadas)
    const { canCreateUser: canCreateUserCheck } = await import('@/lib/helpers/subscription-helpers')
    const limitCheck = await canCreateUserCheck()

    if (!limitCheck.canCreate) {
      log.info('[createUser] Límite alcanzado:', limitCheck.message)
      return { error: limitCheck.message }
    }

    // EXCEPCIÓN: Si el usuario actual es superadmin y está creando otro superadmin,
    // no validar company_id (superadmins pueden gestionar múltiples empresas)
    const isCreatingSuperadmin = data.role === 'superadmin';
    const isSuperadmin = user.role === 'superadmin';

    if (isSuperadmin && isCreatingSuperadmin) {
      // Superadmin creando superadmin: no validar company_id del creador
      log.info('[createUser] Superadmin creando otro superadmin, bypass validación company_id');
    } else {
      // SECURITY: Validar company_id obligatorio para admin/comercial
      const currentUserCompanyId = user.companyId;

      // Validar que sea de la misma empresa (salvo superadmin)
      if (user.role !== 'superadmin' && data.company_id !== currentUserCompanyId) {
        return {
          error: "No puedes crear usuarios de otra empresa",
        };
      }
    }

    // Validar schema
    try {
      createUserSchema.parse(data);
    } catch (error) {
      const zodError = error as z.ZodError;
      return {
        error: zodError.errors?.[0]?.message || "Datos inválidos",
      };
    }

    // Generar password temporal
    const temporaryPassword = generateTemporaryPassword();

    try {
      // Determinar si debemos auto-confirmar email según entorno
      // DESARROLLO: auto-confirmar para facilitar testing
      // PRODUCCIÓN: NO auto-confirmar, forzar flujo de invitación
      const isDevelopment = process.env.NODE_ENV === 'development'

      log.info('[createUser] Entorno:', {
        NODE_ENV: process.env.NODE_ENV,
        isDevelopment,
        emailConfirm: isDevelopment
      })

      // 1. Crear usuario en auth.users
      const { data: authData, error: authError } =
        await supabaseAdmin.auth.admin.createUser({
          email: data.email,
          password: temporaryPassword,
          email_confirm: isDevelopment, // Auto-confirmar SOLO en desarrollo
        });

      if (authError) {
        log.error("[createUser] Error creating auth user:", authError);

        // Traducir mensajes comunes de Supabase
        let errorMessage = "Error al crear usuario en sistema de autenticación";

        if (authError.message.includes("already registered") ||
            authError.message.includes("User already exists")) {
          errorMessage = "Este email ya está registrado en el sistema";
        }

        return {
          error: errorMessage,
        };
      }

      if (!authData.user) {
        return {
          error: "Error al crear usuario",
        };
      }

      // 2. Crear registro en public.users
      // REGLA: Todos los superadmins deben tener company_id = 1
      const finalCompanyId = data.role === 'superadmin' ? 1 : data.company_id;

      log.info('[createUser] Intentando crear registro en users:', {
        userId: authData.user.id,
        email: data.email,
        role: data.role,
        company_id: finalCompanyId,
        originalCompanyId: data.company_id,
        isSuperadmin: data.role === 'superadmin',
        status: 'pending'
      });

      const { data: userData, error: userError } = await supabaseAdmin
        .from("users")
        .insert({
          id: authData.user.id,
          email: data.email,
          name: data.name,
          last_name: data.last_name,
          role: data.role,
          company_id: finalCompanyId,
          status: "pending", // Usuario debe cambiar password en primer login
          invited_by: null, // Se asignará cuando acepte la invitación
        })
        .select()
        .single();

      if (userError) {
        // Rollback: eliminar usuario de auth
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);

        log.error("[createUser] Error creating user record:", {
          error: userError,
          errorString: JSON.stringify(userError),
          code: userError.code,
          message: userError.message,
          details: userError.details,
          hint: userError.hint
        });
        return {
          error: "Error al crear registro de usuario",
        };
      }

      // TODO: Enviar email con password temporal
      // Por ahora retornamos el password para que el admin lo copie

      return {
        data: userData,
        temporaryPassword, // Retornar para mostrar al admin
      };
    } catch (error) {
      log.error("[createUser] Unexpected error creating user:", error);
      return {
        error: "Error inesperado al crear usuario",
      };
    }
  });
}

/**
 * Actualizar usuario existente
 */
export async function updateUser(userId: string, data: UpdateUserData) {
  return withAuthenticatedAction('updateUser', async (user) => {
    // Verificar permisos de admin
    const permission = requireAdmin(user);
    if (!permission.allowed) {
      return { error: permission.error || 'No tienes permisos para actualizar usuarios' };
    }

    // SECURITY: Validar company_id obligatorio (excepto para superadmin)
    const companyId = user.role !== 'superadmin' ? user.companyId : null;

    // Validar schema
    try {
      updateUserSchema.parse(data);
    } catch (error) {
      const zodError = error as z.ZodError;
      return {
        error: zodError.errors?.[0]?.message || "Datos inválidos",
      };
    }

    // Solo superadmin puede cambiar company_id
    if (data.company_id !== undefined && user.role !== "superadmin") {
      return {
        error: "Solo superadmin puede cambiar la empresa de un usuario",
      };
    }

    // Verificar que el usuario pertenece a la misma empresa (salvo que sea superadmin cambiando empresa)
    const { data: targetUser, error: checkError } = await supabaseAdmin
      .from("users")
      .select("company_id, role")
      .eq("id", userId)
      .single();

    if (checkError || !targetUser) {
      return {
        error: "Usuario no encontrado",
      };
    }

    // Si no es superadmin, verificar misma empresa
    if (user.role !== "superadmin" && companyId !== null && targetUser.company_id !== companyId) {
      return {
        error: "No puedes actualizar usuarios de otra empresa",
      };
    }

    // Prevenir que admin se quite sus propios permisos
    if (
      userId === user.id &&
      data.role &&
      data.role !== user.role
    ) {
      return {
        error: "No puedes cambiar tu propio rol",
      };
    }

    // REGLA: Si un usuario SE CONVIERTE EN superadmin (promoción), asignar company_id = 1
    // Si YA ES superadmin, permitir cambio de company_id (mantener rol superadmin)
    const updateData = { ...data };
    const isBecomingSuperadmin = data.role === 'superadmin' && targetUser.role !== 'superadmin';

    if (isBecomingSuperadmin) {
      updateData.company_id = 1;
      log.info('[updateUser] Usuario promovido a superadmin, asignando company_id = 1:', {
        userId,
        previousRole: targetUser.role,
        newRole: data.role
      });
    }

    // Superadmin puede cambiar de empresa temporalmente sin perder su rol
    if (targetUser.role === 'superadmin' && data.company_id !== undefined) {
      log.info('[updateUser] Superadmin cambiando de empresa (mantiene rol superadmin):', {
        userId,
        previousCompanyId: targetUser.company_id,
        newCompanyId: data.company_id
      });
    }

    // Actualizar usuario
    const { data: updatedUser, error: updateError } = await supabaseAdmin
      .from("users")
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId)
      .select()
      .single();

    if (updateError) {
      log.error("[updateUser] Error updating user:", updateError);
      return {
        error: "Error al actualizar usuario",
      };
    }

    // Nota: No es posible invalidar la sesión del usuario desde el servidor
    // El middleware detectará el status='inactive' y redirigirá al login
    if (data.status === 'inactive') {
      log.info(`[updateUser] Usuario ${userId} desactivado. Middleware lo desconectará en su próximo request.`);
    }

    return {
      data: updatedUser,
    };
  });
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

  return withAuthenticatedAction('updateUserComplete', async (user) => {
    log.info('[updateUserComplete] Iniciando...', {
      userId,
      hasBasicData: !!basicData,
      hasEmisorData: !!emisorData,
      hasPasswordData: !!passwordData,
    });

    // Obtener información del usuario objetivo para verificar permisos
    const { data: targetUser, error: targetError } = await supabaseAdmin
      .from("users")
      .select("company_id")
      .eq("id", userId)
      .single();

    if (targetError || !targetUser) {
      return {
        error: "Usuario no encontrado",
      };
    }

    // Verificar permisos usando helper centralizado
    const permission = canModifyUser(user, userId, targetUser.company_id);
    if (!permission.allowed) {
      return { error: permission.error || 'No tienes permisos para editar este usuario' };
    }

    const isOwnProfile = user.id === userId;

    // 1. Actualizar datos básicos del usuario (si se proporcionaron)
    if (basicData && Object.keys(basicData).length > 0) {
      log.info('[updateUserComplete] Actualizando datos básicos...');

      const updateResult = await updateUser(userId, basicData);

      if (!updateResult.success) {
        return { error: updateResult.error };
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
        .from("issuers")
        .update(updateData)
        .eq("user_id", userId);

      if (issuerError) {
        log.error('[updateUserComplete] Error al actualizar emisor:', issuerError);
        return {
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
          error: "La nueva contraseña debe tener al menos 8 caracteres",
        };
      }

      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;
      if (!passwordRegex.test(passwordData.newPassword)) {
        return {
          error: "La contraseña debe contener al menos una mayúscula, una minúscula y un número",
        };
      }

      // Si es propio perfil y se proporciona contraseña actual, verificarla
      if (isOwnProfile && passwordData.currentPassword) {
        const { data: userData } = await supabaseAdmin
          .from("users")
          .select("email")
          .eq("id", userId)
          .single();

        if (!userData) {
          return {
            error: "Usuario no encontrado",
          };
        }

        // Verificar contraseña actual usando supabase client
        const supabase = await createServerActionClient();

        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: userData.email,
          password: passwordData.currentPassword,
        });

        if (signInError) {
          return {
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
          error: "Error al actualizar la contraseña",
        };
      }
    }

    log.info('[updateUserComplete] Usuario actualizado exitosamente');

    // Retornar usuario actualizado
    const userResult = await getUserById(userId);

    return {
      data: userResult.data,
    };
  });
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
  return withAuthenticatedAction('deleteUser', async (user) => {
    // Verificar permisos de admin
    const permission = requireAdmin(user);
    if (!permission.allowed) {
      return { error: permission.error || 'No tienes permisos para eliminar usuarios' };
    }

    // SECURITY: Validar company_id solo para usuarios NO superadmin
    // Los superadmins NO tienen company_id y pueden borrar usuarios de cualquier empresa
    const companyId = user.role !== "superadmin" ? user.companyId : null;

    log.info('[deleteUser] Iniciando borrado:', {
      currentUserId: user.id,
      currentUserRole: user.role,
      targetUserId: userId,
      companyId
    });

    // No permitir auto-eliminación
    if (userId === user.id) {
      return {
        error: "No puedes eliminarte a ti mismo",
      };
    }

    // Verificar que el usuario a eliminar existe
    const { data: targetUser, error: targetError } = await supabaseAdmin
      .from("users")
      .select("company_id, role, email, status")
      .eq("id", userId)
      .single();

    if (targetError || !targetUser) {
      return {
        error: "Usuario no encontrado",
      };
    }

    log.info('[deleteUser] Usuario encontrado:', {
      targetEmail: targetUser.email,
      targetRole: targetUser.role,
      targetCompanyId: targetUser.company_id
    });

    // PROTECCIÓN: No permitir eliminar el superadmin supremo del sistema
    if (targetUser.email === "josivela+super@gmail.com") {
      log.warn('[deleteUser] Intento de borrar superadmin supremo bloqueado');
      return {
        error: "Este usuario no puede ser eliminado del sistema",
      };
    }

    // PROTECCIÓN: No permitir eliminar el último admin de una empresa
    // Cada empresa debe tener al menos un admin para gestionarla
    if (targetUser.role === "admin" && targetUser.company_id) {
      // Contar cuántos admins tiene la empresa
      const { count, error: countError } = await supabaseAdmin
        .from("users")
        .select("*", { count: "exact", head: true })
        .eq("company_id", targetUser.company_id)
        .eq("role", "admin")
        .eq("status", "active");

      if (countError) {
        log.error('[deleteUser] Error contando admins:', countError);
        return {
          error: "Error al verificar usuarios de la empresa",
        };
      }

      // Si es el último admin activo, bloquear borrado
      if (count !== null && count <= 1) {
        log.warn('[deleteUser] Intento de borrar último admin de empresa bloqueado:', {
          targetEmail: targetUser.email,
          companyId: targetUser.company_id,
          adminCount: count
        });
        return {
          error: "No se puede eliminar el último administrador de la empresa. Cada empresa debe tener al menos un administrador activo.",
        };
      }

      log.info('[deleteUser] Empresa tiene múltiples admins:', {
        companyId: targetUser.company_id,
        adminCount: count
      });
    }

    // Si el usuario actual NO es superadmin, verificar permisos adicionales
    if (user.role !== "superadmin") {
      // Admin solo puede borrar usuarios de su misma empresa
      if (targetUser.company_id !== companyId) {
        return {
          error: "No puedes eliminar usuarios de otra empresa",
        };
      }

      // Admin no puede borrar superadmin
      if (targetUser.role === "superadmin") {
        return {
          error: "No tienes permisos para eliminar un superadmin",
        };
      }
    } else {
      // Superadmin puede borrar cualquier usuario (excepto josivela+super@gmail.com ya validado arriba)
      log.info('[deleteUser] Superadmin borrando usuario:', {
        targetEmail: targetUser.email,
        targetRole: targetUser.role
      });

      // PROTECCIÓN: No permitir eliminar superadmins a menos que estén inactivos
      // DEBUG: Log detallado del status
      log.info('[deleteUser] DEBUG - Verificando status:', {
        status: targetUser.status,
        statusType: typeof targetUser.status,
        statusLength: targetUser.status?.length,
        statusJSON: JSON.stringify(targetUser.status),
        isInactive: targetUser.status === 'inactive',
        comparison: targetUser.status !== 'inactive'
      });

      if (targetUser.role === 'superadmin' && targetUser.status !== 'inactive') {
        return {
          error: 'PROTECCIÓN SISTEMA: No se puede eliminar usuarios superadmin activos. Desactiva primero el usuario (status=inactive) antes de eliminarlo.',
        };
      }
    }

    // Si se va a reasignar, verificar que el usuario destino existe y es válido
    if (reassignToUserId) {
      const { data: reassignUser, error: reassignError } = await supabaseAdmin
        .from("users")
        .select("id, company_id, status")
        .eq("id", reassignToUserId)
        .single();

      if (reassignError || !reassignUser) {
        return {
          error: "Usuario de reasignación no encontrado",
        };
      }

      // Si no es superadmin, verificar que el usuario de reasignación sea de la misma empresa
      if (user.role !== "superadmin" && reassignUser.company_id !== companyId) {
        return {
          error: "El usuario de reasignación debe ser de la misma empresa",
        };
      }

      if (reassignUser.status !== "active") {
        return {
          error: "El usuario de reasignación debe estar activo",
        };
      }

      // Reasignar tarifas
      const { error: tariffsError } = await supabaseAdmin
        .from("tariffs")
        .update({ user_id: reassignToUserId })
        .eq("user_id", userId);

      if (tariffsError) {
        log.error("[deleteUser] Error reasignando tarifas:", tariffsError);
        return {
          error: "Error al reasignar tarifas",
        };
      }

      // Reasignar presupuestos
      const { error: budgetsError } = await supabaseAdmin
        .from("budgets")
        .update({ user_id: reassignToUserId })
        .eq("user_id", userId);

      if (budgetsError) {
        log.error("[deleteUser] Error reasignando presupuestos:", budgetsError);
        return {
          error: "Error al reasignar presupuestos",
        };
      }

      log.info(`[deleteUser] Datos reasignados de ${userId} a ${reassignToUserId}`);
    } else {
      // Si no se reasigna, borrar datos explícitamente
      log.info(`[deleteUser] Se borrarán todos los datos del usuario ${userId}`);

      // IMPORTANTE: Borrar presupuestos ANTES porque tienen ON DELETE RESTRICT
      const { error: budgetsDeleteError } = await supabaseAdmin
        .from("budgets")
        .delete()
        .eq("user_id", userId);

      if (budgetsDeleteError) {
        log.error("[deleteUser] Error borrando presupuestos:", budgetsDeleteError);
        return {
          error: "Error al borrar presupuestos del usuario",
        };
      }

      // Borrar tarifas (aunque tienen ON DELETE SET NULL, es mejor limpiar)
      const { error: tariffsDeleteError } = await supabaseAdmin
        .from("tariffs")
        .delete()
        .eq("user_id", userId);

      if (tariffsDeleteError) {
        log.error("[deleteUser] Error borrando tarifas:", tariffsDeleteError);
      }
    }

    // Obtener email del usuario antes de borrarlo (para borrar invitaciones)
    const { data: userToDelete } = await supabaseAdmin
      .from("users")
      .select("email")
      .eq("id", userId)
      .single();

    // Borrar invitaciones relacionadas con este usuario
    // 1. Donde el usuario es el invitador (inviter_id)
    const { error: inviterError } = await supabaseAdmin
      .from("user_invitations")
      .delete()
      .eq("inviter_id", userId);

    if (inviterError) {
      log.error("[deleteUser] Error borrando invitaciones como invitador:", inviterError);
    }

    // 2. Donde el usuario es el invitado (email)
    if (userToDelete?.email) {
      const { error: invitedError } = await supabaseAdmin
        .from("user_invitations")
        .delete()
        .eq("email", userToDelete.email);

      if (invitedError) {
        log.error("[deleteUser] Error borrando invitaciones como invitado:", invitedError);
      }
    }

    // Manejar registros de company_deletion_log donde el usuario es deleted_by
    // Actualizar a NULL en lugar de borrar (mantener auditoría)
    const { error: logError } = await supabaseAdmin
      .from("company_deletion_log")
      .update({ deleted_by: null })
      .eq("deleted_by", userId);

    if (logError) {
      log.error("[deleteUser] Error actualizando company_deletion_log:", logError);
    }

    // IMPORTANTE: Eliminar primero de redpresu.users antes que de auth
    // (el CASCADE de auth.users -> public.users no funciona con schema redpresu)
    const { error: usersError } = await supabaseAdmin
      .from("users")
      .delete()
      .eq("id", userId);

    if (usersError) {
      log.error("[deleteUser] Error eliminando usuario de tabla users:", usersError);

      // Extraer mensaje descriptivo del error de PostgreSQL si está disponible
      const errorMessage = usersError.message || "Error al eliminar registro de usuario";

      // El error P0001 (raise_exception) contiene mensajes personalizados de triggers/constraints
      // que son más informativos que un mensaje genérico
      return {
        error: errorMessage,
      };
    }

    // Ahora eliminar de auth.users
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (authError) {
      log.error("[deleteUser] Error eliminando usuario de auth:", authError);
      // No retornar error aquí porque el usuario ya fue eliminado de la tabla users
      // El error de auth no es crítico si ya se eliminó de la BD
      log.warn("[deleteUser] Usuario eliminado de BD pero no de auth - requiere limpieza manual");
    }

    log.info(`[deleteUser] Usuario ${userId} eliminado correctamente`);

    return {
      data: true,
    };
  });
}
