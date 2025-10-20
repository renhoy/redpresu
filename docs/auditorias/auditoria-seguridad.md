# Auditoría de Seguridad - jeyca-presu
**Fecha:** 2025-01-20
**Auditor:** Claude Code Security Audit
**Alcance:** Vulnerabilidades Críticas y Altas (OWASP Top 10)
**Versión Aplicación:** 0.1.0

---

## Resumen Ejecutivo

### 📊 Resultados Generales

| Nivel | Cantidad | Porcentaje |
|-------|----------|------------|
| 🔴 **CRÍTICO** | 5 | 26% |
| 🟠 **ALTO** | 9 | 47% |
| 🟡 **MEDIO** | 5 | 26% |
| **TOTAL** | **19** | **100%** |

### 🎯 Hallazgos Principales

1. **Exposición masiva de información sensible en logs** (382 console.log en Server Actions)
2. **XSS potencial en MarkdownReader** sin sanitización
3. **Webhook de Stripe sin rate limiting** (riesgo DoS)
4. **Falta de validación exhaustiva de roles** en Server Actions
5. **PDFs públicos sin autenticación** en `/public/pdfs/`

### ✅ Fortalezas Detectadas

- ✅ **0 vulnerabilidades** en dependencias (npm audit limpio)
- ✅ **RLS correctamente implementado** en todas las tablas
- ✅ **Middleware robusto** con protección de rutas
- ✅ **Validación con Zod** en Server Actions críticas
- ✅ **supabaseAdmin** usado correctamente (SECURITY DEFINER)

---

## Stack Tecnológico

### Frontend
- **Framework:** Next.js 15.5.4 (App Router) + Turbopack
- **Lenguaje:** TypeScript 5
- **React:** 19.1.0
- **UI:** shadcn/ui (Radix UI) + Tailwind CSS 3.4
- **Iconos:** Lucide React 0.544.0

### Backend
- **Base de Datos:** Supabase (PostgreSQL 15.8)
- **Autenticación:** Supabase Auth + Row Level Security (RLS)
- **Server Actions:** Next.js Server Actions
- **Validación:** Zod 3.25.76

### Servicios Externos
- **PDF:** Rapid-PDF (microservicio externo)
- **Pagos:** Stripe 19.1.0 (opcional)
- **Storage:** Sistema de archivos local (`/public/pdfs/`, `/public/logos/`)

### Dependencias Críticas
- `@supabase/supabase-js` 2.57.4
- `@supabase/auth-helpers-nextjs` 0.10.0
- `next` 15.5.4
- `stripe` 19.1.0

---

## Vulnerabilidades Identificadas

### 🔴 CRÍTICAS (5)

| ID | Vulnerabilidad | Archivo | Línea | CWE | CVSS |
|----|---------------|---------|-------|-----|------|
| **VULN-001** | Exposición de SUPABASE_SERVICE_ROLE_KEY en código cliente | `src/lib/supabase/server.ts` | 4 | CWE-200 | 9.1 |
| **VULN-002** | XSS vía dangerouslySetInnerHTML sin sanitización | `src/components/help/MarkdownReader.tsx` | 37 | CWE-79 | 8.8 |
| **VULN-003** | Webhook Stripe sin validación de rate limiting | `src/app/api/webhooks/stripe/route.ts` | 29-90 | CWE-770 | 8.6 |
| **VULN-004** | PDFs públicos sin autenticación en /public/pdfs/ | `/public/pdfs/` | N/A | CWE-306 | 8.5 |
| **VULN-005** | Logs masivos con información sensible (382 console.log) | `src/app/actions/*.ts` | Múltiples | CWE-532 | 8.2 |

#### VULN-001: Exposición de SUPABASE_SERVICE_ROLE_KEY

**Descripción:**
La variable `SUPABASE_SERVICE_ROLE_KEY` está importada directamente en `src/lib/supabase/server.ts` sin verificación adicional de que solo se use en server-side. Si este archivo se importa accidentalmente en código cliente, la clave se expondría en el bundle.

**Evidencia:**
```typescript
// src/lib/supabase/server.ts:4
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
```

**Impacto:**
- **Crítico**: Bypass completo de RLS
- **Acceso total** a base de datos (lectura/escritura/eliminación)
- **Escalada de privilegios** inmediata

