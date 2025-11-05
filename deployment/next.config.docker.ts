import type { NextConfig } from "next";

/**
 * CONFIGURACIÓN DE NEXT.JS PARA DOCKER
 *
 * Este archivo es una versión de next.config.ts adaptada para deployment en Docker.
 * Añade la opción 'output: standalone' necesaria para crear un bundle standalone.
 *
 * IMPORTANTE:
 * - Para usar esta configuración en Docker, REEMPLAZAR next.config.ts con este archivo
 * - O añadir la línea 'output: "standalone"' a tu next.config.ts actual
 *
 * Comando para usar durante build Docker:
 *   cp deployment/next.config.docker.ts next.config.ts
 *
 * Documentación: https://nextjs.org/docs/app/api-reference/next-config-js/output
 */
const nextConfig: NextConfig = {
  /**
   * OUTPUT STANDALONE
   *
   * Genera un bundle standalone que incluye solo las dependencias necesarias.
   * Reduce el tamaño de la imagen Docker y mejora el rendimiento.
   *
   * IMPORTANTE: Esta configuración:
   * - Copia solo las dependencias de producción necesarias
   * - Genera un server.js independiente
   * - Crea estructura en .next/standalone/
   */
  output: "standalone",

  /**
   * SECURITY HEADERS
   * (Mismos headers que next.config.ts original)
   */
  async headers() {
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
              "connect-src 'self' https://*.supabase.co https://api.stripe.com",
              "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "upgrade-insecure-requests",
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

          // Strict-Transport-Security (HSTS)
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },

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
