/**
 * Configuración e integración con Resend
 *
 * Documentación: https://resend.com/docs
 * Plan free: 100 emails/día, 3000 emails/mes
 */

import { Resend } from 'resend';

// Inicializar cliente de Resend
const resendApiKey = process.env.RESEND_API_KEY;

if (!resendApiKey) {
  console.warn('[Resend] RESEND_API_KEY no configurada. Los emails no se enviarán.');
}

export const resend = resendApiKey ? new Resend(resendApiKey) : null;

// Email remitente por defecto
// IMPORTANTE: Debe ser un dominio verificado en Resend o usar onboarding@resend.dev para testing
export const DEFAULT_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
export const DEFAULT_FROM_NAME = process.env.RESEND_FROM_NAME || 'Redpresu';

/**
 * Envía un email usando Resend
 */
export async function sendEmailWithResend(params: {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}): Promise<{ success: boolean; error?: string; id?: string }> {
  // Si no hay API key, loguear y retornar
  if (!resend) {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('📧 EMAIL (RESEND NO CONFIGURADO)');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`📮 Para:    ${Array.isArray(params.to) ? params.to.join(', ') : params.to}`);
    console.log(`📋 Asunto:  ${params.subject}`);
    console.log('───────────────────────────────────────────────────────────────');
    console.log('⚠️  Configura RESEND_API_KEY para enviar emails reales');
    console.log('═══════════════════════════════════════════════════════════════\n');
    return { success: false, error: 'RESEND_API_KEY no configurada' };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: `${DEFAULT_FROM_NAME} <${DEFAULT_FROM_EMAIL}>`,
      to: Array.isArray(params.to) ? params.to : [params.to],
      subject: params.subject,
      html: params.html,
      text: params.text,
      replyTo: params.replyTo,
    });

    if (error) {
      console.error('[Resend] Error enviando email:', error);
      return { success: false, error: error.message };
    }

    console.log(`[Resend] Email enviado exitosamente. ID: ${data?.id}`);
    return { success: true, id: data?.id };
  } catch (error) {
    console.error('[Resend] Error inesperado:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}
