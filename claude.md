# Claude Code - jeyca-presu (Fase 2)

## 📊 Estado del Proyecto

**Fase Actual:** Fase 2 - Evolución Funcional
**Progreso MVP:** 100% ✅
**Progreso Fase 2:** 38% ✅ (20/53 tareas)

**Última actualización:** 2025-01-18 - Añadido Bloque 10: Sistema de Ayuda
**Bloques completados:** 5/10 (Usuarios, Tarifas, Config, IRPF/RE, Versiones/Notas)
**Siguiente objetivo:** Bloque 6 - Navegación Unificada (o saltar a Responsive)

---

## 🔒 ARCHIVOS READ-ONLY - MVP FASE 1 (NO MODIFICAR)

### ⚠️ REGLA CRÍTICA FASE 2

**Estos archivos NO se modifican salvo bugs críticos que rompan funcionalidad**

### Fase 1: SHARED (Base común)

- ❌ `src/lib/database/*` (Database)
- ❌ `src/lib/types/*` (Types)
- ❌ `src/lib/supabase/*` (Supabase client)
- ❌ `src/lib/auth/*` (Auth - salvo extensiones)
- ❌ `src/components/auth/LoginForm.tsx` (Login - mantener)
- ❌ `src/components/auth/LogoutButton.tsx` (Logout)
- ❌ `src/middleware.ts` (Auth middleware - salvo extensiones)
- ❌ `auth.config.ts` (Auth config)
- ❌ `src/lib/utils/*` (Utilidades)
- ❌ `src/lib/validators/*` (Validadores CSV)
- ❌ `src/lib/helpers/*` (Helpers formato, cálculos)
- ❌ `src/lib/constants/*` (Constantes)

### Fase 1: Features Core

- ❌ `src/app/tariffs/*` (Tariff Management)
- ❌ `src/components/tariffs/*` (Tariff components)
- ❌ `src/app/actions/tariffs.ts` (Tariff actions - salvo extensiones)
- ❌ `src/app/budgets/*` (Budget Creation)
- ❌ `src/components/budgets/*` (Budget components)
- ❌ `src/app/actions/budgets.ts` (Budget actions - salvo extensiones)
- ❌ `src/app/dashboard/*` (Dashboard)
- ❌ `src/components/dashboard/*` (Dashboard components)
- ❌ `src/components/layout/Header.tsx` (Navigation)
- ❌ `src/app/actions/dashboard.ts` (Dashboard actions)

### Configuración

- ❌ `tailwind.config.ts`
- ❌ `next.config.ts`
- ❌ `tsconfig.json`
- ⚠️ `package.json` (consultar antes de añadir deps)
- ❌ `components.json` (shadcn/ui)

### Base de Datos Fase 1

- ❌ `migrations/001_initial_schema.sql`
- ❌ `migrations/002_rls_policies.sql`
- ❌ `migrations/003_seed_data.sql`

**IMPORTANTE:** Documentar en commit si modificas archivo READ-ONLY por bug crítico

---

## ✅ ARCHIVOS PERMITIDOS - FASE 2 (PUEDEN CREARSE/MODIFICARSE)

### Bloque 1: Usuarios y Seguridad

**Status:** ⏳ Activo

```
✅ migrations/004_emisores_table.sql (NUEVO)
✅ migrations/005_users_status_fields.sql (NUEVO)
✅ src/app/(auth)/register/ (NUEVO)
✅ src/app/(auth)/forgot-password/ (NUEVO)
✅ src/app/(auth)/reset-password/ (NUEVO)
✅ src/components/auth/RegisterForm.tsx (NUEVO)
✅ src/components/auth/PasswordResetForm.tsx (NUEVO)
✅ src/app/profile/ (NUEVO)
✅ src/components/profile/ (NUEVO)
✅ src/app/users/ (NUEVO)
✅ src/components/users/ (NUEVO)
✅ src/app/actions/users.ts (NUEVO)
⚠️ src/app/actions/auth.ts (EXTENDER existente)
```

