/**
 * Helpers para envío de emails
 *
 * NOTA: Actualmente en modo desarrollo (solo logs).
 * Para producción, integrar con:
 * - Supabase Edge Functions (recomendado)
 * - Resend API
 * - SendGrid
 * - Nodemailer
 */

interface ContactEmailData {
  firstName: string
  lastName: string
  email: string
  subject: string
  message: string
  messageId: string
}

interface EmailResult {
  success: boolean
  error?: string
}

/**
 * Envía notificación de nuevo mensaje de contacto a los administradores
 * @param data - Datos del mensaje de contacto
 * @param recipientEmails - Array de emails destinatarios
 * @returns Promise con resultado del envío
 */
export async function sendContactNotificationEmail(
  data: ContactEmailData,
  recipientEmails: string[]
): Promise<EmailResult> {
  try {
    console.log('[sendContactNotificationEmail] Preparando email...')
    console.log('[sendContactNotificationEmail] Destinatarios:', recipientEmails)

    // Validar que hay destinatarios
    if (!recipientEmails || recipientEmails.length === 0) {
      console.error('[sendContactNotificationEmail] No hay destinatarios configurados')
      return {
        success: false,
        error: 'No hay emails de notificación configurados'
      }
    }

    // Construir contenido del email
    const emailSubject = `[Contacto Web] ${data.subject}`
    const emailBody = generateContactEmailHTML(data)

    // TODO: Implementar envío real de email
    // Opciones:
    // 1. Supabase Edge Function:
    //    const { data: result, error } = await supabaseAdmin.functions.invoke('send-email', {
    //      body: { to: recipientEmails, subject: emailSubject, html: emailBody }
    //    })
    //
    // 2. Resend API:
    //    const resend = new Resend(process.env.RESEND_API_KEY)
    //    await resend.emails.send({
    //      from: 'noreply@yourdomain.com',
    //      to: recipientEmails,
    //      subject: emailSubject,
    //      html: emailBody
    //    })

    // Por ahora, solo log en desarrollo
    console.log('========================================')
    console.log('[EMAIL SIMULADO - DESARROLLO]')
    console.log('Para:', recipientEmails.join(', '))
    console.log('Asunto:', emailSubject)
    console.log('----------------------------------------')
    console.log(emailBody)
    console.log('========================================')

    // Simular éxito
    return {
      success: true
    }

  } catch (error) {
    console.error('[sendContactNotificationEmail] Error:', error)
    return {
      success: false,
      error: 'Error al enviar notificación por email'
    }
  }
}

/**
 * Genera el HTML del email de notificación de contacto
 * @param data - Datos del mensaje
 * @returns HTML del email
 */
function generateContactEmailHTML(data: ContactEmailData): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nuevo mensaje de contacto</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f4f4f4; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color: #84cc16; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px;">Nuevo Mensaje de Contacto</h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px; color: #666666; font-size: 16px;">
                Has recibido un nuevo mensaje desde el formulario de contacto web:
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 20px;">
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #eeeeee;">
                    <strong style="color: #333333;">Nombre:</strong>
                  </td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #eeeeee; text-align: right; color: #666666;">
                    ${data.firstName} ${data.lastName}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #eeeeee;">
                    <strong style="color: #333333;">Email:</strong>
                  </td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #eeeeee; text-align: right;">
                    <a href="mailto:${data.email}" style="color: #84cc16; text-decoration: none;">${data.email}</a>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #eeeeee;">
                    <strong style="color: #333333;">Asunto:</strong>
                  </td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #eeeeee; text-align: right; color: #666666;">
                    ${data.subject}
                  </td>
                </tr>
              </table>

              <div style="background-color: #f9f9f9; padding: 20px; border-radius: 6px; margin-bottom: 30px;">
                <strong style="color: #333333; display: block; margin-bottom: 10px;">Mensaje:</strong>
                <p style="margin: 0; color: #666666; white-space: pre-wrap; line-height: 1.6;">${data.message}</p>
              </div>

              <div style="text-align: center;">
                <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/contact-messages"
                   style="display: inline-block; padding: 12px 30px; background-color: #84cc16; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold;">
                  Ver en Panel de Administración
                </a>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 30px; text-align: center; background-color: #f9f9f9; border-radius: 0 0 8px 8px;">
              <p style="margin: 0; color: #999999; font-size: 12px;">
                Este es un email automático del sistema de contacto web.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}
