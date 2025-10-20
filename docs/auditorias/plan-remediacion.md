# Plan de Remediación - Vulnerabilidades de Seguridad
**Fecha Emisión:** 2025-01-20
**Deadline Críticas:** 2025-01-27 (7 días)
**Deadline Altas:** 2025-02-10 (3 semanas)

---

## 📊 Resumen Ejecutivo

| Fase | Vulnerabilidades | Esfuerzo | Deadline | Status |
|------|------------------|----------|----------|--------|
| **Semana 1 (CRÍTICO)** | 5 | 18h (~2-3 días) | 2025-01-27 | ⏳ Pendiente |
| **Semana 2-3 (ALTO)** | 9 | 16h (~2 días) | 2025-02-10 | ⏳ Pendiente |
| **Semana 4 (MEDIO)** | 5 | 5.5h (~1 día) | 2025-02-17 | ⏳ Pendiente |
| **TOTAL** | **19** | **39.5h (~5 días)** | - | - |

**Recursos Necesarios:**
- 1 Desarrollador Senior (full-time)
- Acceso a Supabase Dashboard
- Cuenta Stripe (para testing webhook)

---

## 🔴 FASE 1: CRÍTICAS - Semana 1 (HACER AHORA)

### TAREA 1.1: Proteger SUPABASE_SERVICE_ROLE_KEY
**ID:** VULN-001 | **Prioridad:** 🔴 CRÍTICA | **Esfuerzo:** 2h

**Objetivo:** Garantizar que `SUPABASE_SERVICE_ROLE_KEY` solo se use en server-side

#### Pasos:

1. **Instalar dependencia `server-only`:**
   ```bash
   npm install server-only
   ```

2. **Modificar `src/lib/supabase/server.ts`:**
   ```typescript
   import 'server-only'; // AÑADIR PRIMERA LÍNEA

   import { createClient } from '@supabase/supabase-js'

   const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
   const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

   // Validación runtime adicional
   if (typeof window !== 'undefined') {
     throw new Error('supabaseAdmin can only be used server-side');
   }

   if (!supabaseUrl) {
     throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_URL')
   }

   if (!supabaseServiceRoleKey) {
     throw new Error('Missing env.SUPABASE_SERVICE_ROLE_KEY')
   }

   export const supabaseAdmin = createClient(
     supabaseUrl,
     supabaseServiceRoleKey,
     {
       auth: {
         autoRefreshToken: false,
         persistSession: false
       }
     }
   )
   ```

3. **Verificar que no se importe en componentes cliente:**
   ```bash
   # Buscar imports en archivos .tsx cliente
   grep -r "import.*supabase/server" src/components --include="*.tsx"
   # NO debe haber resultados (o solo en Server Components)
   ```

4. **Testing:**
   - Intentar importar en componente cliente → debe fallar en build
   - Verificar que Server Actions funcionan correctamente

**Criterio de Aceptación:**
- ✅ Build falla si se importa en código cliente
- ✅ Server Actions funcionan sin errores
- ✅ Runtime check lanza error si se ejecuta en browser

---

### TAREA 1.2: Sanitizar XSS en MarkdownReader
**ID:** VULN-002 | **Prioridad:** 🔴 CRÍTICA | **Esfuerzo:** 1h

**Objetivo:** Prevenir XSS en renderizado de Markdown

#### Pasos:

1. **Instalar DOMPurify:**
   ```bash
   npm install isomorphic-dompurify
   npm install --save-dev @types/dompurify
   ```