### Bloque 2: Mejoras Tarifas

**Status:** ⏳ Pendiente

```
✅ migrations/006_tariffs_user_id.sql (NUEVO)
✅ migrations/007_tariffs_ivas_presentes.sql (NUEVO)
✅ migrations/008_tariffs_template.sql (NUEVO)
⚠️ src/app/actions/tariffs.ts (EXTENDER - añadir funciones)
⚠️ src/components/tariffs/TariffList.tsx (MODIFICAR - añadir columnas)
⚠️ src/lib/validators/csv-converter.ts (EXTENDER - detectIVAsPresentes)
```

### Bloque 3: Configuración

**Status:** ⏳ Pendiente

```
✅ migrations/009_config_table.sql (NUEVO)
✅ src/lib/helpers/config-helpers.ts (NUEVO)
✅ src/app/actions/config.ts (NUEVO)
✅ src/app/settings/ (NUEVO)
✅ public/templates/ (NUEVO - imágenes plantillas)
⚠️ src/components/tariffs/TariffForm.tsx (MODIFICAR - selector plantillas)
```

### Bloque 4: IRPF y RE

**Status:** ⏳ Pendiente

```
✅ src/lib/helpers/fiscal-calculations.ts (NUEVO)
⚠️ src/app/actions/budgets.ts (EXTENDER - cálculos fiscales)
⚠️ src/components/budgets/BudgetForm.tsx (MODIFICAR - campos IRPF/RE)
⚠️ src/lib/helpers/pdf-payload-builder.ts (MODIFICAR - añadir IRPF/RE)
```

### Bloque 5: Versiones y Notas

**Status:** ⏳ Pendiente

```
✅ migrations/010_budget_versions.sql (NUEVO)
✅ migrations/011_budget_notes.sql (NUEVO)
✅ src/app/actions/budget-versions.ts (NUEVO)
✅ src/app/actions/budget-notes.ts (NUEVO)
✅ src/app/budgets/[id]/versions/ (NUEVO)
✅ src/components/budgets/VersionTimeline.tsx (NUEVO)
✅ src/components/budgets/BudgetNotes.tsx (NUEVO)
```

### Bloque 6: Navegación Unificada

**Status:** ⏳ Pendiente

```
✅ src/components/shared/HierarchicalNavigator.tsx (NUEVO)
⚠️ src/components/tariffs/HierarchyPreview.tsx (REFACTOR - usar nuevo componente)
⚠️ src/components/budgets/BudgetHierarchyForm.tsx (REFACTOR - usar nuevo componente)
```

### Bloque 7: Rich Text Editor

**Status:** ⏳ Pendiente

```
✅ src/components/shared/RichTextEditor.tsx (NUEVO)
⚠️ src/components/tariffs/TariffForm.tsx (MODIFICAR - usar editor)
⚠️ package.json (AÑADIR: @tiptap/react, @tiptap/starter-kit)
```

### Bloque 8: Import/Export

**Status:** ⏳ Pendiente

```
✅ src/app/actions/export.ts (NUEVO)
✅ src/app/actions/import.ts (NUEVO)
✅ src/lib/helpers/export-helpers.ts (NUEVO)
✅ src/app/tariffs/import/ (NUEVO)
✅ src/app/budgets/import/ (NUEVO)
⚠️ src/components/tariffs/TariffList.tsx (MODIFICAR - checkboxes + export)
⚠️ src/components/budgets/BudgetList.tsx (MODIFICAR - checkboxes + export)
```

### Bloque 9: Responsive

**Status:** ⏳ Pendiente

```
✅ src/components/tariffs/TariffCard.tsx (NUEVO - mobile)
✅ src/components/budgets/BudgetCard.tsx (NUEVO - mobile)
✅ src/components/budgets/BudgetFormMobile.tsx (NUEVO)
✅ src/hooks/useMediaQuery.ts (NUEVO)
⚠️ src/components/tariffs/TariffList.tsx (MODIFICAR - responsive)
⚠️ src/components/budgets/BudgetList.tsx (MODIFICAR - responsive)
⚠️ src/components/budgets/BudgetHierarchyForm.tsx (MODIFICAR - condicional mobile)
```