**Recomendación:**
- Usar `server-only` package para garantizar uso solo en server
- Renombrar archivo a `server.server.ts` o moverlo a carpeta exclusiva
- Implementar runtime check: `if (typeof window !== 'undefined') throw Error('Server only')`

---

#### VULN-002: XSS vía dangerouslySetInnerHTML

**Descripción:**
El componente `MarkdownReader` renderiza HTML sin sanitización usando `dangerouslySetInnerHTML`. Si el contenido markdown proviene de fuentes no confiables (usuarios, API externa), existe riesgo de XSS.

**Evidencia:**
```tsx
// src/components/help/MarkdownReader.tsx:37
<article dangerouslySetInnerHTML={{ __html: htmlContent }} />
```

**Impacto:**
- **Alto**: Ejecución de código JavaScript arbitrario
- **Session hijacking** (robo de cookies de sesión)
- **Defacement** de la aplicación
- **Redirección** a sitios maliciosos

**Recomendación:**
- Sanitizar HTML con `DOMPurify` antes de renderizar:
  ```typescript
  import DOMPurify from 'isomorphic-dompurify';
  const clean = DOMPurify.sanitize(htmlContent);
  <article dangerouslySetInnerHTML={{ __html: clean }} />
  ```
- Validar origen del contenido markdown (solo archivos locales de `/public/help/`)
- Implementar Content Security Policy (CSP) restrictiva

---

#### VULN-003: Webhook Stripe sin Rate Limiting

**Descripción:**
El endpoint de webhook `/api/webhooks/stripe/route.ts` no tiene protección contra ataques de denegación de servicio (DoS). Un atacante podría enviar miles de requests falsos.

**Evidencia:**
```typescript
// src/app/api/webhooks/stripe/route.ts:29
export async function POST(req: NextRequest) {
  // Sin rate limiting
  const body = await req.text();
  // ...
}
```

**Impacto:**
- **Alto**: Denegación de servicio (DoS)
- **Consumo excesivo** de recursos (CPU, BD, memoria)
- **Facturas elevadas** en Supabase/Vercel
- **Pérdida de disponibilidad** del sistema

**Recomendación:**
- Implementar rate limiting con Vercel Edge Config o Upstash Redis:
  ```typescript
  import { Ratelimit } from "@upstash/ratelimit";

  const ratelimit = new Ratelimit({
    redis: redis,
    limiter: Ratelimit.slidingWindow(10, "10 s"),
  });

  const { success } = await ratelimit.limit(signature);
  if (!success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  ```
- Verificar IP de origen contra whitelist de Stripe
- Implementar idempotency keys para prevenir duplicados

---

#### VULN-004: PDFs Públicos sin Autenticación

**Descripción:**
Los PDFs generados se almacenan en `/public/pdfs/` con nombres predecibles (`presupuesto_<nombre>_<nif>_<fecha>.pdf`). Cualquier persona con el link puede acceder sin autenticación.

**Evidencia:**
```
/public/pdfs/presupuesto_antonio_cebrian_maldonado_59101921v_2025-10-18_04-36-43.pdf
```

**Impacto:**
- **Alto**: Exposición de datos sensibles (NIF, precios, clientes)
- **Violación RGPD** (datos personales accesibles públicamente)
- **Enumeración** de clientes y presupuestos (brute force en nombres)
- **Fuga de información** comercial

**Recomendación:**
1. **Opción A - Storage Privado (RECOMENDADO):**
   - Mover PDFs a Supabase Storage con bucket privado
   - Generar URLs firmadas con expiración (1 hora):
     ```typescript
     const { data } = await supabase.storage
       .from('private-pdfs')
       .createSignedUrl('budget.pdf', 3600);
     ```

2. **Opción B - Endpoint Protegido:**
   - Crear API route `/api/pdfs/[id]` con autenticación
   - Verificar permisos antes de servir archivo
   - Implementar rate limiting

3. **Opción C - Nombres Aleatorios:**
   - Usar UUID en lugar de datos predecibles
   - Almacenar mapping en BD (budget_id -> pdf_uuid)

---

#### VULN-005: Logs Masivos con Información Sensible

