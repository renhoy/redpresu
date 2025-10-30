"use server";

import { supabaseAdmin } from "@/lib/supabase/server";
import { getServerUser } from "@/lib/auth/server";

export interface ContactMessageNote {
  id: string;
  contact_message_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  users?: {
    name: string;
    email: string;
  };
}

export interface ActionResult {
  success: boolean;
  data?: ContactMessageNote | ContactMessageNote[];
  error?: string;
}

/**
 * Obtener todas las notas de un mensaje de contacto
 * Solo accesible para superadmin
 */
export async function getContactMessageNotes(
  messageId: string
): Promise<ActionResult> {
  try {
    console.log("[getContactMessageNotes] Obteniendo notas para mensaje:", messageId);

    const user = await getServerUser();
    if (!user) {
      return { success: false, error: "No autenticado" };
    }

    if (user.role !== "superadmin") {
      return { success: false, error: "Sin permisos para acceder a notas" };
    }

    // Obtener notas
    const { data: notesData, error: notesError } = await supabaseAdmin
      .from("redpresu_contact_message_notes")
      .select("*")
      .eq("contact_message_id", messageId)
      .order("created_at", { ascending: false });

    if (notesError) {
      console.error("[getContactMessageNotes] Error BD:", notesError);
      return { success: false, error: notesError.message };
    }

    if (!notesData || notesData.length === 0) {
      console.log("[getContactMessageNotes] No hay notas");
      return { success: true, data: [] };
    }

    // Obtener usuarios para las notas
    const userIds = [...new Set(notesData.map((note) => note.user_id))];
    const { data: usersData, error: usersError } = await supabaseAdmin
      .from("redpresu_users")
      .select("id, name, email")
      .in("id", userIds);

    if (usersError) {
      console.error("[getContactMessageNotes] Error obteniendo usuarios:", usersError);
      // Continuar sin datos de usuarios
    }

    // Combinar datos
    const notesWithUsers = notesData.map((note) => ({
      ...note,
      users: usersData?.find((u) => u.id === note.user_id) || {
        name: "Usuario",
        email: "",
      },
    }));

    console.log("[getContactMessageNotes] Notas obtenidas:", notesWithUsers.length);
    return { success: true, data: notesWithUsers as ContactMessageNote[] };
  } catch (error) {
    console.error("[getContactMessageNotes] Error inesperado:", error);
    return { success: false, error: "Error inesperado" };
  }
}

/**
 * Crear una nueva nota en un mensaje de contacto
 * Solo accesible para superadmin
 */
export async function addContactMessageNote(
  messageId: string,
  content: string
): Promise<ActionResult> {
  try {
    console.log("[addContactMessageNote] Añadiendo nota a mensaje:", messageId);

    if (!content || content.trim() === "") {
      return { success: false, error: "El contenido no puede estar vacío" };
    }

    const user = await getServerUser();
    if (!user) {
      return { success: false, error: "No autenticado" };
    }

    if (user.role !== "superadmin") {
      return { success: false, error: "Sin permisos para añadir notas" };
    }

    // Insertar nota
    const { data: noteData, error: noteError } = await supabaseAdmin
      .from("redpresu_contact_message_notes")
      .insert({
        contact_message_id: messageId,
        user_id: user.id,
        content: content.trim(),
      })
      .select("*")
      .single();

    if (noteError) {
      console.error("[addContactMessageNote] Error BD:", noteError);
      return { success: false, error: noteError.message };
    }

    // Obtener datos del usuario
    const { data: userData } = await supabaseAdmin
      .from("redpresu_users")
      .select("id, name, email")
      .eq("id", user.id)
      .single();

    // Combinar datos
    const noteWithUser = {
      ...noteData,
      users: userData || { name: "Usuario", email: user.email || "" },
    };

    console.log("[addContactMessageNote] Nota creada:", noteWithUser.id);
    return { success: true, data: noteWithUser as ContactMessageNote };
  } catch (error) {
    console.error("[addContactMessageNote] Error inesperado:", error);
    return { success: false, error: "Error inesperado" };
  }
}

/**
 * Actualizar una nota existente
 * Solo el creador puede editar (y debe ser superadmin)
 */
export async function updateContactMessageNote(
  noteId: string,
  content: string
): Promise<ActionResult> {
  try {
    console.log("[updateContactMessageNote] Actualizando nota:", noteId);

    if (!content || content.trim() === "") {
      return { success: false, error: "El contenido no puede estar vacío" };
    }

    const user = await getServerUser();
    if (!user) {
      return { success: false, error: "No autenticado" };
    }

    if (user.role !== "superadmin") {
      return { success: false, error: "Sin permisos para actualizar notas" };
    }

    // Actualizar nota
    const { data: noteData, error: noteError } = await supabaseAdmin
      .from("redpresu_contact_message_notes")
      .update({
        content: content.trim(),
      })
      .eq("id", noteId)
      .eq("user_id", user.id) // Solo el creador puede editar
      .select("*")
      .single();

    if (noteError) {
      console.error("[updateContactMessageNote] Error BD:", noteError);
      return { success: false, error: noteError.message };
    }

    // Obtener datos del usuario
    const { data: userData } = await supabaseAdmin
      .from("redpresu_users")
      .select("id, name, email")
      .eq("id", user.id)
      .single();

    // Combinar datos
    const noteWithUser = {
      ...noteData,
      users: userData || { name: "Usuario", email: user.email || "" },
    };

    console.log("[updateContactMessageNote] Nota actualizada:", noteWithUser.id);
    return { success: true, data: noteWithUser as ContactMessageNote };
  } catch (error) {
    console.error("[updateContactMessageNote] Error inesperado:", error);
    return { success: false, error: "Error inesperado" };
  }
}

/**
 * Eliminar una nota
 * Solo superadmin puede eliminar
 */
export async function deleteContactMessageNote(noteId: string): Promise<ActionResult> {
  try {
    console.log("[deleteContactMessageNote] Eliminando nota:", noteId);

    const user = await getServerUser();
    if (!user) {
      return { success: false, error: "No autenticado" };
    }

    if (user.role !== "superadmin") {
      return { success: false, error: "Sin permisos para eliminar notas" };
    }

    const { error } = await supabaseAdmin
      .from("redpresu_contact_message_notes")
      .delete()
      .eq("id", noteId);

    if (error) {
      console.error("[deleteContactMessageNote] Error BD:", error);
      return { success: false, error: error.message };
    }

    console.log("[deleteContactMessageNote] Nota eliminada:", noteId);
    return { success: true };
  } catch (error) {
    console.error("[deleteContactMessageNote] Error inesperado:", error);
    return { success: false, error: "Error inesperado" };
  }
}

/**
 * Obtener el conteo de notas de un mensaje (para mostrar badge)
 */
export async function getContactMessageNotesCount(messageId: string): Promise<number> {
  try {
    const { count, error } = await supabaseAdmin
      .from("redpresu_contact_message_notes")
      .select("*", { count: "exact", head: true })
      .eq("contact_message_id", messageId);

    if (error) {
      console.error("[getContactMessageNotesCount] Error BD:", error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error("[getContactMessageNotesCount] Error inesperado:", error);
    return 0;
  }
}