### Bloque 10: Sistema de Ayuda

**Status:** ⏳ Pendiente

```
✅ public/help/ (NUEVO - archivos markdown)
✅ public/help/tours.json (NUEVO - configuración tours)
✅ src/components/help/MarkdownReader.tsx (NUEVO)
✅ src/components/help/TourButton.tsx (NUEVO)
✅ src/components/help/HelpIndex.tsx (NUEVO)
✅ src/lib/helpers/markdown-helpers.ts (NUEVO)
✅ src/lib/helpers/tour-helpers.ts (NUEVO)
✅ src/app/help/[slug]/page.tsx (NUEVO)
⚠️ src/components/layout/Header.tsx (MODIFICAR - añadir enlace ayuda)
⚠️ package.json (AÑADIR: gray-matter, marked, driver.js)
```

---

## 📋 REGLAS FASE 2

### ✅ Permitido CREAR:

- Nuevos componentes en carpetas específicas de bloques
- Nuevos helpers en `src/lib/helpers/` (sin modificar existentes)
- Nuevos validators específicos
- Nuevas páginas para features adicionales
- Nuevas Server Actions en archivos nuevos
- Tests (crear carpeta `__tests__` si no existe)
- Migraciones SQL numeradas secuencialmente (004, 005, 006...)

### ⚠️ Permitido MODIFICAR (con precaución):

- **EXTENDER** Server Actions existentes (añadir funciones, no cambiar existentes)
- **AÑADIR** campos a tipos TypeScript (extender, no cambiar)
- **MODIFICAR** componentes UI para añadir features (mantener funcionalidad original)
- **MEJORAR** mensajes de error sin cambiar lógica
- **OPTIMIZAR** performance sin romper funcionalidad
- **CORREGIR** bugs críticos documentados

### ❌ NO Permitido:

- Cambiar estructura de carpetas del MVP
- Modificar schemas BD sin migración SQL
- Refactorizar código que funciona (salvo bug crítico)
- Cambiar convenciones establecidas en Fase 1
- Eliminar funcionalidades del MVP
- Modificar payload PDF sin documentar cambios para Rapid-PDF

---

## 🔍 Antes de Modificar Archivo READ-ONLY

### Checklist obligatorio:

1. ¿Es un bug crítico que rompe funcionalidad? → SI: OK, NO: buscar alternativa
2. ¿Puedo resolver creando nuevo componente/helper? → SI: crear nuevo, NO: continuar
3. ¿Afecta a otros módulos de Fase 1? → SI: consultar `arquitectura.md`, NO: continuar
4. ¿He documentado el "por qué" en commit message? → SI: OK, NO: documentar antes

### Formato commit cuando modificas READ-ONLY:

```
fix(critical): [módulo] - Descripción bug

BREAKING: Modificado archivo READ-ONLY: src/path/file.ts
Razón: [Explicación detallada del bug crítico]
Afecta: [Listar funcionalidades afectadas]
Testing: [Cómo se validó el fix]
```

---

## 🛠️ Extensiones Permitidas vs Refactors Prohibidos

### ✅ EXTENSIÓN (Permitido):

```typescript
// src/app/actions/tariffs.ts

// ✅ AÑADIR nueva función
export async function setTariffAsTemplate(tariffId: string) {
  // nueva funcionalidad
}

// ✅ NO CAMBIAR funciones existentes como getTariffs()
```

### ❌ REFACTOR (Prohibido sin justificación):

```typescript
// ❌ NO hacer esto sin bug crítico:
export async function getTariffs() {
  // cambiar toda la lógica existente
}
```

---

## ✅ Checklist Pre-Commit (Fase 2)

### Antes de cada commit:

