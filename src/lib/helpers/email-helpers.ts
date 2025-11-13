/**
 * Helpers para envío de emails
 *
 * NOTA: Actualmente en modo desarrollo (solo logs).
 * Para producción, integrar con:
 * - Supabase Edge Functions (recomendado)
 * - Resend API
 * - SendGrid
 * - Nodemailer
 *
 * NUEVO (Testing Suscripciones):
 * - En NODE_ENV !== 'production': emails se guardan en BD (redpresu_mock_emails)
 * - En producción: se enviarían vía servicio real
 */

import { supabaseAdmin } from '@/lib/supabase/server';
import { getCurrentTime } from '@/lib/helpers/time-helpers';
import { getAppUrl } from '@/lib/helpers/url-helpers-server';

// ============================================
// Tipos - Formulario de Contacto
// ============================================

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

    // Obtener URL base de la aplicación
    const baseUrl = await getAppUrl()

    // Construir contenido del email
    const emailSubject = `[Contacto Web] ${data.subject}`
    const emailBody = generateContactEmailHTML(data, baseUrl)

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
 * @param baseUrl - URL base de la aplicación
 * @returns HTML del email
 */
function generateContactEmailHTML(data: ContactEmailData, baseUrl: string): string {
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
                <a href="${baseUrl}/contact-messages"
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

// ============================================
// Tipos - Suscripciones
// ============================================

export type SubscriptionEmailType =
  | 'payment_failed'
  | 'expiring_soon'
  | 'expired'
  | 'grace_period_ending'
  | 'upgraded'
  | 'canceled';

interface SubscriptionEmailData {
  type: SubscriptionEmailType;
  to: string;
  subject: string;
  body: string;
  metadata?: Record<string, any>;
  companyId?: number;
}

// ============================================
// Funciones - Emails de Suscripciones (Mockeable)
// ============================================

/**
 * Envía un email de suscripción (mockeable en testing)
 *
 * @param emailData - Datos del email
 * @returns true si se envió/mockeó correctamente
 */
export async function sendSubscriptionEmail(emailData: SubscriptionEmailData): Promise<boolean> {
  try {
    const isProduction = process.env.NODE_ENV === 'production';

    if (isProduction) {
      // TODO: Implementar envío real con servicio de email
      // Por ahora, solo loguear
      console.warn('[sendSubscriptionEmail] Email no enviado (servicio no configurado):', {
        type: emailData.type,
        to: emailData.to,
        subject: emailData.subject,
      });
      return false;
    }

    // Modo testing: Guardar en BD
    const now = await getCurrentTime();

    const { error } = await supabaseAdmin
      .from('redpresu_mock_emails')
      .insert({
        type: emailData.type,
        to_email: emailData.to,
        subject: emailData.subject,
        body: emailData.body,
        data: emailData.metadata || {},
        company_id: emailData.companyId || null,
        created_at: now.toISOString(),
      });

    if (error) {
      console.error('[sendSubscriptionEmail] Error guardando mock email:', error);
      return false;
    }

    // Loguear en consola para debugging
    console.log('📧 [MOCK EMAIL - SUSCRIPCIÓN] ===========================');
    console.log(`Tipo: ${emailData.type}`);
    console.log(`Para: ${emailData.to}`);
    console.log(`Asunto: ${emailData.subject}`);
    console.log('Cuerpo:', emailData.body.substring(0, 200) + '...');
    if (emailData.metadata) {
      console.log('Metadata:', JSON.stringify(emailData.metadata, null, 2));
    }
    console.log('=========================================================');

    return true;
  } catch (error) {
    console.error('[sendSubscriptionEmail] Error inesperado:', error);
    return false;
  }
}

/**
 * Email: Pago fallido
 */
export async function sendPaymentFailedEmail(params: {
  to: string;
  plan: string;
  companyId?: number;
}): Promise<boolean> {
  const baseUrl = await getAppUrl();

  return sendSubscriptionEmail({
    type: 'payment_failed',
    to: params.to,
    subject: `⚠️ Pago fallido - Suscripción ${params.plan.toUpperCase()}`,
    body: `Hola,

Hemos detectado un problema con el pago de tu suscripción ${params.plan.toUpperCase()}.

Por favor, actualiza tu método de pago lo antes posible para evitar la interrupción del servicio.

Puedes gestionar tu suscripción desde el panel de control:
${baseUrl}/subscriptions

Si crees que esto es un error, por favor contacta con soporte.

Saludos,
El equipo de JEYCA Presupuestos`,
    metadata: {
      plan: params.plan,
    },
    companyId: params.companyId,
  });
}

/**
 * Email: Suscripción próxima a vencer
 */
export async function sendExpiringSoonEmail(params: {
  to: string;
  plan: string;
  daysUntilExpiration: number;
  expirationDate: string;
  companyId?: number;
}): Promise<boolean> {
  const { daysUntilExpiration } = params;
  const baseUrl = await getAppUrl();

  let urgency = '';
  if (daysUntilExpiration <= 1) {
    urgency = '🚨 ¡URGENTE! ';
  } else if (daysUntilExpiration <= 3) {
    urgency = '⚠️ ';
  }

  return sendSubscriptionEmail({
    type: 'expiring_soon',
    to: params.to,
    subject: `${urgency}Tu suscripción ${params.plan.toUpperCase()} vence en ${daysUntilExpiration} día${daysUntilExpiration !== 1 ? 's' : ''}`,
    body: `Hola,

Tu suscripción ${params.plan.toUpperCase()} está próxima a vencer.

Fecha de vencimiento: ${params.expirationDate}
Días restantes: ${daysUntilExpiration}

Renueva ahora para evitar la interrupción del servicio y seguir disfrutando de todas las funcionalidades.

Renovar suscripción:
${baseUrl}/subscriptions

Gracias por confiar en nosotros.

Saludos,
El equipo de JEYCA Presupuestos`,
    metadata: {
      plan: params.plan,
      days_until_expiration: daysUntilExpiration,
      expiration_date: params.expirationDate,
    },
    companyId: params.companyId,
  });
}

/**
 * Email: Suscripción expirada
 */
export async function sendExpiredEmail(params: {
  to: string;
  plan: string;
  expirationDate: string;
  gracePeriodDays: number;
  companyId?: number;
}): Promise<boolean> {
  const baseUrl = await getAppUrl();

  return sendSubscriptionEmail({
    type: 'expired',
    to: params.to,
    subject: `❌ Tu suscripción ${params.plan.toUpperCase()} ha expirado`,
    body: `Hola,

Tu suscripción ${params.plan.toUpperCase()} expiró el ${params.expirationDate}.

Período de gracia: Tienes ${params.gracePeriodDays} días para renovar tu suscripción sin perder acceso a tus datos.

Durante este período podrás seguir usando la aplicación normalmente, pero te recomendamos renovar cuanto antes.

Renovar suscripción:
${baseUrl}/subscriptions

Si no renuevas antes de que termine el período de gracia, tu cuenta será bloqueada (solo lectura).

Saludos,
El equipo de JEYCA Presupuestos`,
    metadata: {
      plan: params.plan,
      expiration_date: params.expirationDate,
      grace_period_days: params.gracePeriodDays,
    },
    companyId: params.companyId,
  });
}

/**
 * Email: Período de gracia terminando
 */
export async function sendGracePeriodEndingEmail(params: {
  to: string;
  plan: string;
  daysRemaining: number;
  expirationDate: string;
  companyId?: number;
}): Promise<boolean> {
  const baseUrl = await getAppUrl();

  return sendSubscriptionEmail({
    type: 'grace_period_ending',
    to: params.to,
    subject: `🚨 URGENTE: Tu período de gracia termina en ${params.daysRemaining} día${params.daysRemaining !== 1 ? 's' : ''}`,
    body: `Hola,

Tu suscripción ${params.plan.toUpperCase()} expiró el ${params.expirationDate}.

⚠️ El período de gracia termina en ${params.daysRemaining} día${params.daysRemaining !== 1 ? 's' : ''}.

Si no renuevas antes de que termine, tu cuenta será bloqueada:
- ❌ No podrás crear nuevos presupuestos
- ❌ No podrás crear nuevas tarifas
- ❌ No podrás añadir usuarios
- ✅ Podrás ver tus datos existentes (solo lectura)

RENOVAR AHORA:
${baseUrl}/subscriptions

¿Necesitas ayuda? Contacta con soporte.

Saludos,
El equipo de JEYCA Presupuestos`,
    metadata: {
      plan: params.plan,
      days_remaining: params.daysRemaining,
      expiration_date: params.expirationDate,
    },
    companyId: params.companyId,
  });
}

/**
 * Email: Upgrade exitoso
 */
export async function sendUpgradedEmail(params: {
  to: string;
  newPlan: string;
  companyId?: number;
}): Promise<boolean> {
  const baseUrl = await getAppUrl();
  const features = getPlanFeatures(params.newPlan);

  return sendSubscriptionEmail({
    type: 'upgraded',
    to: params.to,
    subject: `🎉 ¡Bienvenido al plan ${params.newPlan.toUpperCase()}!`,
    body: `¡Hola!

Tu suscripción ha sido actualizada exitosamente al plan ${params.newPlan.toUpperCase()}.

Ya puedes disfrutar de todas las funcionalidades y límites ampliados de tu nuevo plan:

${features}

Gestionar suscripción:
${baseUrl}/subscriptions

Gracias por tu confianza.

Saludos,
El equipo de JEYCA Presupuestos`,
    metadata: {
      new_plan: params.newPlan,
    },
    companyId: params.companyId,
  });
}

/**
 * Email: Cancelación
 */
export async function sendCanceledEmail(params: {
  to: string;
  oldPlan: string;
  companyId?: number;
}): Promise<boolean> {
  const baseUrl = await getAppUrl();

  return sendSubscriptionEmail({
    type: 'canceled',
    to: params.to,
    subject: `Cancelación de suscripción ${params.oldPlan.toUpperCase()}`,
    body: `Hola,

Tu suscripción ${params.oldPlan.toUpperCase()} ha sido cancelada.

Has vuelto al plan FREE con las siguientes limitaciones:
- Tarifas: 3 máximo
- Presupuestos: 10 máximo
- Usuarios: 1 (solo tú)

Tus datos existentes se mantienen intactos. Si deseas volver a un plan de pago en el futuro, puedes hacerlo en cualquier momento.

Ver planes disponibles:
${baseUrl}/pricing

Lamentamos verte partir. Si tienes algún comentario sobre el servicio, nos encantaría escucharlo.

Saludos,
El equipo de JEYCA Presupuestos`,
    metadata: {
      old_plan: params.oldPlan,
    },
    companyId: params.companyId,
  });
}

// ============================================
// Helpers
// ============================================

/**
 * Obtiene las características del plan para mostrar en emails
 */
function getPlanFeatures(plan: string): string {
  const features: Record<string, string> = {
    free: `- 3 tarifas
- 10 presupuestos
- 1 usuario
- 100MB almacenamiento`,
    pro: `- 50 tarifas
- 500 presupuestos
- 5 usuarios
- 5GB almacenamiento
- Soporte prioritario`,
    enterprise: `- Tarifas ilimitadas
- Presupuestos ilimitados
- 50 usuarios
- 50GB almacenamiento
- Soporte prioritario
- Gestor de cuenta dedicado`,
  };

  return features[plan.toLowerCase()] || 'Funcionalidades completas';
}
