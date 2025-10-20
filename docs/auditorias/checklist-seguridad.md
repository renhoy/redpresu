# Checklist de Seguridad - jeyca-presu
**Fecha Creación:** 2025-01-20
**Versión:** 1.0

---

## 📋 Uso de Este Checklist

Este documento sirve para:

1. ✅ **Validar fixes** de vulnerabilidades detectadas
2. ✅ **Prevenir regresiones** en futuras features
3. ✅ **Onboarding** de nuevos desarrolladores
4. ✅ **Code reviews** sistemáticos

**Frecuencia de Uso:**
- **Antes de cada commit:** Revisar sección relevante
- **Antes de cada PR:** Checklist completo
- **Antes de cada deploy:** Validación exhaustiva

---

## 🔴 CRÍTICO: Pre-Deploy Checklist

Verificar **SIEMPRE** antes de desplegar a producción:

- [ ] npm audit: 0 vulnerabilities
- [ ] No hay console.log con datos sensibles
- [ ] Variables de entorno configuradas (.env.production)
- [ ] SUPABASE_SERVICE_ROLE_KEY solo en server-side
- [ ] PDFs en storage privado (no /public/pdfs/)
- [ ] Rate limiting habilitado en webhooks
- [ ] Security headers configurados
- [ ] RLS policies activas en todas las tablas
- [ ] Logs configurados en modo producción (LOG_LEVEL=warn)
- [ ] Testing de seguridad realizado

---

## 🔐 Autenticación y Autorización

### Middleware
- [ ] Rutas protegidas cubiertas por `middleware.ts`
- [ ] Rutas públicas correctamente definidas
- [ ] Redirecciones a /login funcionan correctamente
- [ ] Usuario autenticado no puede acceder a /login, /register
- [ ] Verificación de roles implementada (superadmin, admin, vendedor)

### Server Actions
- [ ] TODAS las Server Actions validan autenticación (`getServerUser()`)
- [ ] Validación de roles en acciones sensibles
- [ ] Validación de company_id para aislamiento multi-tenant
- [ ] Errors sin stack traces en producción
- [ ] Validación de ownership (user_id, company_id)

### RLS (Row Level Security)
- [ ] RLS habilitado en TODAS las tablas (`ENABLE ROW LEVEL SECURITY`)
- [ ] Políticas SELECT implementadas
- [ ] Políticas INSERT implementadas
- [ ] Políticas UPDATE implementadas
- [ ] Políticas DELETE implementadas
- [ ] Funciones SECURITY DEFINER para helpers (get_user_role, etc.)
- [ ] Policies testean auth.uid() correctamente

---

## 🛡️ Inyección y Validación

### SQL Injection
- [ ] Usar Supabase client (nunca raw SQL desde usuario)
- [ ] Queries parametrizadas (automático con Supabase)
- [ ] Validación de tipos en Server Actions
- [ ] Zod schemas para validación de inputs

### XSS (Cross-Site Scripting)
- [ ] `dangerouslySetInnerHTML` solo con contenido sanitizado (DOMPurify)
- [ ] Rich text editor (Tiptap) con configuración segura
- [ ] Content Security Policy (CSP) configurada
- [ ] User inputs escapados en templates
- [ ] No eval() ni Function() con input de usuario

### Command Injection
- [ ] No ejecutar comandos shell con input de usuario
- [ ] Validación exhaustiva en import CSV/JSON
- [ ] Sanitización de nombres de archivos

### CSRF (Cross-Site Request Forgery)
- [ ] Next.js Server Actions con CSRF protection habilitada
- [ ] Webhooks externos verifican signature (Stripe)
- [ ] Validación de origin en requests críticos

---

## 🔒 Datos Sensibles

### Almacenamiento
- [ ] Contraseñas hasheadas (Supabase Auth automático)
- [ ] Service role key NUNCA en código cliente
- [ ] API keys en variables de entorno (.env.local)
- [ ] PDFs en storage privado (no /public/)
- [ ] Datos sensibles no en localStorage (solo cookies HttpOnly)

### Logging
- [ ] Logs sin emails, passwords, NIFs
- [ ] Logger estructurado (pino) con redacción
- [ ] LOG_LEVEL=warn en producción
- [ ] console.log eliminados o condicionales (NODE_ENV)
- [ ] Error messages genéricos al usuario