- [ ] **¿Modifiqué archivo READ-ONLY?**

  - SI: ¿Bug crítico? → Documentar en commit
  - NO: Perfecto, continuar

- [ ] **¿Añadí nueva dependencia?**

  - Justificar necesidad en commit
  - Verificar alternativas en deps actuales

- [ ] **¿Cambié estructura de datos (BD)?**

  - Crear migración SQL numerada
  - Actualizar tipos TypeScript
  - Verificar compatibilidad datos existentes

- [ ] **¿Modifiqué Server Action existente?**

  - Verificar no rompe funcionalidad actual
  - Testear casos edge
  - Documentar cambios

- [ ] **¿Añadí nueva feature?**

  - Documentar en `tareas.md`
  - Seguir convenciones de `arquitectura.md`
  - Actualizar progreso en `planificacion.md`

- [ ] **¿Código listo para review?**
  - Sin console.logs de debug
  - Nombres variables descriptivos
  - Comentarios en lógica compleja
  - Errores manejados correctamente

---

## 📝 Formato Commit Messages Fase 2

```
<tipo>(<bloque>): descripción corta

<cuerpo opcional>
```

**Tipos:**

- `feat`: nueva funcionalidad
- `fix`: corrección bugs
- `refactor`: mejora código (solo si necesario)
- `docs`: documentación
- `test`: tests
- `perf`: optimización performance
- `chore`: tareas mantenimiento

**Bloques:**

- `users`: Bloque 1
- `tariffs`: Bloque 2
- `config`: Bloque 3
- `fiscal`: Bloque 4 (IRPF/RE)
- `versions`: Bloque 5
- `navigation`: Bloque 6
- `editor`: Bloque 7
- `import-export`: Bloque 8
- `responsive`: Bloque 9
- `help`: Bloque 10 (Sistema de Ayuda)

**Ejemplos:**

```
feat(users): añadir página de registro

feat(fiscal): implementar cálculo IRPF

fix(critical): corregir cálculo IVA en presupuestos
BREAKING: Modificado src/lib/helpers/calculation-helpers.ts

docs(users): actualizar README con flujo registro
```

---

## 📚 Documentación de Referencia Fase 2

### Documentos Activos:

- `prd.md` - Product Requirements Fase 2
- `planificacion.md` - Roadmap y timeline Fase 2
- `tareas.md` - Tareas activas por bloque
- `claude.md` - Este documento (instrucciones)
- `arquitectura.md` - Guía técnica (añadir cambios Fase 2)

### Documentos Archivo (Fase 1):

- `docs/fase1/prd.md`
- `docs/fase1/planificacion.md`
- `docs/fase1/tareas.md`
- `docs/fase1/mvp-completado.md`

### Documentos Referencia:

- `mvp-completado.md` - Estado final MVP, limitaciones conocidas
- `arquitectura.md` - Stack, patrones, convenciones

---

## 🎯 Funcionalidades Fase 2 (Roadmap)

### INMEDIATO (Semanas 1-2): ⏳

1. ✅ Sistema registro completo
2. ✅ Recuperación contraseña
3. ✅ CRUD usuarios (admin)
4. ✅ Campo user_id en tarifas
5. ✅ Detección automática IVAs

### CORTO PLAZO (Semanas 3-4): ⏳

6. ✅ Tabla config
7. ✅ Selector plantillas PDF
8. ✅ Tarifa por defecto

### MEDIO PLAZO (Semanas 5-8): ⏳

9. ✅ IRPF completo
10. ✅ Recargo Equivalencia
11. ✅ Sistema versiones
12. ✅ Sistema notas

### LARGO PLAZO (Semanas 9-13): ⏳

13. ✅ Navegación unificada
14. ✅ Rich text editor
15. ✅ Import/Export
16. ✅ Responsive completo
17. ⏳ Sistema de ayuda (Markdown + Driver.js)

---

## 🚀 Stack Tecnológico (Sin cambios Fase 2)

