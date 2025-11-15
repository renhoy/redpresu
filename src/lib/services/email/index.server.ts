// ============================================================
// EmailService Agnóstico - Redpresu
// Abstracción para cambiar de proveedor sin modificar código
// ============================================================

import Handlebars from 'handlebars';
import { logger } from '@/lib/logger';
import { readFileSync } from 'fs';
import { join } from 'path';

// Interfaz agnóstica
export interface EmailProvider {
  send(params: EmailParams): Promise<EmailResult>;
}

export interface EmailParams {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// Factory para cambiar de proveedor fácilmente
export class EmailService {
  private provider: EmailProvider;
  private templatesCache: Map<string, Handlebars.TemplateDelegate> = new Map();

  constructor(provider: EmailProvider) {
    this.provider = provider;
  }

  /**
   * Envía email usando template
   */
  async sendTemplate(
    templateId: string,
    to: string | string[],
    data: Record<string, any>
  ): Promise<EmailResult> {
    try {
      const template = this.getTemplate(templateId);
      const html = template(data);

      // Generar texto plano simple desde HTML
      const text = html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

      const result = await this.provider.send({
        to,
        subject: this.getSubject(templateId, data),
        html,
        text
      });

      logger.info({ templateId, to, success: result.success }, 'Email sent');
      return result;

    } catch (error) {
      logger.error({ error, templateId, to }, 'Error sending email');
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Obtiene y cachea templates
   */
  private getTemplate(templateId: string): Handlebars.TemplateDelegate {
    if (this.templatesCache.has(templateId)) {
      return this.templatesCache.get(templateId)!;
    }

    const templatePath = join(
      process.cwd(),
      'src/lib/services/email/templates',
      `${templateId}.hbs`
    );

    const templateSource = readFileSync(templatePath, 'utf-8');
    const template = Handlebars.compile(templateSource);

    this.templatesCache.set(templateId, template);
    return template;
  }

  /**
   * Genera subject según template
   */
  private getSubject(templateId: string, data: Record<string, any>): string {
    const subjects: Record<string, string> = {
      trial_expired: '⏰ Tu período de prueba ha expirado - Redpresu',
      payment_overdue_30d: '⚠️ Pago pendiente - Acción requerida',
      downgrade_notice: '📉 Tu plan ha cambiado',
      user_limit_reached: '🚫 Límite de usuarios alcanzado'
    };

    return subjects[templateId] || 'Notificación de tu cuenta Redpresu';
  }

  /**
   * Envío directo sin template (para casos simples)
   */
  async send(params: EmailParams): Promise<EmailResult> {
    return this.provider.send(params);
  }
}

// Singleton instance
let emailServiceInstance: EmailService | null = null;

export function getEmailService(): EmailService {
  if (!emailServiceInstance) {
    // Leer proveedor desde ENV (futuro: cambiar sin código)
    const provider = process.env.EMAIL_PROVIDER || 'resend';

    switch (provider) {
      case 'resend':
        const { ResendProvider } = require('./providers/resend.server');
        emailServiceInstance = new EmailService(new ResendProvider());
        break;
      default:
        throw new Error(`Unknown email provider: ${provider}`);
    }
  }

  return emailServiceInstance;
}
