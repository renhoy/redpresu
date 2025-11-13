"use server";

import { supabaseAdmin } from "@/lib/supabase/server";
import { getConfigValue } from "@/lib/helpers/config-helpers";
import { sendContactNotificationEmail } from "@/lib/helpers/email-helpers";

interface ContactMessageData {
  firstName: string;
  lastName: string;
  email: string;
  subject: string;
  message: string;
}

interface ActionResult {
  success: boolean;
  error?: string;
  data?: {
    message: string;
    messageId?: string;
  };
}

/**
 * Envía un mensaje de contacto, lo guarda en la base de datos
 * y notifica a los administradores por email
 */
export async function sendContactMessage(
  data: ContactMessageData
): Promise<ActionResult> {
  try {
    console.log("[sendContactMessage] Procesando mensaje de:", data.email);

    // Validar campos obligatorios
    if (
      !data.firstName ||
      !data.lastName ||
      !data.email ||
      !data.subject ||
      !data.message
    ) {
      return {
        success: false,
        error: "Todos los campos son obligatorios",
      };
    }

    // Validar formato email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      return {
        success: false,
        error: "El correo electrónico no es válido",
      };
    }

    // 1. Guardar mensaje en base de datos
    const { data: savedMessage, error: dbError } = await supabaseAdmin
      .from("contact_messages")
      .insert({
        first_name: data.firstName,
        last_name: data.lastName,
        email: data.email,
        subject: data.subject,
        message: data.message,
        status: "nuevo",
      })
      .select("id")
      .single();

    if (dbError) {
      console.error("[sendContactMessage] Error guardando en BD:", dbError);
      return {
        success: false,
        error: "Error al guardar el mensaje. Por favor, intenta de nuevo.",
      };
    }

    console.log("[sendContactMessage] Mensaje guardado con ID:", savedMessage.id);

    // 2. Obtener emails de notificación desde configuración
    const notificationEmails = await getConfigValue<string[]>(
      "contact_notification_emails"
    );

    if (!notificationEmails || notificationEmails.length === 0) {
      console.warn(
        "[sendContactMessage] No hay emails de notificación configurados"
      );
      // Continuar igualmente, el mensaje ya está guardado
    } else {
      // 3. Enviar notificación por email
      const emailResult = await sendContactNotificationEmail(
        {
          ...data,
          messageId: savedMessage.id,
        },
        notificationEmails
      );

      if (!emailResult.success) {
        console.error(
          "[sendContactMessage] Error enviando email:",
          emailResult.error
        );
        // No retornar error, el mensaje ya está guardado en BD
      } else {
        console.log("[sendContactMessage] Email de notificación enviado correctamente");
      }
    }

    return {
      success: true,
      data: {
        message:
          "Mensaje enviado correctamente. Nos pondremos en contacto contigo pronto.",
        messageId: savedMessage.id,
      },
    };
  } catch (error) {
    console.error("[sendContactMessage] Error inesperado:", error);
    return {
      success: false,
      error: "Error inesperado al enviar el mensaje",
    };
  }
}