- **Framework:** Next.js 15.5.4 (App Router) + Turbopack
- **Lenguaje:** TypeScript 5
- **React:** 19.1.0
- **Estilos:** Tailwind CSS 3.4 + tailwindcss-animate
- **Componentes:** shadcn/ui (Radix UI)
- **Base de datos:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth con RLS
- **Validación:** Zod 4.1
- **PDF:** Rapid-PDF (microservicio externo)
- **Storage:** Directorios locales (`/public/pdfs/`, `/public/logos/`)
- **Notificaciones:** Sonner (toasts)
- **Iconos:** Lucide React

**Nuevas deps Fase 2:**

- `@tiptap/react` - Rich text editor (Bloque 7)
- `@tiptap/starter-kit` - Extensiones básicas Tiptap
- `@tiptap/extension-placeholder` - Placeholder text
- `gray-matter` - Frontmatter parser para Markdown (Bloque 10)
- `marked` - Markdown to HTML converter (Bloque 10)
- `driver.js` - Interactive tours library (Bloque 10)

---

## 🔧 Puntos Críticos Fase 2

### 1. Cálculos Fiscales (IRPF/RE)

**Regla de oro:** Validar con contador antes de implementar

- IRPF: aplicar solo si emisor=autónomo Y cliente=empresa|autónomo
- RE: aplicar solo si cliente=autónomo Y checkbox marcado
- Cálculos: base × (% / 100)
- Testing exhaustivo con casos reales

### 2. Migraciones SQL

**Regla de oro:** Backup antes de cada migración

- Numerar secuencialmente: 004-030 (última ejecutada: 030)
- **CRÍTICO:** Migración 030 añade políticas RLS faltantes para tabla `tariffs`
- Incluir rollback en comentario
- Testear en staging primero
- Migrar datos existentes si necesario
- **Migraciones ejecutadas:** 004-030 (27 migraciones en Fase 2)

### 3. Payload PDF (cambios para Rapid-PDF)

**Regla de oro:** Documentar todos los cambios

- Mantener estructura compatible con Fase 1
- Añadir campos opcionales: `irpf`, `re`
- Formato moneda español consistente
- Comunicar cambios a equipo Rapid-PDF

### 4. Responsive Mobile

**Regla de oro:** Mobile-first, progressive enhancement

- Diseñar mobile primero
- Testear en dispositivos reales (tablet, smartphone)
- Touch-friendly (botones mínimo 44×44px)
- Navegación adaptativa sin pérdida funcionalidad

### 5. Versiones y Backups

**Regla de oro:** Nunca perder datos

- Guardar snapshot completo en versiones
- json_budget_data + json_client_data
- Restauración sin pérdida datos
- Testing restauración obligatorio

---

## 📊 Métricas Fase 2

### Por Bloque:

- Tareas completadas / Total tareas
- Tiempo real vs estimado
- Bugs introducidos/resueltos
- Code coverage (objetivo: > 60%)

### Global:

- **Progreso:** 38% (20/53 tareas)
- **Bloques completados:** 5/10 (Usuarios ✅, Tarifas ✅, Config ✅, IRPF/RE ✅, Versiones ✅)
- **Bloques parciales:** Rich Editor ✅ (Bloque 7), Import/Export ✅ (Bloque 8)
- **Semanas consumidas:** 7/13
- **Bugs críticos resueltos:** 1 (RLS tariffs - migración 030)
- **Mejoras UX:** 8 implementadas

---

## 🎯 Criterios de Completado Fase 2

### Funcional:

- ✅ Registro usuarios funcional (empresa/autónomo)
- ✅ CRUD usuarios operativo
- ✅ IRPF calculado correctamente
- ✅ RE aplicable y configurable
- ✅ Versiones de presupuestos
- ✅ Notas con timeline
- ✅ Navegación unificada
- ✅ Rich text editor integrado
- ✅ Import/Export operativo
- ✅ Responsive tablet/móvil
- ⏳ Sistema de ayuda (Markdown + Tours)