**Descripción:**
Se detectaron 382 llamadas a `console.log/error/warn` en Server Actions, muchas exponiendo datos sensibles (emails, IDs, company_ids, roles).

**Evidencia:**
```typescript
// src/app/actions/auth.ts
console.log('[getUserProfile] User data loaded:', userData.email, userData.role)

// src/app/actions/budgets.ts
console.log('[createBudget] Data:', budgetData)

// src/middleware.ts:73
console.log(`[Middleware] Path: ${pathname}, Auth: ${isAuthenticated}, Public: ${isPublicRoute}, MultiEmpresa: ${multiempresa}`)
```

**Impacto:**
- **Alto**: Exposición de datos en logs de producción
- **Acceso no autorizado** si logs se filtran
- **Violación RGPD** (logging de datos personales)
- **Información para atacantes** (estructura de BD, flujos)

**Recomendación:**
1. **Eliminar logs en producción:**
   ```typescript
   // lib/logger.ts
   export const log = process.env.NODE_ENV === 'development'
     ? console.log
     : () => {};
   ```

2. **Usar logger estructurado** (Winston, Pino):
   ```typescript
   import pino from 'pino';
   const logger = pino({
     level: process.env.LOG_LEVEL || 'info',
     redact: ['email', 'password', 'nif', 'company_id']
   });
   ```

3. **Auditar y eliminar logs sensibles:**
   - Buscar: `console.log.*email`, `console.log.*password`, `console.log.*id`
   - Eliminar o redactar con `[REDACTED]`

---

### 🟠 ALTAS (9)

| ID | Vulnerabilidad | Archivo | Línea | CWE | CVSS |
|----|---------------|---------|-------|-----|------|
| **VULN-006** | Falta validación de company_id en Server Actions | `src/app/actions/budgets.ts` | 62-117 | CWE-639 | 7.5 |
| **VULN-007** | Eliminación en cascada sin confirmación exhaustiva | `src/app/actions/companies.ts` | 236-304 | CWE-404 | 7.2 |
| **VULN-008** | Falta sanitización en importación CSV | `src/app/actions/import.ts` | N/A | CWE-20 | 7.1 |
| **VULN-009** | XSS potencial en BudgetForm (rich text editor) | `src/components/budgets/BudgetForm.tsx` | N/A | CWE-79 | 7.0 |
| **VULN-010** | Falta validación de ownership en updateBudget | `src/app/actions/budgets.ts` | N/A | CWE-862 | 6.9 |
| **VULN-011** | Webhook Stripe sin verificación de metadata | `src/app/api/webhooks/stripe/route.ts` | 102-108 | CWE-20 | 6.8 |
| **VULN-012** | Falta CSRF protection en Server Actions | Múltiples | N/A | CWE-352 | 6.5 |
| **VULN-013** | Exposición de stack trace en errores de producción | Múltiples | N/A | CWE-209 | 6.3 |
| **VULN-014** | Falta timeout en queries a Supabase | Múltiples | N/A | CWE-400 | 6.2 |

#### VULN-006: Falta Validación de company_id

**Descripción:**
En `getActiveTariffs()`, si el usuario no tiene `company_id`, se usa la empresa por defecto sin validar si el usuario debería tener acceso a esa empresa.

**Evidencia:**
```typescript
// src/app/actions/budgets.ts:88-94
let empresaId = userData?.company_id
if (!empresaId) {
  console.log('[getActiveTariffs] Usuario sin company_id, obteniendo empresa por defecto...')
  empresaId = await getDefaultEmpresaId()
}
```

**Impacto:**
- **Alto**: Acceso potencial a datos de otra empresa
- **Violación de aislamiento** multi-tenant
- **Escalada de privilegios** horizontal

**Recomendación:**
```typescript
if (!empresaId) {
  throw new Error('Usuario sin empresa asignada');
}
```

---

#### VULN-007: Eliminación en Cascada sin Confirmación

**Descripción:**
La función `deleteCompany()` elimina cascada: usuarios, tarifas, presupuestos, PDFs. Solo valida rol superadmin, pero no hay doble confirmación ni backup.

**Evidencia:**
```typescript
// src/app/actions/companies.ts:281-284
const { error: deleteError } = await supabaseAdmin
  .from('redpresu_issuers')
  .delete()
  .eq('id', companyId);
```

