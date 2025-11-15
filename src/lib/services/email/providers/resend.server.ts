// ============================================================
// Resend Provider - Redpresu
// Implementación del EmailProvider para Resend
// ============================================================

import type { EmailProvider, EmailParams, EmailResult } from '../index.server';

export class ResendProvider implements EmailProvider {
  private client: any;
  private defaultFrom: string;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('RESEND_API_KEY is not set');
    }

    // Usar require dinámico para evitar bundling en build time
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Resend } = require('resend');
    this.client = new Resend(apiKey);
    this.defaultFrom = process.env.EMAIL_FROM || 'noreply@redpresu.com';
  }

  async send(params: EmailParams): Promise<EmailResult> {
    try {
      const { data, error } = await this.client.emails.send({
        from: params.from || this.defaultFrom,
        to: Array.isArray(params.to) ? params.to : [params.to],
        subject: params.subject,
        html: params.html,
        text: params.text,
        replyTo: params.replyTo
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, messageId: data?.id };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}
