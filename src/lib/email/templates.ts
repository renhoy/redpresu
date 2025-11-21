/**
 * Templates de email para el sistema de usuarios
 *
 * Templates disponibles:
 * - userApproved: Cuenta aprobada por superadmin
 * - invitedReminder: Recordatorio para usuarios invitados (futuro)
 * - awaitingApprovalReminder: Recordatorio para usuarios en espera (futuro)
 */

import { getAppUrl } from '@/lib/helpers/url-helpers-server';

// Colores de la marca
const BRAND_COLOR = '#84cc16'; // lime-500
const BRAND_COLOR_DARK = '#65a30d'; // lime-600

/**
 * Layout base para todos los emails
 */
function baseLayout(content: string): string {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Redpresu</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6; line-height: 1.6;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f3f4f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
          ${content}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Header del email con logo
 */
function emailHeader(title: string): string {
  return `
  <tr>
    <td style="background: linear-gradient(135deg, ${BRAND_COLOR} 0%, ${BRAND_COLOR_DARK} 100%); padding: 40px 30px; text-align: center; border-radius: 12px 12px 0 0;">
      <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">Redpresu</h1>
      <p style="margin: 10px 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">${title}</p>
    </td>
  </tr>
  `;
}

/**
 * Footer del email
 */
async function emailFooter(): Promise<string> {
  const appUrl = await getAppUrl();
  return `
  <tr>
    <td style="padding: 30px; text-align: center; background-color: #f9fafb; border-radius: 0 0 12px 12px;">
      <p style="margin: 0 0 10px; color: #6b7280; font-size: 14px;">
        ¿Necesitas ayuda? <a href="${appUrl}/contact" style="color: ${BRAND_COLOR}; text-decoration: none;">Contáctanos</a>
      </p>
      <p style="margin: 0; color: #9ca3af; font-size: 12px;">
        © ${new Date().getFullYear()} Redpresu. Todos los derechos reservados.
      </p>
    </td>
  </tr>
  `;
}

/**
 * Botón de acción
 */
function actionButton(text: string, url: string): string {
  return `
  <a href="${url}"
     style="display: inline-block;
            background-color: ${BRAND_COLOR};
            color: #ffffff;
            padding: 14px 32px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            margin: 20px 0;
            transition: background-color 0.2s;">
    ${text}
  </a>
  `;
}

// ============================================
// TEMPLATE: Usuario Aprobado
// ============================================

export async function getUserApprovedEmailTemplate(params: {
  userName: string;
  userEmail: string;
}): Promise<{ html: string; text: string; subject: string }> {
  const appUrl = await getAppUrl();
  const loginUrl = `${appUrl}/login`;

  const subject = '🎉 ¡Tu cuenta ha sido aprobada!';

  const html = baseLayout(`
    ${emailHeader('¡Cuenta Aprobada!')}
    <tr>
      <td style="padding: 40px 30px;">
        <p style="margin: 0 0 20px; color: #374151; font-size: 18px;">
          Hola <strong>${params.userName}</strong>,
        </p>

        <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px;">
          ¡Excelentes noticias! Tu cuenta en <strong>Redpresu</strong> ha sido revisada y aprobada por nuestro equipo.
        </p>

        <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; margin: 25px 0;">
          <p style="margin: 0; color: #166534; font-size: 16px;">
            ✅ Ya puedes acceder a todas las funcionalidades de la plataforma con tus credenciales.
          </p>
        </div>

        <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin: 25px 0;">
          <p style="margin: 0 0 10px; color: #6b7280; font-size: 14px;"><strong>Tus datos de acceso:</strong></p>
          <p style="margin: 0; color: #374151; font-size: 16px;">
            📧 Email: <strong>${params.userEmail}</strong><br>
            🔐 Contraseña: La que estableciste al registrarte
          </p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          ${actionButton('Iniciar Sesión', loginUrl)}
        </div>

        <p style="margin: 30px 0 0; color: #6b7280; font-size: 14px;">
          Si tienes alguna pregunta o necesitas ayuda, no dudes en contactarnos.
        </p>
      </td>
    </tr>
    ${await emailFooter()}
  `);

  const text = `
¡Tu cuenta ha sido aprobada!

Hola ${params.userName},

¡Excelentes noticias! Tu cuenta en Redpresu ha sido revisada y aprobada por nuestro equipo.

Ya puedes acceder a todas las funcionalidades de la plataforma con tus credenciales:

Email: ${params.userEmail}
Contraseña: La que estableciste al registrarte

Iniciar sesión: ${loginUrl}

Si tienes alguna pregunta o necesitas ayuda, no dudes en contactarnos.

El equipo de Redpresu
${appUrl}
  `.trim();

  return { html, text, subject };
}

// ============================================
// TEMPLATE: Recordatorio para Invitado (FUTURO)
// ============================================

export async function getInvitedReminderEmailTemplate(params: {
  userName: string;
  invitationUrl: string;
  invitedByName: string;
  reminderNumber: number;
}): Promise<{ html: string; text: string; subject: string }> {
  const appUrl = await getAppUrl();

  const subject = params.reminderNumber === 1
    ? '📬 Tienes una invitación pendiente en Redpresu'
    : `⏰ Recordatorio: Tu invitación a Redpresu sigue pendiente`;

  const html = baseLayout(`
    ${emailHeader('Invitación Pendiente')}
    <tr>
      <td style="padding: 40px 30px;">
        <p style="margin: 0 0 20px; color: #374151; font-size: 18px;">
          Hola${params.userName ? ` <strong>${params.userName}</strong>` : ''},
        </p>

        <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px;">
          <strong>${params.invitedByName}</strong> te ha invitado a unirte a <strong>Redpresu</strong>,
          la plataforma profesional de gestión de presupuestos.
        </p>

        <div style="background-color: #fef3c7; border: 1px solid #fde68a; border-radius: 8px; padding: 20px; margin: 25px 0;">
          <p style="margin: 0; color: #92400e; font-size: 16px;">
            ⏳ Tu invitación sigue pendiente de ser completada.
          </p>
        </div>

        <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px;">
          Para activar tu cuenta, solo necesitas hacer clic en el siguiente enlace y establecer tu contraseña:
        </p>

        <div style="text-align: center; margin: 30px 0;">
          ${actionButton('Activar mi Cuenta', params.invitationUrl)}
        </div>

        <p style="margin: 30px 0 0; color: #9ca3af; font-size: 13px; text-align: center;">
          Este enlace es personal e intransferible. Si no solicitaste esta invitación, puedes ignorar este email.
        </p>
      </td>
    </tr>
    ${await emailFooter()}
  `);

  const text = `
Invitación Pendiente en Redpresu

Hola${params.userName ? ` ${params.userName}` : ''},

${params.invitedByName} te ha invitado a unirte a Redpresu, la plataforma profesional de gestión de presupuestos.

Tu invitación sigue pendiente de ser completada.

Para activar tu cuenta, solo necesitas acceder al siguiente enlace y establecer tu contraseña:

${params.invitationUrl}

Este enlace es personal e intransferible. Si no solicitaste esta invitación, puedes ignorar este email.

El equipo de Redpresu
${appUrl}
  `.trim();

  return { html, text, subject };
}

// ============================================
// TEMPLATE: Recordatorio para En Espera (FUTURO)
// ============================================

export async function getAwaitingApprovalReminderEmailTemplate(params: {
  userName: string;
  userEmail: string;
  reminderNumber: number;
}): Promise<{ html: string; text: string; subject: string }> {
  const appUrl = await getAppUrl();

  const subject = params.reminderNumber === 1
    ? '📋 Tu registro está siendo revisado'
    : `⏳ Actualización: Tu registro sigue en revisión`;

  const html = baseLayout(`
    ${emailHeader('Registro en Revisión')}
    <tr>
      <td style="padding: 40px 30px;">
        <p style="margin: 0 0 20px; color: #374151; font-size: 18px;">
          Hola <strong>${params.userName}</strong>,
        </p>

        <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px;">
          Queremos informarte que tu solicitud de registro en <strong>Redpresu</strong> está siendo revisada por nuestro equipo.
        </p>

        <div style="background-color: #fef3c7; border: 1px solid #fde68a; border-radius: 8px; padding: 20px; margin: 25px 0;">
          <p style="margin: 0; color: #92400e; font-size: 16px;">
            ⏳ Tu cuenta está pendiente de aprobación.
          </p>
        </div>

        <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px;">
          Te notificaremos por email tan pronto como tu cuenta sea activada. Esto suele tomar entre 24-48 horas hábiles.
        </p>

        <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px;">
          Si crees que ha pasado demasiado tiempo o tienes alguna pregunta, no dudes en contactarnos:
        </p>

        <div style="text-align: center; margin: 30px 0;">
          ${actionButton('Contactar Soporte', `${appUrl}/contact`)}
        </div>
      </td>
    </tr>
    ${await emailFooter()}
  `);

  const text = `
Tu registro está siendo revisado

Hola ${params.userName},

Queremos informarte que tu solicitud de registro en Redpresu está siendo revisada por nuestro equipo.

Tu cuenta está pendiente de aprobación.

Te notificaremos por email tan pronto como tu cuenta sea activada. Esto suele tomar entre 24-48 horas hábiles.

Si crees que ha pasado demasiado tiempo o tienes alguna pregunta, no dudes en contactarnos:
${appUrl}/contact

El equipo de Redpresu
${appUrl}
  `.trim();

  return { html, text, subject };
}

// ============================================
// TODO: CRON JOB PARA RECORDATORIOS
// ============================================
/*
 * Futuro job de Supabase Cron para enviar recordatorios automáticos.
 *
 * Lógica a implementar:
 *
 * 1. Buscar usuarios con status IN ('invited', 'awaiting_approval')
 *    WHERE created_at < NOW() - INTERVAL '48 hours'
 *    AND reminder_count < 3
 *    AND (last_reminder_sent_at IS NULL OR last_reminder_sent_at < NOW() - INTERVAL '3 days')
 *
 * 2. Para cada usuario encontrado:
 *    - Incrementar reminder_count
 *    - Actualizar last_reminder_sent_at = NOW()
 *    - Enviar email correspondiente según status:
 *      - 'invited' -> getInvitedReminderEmailTemplate()
 *      - 'awaiting_approval' -> getAwaitingApprovalReminderEmailTemplate()
 *
 * 3. Loguear resultados para auditoría
 *
 * Configuración sugerida:
 * - Ejecutar cada 6 horas
 * - Máximo 3 recordatorios por usuario
 * - Intervalo mínimo entre recordatorios: 3 días
 */