2. **Modificar `src/components/help/MarkdownReader.tsx`:**
   ```typescript
   "use client";

   import DOMPurify from 'isomorphic-dompurify';

   interface MarkdownReaderProps {
     htmlContent: string;
     className?: string;
   }

   export function MarkdownReader({
     htmlContent,
     className = "",
   }: MarkdownReaderProps) {
     // Sanitizar HTML con configuración restrictiva
     const cleanHtml = DOMPurify.sanitize(htmlContent, {
       ALLOWED_TAGS: [
         'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
         'p', 'a', 'ul', 'ol', 'li',
         'strong', 'em', 'code', 'pre',
         'blockquote', 'br', 'hr'
       ],
       ALLOWED_ATTR: ['href', 'class', 'id'],
       ALLOW_DATA_ATTR: false,
       FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed'],
       FORBID_ATTR: ['onerror', 'onload', 'onclick']
     });

     return (
       <article
         className={`prose prose-slate max-w-none ... ${className}`}
         dangerouslySetInnerHTML={{ __html: cleanHtml }}
       />
     );
   }
   ```

3. **Testing:**
   - Crear archivo markdown de prueba con script malicioso:
     ```markdown
     # Test
     <script>alert('XSS')</script>
     <img src=x onerror="alert('XSS')">
     ```
   - Verificar que el script NO se ejecuta
   - Verificar que contenido legítimo se renderiza correctamente

**Criterio de Aceptación:**
- ✅ Scripts maliciosos son eliminados
- ✅ Contenido legítimo (headers, links, listas) funciona
- ✅ No hay warnings de XSS en consola

---

### TAREA 1.3: Rate Limiting en Webhook Stripe
**ID:** VULN-003 | **Prioridad:** 🔴 CRÍTICA | **Esfuerzo:** 3h

**Objetivo:** Prevenir DoS en endpoint de webhook Stripe

#### Pasos:

1. **Opción A - Usar Vercel Edge Config (RECOMENDADO si en Vercel):**

   ```bash
   npm install @upstash/ratelimit @upstash/redis
   ```

   Crear cuenta en Upstash (gratis hasta 10K requests/día):
   - https://console.upstash.com/
   - Crear Redis database
   - Copiar `UPSTASH_REDIS_REST_URL` y `UPSTASH_REDIS_REST_TOKEN`

   Añadir a `.env.local`:
   ```env
   UPSTASH_REDIS_REST_URL=https://...
   UPSTASH_REDIS_REST_TOKEN=...
   ```

2. **Modificar `src/app/api/webhooks/stripe/route.ts`:**

   ```typescript
   import { Ratelimit } from "@upstash/ratelimit";
   import { Redis } from "@upstash/redis";

   // Inicializar Redis y Rate Limiter
   const redis = new Redis({
     url: process.env.UPSTASH_REDIS_REST_URL!,
     token: process.env.UPSTASH_REDIS_REST_TOKEN!,
   });

   const ratelimit = new Ratelimit({
     redis,
     limiter: Ratelimit.slidingWindow(10, "10 s"), // 10 requests por 10 segundos
     analytics: true,
   });

   export async function POST(req: NextRequest) {
     console.log('[Stripe Webhook] Received event');

     // Rate limiting por IP
     const ip = req.headers.get('x-forwarded-for') || 'unknown';
     const { success, limit, remaining } = await ratelimit.limit(ip);

     if (!success) {
       console.warn('[Stripe Webhook] Rate limit exceeded:', ip);
       return NextResponse.json(
         { error: 'Too many requests' },
         { status: 429 }
       );
     }

     // ... resto del código
   }
   ```

3. **Opción B - Sin Upstash (simple in-memory):**

   ```typescript
   // Rate limiter simple (solo para desarrollo/staging)
   const requestLog = new Map<string, number[]>();

   function checkRateLimit(ip: string, maxRequests = 10, windowMs = 10000): boolean {
     const now = Date.now();
     const requests = requestLog.get(ip) || [];

     // Limpiar requests antiguos
     const validRequests = requests.filter(time => now - time < windowMs);

     if (validRequests.length >= maxRequests) {
       return false; // Excedido
     }

     validRequests.push(now);
     requestLog.set(ip, validRequests);
     return true; // OK
   }

   export async function POST(req: NextRequest) {
     const ip = req.headers.get('x-forwarded-for') || 'unknown';

     if (!checkRateLimit(ip)) {
       return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
     }

     // ... resto del código
   }
   ```