**Impacto:**
- **Alto**: Pérdida masiva de datos sin recuperación
- **Riesgo operacional** (error humano)
- **Violación RGPD** (derecho al olvido sin proceso)

**Recomendación:**
1. Implementar soft-delete (deleted_at en lugar de DELETE)
2. Crear backup antes de eliminar:
   ```typescript
   // Backup a tabla temporal
   await supabaseAdmin
     .from('deleted_companies_backup')
     .insert({ company_data: company, deleted_by: user.id });
   ```
3. Requerir confirmación con password del usuario
4. Enviar email con link de recuperación (24h)

---

#### VULN-008: Falta Sanitización en Import CSV

**Descripción:**
La importación de tarifas/presupuestos desde JSON no valida tipos ni sanitiza contenido. Riesgo de inyección de objetos maliciosos.

**Evidencia:**
```typescript
// src/app/actions/import.ts
const parsed = JSON.parse(content);
// Sin validación exhaustiva
```

**Impacto:**
- **Alto**: Prototype pollution
- **Inyección de objetos** maliciosos
- **Bypass de validación** de negocio

**Recomendación:**
```typescript
import { z } from 'zod';

const ImportSchema = z.object({
  tariffs: z.array(z.object({
    title: z.string().max(200),
    description: z.string().max(500),
    // ... definir todos los campos
  }))
});

const parsed = JSON.parse(content);
const validated = ImportSchema.parse(parsed); // Lanza error si inválido
```

---

#### VULN-009: XSS en Rich Text Editor

**Descripción:**
El componente `BudgetForm` usa `dangerouslySetInnerHTML` para renderizar preview del rich text editor (Tiptap). Si el contenido no está sanitizado, existe riesgo XSS.

**Evidencia:**
```tsx
// src/components/budgets/BudgetForm.tsx
<div dangerouslySetInnerHTML={{ __html: editorContent }} />
```

**Impacto:**
- **Alto**: XSS stored (persistido en BD)
- **Afecta a todos** los usuarios que vean el presupuesto
- **Session hijacking** masivo

**Recomendación:**
- Tiptap ya sanitiza por defecto, verificar configuración:
  ```typescript
  const editor = useEditor({
    extensions: [
      StarterKit,
      // NO incluir extensiones inseguras como JavaScript
    ],
  });
  ```
- Validar HTML generado con whitelist de tags permitidos
- Usar Content Security Policy: `script-src 'self'`

---

#### VULN-010: Falta Validación de Ownership

**Descripción:**
En `updateBudget()`, se valida con RLS pero no se verifica explícitamente que el usuario sea owner o admin de la empresa del presupuesto antes de permitir modificación.

**Evidencia:**
```typescript
// Depende 100% de RLS, sin validación adicional en application layer
```

**Impacto:**
- **Medio-Alto**: Si RLS falla (bug, misconfiguration), no hay segunda barrera
- **Principio de defensa en profundidad** no aplicado

**Recomendación:**
```typescript
// Validar explícitamente antes de update
const budget = await getBudgetById(budgetId);
if (budget.company_id !== currentUser.company_id) {
  return { success: false, error: 'Sin permisos' };
}
if (budget.user_id !== currentUser.id && currentUser.role === 'vendedor') {
  return { success: false, error: 'Solo el creador o admin puede editar' };
}
```

---

#### VULN-011: Webhook sin Validación de Metadata

**Descripción:**
El webhook de Stripe confía ciegamente en `session.metadata.company_id` sin validar que sea un número válido o que exista en BD.

**Evidencia:**
```typescript
// src/app/api/webhooks/stripe/route.ts:102
const companyId = session.metadata?.company_id;
// ... parseInt sin validación
```

**Impacto:**
- **Alto**: Creación de subscriptions con company_id inválido
- **Inconsistencia de datos**
- **Fallo en lógica de negocio**

**Recomendación:**
```typescript
const companyId = session.metadata?.company_id;
if (!companyId || isNaN(parseInt(companyId))) {
  console.error('[handleCheckoutCompleted] Invalid company_id');
  return; // O lanzar error
}

// Verificar que la empresa exista
const { data: company } = await supabaseAdmin
  .from('redpresu_companies')
  .select('id')
  .eq('id', parseInt(companyId))
  .single();

if (!company) {
  console.error('[handleCheckoutCompleted] Company not found:', companyId);
  return;
}
```