### Transmisión
- [ ] HTTPS en producción (automático en Vercel)
- [ ] Cookies con flags Secure, HttpOnly, SameSite
- [ ] URLs firmadas con expiración (Supabase Storage)
- [ ] No enviar datos sensibles en query params

---

## 🌐 APIs y Endpoints

### Server Actions
- [ ] Autenticación verificada
- [ ] Autorización verificada (rol, company_id)
- [ ] Inputs validados con Zod
- [ ] Rate limiting (si aplica)
- [ ] Timeouts configurados (5s)
- [ ] Error handling robusto

### Webhooks
- [ ] Signature verification (Stripe)
- [ ] Rate limiting implementado
- [ ] Validación de metadata
- [ ] Idempotency para prevenir duplicados
- [ ] IP whitelist (opcional)

### REST/GraphQL
- [ ] Authentication en headers
- [ ] CORS configurado restrictivamente
- [ ] Pagination para prevenir DoS
- [ ] Input validation exhaustiva

---

## 📁 Archivos y Uploads

### Validación
- [ ] File type validation (MIME type)
- [ ] File size limits (< 5MB)
- [ ] Filename sanitization
- [ ] Virus scanning (si aplica)
- [ ] Extension whitelist (.json, .csv, .pdf)

### Storage
- [ ] Archivos públicos SOLO assets estáticos (imágenes)
- [ ] Archivos privados en Supabase Storage con RLS
- [ ] URLs firmadas con expiración
- [ ] Cleanup de archivos temporales

---

## 🧪 Testing de Seguridad

### Manual Testing
- [ ] Intentar acceder a recursos de otra empresa (IDOR)
- [ ] Intentar XSS en todos los inputs
- [ ] Intentar SQL injection (aunque Supabase protege)
- [ ] Intentar acceder sin autenticación
- [ ] Intentar escalar privilegios (vendedor → admin)
- [ ] Intentar DoS con requests masivos

### Automated Testing
- [ ] npm audit ejecutado
- [ ] ESLint security rules habilitado
- [ ] Unit tests para validaciones
- [ ] Integration tests para flujos críticos

### Herramientas
- [ ] OWASP ZAP scan
- [ ] Burp Suite (opcional)
- [ ] Snyk para dependencias
- [ ] securityheaders.com validation

---

## 🚀 Configuración de Producción

### Next.js
- [ ] `NODE_ENV=production`
- [ ] Security headers configurados
- [ ] Source maps deshabilitados (o privados)
- [ ] Error pages genéricas (sin stack traces)

### Supabase
- [ ] Service role key en variables de entorno
- [ ] RLS habilitado en todas las tablas
- [ ] Backup automático configurado
- [ ] Email templates configurados
- [ ] Auth settings revisados (password policy)

### Vercel
- [ ] Environment variables configuradas
- [ ] HTTPS forzado
- [ ] Preview deployments con protección
- [ ] Analytics habilitado
- [ ] Monitoring habilitado

---

## 📊 Monitoreo y Alertas

### Logs
- [ ] Logger estructurado configurado
- [ ] Logs centralizados (Vercel, Datadog, etc.)
- [ ] Alertas para errores 500
- [ ] Alertas para intentos de acceso no autorizado

### Métricas
- [ ] Performance monitoring (Vercel Analytics)
- [ ] Error tracking (Sentry)
- [ ] Uptime monitoring
- [ ] Database performance

---

## 🔄 Mantenimiento Continuo

### Mensual
- [ ] npm audit
- [ ] Review de nuevas dependencias
- [ ] Check de CVEs en dependencias actuales
- [ ] Review de logs de seguridad

### Trimestral
- [ ] Auditoría de código manual
- [ ] Review de RLS policies
- [ ] Testing de penetración manual
- [ ] Actualización de documentación

### Anual
- [ ] Auditoría externa
- [ ] Penetration testing profesional
- [ ] Review de compliance (RGPD)
- [ ] Update de security headers

---

## 📝 Code Review Checklist

Usar en CADA Pull Request:

### General
- [ ] No secrets hardcodeados
- [ ] No console.log con datos sensibles
- [ ] Error handling robusto
- [ ] Validación de inputs
- [ ] Testing incluido

### Server Actions
- [ ] Validación de autenticación
- [ ] Validación de autorización
- [ ] Validación con Zod
- [ ] Error messages genéricos
- [ ] Logging apropiado

