// ============================================================
// Resend Provider - Redpresu
// Implementación del EmailProvider para Resend
// ============================================================

import type { EmailProvider, EmailParams, EmailResult } from '../index';

// Lazy load de Resend usando require() para evitar build-time bundling
type ResendType = any;

export class ResendProvider implements EmailProvider {
  private client: ResendType;
  private defaultFrom: string;
  private initialized: boolean = false;

  constructor() {
    this.defaultFrom = process.env.EMAIL_FROM || 'noreply@redpresu.com';
  }

  private initialize() {
    if (this.initialized) return;

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('RESEND_API_KEY is not set');
    }

    const { Resend } = require('resend');
    this.client = new Resend(apiKey);
    this.initialized = true;
  }

  async send(params: EmailParams): Promise<EmailResult> {
    this.initialize();

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