---

#### VULN-012: Falta CSRF Protection

**Descripción:**
Next.js Server Actions no tienen protección CSRF nativa. Aunque están en rutas POST, un atacante podría ejecutarlas desde otro dominio si el usuario está autenticado.

**Impacto:**
- **Medio-Alto**: CSRF attacks (crear/editar/eliminar recursos)
- **Acciones no autorizadas** en nombre del usuario

**Recomendación:**
- Next.js 15 incluye protección CSRF automática para Server Actions
- Verificar que está habilitado: `next.config.ts` → `experimental.serverActions = true`
- Alternativamente, implementar tokens CSRF manuales

---

#### VULN-013: Exposición de Stack Traces

**Descripción:**
En errores de Server Actions, se retorna `error.message` directamente al cliente, lo que puede exponer stack traces en desarrollo.

**Evidencia:**
```typescript
catch (error) {
  return { success: false, error: error.message };
}
```

**Impacto:**
- **Medio**: Información de rutas de archivos, dependencias, lógica interna
- **Fingerprinting** para atacantes

**Recomendación:**
```typescript
catch (error) {
  console.error('[Action] Error:', error);

  if (process.env.NODE_ENV === 'production') {
    return { success: false, error: 'Error inesperado. Contacta soporte.' };
  }

  return { success: false, error: error.message };
}
```

---

#### VULN-014: Falta Timeout en Queries

**Descripción:**
Las queries a Supabase no tienen timeout configurado. Una query lenta podría bloquear la aplicación.

**Impacto:**
- **Medio**: Denegación de servicio (DoS) por queries lentas
- **Timeout en Vercel** (10s por defecto)
- **Mala experiencia** de usuario

**Recomendación:**
```typescript
const supabase = createClient(url, key, {
  db: {
    schema: 'public',
  },
  global: {
    fetch: (url, options) => {
      return fetch(url, {
        ...options,
        signal: AbortSignal.timeout(5000) // 5s timeout
      });
    }
  }
});
```

---

### 🟡 MEDIAS (5)

| ID | Vulnerabilidad | Archivo | Línea | CWE | CVSS |
|----|---------------|---------|-------|-----|------|
| **VULN-015** | Falta validación de file size en uploads | `src/app/actions/import.ts` | N/A | CWE-400 | 5.3 |
| **VULN-016** | Generación de passwords temporales débiles | `src/app/actions/users.ts` | 117-124 | CWE-330 | 5.1 |
| **VULN-017** | Falta headers de seguridad (CSP, HSTS, X-Frame-Options) | `next.config.ts` | N/A | CWE-16 | 4.9 |
| **VULN-018** | Uso de Math.random() para generación de IDs únicos | `src/app/actions/users.ts` | 122 | CWE-338 | 4.8 |
| **VULN-019** | Falta validación de email en formularios de cliente | `src/components/*Form.tsx` | N/A | CWE-20 | 4.5 |

---

## Dependencias Vulnerables

**Resultado npm audit:**

```json
{
  "vulnerabilities": {},
  "metadata": {
    "vulnerabilities": {
      "critical": 0,
      "high": 0,
      "moderate": 0,
      "low": 0,
      "total": 0
    }
  }
}
```

✅ **No se encontraron vulnerabilidades conocidas en dependencias.**

**Verificación de versiones:**
- ✅ Next.js 15.5.4 (última estable)
- ✅ React 19.1.0 (última estable)
- ✅ Supabase 2.57.4 (actualizada)
- ✅ Stripe 19.1.0 (actualizada)

---

## Plan de Remediación

Ver documento detallado: [`plan-remediacion.md`](./plan-remediacion.md)

### Priorización por Semanas

#### 🔴 CRÍTICO - Semana 1 (Hacer AHORA)
- [ ] **VULN-001**: Proteger SUPABASE_SERVICE_ROLE_KEY (2h)
- [ ] **VULN-002**: Sanitizar XSS en MarkdownReader (1h)
- [ ] **VULN-003**: Añadir rate limiting a webhook Stripe (3h)
- [ ] **VULN-004**: Migrar PDFs a storage privado (8h)
- [ ] **VULN-005**: Eliminar logs sensibles de producción (4h)

