# 🔒 Security Headers - Documentación Técnica

**Fecha:** 2025-01-20
**Vulnerabilidad:** VULN-017 - Añadir security headers
**Prioridad:** 🟡 MEDIA
**Tiempo estimado:** 2h
**Estado:** ✅ COMPLETADA

---

## 📋 Resumen

Se han implementado **9 security headers** en Next.js para proteger la aplicación contra vulnerabilidades comunes como XSS, clickjacking, MIME sniffing, y otros ataques web.

**Archivo modificado:**
- `next.config.ts` - Configuración de headers en todas las rutas

**Headers implementados:**
1. Content-Security-Policy (CSP)
2. X-Frame-Options
3. X-Content-Type-Options
4. Referrer-Policy
5. Permissions-Policy
6. Strict-Transport-Security (HSTS)
7. X-DNS-Prefetch-Control
8. X-XSS-Protection (legacy)

---

## 🛡️ Headers Implementados

### 1. Content-Security-Policy (CSP)

**Propósito:** Previene XSS, clickjacking, code injection

**Valor configurado:**
```
default-src 'self';
script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com;
style-src 'self' 'unsafe-inline';
img-src 'self' data: blob: https:;
font-src 'self' data:;
connect-src 'self' https://*.supabase.co https://api.stripe.com;
frame-src 'self' https://js.stripe.com https://hooks.stripe.com;
frame-ancestors 'none';
base-uri 'self';
form-action 'self';
upgrade-insecure-requests
```

**Directivas explicadas:**

| Directiva | Valor | Razón |
|-----------|-------|-------|
| `default-src` | `'self'` | Solo recursos del mismo origen por defecto |
| `script-src` | `'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com` | Next.js requiere `unsafe-inline` y `unsafe-eval` en dev. Stripe SDK permitido |
| `style-src` | `'self' 'unsafe-inline'` | Tailwind CSS requiere `unsafe-inline` |
| `img-src` | `'self' data: blob: https:` | Logos (data URIs), previews (blob), imágenes externas |
| `font-src` | `'self' data:` | Fuentes locales y data URIs |
| `connect-src` | `'self' https://*.supabase.co https://api.stripe.com` | APIs permitidas: Supabase + Stripe |
| `frame-src` | `'self' https://js.stripe.com https://hooks.stripe.com` | Stripe checkout embebido |
| `frame-ancestors` | `'none'` | Previene iframe embedding (clickjacking) |
| `base-uri` | `'self'` | Previene base tag injection |
| `form-action` | `'self'` | Solo permite envío de forms al mismo origen |
| `upgrade-insecure-requests` | - | Fuerza HTTPS en producción |

**⚠️ Limitaciones conocidas:**
- `unsafe-inline` y `unsafe-eval` debilitan CSP, pero son necesarios para Next.js
- En producción, considerar usar nonces o hashes para scripts/estilos