### Componentes
- [ ] No dangerouslySetInnerHTML sin sanitizar
- [ ] Validación de props
- [ ] Error boundaries
- [ ] Loading states
- [ ] Accessibility (ARIA)

### Database
- [ ] Migraciones con rollback
- [ ] RLS policies actualizadas
- [ ] Índices apropiados
- [ ] Backup considerado

---

## 🎯 Validación de Fixes

Usar para validar correcciones de vulnerabilidades:

### VULN-001: SUPABASE_SERVICE_ROLE_KEY
- [ ] `server-only` instalado
- [ ] Import en primera línea de server.ts
- [ ] Runtime check implementado
- [ ] Build falla si se importa en cliente
- [ ] Tests pasan

### VULN-002: XSS en MarkdownReader
- [ ] DOMPurify instalado
- [ ] Sanitización antes de renderizar
- [ ] Whitelist de tags configurada
- [ ] Testing con scripts maliciosos
- [ ] CSP configurado

### VULN-003: Rate Limiting Webhook
- [ ] Upstash Redis configurado (o alternativa)
- [ ] Rate limiter implementado
- [ ] Testing: 15 requests → 11º retorna 429
- [ ] Logs de rate limit
- [ ] IP whitelist (opcional)

### VULN-004: PDFs Privados
- [ ] Bucket privado creado
- [ ] RLS policies en storage
- [ ] Upload a Supabase Storage
- [ ] URLs firmadas con expiración
- [ ] PDFs antiguos migrados
- [ ] /public/pdfs/ vacío

### VULN-005: Logs Sensibles
- [ ] Logger estructurado (pino)
- [ ] Redacción de campos sensibles
- [ ] LOG_LEVEL=warn en producción
- [ ] < 10 console.log en Server Actions
- [ ] Testing en modo producción

---

## 🔍 Security Audit Checklist

Ejecutar antes de cada release:

### Automated
```bash
# Dependencias
npm audit

# ESLint security
npm run lint

# Type checking
npx tsc --noEmit

# Testing
npm test
```

### Manual
```bash
# Buscar secrets
grep -r "password\s*=\s*['\"]" src/
grep -r "api.*key\s*=\s*['\"]" src/

# Buscar console.log sensibles
grep -r "console.*email" src/app/actions
grep -r "console.*password" src/

# Buscar dangerouslySetInnerHTML
grep -r "dangerouslySetInnerHTML" src/

# Verificar RLS
psql -d postgres -c "SELECT tablename FROM pg_tables WHERE schemaname='public' AND rowsecurity=false;"
# Resultado debe estar vacío
```

### External Tools
```bash
# OWASP ZAP
zap-cli quick-scan --self-contained http://localhost:3000

# Security headers
curl -I https://your-domain.com | grep -i "security\|frame\|xss\|content-security"
```

---

## ✅ Checklist de Nueva Feature

Antes de crear PR para nueva funcionalidad:

### Planning
- [ ] Feature no introduce nuevas vulnerabilidades
- [ ] Datos sensibles identificados
- [ ] Nivel de acceso definido (público/autenticado/admin/superadmin)
- [ ] RLS policies consideradas

### Implementación
- [ ] Server Actions con validación completa
- [ ] RLS policies actualizadas
- [ ] Tests de seguridad incluidos
- [ ] Error handling robusto
- [ ] Logging apropiado (sin datos sensibles)

### Testing
- [ ] Testing manual de seguridad
- [ ] Testing con diferentes roles
- [ ] Testing de IDOR (acceso entre empresas)
- [ ] Testing de XSS en inputs
- [ ] Testing de autorización

### Documentación
- [ ] README actualizado
- [ ] Comentarios en código complejo
- [ ] Migraciones documentadas
- [ ] Security considerations documentadas

---

## 📚 Referencias

### Estándares
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP ASVS](https://owasp.org/www-project-application-security-verification-standard/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)

### Herramientas
- [npm audit](https://docs.npmjs.com/cli/v9/commands/npm-audit)
- [Snyk](https://snyk.io/)
- [OWASP ZAP](https://www.zaproxy.org/)
- [SecurityHeaders](https://securityheaders.com/)

### Específico Next.js
- [Next.js Security](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables#security)
- [Supabase Security Best Practices](https://supabase.com/docs/guides/auth/row-level-security)

---

**Checklist Creado:** 2025-01-20
**Última Actualización:** 2025-01-20
**Revisión Periódica:** Trimestral
**Owner:** [Tech Lead / Security Team]
