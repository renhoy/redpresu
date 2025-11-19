"use server";

import { supabaseAdmin } from "@/lib/supabase/server";
import { createServerActionClient } from "@/lib/supabase/helpers";
import { getRegistrationRequiresApproval } from "@/lib/helpers/config-helpers";
import { notifySuperadminNewRegistration } from "@/lib/helpers/notification-helpers";
import crypto from "crypto";

/**
 * PASO 1: Crear token de registro
 * Almacena datos básicos del usuario y genera token único
 *
 * @param data - Datos básicos del usuario (nombre, email, contraseña, tipo)
 * @returns Token generado o error
 */
export async function createRegistrationToken(data: {
  name: string;
  email: string;
  password: string;
  tipo_emisor: "empresa" | "autonomo";
}) {
  try {
    console.log("[createRegistrationToken] Iniciando PASO 1...", {
      email: data.email,
      tipo: data.tipo_emisor,
    });

    // 1. Validar entrada
    if (!data.name || !data.email || !data.password || !data.tipo_emisor) {
      return {
        success: false,
        error: "Todos los campos son obligatorios",
      };
    }

    // Validar longitud de contraseña
    if (data.password.length < 6) {
      return {
        success: false,
        error: "La contraseña debe tener al menos 6 caracteres",
      };
    }

    // Validar formato email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      return {
        success: false,
        error: "El formato del email no es válido",
      };
    }

    // 2. Verificar que el email NO exista ya en Supabase Auth
    const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
    const emailExists = existingUser.users.some(
      (user) => user.email?.toLowerCase() === data.email.toLowerCase()
    );

    if (emailExists) {
      console.log("[createRegistrationToken] Email ya existe en Auth");
      return {
        success: false,
        error: "Este email ya está registrado en el sistema",
      };
    }

    // 3. Verificar que el email NO tenga un token pendiente (no usado, no expirado)
    const { data: existingToken } = await supabaseAdmin
      .from("registration_tokens")
      .select("id")
      .eq("email", data.email.toLowerCase())
      .eq("used", false)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (existingToken) {
      console.log("[createRegistrationToken] Token pendiente existe para este email");
      return {
        success: false,
        error:
          "Ya existe un registro pendiente para este email. Revisa tu correo electrónico.",
      };
    }

    // 4. Generar token único
    const token = crypto.randomBytes(32).toString("hex");

    // 5. Calcular expiración (24 horas desde ahora)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    // 6. Guardar token en BD
    const { data: savedToken, error: saveError } = await supabaseAdmin
      .from("registration_tokens")
      .insert({
        token,
        email: data.email.toLowerCase(),
        name: data.name,
        password: data.password, // Guardada temporalmente (se elimina al completar)
        tipo_emisor: data.tipo_emisor,
        expires_at: expiresAt.toISOString(),
        used: false,
      })
      .select()
      .single();

    if (saveError) {
      console.error("[createRegistrationToken] Error guardando token:", saveError);
      return {
        success: false,
        error: "Error al crear el registro. Inténtalo de nuevo.",
      };
    }

    console.log("[createRegistrationToken] Token creado exitosamente:", {
      tokenId: savedToken.id,
      email: data.email,
      expiresAt: expiresAt.toISOString(),
    });

    // 7. TODO: Integrar envío de email con template personalizado
    // const completionLink = `${process.env.NEXT_PUBLIC_APP_URL}/register/complete?token=${token}`;
    // await sendRegistrationEmail(data.email, completionLink);

    return {
      success: true,
      data: {
        token,
        email: data.email,
        expiresAt: expiresAt.toISOString(),
      },
    };
  } catch (error) {
    console.error("[createRegistrationToken] Error inesperado:", error);
    return {
      success: false,
      error: "Error inesperado al crear el registro",
    };
  }
}

/**
 * Validar token de registro
 * Verifica que el token exista, no esté usado y no haya expirado
 *
 * @param token - Token a validar
 * @returns Datos del token o error
 */
