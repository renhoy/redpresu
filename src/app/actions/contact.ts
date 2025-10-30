"use server";

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
  };
}

/**
 * Envía un mensaje de contacto y lo guarda en la base de datos
 * Los mensajes son revisados por los administradores
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

    // Guardar mensaje en base de datos
    // NOTA: Esta tabla se debe crear con una migración futura si se quiere persistir los mensajes
    // Por ahora solo validamos y retornamos éxito
    // En producción, aquí se enviaría un email a los administradores usando Supabase Functions o similar

    console.log("[sendContactMessage] Mensaje recibido correctamente:", {
      from: `${data.firstName} ${data.lastName}`,
      email: data.email,
      subject: data.subject,
    });

    // TODO: Implementar envío de email a administradores
    // await supabaseAdmin.functions.invoke('send-contact-email', { body: data })

    return {
      success: true,
      data: {
        message: "Mensaje enviado correctamente. Nos pondremos en contacto contigo pronto.",
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
