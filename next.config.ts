import type { NextConfig } from "next";

/**
 * CONFIGURACIÓN DE NEXT.JS PARA DESARROLLO
 *
 * Esta configuración incluye CSP adaptada para desarrollo local con Supabase local
 */
const nextConfig: NextConfig = {
  /**
   * EXTERNAL PACKAGES
   * Paquetes que deben ejecutarse solo en el servidor
   */
  serverExternalPackages: ['handlebars', 'json-logic-js'],

  /**
   * SECURITY HEADERS
   * Configuración CSP adaptada para desarrollo con Supabase local
   */
  async headers() {
    // Determinar si estamos en desarrollo para permitir localhost
    const isDevelopment = process.env.NODE_ENV === 'development';

    // En desarrollo, permitir localhost:8002 (Supabase local)
    const connectSrc = isDevelopment
      ? "'self' http://localhost:8002 https://*.supabase.co https://api.stripe.com"
      : "'self' https://*.supabase.co https://api.stripe.com";

    return [
      {
        // Aplicar headers a todas las rutas
        source: "/:path*",
        headers: [
          // Content Security Policy (CSP)
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https:",
              "font-src 'self' data:",
              `connect-src ${connectSrc}`,
              "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              // Comentar upgrade-insecure-requests en desarrollo local
              ...(isDevelopment ? [] : ["upgrade-insecure-requests"]),
            ].join("; "),
          },

          // X-Frame-Options
          {
            key: "X-Frame-Options",
            value: "DENY",
          },

          // X-Content-Type-Options
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },

          // Referrer-Policy
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },

          // Permissions-Policy
          {
            key: "Permissions-Policy",
            value: [
              "camera=()",
              "microphone=()",
              "geolocation=()",
              "payment=(self)",
              "usb=()",
              "magnetometer=()",
              "gyroscope=()",
              "accelerometer=()",
            ].join(", "),
          },

          // Strict-Transport-Security (HSTS) - Solo en producción
          ...(isDevelopment ? [] : [{
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          }]),

          // X-DNS-Prefetch-Control
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },

          // X-XSS-Protection (Legacy)
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