### Calidad:

- ✅ 0 bugs críticos
- ✅ < 5 bugs menores
- ✅ Tests > 60% coverage
- ✅ E2E flujos principales
- ✅ Performance < 3s carga
- ✅ Documentación actualizada
- ✅ Sin warnings ESLint críticos
- ✅ Accesibilidad básica (ARIA)

### Preparación SaaS:

- ✅ Arquitectura multi-tenant lista
- ✅ Tabla emisores operativa
- ✅ Config centralizada en BD
- ✅ Permisos RLS robustos
- ✅ Backup/restore funcional

---

## 🚧 Limitaciones Conocidas Fase 2

### Técnicas:

- **Emails:** Depende de configuración Supabase (templates manuales)
- **Rich Text:** Solo HTML básico (negrita, cursiva, listas)
- **Import/Export:** Solo JSON/CSV, no Excel binario
- **Responsive:** Optimizado para tablet/móvil, no smartwatch
- **Versiones:** Sin límite, puede crecer BD indefinidamente

### UX:

- **Dark mode:** Postponed a Fase 3
- **Multi-idioma:** Solo español en Fase 2
- **Notificaciones push:** Postponed a Fase 3
- **Analytics avanzados:** Postponed a Fase 3

### Performance:

- **Sin paginación:** Listados pueden ser lentos con > 100 items
- **Sin lazy loading:** Imágenes preview plantillas cargan todas
- **Sin caché:** Config se lee de BD en cada request (optimizar si necesario)

---

## 🔄 Proceso de Trabajo Fase 2

### 1. Antes de empezar nueva tarea:

```bash
1. Leer tareas.md - ¿Qué bloque estoy trabajando?
2. Leer prd.md - ¿Cuáles son los requisitos?
3. Verificar dependencias - ¿Bloques previos completados?
4. Revisar claude.md - ¿Archivos permitidos/prohibidos?
```

### 2. Durante desarrollo:

```bash
1. Crear archivos nuevos en carpetas correctas
2. Documentar cambios en archivos existentes
3. Testear funcionalidad localmente
4. Actualizar tipos TypeScript si necesario
5. No dejar console.logs de debug
```

### 3. Antes de commit:

```bash
1. Ejecutar ESLint: npm run lint
2. Verificar tipos: npx tsc --noEmit
3. Testear funcionalidad manualmente
4. Revisar checklist pre-commit
5. Commit con mensaje descriptivo
```

### 4. Al completar tarea:

```bash
1. Marcar tarea en tareas.md: ⏳ → ✅
2. Actualizar progreso en planificacion.md
3. Documentar cambios relevantes en arquitectura.md
4. Comunicar en daily standup
```

### 5. Al completar bloque:

```bash
1. Review completo del bloque
2. Testing integración con otros bloques
3. Actualizar documentación
4. Demo a stakeholders
5. Planning siguiente bloque
```

---

## 🧪 Testing Guidelines Fase 2

### Unit Tests (objetivo: > 60% coverage):

```typescript
// Helpers y cálculos SIEMPRE con tests
describe("fiscal-calculations", () => {
  describe("calculateIRPF", () => {
    it("should calculate IRPF correctly", () => {
      const base = 1000;
      const percentage = 15;
      expect(calculateIRPF(base, percentage)).toBe(150);
    });

    it("should return 0 if percentage is 0", () => {
      expect(calculateIRPF(1000, 0)).toBe(0);
    });
  });
});
```

### Integration Tests (Server Actions):

```typescript
// Testar flujos completos con mock de Supabase
describe("users actions", () => {
  it("should create user and emisor", async () => {
    const result = await registerUser({
      email: "test@test.com",
      password: "Test123!",
      tipo: "autonomo",
      // ...
    });

    expect(result.success).toBe(true);
    expect(result.data.emisor).toBeDefined();
  });
});
```

### E2E Tests (Playwright - críticos):

