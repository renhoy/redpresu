import type { NextConfig } from "next";

/**
 * SECURITY (VULN-017): Security headers para protección contra vulnerabilidades comunes
 *
 * Referencias:
 * - OWASP Secure Headers: https://owasp.org/www-project-secure-headers/
 * - Next.js Security Headers: https://nextjs.org/docs/app/api-reference/next-config-js/headers
 * - Mozilla Observatory: https://observatory.mozilla.org/
 */
const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Aplicar headers a todas las rutas
        source: "/:path*",
        headers: [
          // ============================================
          // CONTENT SECURITY POLICY (CSP)
          // ============================================
          /**
           * Previene XSS, clickjacking, code injection
           *
           * Configuración:
           * - default-src 'self': Solo recursos del mismo origen
           * - script-src: Scripts del mismo origen + 'unsafe-inline' (necesario para Next.js)
           * - style-src: Estilos del mismo origen + 'unsafe-inline' (necesario para Tailwind)
           * - img-src: Imágenes del mismo origen + data URIs + blob
           * - font-src: Fuentes del mismo origen + data URIs
           * - connect-src: APIs del mismo origen + Supabase + Stripe
           * - frame-ancestors: Previene iframe embedding (clickjacking)
           * - base-uri: Previene ataques de base tag injection
           * - form-action: Solo permite envío de forms al mismo origen
           */
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com", // unsafe-eval para Next.js dev, Stripe SDK
              "style-src 'self' 'unsafe-inline'", // unsafe-inline para Tailwind CSS
              "img-src 'self' data: blob: https:", // data URIs para logos, blob para previews
              "font-src 'self' data:",
              "connect-src 'self' https://*.supabase.co https://api.stripe.com", // Supabase + Stripe API
              "frame-src 'self' https://js.stripe.com https://hooks.stripe.com", // Stripe checkout
              "frame-ancestors 'none'", // Previene iframe embedding
              "base-uri 'self'",
              "form-action 'self'",
              "upgrade-insecure-requests" // Forzar HTTPS en producción
            ].join("; ")
          },

          // ============================================
          // X-FRAME-OPTIONS
          // ============================================
          /**
           * Previene clickjacking (backup de CSP frame-ancestors)
           * DENY: No permitir iframe embedding
           */
          {
            key: "X-Frame-Options",
            value: "DENY"
          },

          // ============================================
          // X-CONTENT-TYPE-OPTIONS
          // ============================================
          /**
           * Previene MIME sniffing
           * nosniff: Fuerza al navegador a respetar el Content-Type
           */
          {
            key: "X-Content-Type-Options",
            value: "nosniff"
          },

          // ============================================
          // REFERRER-POLICY
          // ============================================
          /**
           * Controla información enviada en Referer header
           * strict-origin-when-cross-origin: Solo enviar origin en HTTPS cross-origin
           */
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin"
          },

          // ============================================
          // PERMISSIONS-POLICY
          // ============================================
          /**
           * Controla features del navegador (antes Feature-Policy)
           * Deshabilita features no usadas para reducir superficie de ataque
           */
          {
            key: "Permissions-Policy",
            value: [
              "camera=()",
              "microphone=()",
              "geolocation=()",
              "payment=(self)", // Permitir Stripe payments
              "usb=()",
              "magnetometer=()",
              "gyroscope=()",
              "accelerometer=()"
            ].join(", ")
          },

          // ============================================
          // STRICT-TRANSPORT-SECURITY (HSTS)
          // ============================================
          /**
           * Fuerza HTTPS en navegadores
           * max-age=31536000: 1 año
           * includeSubDomains: Aplicar a subdominios
           * preload: Incluir en HSTS preload list
           *
           * NOTA: Solo aplicar en producción con HTTPS configurado
           */
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload"
          },

          // ============================================
          // X-DNS-PREFETCH-CONTROL
          // ============================================
          /**
           * Controla DNS prefetching
           * on: Permitir para mejor performance
           */
          {
            key: "X-DNS-Prefetch-Control",
            value: "on"
          },

          // ============================================
          // X-XSS-PROTECTION (Legacy)
          // ============================================
          /**
           * Protección XSS legacy (browsers antiguos)
           * CSP es mejor, pero mantenemos para compatibilidad
           * 1; mode=block: Activar y bloquear página si detecta XSS
           */
          {
            key: "X-XSS-Protection",
            value: "1; mode=block"
          }
        ]
      }
    ];
  }
};

export default nextConfig;
