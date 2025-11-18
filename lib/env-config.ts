/**
 * Configuración de entornos para Vercel
 *
 * Vercel proporciona automáticamente estas variables:
 * - VERCEL_ENV: 'production' | 'preview' | 'development'
 * - NEXT_PUBLIC_VERCEL_ENV: igual pero accesible en cliente
 *
 * Estrategia:
 * - Development: Siempre modo TEST
 * - Preview: Siempre modo TEST
 * - Production: Modo TEST por defecto, cambiar a LIVE cuando estés listo
 */

export type Environment = 'development' | 'preview' | 'production'
export type Mode = 'test' | 'live'

/**
 * Detecta el entorno actual de Vercel
 */
export function getEnvironment(): Environment {
  // En Vercel
  if (process.env.VERCEL_ENV) {
    return process.env.VERCEL_ENV as Environment
  }

  // En local
  if (process.env.NODE_ENV === 'development') {
    return 'development'
  }

  return 'production'
}

/**
 * Determina si debemos usar modo LIVE o TEST
 *
 * Por defecto:
 * - development → test
 * - preview → test
 * - production → depende de ENABLE_LIVE_MODE
 */
export function getMode(): Mode {
  const env = getEnvironment()

  // Development y Preview siempre en TEST
  if (env === 'development' || env === 'preview') {
    return 'test'
  }

  // Production: controlado por variable de entorno
  // Solo se activa LIVE cuando explícitamente lo habilites
  if (env === 'production') {
    return process.env.ENABLE_LIVE_MODE === 'true' ? 'live' : 'test'
  }

  return 'test'
}

/**
 * Indica si estamos en modo LIVE
 */
export function isLiveMode(): boolean {
  return getMode() === 'live'
}

/**
 * Indica si estamos en modo TEST
 */
export function isTestMode(): boolean {
  return getMode() === 'test'
}

/**
 * Configuración para Stripe según el entorno
 */
export function getStripeConfig() {
  const mode = getMode()

  if (mode === 'live') {
    return {
      publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_LIVE!,
      secretKey: process.env.STRIPE_SECRET_KEY_LIVE!,
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET_LIVE!,
      mode: 'live' as const,
    }
  }

  return {
    publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_TEST!,
    secretKey: process.env.STRIPE_SECRET_KEY_TEST!,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET_TEST!,
    mode: 'test' as const,
  }
}

/**
 * Log del entorno actual (útil para debugging)
 */
export function logEnvironment() {
  const env = getEnvironment()
  const mode = getMode()

  console.log('🌍 Environment:', {
    environment: env,
    mode: mode,
    isLive: isLiveMode(),
    isTest: isTestMode(),
    vercelEnv: process.env.VERCEL_ENV,
    nodeEnv: process.env.NODE_ENV,
  })
}
