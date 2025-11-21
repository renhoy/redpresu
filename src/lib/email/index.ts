/**
 * Sistema de emails para Redpresu
 *
 * Usa Resend como proveedor de emails.
 * Plan free: 100 emails/día, 3000 emails/mes
 *
 * Configuración requerida en .env:
 * - RESEND_API_KEY: API key de Resend
 * - RESEND_FROM_EMAIL: Email remitente (debe ser dominio verificado)
 * - RESEND_FROM_NAME: Nombre del remitente
 */

export { sendEmailWithResend, resend, DEFAULT_FROM_EMAIL, DEFAULT_FROM_NAME } from './resend';
export {
  getUserApprovedEmailTemplate,
  getInvitedReminderEmailTemplate,
  getAwaitingApprovalReminderEmailTemplate,
} from './templates';

import { sendEmailWithResend } from './resend';
import {
  getUserApprovedEmailTemplate,
  getInvitedReminderEmailTemplate,
  getAwaitingApprovalReminderEmailTemplate,
} from './templates';

// ============================================
// Funciones de alto nivel para envío de emails
// ============================================

/**
 * Envía email de cuenta aprobada al usuario
 */
export async function sendUserApprovedEmail(params: {
  to: string;
  userName: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const template = await getUserApprovedEmailTemplate({
      userName: params.userName,
      userEmail: params.to,
    });

    return await sendEmailWithResend({
      to: params.to,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  } catch (error) {
    console.error('[sendUserApprovedEmail] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

/**
 * Envía recordatorio a usuario invitado
 * (Para uso futuro con cron job)
 */
export async function sendInvitedReminderEmail(params: {
  to: string;
  userName: string;
  invitationUrl: string;
  invitedByName: string;
  reminderNumber: number;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const template = await getInvitedReminderEmailTemplate({
      userName: params.userName,
      invitationUrl: params.invitationUrl,
      invitedByName: params.invitedByName,
      reminderNumber: params.reminderNumber,
    });

    return await sendEmailWithResend({
      to: params.to,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  } catch (error) {
    console.error('[sendInvitedReminderEmail] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

/**
 * Envía recordatorio a usuario en espera de aprobación
 * (Para uso futuro con cron job)
 */
export async function sendAwaitingApprovalReminderEmail(params: {
  to: string;
  userName: string;
  reminderNumber: number;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const template = await getAwaitingApprovalReminderEmailTemplate({
      userName: params.userName,
      userEmail: params.to,
      reminderNumber: params.reminderNumber,
    });

    return await sendEmailWithResend({
      to: params.to,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  } catch (error) {
    console.error('[sendAwaitingApprovalReminderEmail] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}