```typescript
// Flujos completos end-to-end
test("register and create first tariff", async ({ page }) => {
  // 1. Registrarse
  await page.goto("/register");
  await page.fill('[name="email"]', "nuevo@test.com");
  // ...
  await page.click('button[type="submit"]');

  // 2. Crear tarifa
  await page.goto("/tariffs/create");
  // ...

  // 3. Verificar tarifa creada
  await expect(page.locator("text=Tarifa creada")).toBeVisible();
});
```

---

## 🆘 Troubleshooting Fase 2

### Problema: Migración SQL falla

```bash
# Verificar estado actual
psql -d postgres -c "SELECT version FROM schema_migrations;"

# Rollback manual si necesario
psql -d postgres -f migrations/rollback_XXX.sql

# Re-ejecutar migración
psql -d postgres -f migrations/XXX_description.sql
```

### Problema: Cálculos IRPF incorrectos

```bash
# Verificar matriz de aplicación
1. Emisor tipo = ? (empresa | autónomo)
2. Cliente tipo = ? (empresa | autónomo | particular)
3. ¿Aplica IRPF? Ver matriz en prd.md

# Testear con casos reales
- Autónomo → Empresa: SÍ aplica
- Autónomo → Particular: NO aplica
- Empresa → cualquiera: NO aplica
```

### Problema: Responsive no funciona en móvil

```bash
# Verificar breakpoints
1. Tailwind: md: >= 768px
2. useMediaQuery correcto
3. Condicional renderizado: hidden md:block / md:hidden

# Testear en Chrome DevTools
- Toggle device toolbar
- Probar diferentes tamaños
- Verificar touch events
```

### Problema: Import falla con JSON válido

```bash
# Verificar estructura
1. JSON.parse(content) sin errores
2. Validar campos obligatorios
3. IDs duplicados detectados
4. empresa_id y user_id asignados correctamente

# Logs detallados
console.log('[import] Parsing...', content.substring(0, 100));
console.log('[import] Validating...', data.length, 'items');
```

---

## 📝 Plantillas de Código Fase 2

### Nueva Server Action:

```typescript
// src/app/actions/[modulo].ts
"use server";

import { createServerActionClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { getServerUser } from "@/lib/auth/server";

/**
 * Descripción de la acción
 * @param params - Descripción parámetros
 * @returns ActionResult con data o error
 */
export async function myNewAction(params: MyParams): Promise<ActionResult> {
  try {
    console.log("[myNewAction] Iniciando...", params);

    // 1. Validación entrada
    if (!params.field) {
      return { success: false, error: "Campo requerido" };
    }

    // 2. Autenticación
    const user = await getServerUser();
    if (!user) {
      return { success: false, error: "No autenticado" };
    }

    // 3. Autorización (si aplica)
    if (user.role === "vendedor") {
      return { success: false, error: "Sin permisos" };
    }

    // 4. Lógica de negocio
    const cookieStore = await cookies();
    const supabase = createServerActionClient({ cookies: () => cookieStore });

    const { data, error } = await supabase
      .from("table")
      .insert({ ...params, user_id: user.id })
      .select()
      .single();

    if (error) {
      console.error("[myNewAction] Error DB:", error);
      return { success: false, error: error.message };
    }

    // 5. Revalidación (si aplica)
    // revalidatePath('/path');

    // 6. Log éxito
    console.log("[myNewAction] Éxito:", data.id);

    // 7. Retorno
    return { success: true, data };
  } catch (error) {
    console.error("[myNewAction] Error inesperado:", error);
    return { success: false, error: "Error inesperado" };
  }
}
```

### Nueva Migración SQL:

