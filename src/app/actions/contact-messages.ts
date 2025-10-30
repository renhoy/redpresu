"use server";

import { supabaseAdmin } from "@/lib/supabase/server";
import { getServerUser } from "@/lib/auth/server";

interface ActionResult {
  success: boolean;
  error?: string;
  data?: any;
}

interface ContactMessage {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  subject: string;
  message: string;
  status: "nuevo" | "leido" | "respondido";
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface UpdateContactMessageData {
  id: string;
  status?: "nuevo" | "leido" | "respondido";
  notes?: string;
}

/**
 * Obtiene todos los mensajes de contacto con filtrado opcional por estado
 * Solo accesible para superadmin
 */
export async function getContactMessages(
  statusFilter?: "nuevo" | "leido" | "respondido"
): Promise<ActionResult> {
  try {
    console.log("[getContactMessages] Obteniendo mensajes, filtro:", statusFilter);

    // Verificar autenticación y rol
    const user = await getServerUser();
    if (!user) {
      return { success: false, error: "No autenticado" };
    }

    if (user.role !== "superadmin") {
      return { success: false, error: "Sin permisos para acceder a mensajes" };
    }

    // Construir query
    let query = supabaseAdmin
      .from("redpresu_contact_messages")
      .select("*")
      .order("created_at", { ascending: false });

    // Aplicar filtro de estado si se especifica
    if (statusFilter) {
      query = query.eq("status", statusFilter);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[getContactMessages] Error obteniendo mensajes:", error);
      return {
        success: false,
        error: "Error al obtener mensajes de contacto",
      };
    }

    console.log("[getContactMessages] Mensajes obtenidos:", data?.length);

    return {
      success: true,
      data: data as ContactMessage[],
    };
  } catch (error) {
    console.error("[getContactMessages] Error inesperado:", error);
    return {
      success: false,
      error: "Error inesperado al obtener mensajes",
    };
  }
}

/**
 * Obtiene un mensaje de contacto por ID
 * Solo accesible para superadmin
 */
export async function getContactMessageById(
  id: string
): Promise<ActionResult> {
  try {
    console.log("[getContactMessageById] Obteniendo mensaje:", id);

    // Verificar autenticación y rol
    const user = await getServerUser();
    if (!user) {
      return { success: false, error: "No autenticado" };
    }

    if (user.role !== "superadmin") {
      return { success: false, error: "Sin permisos para acceder al mensaje" };
    }

    // Validar ID
    if (!id) {
      return { success: false, error: "ID de mensaje requerido" };
    }

    const { data, error } = await supabaseAdmin
      .from("redpresu_contact_messages")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("[getContactMessageById] Error obteniendo mensaje:", error);
      return {
        success: false,
        error: "Error al obtener el mensaje",
      };
    }

    if (!data) {
      return {
        success: false,
        error: "Mensaje no encontrado",
      };
    }

    console.log("[getContactMessageById] Mensaje obtenido:", data.id);

    return {
      success: true,
      data: data as ContactMessage,
    };
  } catch (error) {
    console.error("[getContactMessageById] Error inesperado:", error);
    return {
      success: false,
      error: "Error inesperado al obtener el mensaje",
    };
  }
}

/**
 * Actualiza el estado y/o notas de un mensaje de contacto
 * Solo accesible para superadmin
 */
export async function updateContactMessage(
  updateData: UpdateContactMessageData
): Promise<ActionResult> {
  try {
    console.log("[updateContactMessage] Actualizando mensaje:", updateData.id);

    // Verificar autenticación y rol
    const user = await getServerUser();
    if (!user) {
      return { success: false, error: "No autenticado" };
    }

    if (user.role !== "superadmin") {
      return { success: false, error: "Sin permisos para actualizar mensaje" };
    }

    // Validar ID
    if (!updateData.id) {
      return { success: false, error: "ID de mensaje requerido" };
    }

    // Validar que al menos se actualice un campo
    if (updateData.status === undefined && updateData.notes === undefined) {
      return {
        success: false,
        error: "Debe especificar al menos un campo para actualizar",
      };
    }

    // Construir objeto de actualización
    const updates: any = {};
    if (updateData.status !== undefined) {
      updates.status = updateData.status;
    }
    if (updateData.notes !== undefined) {
      updates.notes = updateData.notes;
    }

    // Actualizar mensaje
    const { data, error } = await supabaseAdmin
      .from("redpresu_contact_messages")
      .update(updates)
      .eq("id", updateData.id)
      .select()
      .single();

    if (error) {
      console.error("[updateContactMessage] Error actualizando mensaje:", error);
      return {
        success: false,
        error: "Error al actualizar el mensaje",
      };
    }

    console.log("[updateContactMessage] Mensaje actualizado correctamente:", data.id);

    return {
      success: true,
      data: data as ContactMessage,
    };
  } catch (error) {
    console.error("[updateContactMessage] Error inesperado:", error);
    return {
      success: false,
      error: "Error inesperado al actualizar el mensaje",
    };
  }
}

/**
 * Obtiene estadísticas de mensajes de contacto
 * Solo accesible para superadmin
 */
export async function getContactMessagesStats(): Promise<ActionResult> {
  try {
    console.log("[getContactMessagesStats] Obteniendo estadísticas");

    // Verificar autenticación y rol
    const user = await getServerUser();
    if (!user) {
      return { success: false, error: "No autenticado" };
    }

    if (user.role !== "superadmin") {
      return { success: false, error: "Sin permisos para acceder a estadísticas" };
    }

    // Obtener conteos por estado
    const { data: allMessages, error } = await supabaseAdmin
      .from("redpresu_contact_messages")
      .select("status");

    if (error) {
      console.error("[getContactMessagesStats] Error obteniendo estadísticas:", error);
      return {
        success: false,
        error: "Error al obtener estadísticas",
      };
    }

    // Calcular estadísticas
    const stats = {
      total: allMessages.length,
      nuevo: allMessages.filter((m) => m.status === "nuevo").length,
      leido: allMessages.filter((m) => m.status === "leido").length,
      respondido: allMessages.filter((m) => m.status === "respondido").length,
    };

    console.log("[getContactMessagesStats] Estadísticas:", stats);

    return {
      success: true,
      data: stats,
    };
  } catch (error) {
    console.error("[getContactMessagesStats] Error inesperado:", error);
    return {
      success: false,
      error: "Error inesperado al obtener estadísticas",
    };
  }
}