export async function validateRegistrationToken(token: string) {
  try {
    console.log("[validateRegistrationToken] Validando token...");

    if (!token) {
      return {
        success: false,
        error: "Token no proporcionado",
      };
    }

    // Buscar token en BD
    const { data: tokenData, error } = await supabaseAdmin
      .from("registration_tokens")
      .select("*")
      .eq("token", token)
      .single();

    if (error || !tokenData) {
      console.log("[validateRegistrationToken] Token no encontrado");
      return {
        success: false,
        error: "Token inválido o no encontrado",
      };
    }

    // Verificar que no esté usado
    if (tokenData.used) {
      console.log("[validateRegistrationToken] Token ya usado");
      return {
        success: false,
        error: "Este enlace de registro ya fue utilizado",
      };
    }

    // Verificar que no haya expirado
    const now = new Date();
    const expiresAt = new Date(tokenData.expires_at);

    if (now > expiresAt) {
      console.log("[validateRegistrationToken] Token expirado");
      return {
        success: false,
        error: "Este enlace de registro ha expirado. Por favor, inicia el proceso de nuevo.",
      };
    }

    console.log("[validateRegistrationToken] Token válido:", {
      email: tokenData.email,
      tipo: tokenData.tipo_emisor,
    });

    return {
      success: true,
      data: {
        email: tokenData.email,
        name: tokenData.name,
        password: tokenData.password,
        tipo_emisor: tokenData.tipo_emisor as "empresa" | "autonomo",
      },
    };
  } catch (error) {
    console.error("[validateRegistrationToken] Error inesperado:", error);
    return {
      success: false,
      error: "Error al validar el token",
    };
  }
}

/**
 * PASO 2: Completar registro
 * Crea el usuario en Supabase Auth, crea la empresa/emisor y completa el registro
 *
 * @param token - Token de registro
 * @param registrationData - Datos completos del registro (datos fiscales/contacto)
 * @returns Usuario creado o error
 */
