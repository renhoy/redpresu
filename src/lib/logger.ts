/**
 * Logger estructurado con pino
 * SECURITY: Redacta campos sensibles automáticamente
 */

import pino from 'pino';

// Campos sensibles a redactar
const SENSITIVE_FIELDS = [
  'password',
  'token',
  'api_key',
  'apiKey',
  'api_secret',
  'apiSecret',
  'secret',
  'auth',
  'authorization',
  'cookie',
  'session',
  // Específicos de la app
  'email',
  'nif',
  'nie',
  'nif_nie',
  'client_nif_nie',
  'client_email',
  'phone',
  'client_phone',
  'address',
  'client_address',
  'postal_code',
  'client_postal_code',
  // Stripe
  'stripe_customer_id',
  'stripe_subscription_id',
  'stripe_secret_key',
  'stripe_webhook_secret',
  // Supabase
  'service_role_key',
  'supabase_service_role_key',
];

// Redactar valores sensibles recursivamente
function redact(obj: any): any {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(redact);
  }

  const redacted: any = {};

  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();

    // Verificar si la key es sensible
    const isSensitive = SENSITIVE_FIELDS.some(field =>
      lowerKey.includes(field.toLowerCase())
    );

    if (isSensitive) {
      redacted[key] = '[REDACTED]';
    } else if (value && typeof value === 'object') {
      redacted[key] = redact(value);
    } else {
      redacted[key] = value;
    }
  }

  return redacted;
}

// Configuración del logger
const isDevelopment = process.env.NODE_ENV === 'development';
const logLevel = process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'warn');

// Logger con redacción automática
// NOTA: No usar pino-pretty en Next.js serverless (causa crashes)
export const logger = pino({
  level: logLevel,

  // Redactar campos sensibles
  serializers: {
    // Redactar el objeto completo en logs
    req: (req: any) => redact(req),
    res: (res: any) => redact(res),
    err: (err: any) => redact(err),
  },

  // Base para todos los logs
  base: {
    env: process.env.NODE_ENV,
  },

  // Formateo simple en desarrollo (sin pino-pretty)
  ...(isDevelopment && {
    formatters: {
      level: (label: string) => {
        return { level: label };
      },
    },
  }),
});

/**
 * Helper para redactar objetos manualmente antes de loggear
 */
export function redactSensitive(obj: any): any {
  return redact(obj);
}

/**
 * Shortcuts para logging común
 */
export const log = {
  /**
   * Debug - Solo en desarrollo
   */
  debug: (message: string, data?: any) => {
    if (isDevelopment) {
      logger.debug(data ? redact(data) : {}, message);
    }
  },

  /**
   * Info - Eventos normales
   */
  info: (message: string, data?: any) => {
    logger.info(data ? redact(data) : {}, message);
  },

  /**
   * Warn - Advertencias (default en producción)
   */
  warn: (message: string, data?: any) => {
    logger.warn(data ? redact(data) : {}, message);
  },

  /**
   * Error - Errores críticos
   */
  error: (message: string, error?: any, data?: any) => {
    logger.error(
      {
        ...redact(data || {}),
        error: error instanceof Error
          ? {
              message: error.message,
              stack: isDevelopment ? error.stack : undefined,
            }
          : redact(error),
      },
      message
    );
  },

  /**
   * Fatal - Errores críticos que requieren atención inmediata
   */
  fatal: (message: string, error?: any, data?: any) => {
    logger.fatal(
      {
        ...redact(data || {}),
        error: error instanceof Error
          ? {
              message: error.message,
              stack: error.stack,
            }
          : redact(error),
      },
      message
    );
  },
};

// Export default para uso directo
export default logger;