**📚 Referencias:**
- [MDN CSP](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [OWASP CSP Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html)

---

### 2. X-Frame-Options

**Propósito:** Previene clickjacking (backup de CSP `frame-ancestors`)

**Valor configurado:**
```
DENY
```

**Opciones disponibles:**
- `DENY`: No permitir iframe embedding (recomendado)
- `SAMEORIGIN`: Permitir solo en mismo origen
- `ALLOW-FROM uri`: Permitir desde URI específica (deprecated)

**Protección:**
- Previene que atacantes embeben la app en iframe malicioso
- Evita ataques de clickjacking donde usuario hace clic en elemento oculto

**📚 Referencias:**
- [MDN X-Frame-Options](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Frame-Options)
- [OWASP Clickjacking](https://owasp.org/www-community/attacks/Clickjacking)

---

### 3. X-Content-Type-Options

**Propósito:** Previene MIME sniffing

**Valor configurado:**
```
nosniff
```

**Protección:**
- Fuerza al navegador a respetar el `Content-Type` declarado
- Previene que navegador "adivine" tipo de archivo (MIME sniffing)
- Bloquea ejecución de scripts disfrazados como otros tipos

**Ejemplo de ataque prevenido:**
```html
<!-- Atacante sube imagen.jpg que es realmente script -->
<script src="imagen.jpg"></script>
<!-- Sin nosniff: navegador ejecuta script -->
<!-- Con nosniff: navegador rechaza (Content-Type: image/jpeg) -->
```

**📚 Referencias:**
- [MDN X-Content-Type-Options](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Content-Type-Options)

---

### 4. Referrer-Policy

**Propósito:** Controla información enviada en `Referer` header

**Valor configurado:**
```
strict-origin-when-cross-origin
```

**Comportamiento:**

| Escenario | Referer enviado |
|-----------|-----------------|
| HTTPS → HTTPS (mismo origen) | URL completa |
| HTTPS → HTTPS (cross-origin) | Solo origin (`https://example.com`) |
| HTTPS → HTTP | Nada (no degradar HTTPS a HTTP) |

**Protección:**
- No expone URLs sensibles a sitios externos
- Previene leakage de tokens en query params
- Mantiene privacidad del usuario

**Opciones disponibles:**
- `no-referrer`: Nunca enviar referer
- `no-referrer-when-downgrade`: No enviar en HTTPS → HTTP
- `origin`: Solo enviar origin
- `strict-origin-when-cross-origin`: Recomendado (balance seguridad/funcionalidad)

**📚 Referencias:**
- [MDN Referrer-Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Referrer-Policy)

---

### 5. Permissions-Policy

**Propósito:** Controla features del navegador (antes `Feature-Policy`)

**Valor configurado:**
```
camera=(), microphone=(), geolocation=(), payment=(self), usb=(), magnetometer=(), gyroscope=(), accelerometer=()
```

**Features deshabilitadas:**
- ❌ `camera=()` - Acceso a cámara
- ❌ `microphone=()` - Acceso a micrófono
- ❌ `geolocation=()` - Geolocalización
- ❌ `usb=()` - Dispositivos USB
- ❌ `magnetometer=()` - Magnetómetro
- ❌ `gyroscope=()` - Giroscopio
- ❌ `accelerometer=()` - Acelerómetro

**Features permitidas:**
- ✅ `payment=(self)` - Stripe payments (solo mismo origen)

**Protección:**
- Reduce superficie de ataque deshabilitando features no usadas
- Previene que scripts maliciosos accedan a hardware
- Bloquea fingerprinting del dispositivo

**📚 Referencias:**
- [MDN Permissions-Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Permissions-Policy)
- [W3C Permissions Policy](https://www.w3.org/TR/permissions-policy-1/)

---

### 6. Strict-Transport-Security (HSTS)

**Propósito:** Fuerza HTTPS en navegadores

**Valor configurado:**
```
max-age=31536000; includeSubDomains; preload
```

**Directivas:**
- `max-age=31536000` - Duración: 1 año (365 días)
- `includeSubDomains` - Aplicar a todos los subdominios
- `preload` - Incluir en lista HSTS preload de navegadores

**Protección:**
- Fuerza HTTPS incluso si usuario escribe `http://`
- Previene ataques SSL stripping
- Previene downgrade attacks
- Bloquea certificados inválidos

**⚠️ IMPORTANTE:**
- **Solo aplicar en producción con HTTPS configurado**
- Una vez activado con `preload`, difícil de revertir
- Verificar antes de preload: https://hstspreload.org/

**📚 Referencias:**
- [MDN HSTS](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Strict-Transport-Security)
- [HSTS Preload List](https://hstspreload.org/)

---

### 7. X-DNS-Prefetch-Control

**Propósito:** Controla DNS prefetching

**Valor configurado:**
```
on
```

**Comportamiento:**
- Permite que navegador resuelva DNS de enlaces antes de click
- Mejora performance en navegación
- Trade-off: privacidad vs velocidad

**Opciones:**
- `on`: Permitir DNS prefetch (recomendado para apps SaaS)
- `off`: Deshabilitar (mejor privacidad)

**📚 Referencias:**
- [MDN X-DNS-Prefetch-Control](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-DNS-Prefetch-Control)

---

### 8. X-XSS-Protection (Legacy)

**Propósito:** Protección XSS legacy para navegadores antiguos

**Valor configurado:**
```
1; mode=block
```

**Directivas:**
- `1` - Activar protección XSS
- `mode=block` - Bloquear página completa si detecta XSS

**⚠️ NOTA:**
- Header **legacy** (deprecated en navegadores modernos)
- CSP es mejor protección
- Mantenido para compatibilidad con IE11 y navegadores antiguos

**📚 Referencias:**
- [MDN X-XSS-Protection](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-XSS-Protection)

---

## 🧪 Testing de Headers

### 1. Verificar headers localmente

```bash
# Iniciar servidor de desarrollo
npm run dev

# Verificar headers con curl
curl -I http://localhost:3000

# Verificar header específico
curl -I http://localhost:3000 | grep -i "Content-Security-Policy"
```

### 2. Verificar headers en producción

```bash
# Verificar en dominio desplegado
curl -I https://tu-dominio.com

# Ver todos los headers
curl -v https://tu-dominio.com 2>&1 | grep "^<"
```

### 3. Usar herramientas online

**Security Headers Scanner:**
- https://securityheaders.com/
- Introduce URL y obtiene rating A-F
- Recomendaciones de mejora

**Mozilla Observatory:**
- https://observatory.mozilla.org/
- Análisis completo de seguridad
- Score de 0 a 100

**Expected Results:**
- Security Headers: **A+** rating
- Mozilla Observatory: **90-100** score

---

## 🔍 Verificación en Chrome DevTools

### Paso 1: Abrir DevTools
1. Chrome → F12
2. Pestaña **Network**
3. Recargar página (Ctrl+R)

### Paso 2: Ver headers de response
1. Click en request principal (document)
2. Pestaña **Headers**
3. Sección **Response Headers**

### Paso 3: Verificar CSP violations (si hay)
1. Pestaña **Console**
2. Buscar mensajes `[CSP] Refused to...`
3. Ajustar CSP si hay false positives

**Ejemplo de CSP violation:**
```
[CSP] Refused to load the script 'https://evil.com/script.js'
because it violates the following Content Security Policy directive:
"script-src 'self' https://js.stripe.com"
```

---

## 📊 Compatibilidad de Headers

| Header | Chrome | Firefox | Safari | Edge | IE11 |
|--------|--------|---------|--------|------|------|
| CSP | ✅ 25+ | ✅ 23+ | ✅ 7+ | ✅ 12+ | ⚠️ 10+ (partial) |
| X-Frame-Options | ✅ 4+ | ✅ 3.6+ | ✅ 4+ | ✅ 8+ | ✅ 8+ |
| X-Content-Type-Options | ✅ 1+ | ✅ 50+ | ✅ 11+ | ✅ 12+ | ✅ 8+ |
| Referrer-Policy | ✅ 56+ | ✅ 50+ | ✅ 11.1+ | ✅ 79+ | ❌ |
| Permissions-Policy | ✅ 88+ | ✅ 74+ | ✅ 16+ | ✅ 88+ | ❌ |
| HSTS | ✅ 4+ | ✅ 4+ | ✅ 7+ | ✅ 12+ | ✅ 11+ |
| X-XSS-Protection | ✅ 4+ | ❌ | ✅ 4+ | ✅ 12+ | ✅ 8+ |

**Soporte:** ✅ Completo | ⚠️ Parcial | ❌ No soportado

---

## 🚨 Troubleshooting

### Problema: CSP bloquea recursos legítimos

**Síntomas:**
- Imágenes, scripts o estilos no cargan
- Console muestra `[CSP] Refused to load...`

**Solución:**
1. Identificar dominio bloqueado en console
2. Añadir dominio a directiva correspondiente en `next.config.ts`
3. Reiniciar servidor

**Ejemplo:**
```typescript
// Si bloquea imágenes de Cloudinary
"img-src 'self' data: blob: https: https://res.cloudinary.com",
```

---

### Problema: HSTS bloquea acceso local

**Síntomas:**
- Navegador rechaza certificado local
- Error: `NET::ERR_CERT_AUTHORITY_INVALID`

**Solución:**
1. Deshabilitar HSTS temporalmente en desarrollo
2. Usar dominio `.localhost` en lugar de `localhost`
3. O configurar certificado SSL local válido

```typescript
// Deshabilitar HSTS en desarrollo
{
  key: "Strict-Transport-Security",
  value: process.env.NODE_ENV === "production"
    ? "max-age=31536000; includeSubDomains; preload"
    : "max-age=0" // Deshabilitar en dev
}
```

---

### Problema: Stripe checkout no funciona

**Síntomas:**
- Iframe de Stripe bloqueado
- Error CSP en `frame-src`

**Solución:**
Verificar que `frame-src` incluye dominios Stripe:
```typescript
"frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
```

---

### Problema: Supabase API bloqueado

**Síntomas:**
- Requests a Supabase fallan
- Error CSP en `connect-src`

**Solución:**
Verificar wildcard para Supabase:
```typescript
"connect-src 'self' https://*.supabase.co https://api.stripe.com",
```

---

## 📈 Mejoras Futuras

### 1. CSP sin `unsafe-inline` (Nivel 2)

**Problema actual:** `unsafe-inline` debilita CSP

**Solución:** Usar nonces o hashes

```typescript
// Generar nonce por request
const nonce = crypto.randomBytes(16).toString('base64');

// En CSP
"script-src 'self' 'nonce-{NONCE}'",

// En script tag
<script nonce={nonce}>...</script>
```

**Beneficio:** Elimina vector de ataque XSS inline

---

### 2. Subresource Integrity (SRI)

**Objetivo:** Verificar integridad de recursos externos

```html
<script
  src="https://js.stripe.com/v3/"
  integrity="sha384-HASH_AQUI"
  crossorigin="anonymous"
></script>
```

**Beneficio:** Previene CDN compromise

---

### 3. Report-URI / report-to

**Objetivo:** Recibir reports de CSP violations

```typescript
"Content-Security-Policy": [
  // ... directivas ...
  "report-uri https://tu-dominio.com/api/csp-report",
  "report-to csp-endpoint"
].join("; ")
```

**Beneficio:** Monitorear ataques en producción

---

## 📚 Referencias y Recursos

### Guías oficiales:
- [OWASP Secure Headers Project](https://owasp.org/www-project-secure-headers/)
- [Next.js Security Headers](https://nextjs.org/docs/app/api-reference/next-config-js/headers)
- [MDN Web Security](https://developer.mozilla.org/en-US/docs/Web/Security)

### Herramientas de testing:
- [Security Headers Scanner](https://securityheaders.com/)
- [Mozilla Observatory](https://observatory.mozilla.org/)
- [CSP Evaluator](https://csp-evaluator.withgoogle.com/)

### Estándares:
- [W3C CSP Level 3](https://www.w3.org/TR/CSP3/)
- [RFC 7234 - HTTP Caching](https://tools.ietf.org/html/rfc7234)
- [RFC 6797 - HSTS](https://tools.ietf.org/html/rfc6797)

---

## ✅ Checklist de Implementación

- [x] Headers configurados en `next.config.ts`
- [x] CSP permite Supabase (`https://*.supabase.co`)
- [x] CSP permite Stripe (`https://js.stripe.com`)
- [x] X-Frame-Options configurado (`DENY`)
- [x] X-Content-Type-Options configurado (`nosniff`)
- [x] Referrer-Policy configurado (`strict-origin-when-cross-origin`)
- [x] Permissions-Policy configurado (deshabilitar features no usadas)
- [x] HSTS configurado (producción con HTTPS)
- [x] Headers verificados localmente
- [ ] Headers verificados en producción (pending deploy)
- [ ] Security Headers score A+ (pending deploy)
- [ ] Mozilla Observatory score 90+ (pending deploy)

---

## 📝 Notas de Deploy

### Pre-deploy:
1. Verificar que dominio tiene HTTPS configurado
2. Probar headers en staging antes de producción
3. Monitorear console por CSP violations

### Post-deploy:
1. Verificar headers con `curl -I https://dominio.com`
2. Testear con Security Headers scanner
3. Verificar funcionalidad: Stripe, Supabase, uploads
4. Monitorear errores CSP en primeras 24h

### Rollback (si es necesario):
```typescript
// Revertir a configuración vacía
const nextConfig: NextConfig = {
  /* config options here */
};
```

---

**Documento:** Security Headers - Implementación VULN-017
**Versión:** 1.0
**Fecha:** 2025-01-20
**Estado:** ✅ COMPLETADA
**Próxima revisión:** Post-deploy a producción