export async function completeRegistration(
  token: string,
  registrationData: {
    // Datos fiscales
    nif: string;
    razon_social: string;
    domicilio: string;
    codigo_postal: string;
    poblacion: string;
    provincia: string;
    irpf_percentage?: number;
    // Datos de contacto
    telefono: string;
    email_contacto: string;
    web?: string;
  }
) {
  try {
    console.log("[completeRegistration] Iniciando PASO 2...");

    // 1. Validar token
    const tokenValidation = await validateRegistrationToken(token);

    if (!tokenValidation.success || !tokenValidation.data) {
      return tokenValidation;
    }

    const tokenData = tokenValidation.data;

    // 2. Validar datos de entrada
    if (!registrationData.nif || !registrationData.razon_social) {
      return {
        success: false,
        error: "NIF y Razón Social son obligatorios",
      };
    }

    // 3. Crear usuario en Supabase Auth
    console.log("[completeRegistration] Creando usuario en Auth...");

    const { data: authUser, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email: tokenData.email,
        password: tokenData.password, // Usar contraseña guardada en PASO 1
        email_confirm: true, // Email ya verificado mediante token
        user_metadata: {
          name: tokenData.name,
        },
      });

    // Si el usuario se creó pero el email no está confirmado, confirmarlo
    if (authUser?.user && !authUser.user.email_confirmed_at) {
      console.log("[completeRegistration] Confirmando email del usuario...");
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        authUser.user.id,
        {
          email_confirm: true,
        }
      );

      if (updateError) {
        console.error("[completeRegistration] Error confirmando email:", updateError);
      }
    }

    if (authError || !authUser.user) {
      console.error("[completeRegistration] Error creando usuario en Auth:", authError);
      return {
        success: false,
        error: "Error al crear el usuario: " + authError?.message,
      };
    }

    const userId = authUser.user.id;
    console.log("[completeRegistration] Usuario creado en Auth:", userId);

    // 4. Crear empresa
    console.log("[completeRegistration] Creando empresa...");

    const { data: company, error: companyError } = await supabaseAdmin
      .from("companies")
      .insert({
        name: registrationData.razon_social,
      })
      .select()
      .single();

    if (companyError || !company) {
      console.error("[completeRegistration] Error creando empresa:", companyError);

      // Rollback: eliminar usuario de Auth
      await supabaseAdmin.auth.admin.deleteUser(userId);

      return {
        success: false,
        error: "Error al crear la empresa",
      };
    }

    const companyId = company.id;
    console.log("[completeRegistration] Empresa creada:", companyId);

    // 5. Crear emisor
    console.log("[completeRegistration] Creando emisor...");

    const { data: emisor, error: emisorError } = await supabaseAdmin
      .from("emisores")
      .insert({
        tipo: tokenData.tipo_emisor,
        nif: registrationData.nif,
        razon_social: registrationData.razon_social,
        domicilio: registrationData.domicilio || "",
        codigo_postal: registrationData.codigo_postal || "",
        poblacion: registrationData.poblacion || "",
        provincia: registrationData.provincia || "",
        pais: "España", // Campo obligatorio por defecto
        telefono: registrationData.telefono || "",
        email: registrationData.email_contacto || tokenData.email,
        web: registrationData.web || "",
        irpf_percentage: registrationData.irpf_percentage || null,
        company_id: companyId,
      })
      .select()
      .single();

    if (emisorError || !emisor) {
      console.error("[completeRegistration] Error creando emisor:", emisorError);
      console.error("[completeRegistration] Datos del emisor:", {
        tipo: tokenData.tipo_emisor,
        nif: registrationData.nif,
        razon_social: registrationData.razon_social,
        company_id: companyId,
      });

      // Rollback: eliminar usuario y empresa
      await supabaseAdmin.auth.admin.deleteUser(userId);
      await supabaseAdmin.from("companies").delete().eq("id", companyId);

      return {
        success: false,
        error: `Error al crear el emisor: ${emisorError?.message || "Error desconocido"}`,
      };
    }

    console.log("[completeRegistration] Emisor creado:", emisor.id);

    // 6. Determinar el estado del usuario según configuración
    const requiresApproval = await getRegistrationRequiresApproval();
    const userStatus = requiresApproval ? 'awaiting_approval' : 'active';

    console.log('\n');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('[completeRegistration] ESTADO DEL REGISTRO');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`📋 Requires Approval: ${requiresApproval}`);
    console.log(`🔐 User Status: ${userStatus}`);
    console.log(`👤 Usuario: ${tokenData.name} (${tokenData.email})`);
    console.log('───────────────────────────────────────────────────────────────');

    const { error: userError } = await supabaseAdmin
      .from("users")
      .insert({
        id: userId,
        name: tokenData.name,
        last_name: "", // No se recopila en PASO 1, se puede completar después
        email: tokenData.email,
        role: "admin", // El usuario que se registra es admin de su empresa
        status: userStatus, // 'awaiting_approval' si requiere aprobación, 'active' si no
        company_id: companyId,
        issuer_id: emisor.id,
      });

    if (userError) {
      console.error("❌ Error creando usuario en BD:", userError);
      console.log('═══════════════════════════════════════════════════════════════\n');

      // Rollback completo
      await supabaseAdmin.auth.admin.deleteUser(userId);
      await supabaseAdmin.from("companies").delete().eq("id", companyId);
      await supabaseAdmin.from("emisores").delete().eq("id", emisor.id);

      return {
        success: false,
        error: "Error al crear el registro de usuario",
      };
    }

    console.log('✅ Usuario creado exitosamente en BD');
    console.log('═══════════════════════════════════════════════════════════════\n');

    // 7. Marcar token como usado
    console.log("[completeRegistration] Marcando token como usado...");

    await supabaseAdmin
      .from("registration_tokens")
      .update({ used: true })
      .eq("token", token);

    // 8. Notificar al superadmin si requiere aprobación
    if (requiresApproval) {
      console.log('\n🔔 Usuario requiere aprobación - iniciando notificación...\n');
      // No esperar la notificación - ejecutar en background
      notifySuperadminNewRegistration(
        tokenData.name,
        "", // last_name no disponible en este flujo
        tokenData.email
      ).catch(error => {
        console.error("[completeRegistration] ❌ Error al notificar superadmin:", error);
        // No afectar el flujo de registro si falla la notificación
      });
    } else {
      console.log('\n✅ Usuario NO requiere aprobación - activación inmediata\n');
    }

    // 9. Crear sesión para auto-login SOLO si no requiere aprobación
    let sessionCreated = false;
    if (!requiresApproval) {
      console.log("[completeRegistration] Creando sesión para auto-login...");

      const supabase = await createServerActionClient();

      const { data: sessionData, error: sessionError } =
        await supabase.auth.signInWithPassword({
          email: tokenData.email,
          password: tokenData.password,
        });

      if (sessionError) {
        console.error("[completeRegistration] Error creando sesión:", sessionError);
        // No hacer rollback aquí, el usuario puede hacer login manualmente
      } else {
        sessionCreated = true;
      }
    } else {
      console.log("[completeRegistration] Auto-login omitido - usuario requiere aprobación");
    }

    console.log("[completeRegistration] Registro completado exitosamente:", {
      userId,
      companyId,
      emisorId: emisor.id,
      requiresApproval,
      sessionCreated,
    });

    return {
      success: true,
      data: {
        user: {
          id: userId,
          email: tokenData.email,
          name: tokenData.name,
          role: "admin",
        },
        company: {
          id: companyId,
          name: company.name,
        },
        emisor: {
          id: emisor.id,
          tipo: emisor.tipo,
        },
        requiresApproval, // Para que el frontend sepa si debe mostrar mensaje de aprobación
      },
    };
  } catch (error) {
    console.error("[completeRegistration] Error inesperado:", error);
    return {
      success: false,
      error: "Error inesperado al completar el registro",
    };
  }
}