4. **Añadir verificación de IP de Stripe (opcional):**

   ```typescript
   const STRIPE_IPS = [
     '3.18.12.63', '3.130.192.231', '13.235.14.237', '13.235.122.149',
     // ... lista completa en https://stripe.com/docs/ips
   ];

   const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim();
   if (ip && !STRIPE_IPS.includes(ip)) {
     console.warn('[Stripe Webhook] Suspicious IP:', ip);
     // Opcional: bloquear o solo logear
   }
   ```

5. **Testing:**
   - Usar `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
   - Enviar 15 eventos rápidamente
   - Verificar que el 11º retorna 429 Too Many Requests

**Criterio de Aceptación:**
- ✅ Máximo 10 requests por 10 segundos
- ✅ Retorna 429 si excede límite
- ✅ Eventos legítimos de Stripe procesados correctamente

---

### TAREA 1.4: Migrar PDFs a Storage Privado
**ID:** VULN-004 | **Prioridad:** 🔴 CRÍTICA | **Esfuerzo:** 8h

**Objetivo:** Proteger PDFs con autenticación

#### Pasos:

1. **Crear bucket privado en Supabase:**

   - Ir a Supabase Dashboard → Storage
   - Create new bucket: `private-budgets`
   - **Public:** NO (desmarcado)

2. **Crear políticas RLS para el bucket:**

   ```sql
   -- Policy: Users can read their own company's PDFs
   CREATE POLICY "private_budgets_select"
   ON storage.objects FOR SELECT
   USING (
     bucket_id = 'private-budgets'
     AND auth.uid() IN (
       SELECT id FROM redpresu_users
       WHERE company_id = (
         SELECT company_id FROM redpresu_budgets
         WHERE pdf_url LIKE '%' || name || '%'
       )
     )
   );

   -- Policy: Admins can upload PDFs
   CREATE POLICY "private_budgets_insert"
   ON storage.objects FOR INSERT
   WITH CHECK (
     bucket_id = 'private-budgets'
     AND auth.uid() IS NOT NULL
   );

   -- Policy: Admins can delete PDFs
   CREATE POLICY "private_budgets_delete"
   ON storage.objects FOR DELETE
   USING (
     bucket_id = 'private-budgets'
     AND auth.uid() IN (
       SELECT id FROM redpresu_users
       WHERE role IN ('admin', 'superadmin')
     )
   );
   ```

3. **Modificar `src/app/actions/budgets.ts` - generateBudgetPDF():**

   ```typescript
   // Función helper para generar nombre único
   function generatePDFFileName(budget: Budget): string {
     const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
     const randomId = crypto.randomUUID().substring(0, 8);
     return `${budget.id}-${timestamp}-${randomId}.pdf`;
   }

   export async function generateBudgetPDF(budgetId: string) {
     try {
       // ... código existente para obtener budget y generar PDF

       // En lugar de guardar en /public/pdfs/
       const fileName = generatePDFFileName(budget);
       const filePath = `budgets/${budget.company_id}/${fileName}`;

       // Subir a Supabase Storage
       const { data: uploadData, error: uploadError } = await supabaseAdmin
         .storage
         .from('private-budgets')
         .upload(filePath, pdfBuffer, {
           contentType: 'application/pdf',
           upsert: false
         });

       if (uploadError) {
         console.error('[generateBudgetPDF] Error uploading:', uploadError);
         return { success: false, error: 'Error al subir PDF' };
       }

       // Generar URL firmada (válida por 1 hora)
       const { data: signedUrl } = await supabaseAdmin
         .storage
         .from('private-budgets')
         .createSignedUrl(filePath, 3600); // 1 hora

       // Actualizar BD con path (no URL firmada, se genera on-demand)
       const { error: updateError } = await supabaseAdmin
         .from('redpresu_budgets')
         .update({
           pdf_url: filePath, // Guardar path, no URL firmada
           updated_at: new Date().toISOString()
         })
         .eq('id', budgetId);

       if (updateError) {
         console.error('[generateBudgetPDF] Error updating budget:', updateError);
         return { success: false, error: 'Error al actualizar presupuesto' };
       }

       return {
         success: true,
         pdf_url: signedUrl?.signedUrl // Retornar URL firmada para visualización inmediata
       };

     } catch (error) {
       console.error('[generateBudgetPDF] Error:', error);
       return { success: false, error: 'Error generando PDF' };
     }
   }
   ```

4. **Crear Server Action para obtener URL firmada:**

   ```typescript
   // src/app/actions/budgets.ts

   /**
    * Obtiene URL firmada para ver PDF (válida 1 hora)
    */
   export async function getBudgetPDFUrl(budgetId: string) {
     try {
       const user = await getServerUser();
       if (!user) {
         return { success: false, error: 'No autenticado' };
       }

       // Obtener presupuesto
       const { data: budget, error } = await supabaseAdmin
         .from('redpresu_budgets')
         .select('pdf_url, company_id')
         .eq('id', budgetId)
         .single();

       if (error || !budget) {
         return { success: false, error: 'Presupuesto no encontrado' };
       }

       // Verificar permisos (mismo company_id)
       if (budget.company_id !== user.company_id && user.role !== 'superadmin') {
         return { success: false, error: 'Sin permisos' };
       }

       if (!budget.pdf_url) {
         return { success: false, error: 'PDF no generado' };
       }

       // Generar URL firmada
       const { data: signedUrl, error: signError } = await supabaseAdmin
         .storage
         .from('private-budgets')
         .createSignedUrl(budget.pdf_url, 3600); // 1 hora

       if (signError) {
         console.error('[getBudgetPDFUrl] Error:', signError);
         return { success: false, error: 'Error generando URL' };
       }

       return {
         success: true,
         url: signedUrl.signedUrl
       };

     } catch (error) {
       console.error('[getBudgetPDFUrl] Error:', error);
       return { success: false, error: 'Error inesperado' };
     }
   }
   ```

5. **Modificar componentes que usan pdf_url:**

   ```typescript
   // src/components/budgets/BudgetsTable.tsx

   const handleViewPDF = async (budgetId: string) => {
     setLoadingPdf(budgetId);

     const result = await getBudgetPDFUrl(budgetId);

     if (result.success && result.url) {
       window.open(result.url, '_blank');
     } else {
       toast.error(result.error || 'Error al cargar PDF');
     }

     setLoadingPdf(null);
   };

   // Botón Ver PDF
   <Button onClick={() => handleViewPDF(budget.id)}>
     {loadingPdf === budget.id ? 'Cargando...' : 'Ver PDF'}
   </Button>
   ```

6. **Migrar PDFs existentes (script one-time):**

   ```typescript
   // scripts/migrate-pdfs.ts
   import fs from 'fs';
   import path from 'path';
   import { supabaseAdmin } from '@/lib/supabase/server';

   async function migratePDFs() {
     const pdfsDir = path.join(process.cwd(), 'public', 'pdfs');
     const files = fs.readdirSync(pdfsDir);

     console.log(`Migrando ${files.length} PDFs...`);

     for (const file of files) {
       if (!file.endsWith('.pdf')) continue;

       const filePath = path.join(pdfsDir, file);
       const buffer = fs.readFileSync(filePath);

       // Extraer budget_id del nombre (si es posible)
       // presupuesto_antonio_cebrian_maldonado_59101921v_2025-10-18_04-36-43.pdf

       const newPath = `budgets/1/${crypto.randomUUID()}.pdf`; // Ajustar company_id

       const { error } = await supabaseAdmin
         .storage
         .from('private-budgets')
         .upload(newPath, buffer, {
           contentType: 'application/pdf'
         });

       if (error) {
         console.error(`Error migrando ${file}:`, error);
       } else {
         console.log(`Migrado: ${file} → ${newPath}`);
         // Actualizar BD si es posible mapear budget_id
       }
     }

     console.log('Migración completada');
   }

   migratePDFs();
   ```

   Ejecutar:
   ```bash
   npx tsx scripts/migrate-pdfs.ts
   ```

7. **Limpiar PDFs antiguos:**
   ```bash
   rm -rf public/pdfs/*.pdf
   # Dejar README.md explicando que los PDFs están en Supabase Storage
   ```

**Criterio de Aceptación:**
- ✅ PDFs nuevos se guardan en Supabase Storage
- ✅ PDFs antiguos migrados correctamente
- ✅ URLs firmadas expiran en 1 hora
- ✅ Solo usuarios con permisos pueden acceder
- ✅ /public/pdfs/ vacío

---

### TAREA 1.5: Eliminar Logs Sensibles de Producción
**ID:** VULN-005 | **Prioridad:** 🔴 CRÍTICA | **Esfuerzo:** 4h

**Objetivo:** Eliminar logs con información sensible en producción

#### Pasos:

1. **Crear logger estructurado:**

   ```bash
   npm install pino pino-pretty
   ```

   ```typescript
   // src/lib/logger.ts
   import pino from 'pino';

   const isDevelopment = process.env.NODE_ENV === 'development';

   export const logger = pino({
     level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),

     // Redactar campos sensibles
     redact: {
       paths: [
         'email',
         'password',
         'nif',
         'client_nif_nie',
         'company_id',
         '*.email',
         '*.password',
         '*.nif',
         'req.headers.authorization',
         'req.headers.cookie'
       ],
       remove: true
     },

     // Pretty print en desarrollo
     transport: isDevelopment ? {
       target: 'pino-pretty',
       options: {
         colorize: true,
         translateTime: 'SYS:standard',
         ignore: 'pid,hostname'
       }
     } : undefined,

     // Formato JSON en producción
     formatters: {
       level: (label) => {
         return { level: label };
       }
     }
   });

   // Helper para desarrollo
   export const log = isDevelopment ? console.log : () => {};
   export const logError = isDevelopment ? console.error : () => {};
   ```

2. **Reemplazar console.log en Server Actions:**

   ```bash
   # Buscar todos los console.log en actions
   grep -r "console\." src/app/actions --include="*.ts" -n

   # Reemplazar con logger
   # Ejemplo:
   # console.log('[getUsers] Success:', users.length)
   # →
   # logger.info({ count: users.length }, '[getUsers] Success')
   ```

   **Patrón de reemplazo:**
   ```typescript
   // ANTES
   console.log('[getUsers] User data:', userData.email, userData.role);

   // DESPUÉS
   logger.info({
     userId: userData.id,
     role: userData.role
     // NO incluir email
   }, '[getUsers] User loaded');
   ```

3. **Auditar logs críticos:**

   Buscar y eliminar/redactar:
   ```bash
   # Logs con email
   grep -r "console.*email" src/app/actions

   # Logs con password
   grep -r "console.*password" src/app/actions

   # Logs con NIF
   grep -r "console.*nif" src/app/actions

   # Logs con IDs de empresa
   grep -r "console.*company_id" src/app/actions
   ```

4. **Modificar middleware (caso especial):**

   ```typescript
   // src/middleware.ts
   // ANTES:
   // console.log(`[Middleware] Path: ${pathname}, Auth: ${isAuthenticated}, Public: ${isPublicRoute}, MultiEmpresa: ${multiempresa}`)

   // DESPUÉS (solo en desarrollo):
   if (process.env.NODE_ENV === 'development') {
     console.log(`[Middleware] Path: ${pathname}, Auth: ${isAuthenticated}`);
   }
   ```

5. **Crear .env.local con LOG_LEVEL:**

   ```env
   # Desarrollo
   LOG_LEVEL=debug

   # Producción (.env.production)
   LOG_LEVEL=warn
   ```

6. **Testing:**

   - Ejecutar app en modo producción: `npm run build && npm run start`
   - Verificar que NO aparecen logs sensibles en consola
   - Generar un error intencional
   - Verificar que el error se logea correctamente (sin datos sensibles)

**Criterio de Aceptación:**
- ✅ < 10 console.log en Server Actions (solo críticos)
- ✅ Logger estructurado redacta campos sensibles
- ✅ LOG_LEVEL=warn en producción
- ✅ Logs útiles para debugging pero sin datos personales

**Archivos Modificados (estimado 30-40):**
- `src/app/actions/*.ts` (12 archivos)
- `src/middleware.ts`
- `src/lib/auth/server.ts`
- `src/components/budgets/BudgetForm.tsx`
- Otros componentes con logs

---

## 🟠 FASE 2: ALTAS - Semanas 2-3

### TAREA 2.1: Validar company_id en Server Actions
**ID:** VULN-006 | **Prioridad:** 🟠 ALTA | **Esfuerzo:** 2h

**Pasos:**

1. Modificar `src/app/actions/budgets.ts`:
   ```typescript
   export async function getActiveTariffs(): Promise<Tariff[]> {
     // ...
     let empresaId = userData?.company_id
     if (!empresaId) {
       logger.error({ userId: user.id }, 'Usuario sin company_id asignado');
       throw new Error('Usuario sin empresa asignada');
     }
     // ...
   }
   ```

2. Auditar TODAS las Server Actions que usen company_id
3. Añadir validación explícita en cada caso

---

### TAREA 2.2: Soft-Delete para Empresas
**ID:** VULN-007 | **Prioridad:** 🟠 ALTA | **Esfuerzo:** 4h

**Pasos:**

1. **Añadir columna deleted_at a redpresu_issuers:**
   ```sql
   ALTER TABLE redpresu_issuers
   ADD COLUMN deleted_at TIMESTAMPTZ NULL;

   CREATE INDEX idx_issuers_deleted_at ON redpresu_issuers(deleted_at)
   WHERE deleted_at IS NOT NULL;
   ```

2. **Modificar RLS policies para excluir eliminados:**
   ```sql
   -- Actualizar todas las policies de issuers
   CREATE OR REPLACE POLICY "issuers_select_own_company"
   ON redpresu_issuers FOR SELECT
   USING (
     company_id IN (
       SELECT company_id FROM redpresu_users WHERE id = auth.uid()
     )
     AND deleted_at IS NULL
   );
   ```

3. **Modificar `deleteCompany()` para usar soft-delete:**
   ```typescript
   export async function deleteCompany(companyId: string) {
     // ... validaciones existentes

     // Soft delete
     const { error } = await supabaseAdmin
       .from('redpresu_issuers')
       .update({ deleted_at: new Date().toISOString() })
       .eq('id', companyId);

     // ... resto del código
   }
   ```

4. **Crear script de recuperación:**
   ```typescript
   // src/app/actions/companies.ts
   export async function restoreCompany(companyId: string) {
     const user = await getServerUser();
     if (user?.role !== 'superadmin') {
       return { success: false, error: 'Sin permisos' };
     }

     const { error } = await supabaseAdmin
       .from('redpresu_issuers')
       .update({ deleted_at: null })
       .eq('id', companyId);

     return error
       ? { success: false, error: error.message }
       : { success: true };
   }
   ```

---

### TAREA 2.3 a 2.9: Ver detalles completos en tareas.md

_(Continuar con el mismo nivel de detalle para VULN-008 a VULN-014)_

---

## 🟡 FASE 3: MEDIAS - Semana 4

### TAREA 3.1: Validar File Size en Uploads
**ID:** VULN-015 | **Prioridad:** 🟡 MEDIA | **Esfuerzo:** 1h

**Pasos:**

1. Modificar `src/app/actions/import.ts`:
   ```typescript
   const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

   if (file.size > MAX_FILE_SIZE) {
     return { success: false, error: 'Archivo demasiado grande (máx 5MB)' };
   }
   ```

---

### TAREA 3.2: Mejorar Generación de Passwords
**ID:** VULN-016 | **Prioridad:** 🟡 MEDIA | **Esfuerzo:** 1h

**Pasos:**

1. Modificar `src/app/actions/users.ts`:
   ```typescript
   import crypto from 'crypto';

   function generateTemporaryPassword(): string {
     // Usar crypto en lugar de Math.random()
     const array = new Uint8Array(12);
     crypto.getRandomValues(array);

     const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
     let password = '';

     for (let i = 0; i < array.length; i++) {
       password += chars[array[i] % chars.length];
     }

     return password;
   }
   ```

---

### TAREA 3.3: Security Headers
**ID:** VULN-017 | **Prioridad:** 🟡 MEDIA | **Esfuerzo:** 2h

**Pasos:**

1. Modificar `next.config.ts`:
   ```typescript
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
       key: 'Permissions-Policy',
       value: 'camera=(), microphone=(), geolocation=()'
     }
   ];

   module.exports = {
     async headers() {
       return [
         {
           source: '/:path*',
           headers: securityHeaders,
         },
       ];
     },
   };
   ```

2. Testing con https://securityheaders.com/

---

## 📊 Tracking de Progreso

### Checklist General

#### 🔴 Semana 1 - CRÍTICAS
- [ ] TAREA 1.1: Proteger SUPABASE_SERVICE_ROLE_KEY (2h)
- [ ] TAREA 1.2: Sanitizar XSS en MarkdownReader (1h)
- [ ] TAREA 1.3: Rate Limiting Stripe Webhook (3h)
- [ ] TAREA 1.4: Migrar PDFs a Storage Privado (8h)
- [ ] TAREA 1.5: Eliminar Logs Sensibles (4h)

**Total Semana 1:** 18h

#### 🟠 Semanas 2-3 - ALTAS
- [ ] TAREA 2.1: Validar company_id (2h)
- [ ] TAREA 2.2: Soft-Delete Empresas (4h)
- [ ] TAREA 2.3: Validar JSON Imports (3h)
- [ ] TAREA 2.4: Verificar Tiptap Sanitización (1h)
- [ ] TAREA 2.5: Validación de Ownership (2h)
- [ ] TAREA 2.6: Validar Metadata Stripe (1h)
- [ ] TAREA 2.7: Verificar CSRF Protection (1h)
- [ ] TAREA 2.8: Ocultar Stack Traces (1h)
- [ ] TAREA 2.9: Configurar Timeouts (1h)

**Total Semanas 2-3:** 16h

#### 🟡 Semana 4 - MEDIAS
- [ ] TAREA 3.1: Validar File Size (1h)
- [ ] TAREA 3.2: Mejorar Passwords (1h)
- [ ] TAREA 3.3: Security Headers (2h)
- [ ] TAREA 3.4: Usar crypto.randomUUID() (0.5h)
- [ ] TAREA 3.5: Validar Emails Cliente (1h)

**Total Semana 4:** 5.5h

---

## 🎯 Criterios de Éxito Global

### Métricas de Seguridad

- ✅ **0 vulnerabilidades CRÍTICAS** pendientes
- ✅ **< 3 vulnerabilidades ALTAS** pendientes
- ✅ **Score CVSS < 5.0** promedio
- ✅ **A+ en securityheaders.com**
- ✅ **npm audit: 0 vulnerabilities**

### Validación Final

1. **Penetration Testing Manual:**
   - Intentar XSS en todos los inputs
   - Intentar IDOR (acceso a recursos de otra empresa)
   - Intentar DoS en webhook
   - Intentar acceder a PDFs sin autenticación

2. **Code Review:**
   - Auditoría por desarrollador senior externo
   - Revisión de RLS policies
   - Revisión de Server Actions

3. **Compliance:**
   - RGPD: Logs sin datos personales
   - RGPD: PDFs protegidos
   - RGPD: Derecho al olvido (soft-delete)

---

## 📞 Contacto y Escalación

**Responsable:** [Nombre Tech Lead]
**Email:** [email]
**Escalación:** [Nombre CTO/CEO]

**Canal de Comunicación:** Slack #security-audit

**Reportar Issues:**
- Bloqueadores: Inmediato (Slack)
- Preguntas técnicas: Email + Slack
- Progreso diario: Daily standup

---

**Plan Creado:** 2025-01-20
**Última Actualización:** 2025-01-20
**Próxima Revisión:** 2025-01-27 (Post Semana 1)