```sql
-- migrations/XXX_description.sql
-- Descripción: [Qué hace esta migración]
-- Fecha: YYYY-MM-DD
-- Bloque: [1-9]

-- ============================================
-- UP: Aplicar cambios
-- ============================================

BEGIN;

-- 1. Crear tabla/columna
CREATE TABLE IF NOT EXISTS public.table_name (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campo TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Índices
CREATE INDEX idx_table_campo ON table_name(campo);

-- 3. RLS policies
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

CREATE POLICY "table_select_policy"
ON table_name FOR SELECT
USING (auth.uid() IS NOT NULL);

-- 4. Datos iniciales (si aplica)
-- INSERT INTO ...

COMMIT;

-- ============================================
-- DOWN: Rollback (documentar, no ejecutar)
-- ============================================

-- DROP TABLE IF EXISTS public.table_name CASCADE;
```

### Nuevo Componente:

```typescript
// src/components/[modulo]/ComponentName.tsx
"use client"; // solo si necesita interactividad

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { myAction } from "@/app/actions/[modulo]";
import { toast } from "sonner";

interface ComponentNameProps {
  prop1: string;
  onSuccess?: () => void;
}

export function ComponentName({ prop1, onSuccess }: ComponentNameProps) {
  const [loading, setLoading] = useState(false);

  async function handleAction() {
    setLoading(true);

    const result = await myAction({ field: prop1 });

    if (result.success) {
      toast.success("Operación exitosa");
      onSuccess?.();
    } else {
      toast.error(result.error);
    }

    setLoading(false);
  }

  return (
    <div>
      <Button onClick={handleAction} disabled={loading}>
        {loading ? "Cargando..." : "Acción"}
      </Button>
    </div>
  );
}
```

---

## 🎓 Mejores Prácticas Fase 2

### 1. Nomenclatura:

- Componentes: `PascalCase.tsx`
- Server Actions: `camelCase()`
- Tipos: `PascalCase`
- Constantes: `UPPER_SNAKE_CASE`

### 2. Estructura:

- Mantener componentes < 300 líneas
- Extraer lógica compleja a helpers
- Un componente por archivo
- Imports ordenados (externos → internos → tipos)

### 3. Performance:

- useCallback para funciones pasadas a children
- useMemo para cálculos costosos
- Lazy load componentes pesados
- Optimizar queries (select solo campos necesarios)

### 4. Accesibilidad:

- Labels en todos los inputs
- Roles ARIA en elementos interactivos
- Keyboard navigation funcional
- Contraste colores suficiente (WCAG AA)

### 5. Seguridad:

- Validar siempre en servidor (Server Actions)
- No exponer service_role key
- RLS policies en todas las tablas
- Sanitizar inputs antes de guardar

---

## 🚀 Deploy Fase 2 (cuando esté lista)

### Pre-deploy Checklist:

- [ ] Todas las tareas completadas
- [ ] 0 bugs críticos
- [ ] Tests pasando (> 60% coverage)
- [ ] Performance validada
- [ ] Responsive testeado en dispositivos reales
- [ ] Documentación actualizada
- [ ] Backup BD producción
- [ ] Variables entorno configuradas
- [ ] Migraciones SQL preparadas

### Deploy Steps:

1. Backup BD producción
2. Ejecutar migraciones SQL (004-011)
3. Deploy app a Vercel
4. Verificar conexiones (Supabase, Rapid-PDF)
5. Smoke tests producción
6. Monitoreo 24h post-deploy
7. Comunicar a usuarios cambios

---

## 📞 Contactos y Recursos

### Equipo:

- **Product Owner:** [Nombre]
- **Tech Lead:** [Nombre]
- **QA Lead:** [Nombre]

### Servicios:

- **Supabase Dashboard:** [URL]
- **Rapid-PDF Docs:** [URL]
- **Vercel Dashboard:** [URL]

### Comunicación:

- **Daily Standup:** Lunes-Viernes 10:00
- **Weekly Review:** Viernes 16:00
- **Slack Channel:** #jeyca-presu-dev

---

**Documento:** Claude Code Fase 2
**Versión:** 1.2
**Fecha:** 2025-01-18
**Estado:** Activo
**Última actualización:** Añadido Bloque 10 - Sistema de Ayuda (Markdown + Driver.js)
**Próxima revisión:** Fin Semana 9