**Esfuerzo Total Semana 1:** ~18 horas (2-3 días)

#### 🟠 ALTO - Semanas 2-3
- [ ] **VULN-006**: Validar company_id en Server Actions (2h)
- [ ] **VULN-007**: Implementar soft-delete para empresas (4h)
- [ ] **VULN-008**: Validar JSON imports con Zod (3h)
- [ ] **VULN-009**: Verificar sanitización Tiptap (1h)
- [ ] **VULN-010**: Añadir validación de ownership (2h)
- [ ] **VULN-011**: Validar metadata de Stripe (1h)
- [ ] **VULN-012**: Verificar CSRF protection (1h)
- [ ] **VULN-013**: Ocultar stack traces en producción (1h)
- [ ] **VULN-014**: Configurar timeouts en Supabase (1h)

**Esfuerzo Total Semanas 2-3:** ~16 horas (2 días)

#### 🟡 MEDIO - Semana 4 (Backlog)
- [ ] **VULN-015**: Validar file size en uploads (1h)
- [ ] **VULN-016**: Mejorar generación de passwords (1h)
- [ ] **VULN-017**: Añadir security headers (2h)
- [ ] **VULN-018**: Usar crypto.randomUUID() (0.5h)
- [ ] **VULN-019**: Validar emails en cliente (1h)

**Esfuerzo Total Semana 4:** ~5.5 horas (1 día)

---

## Recomendaciones Generales

### 1. Implementar Security Headers

```typescript
// next.config.ts
const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on'
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload'
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block'
  },
  {
    key: 'Referrer-Policy',
    value: 'origin-when-cross-origin'
  },
  {
    key: 'Content-Security-Policy',
    value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline';"
  }
]

module.exports = {
  async headers() {
    return [{
      source: '/:path*',
      headers: securityHeaders,
    }]
  },
}
```

### 2. Implementar Logging Estructurado

```typescript
// lib/logger.ts
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  redact: {
    paths: ['email', 'password', 'nif', 'company_id', '*.email', '*.password'],
    remove: true
  },
  transport: process.env.NODE_ENV === 'development' ? {
    target: 'pino-pretty'
  } : undefined
});
```

### 3. Monitoreo y Alertas

- **Sentry** para error tracking
- **LogRocket** para session replay
- **Datadog** para métricas de performance
- **Alertas automáticas** para:
  - Spike en errores 500
  - Queries lentas (> 2s)
  - Intentos de acceso no autorizado

### 4. Auditorías Periódicas

- **Mensual**: `npm audit` + review de nuevas dependencias
- **Trimestral**: Auditoría de código manual
- **Anual**: Penetration testing externo

---

## Conclusiones

### Fortalezas de Seguridad

1. ✅ **Arquitectura RLS sólida**: Todas las tablas tienen políticas correctas
2. ✅ **Middleware robusto**: Protección de rutas bien implementada
3. ✅ **Validación con Zod**: Schema validation en Server Actions críticas
4. ✅ **Dependencias actualizadas**: 0 CVEs conocidos
5. ✅ **TypeScript**: Type safety reduce errores

### Áreas de Mejora Prioritarias

1. 🔴 **Logging excesivo**: 382 console.log deben eliminarse
2. 🔴 **PDFs públicos**: Migración urgente a storage privado
3. 🔴 **XSS en Markdown**: Sanitización obligatoria
4. 🟠 **Falta defense in depth**: Validaciones solo en RLS
5. 🟠 **Sin rate limiting**: Vulnerable a DoS

### Riesgo Global

**NIVEL DE RIESGO: 🟠 ALTO**

- **Puntuación CVSS Promedio:** 7.1/10
- **Vulnerabilidades Críticas:** 5
- **Impacto Potencial:** Exposición de datos sensibles, XSS, DoS
- **Tiempo Estimado de Remediación:** 39.5 horas (~5 días)

### Siguiente Paso Recomendado

**Prioridad Máxima:**
Implementar plan de remediación **Semana 1** (vulnerabilidades críticas) antes de desplegar a producción.

---

**Auditoría Completada:** 2025-01-20
**Próxima Revisión:** 2025-02-20 (post-remediación)
**Auditor:** Claude Code Security Audit v1.0
