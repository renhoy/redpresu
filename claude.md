# Claude Code - jeyca-presu

## 📊 Estado del Proyecto

**Fase Actual:** Fase 2 (Post-MVP)
**Progreso MVP:** 100% ✅
**Progreso Fase 2:** 0% ⏳

**Último módulo completado:** Dashboard (MVP funcional)
**Siguiente objetivo:** [se definirá en fase2-requisitos.md]

## 🔒 ARCHIVOS READ-ONLY - MVP COMPLETADO (NO MODIFICAR)

### Fase 1: SHARED (Base común)
- ✅ src/lib/database/* (Database)
- ✅ src/lib/types/* (Types)
- ✅ src/lib/supabase/* (Supabase client)
- ✅ src/lib/auth/* (Auth)
- ✅ src/components/auth/* (Auth components)
- ✅ src/app/(auth)/* (Auth pages)
- ✅ src/middleware.ts (Auth middleware)
- ✅ auth.config.ts (Auth config)
- ✅ src/lib/utils/* (Utilidades)
- ✅ src/lib/validators/* (Validadores)
- ✅ src/lib/helpers/* (Helpers)
- ✅ src/lib/constants/* (Constantes)

### Fase 1: Features Core
- ✅ src/app/tariffs/* (Tariff Management)
- ✅ src/components/tariffs/* (Tariff components)
- ✅ src/app/actions/tariffs.ts (Tariff actions)
- ✅ src/app/budgets/* (Budget Creation)
- ✅ src/components/budgets/* (Budget components)
- ✅ src/app/actions/budgets.ts (Budget actions + PDF generation)
- ✅ src/app/dashboard/* (Dashboard)
- ✅ src/components/dashboard/* (Dashboard components)
- ✅ src/components/layout/Header.tsx (Navigation)
- ✅ src/app/actions/dashboard.ts (Dashboard actions)

### Configuración
- ✅ tailwind.config.ts
- ✅ next.config.ts
- ✅ tsconfig.json
- ✅ package.json (no añadir deps sin consultar)
- ✅ components.json (shadcn/ui)

### Base de Datos
- ✅ migrations/* (Database - READ-ONLY)
- ✅ database.types.ts (Database - READ-ONLY)
- ✅ schema.sql (Database - READ-ONLY)
- ✅ seed.sql (Database - READ-ONLY)

**IMPORTANTE:** Estos archivos NO se modifican en Fase 2 salvo bugs críticos.

## 📋 REGLAS FASE 2 (Post-MVP)

### ✅ Permitido CREAR:
- Nuevos componentes en carpetas específicas de features
- Nuevos helpers en `src/lib/helpers/` (sin modificar existentes)
- Nuevos validators específicos
- Nuevas páginas para features adicionales
- Tests (crear carpeta `__tests__`)
- Nuevas features en `src/features/[nombre]/`

### ✅ Permitido MODIFICAR (con cuidado):
- Agregar campos a tipos existentes (extender, no cambiar)
- Añadir nuevas Server Actions (no modificar existentes)
- Mejorar mensajes de error (sin cambiar lógica)
- Optimizar performance (sin romper funcionalidad)
- Corregir bugs críticos documentados

### ❌ NO Permitido:
- Cambiar estructura de carpetas del MVP
- Modificar schemas de BD sin migración
- Refactorizar código que funciona (salvo bug crítico)
- Cambiar convenciones establecidas
- Eliminar funcionalidades del MVP

### 🔍 Antes de Modificar Archivo READ-ONLY:
1. ¿Es un bug crítico que rompe funcionalidad? → OK
2. ¿Es mejora cosmética o refactor? → NO, crear nuevo componente
3. ¿Afecta a otros módulos? → Consultar `arquitectura.md`

### 🐛 Corrección de Bugs:
- **Bugs críticos:** pueden modificar READ-ONLY
- **Bugs menores:** preferir wrapper/extensión antes que modificar
- **Siempre documentar** en commit el "por qué" se modifica READ-ONLY

### ✨ Nuevas Features:
- Crear carpeta propia: `src/features/[nombre]/`
- No mezclar con código MVP
- Usar helpers existentes del MVP (imports, no copiar)

## ✅ Checklist Pre-Commit (Fase 2)

Antes de cada commit, verificar:

- [ ] **¿Modifiqué algún archivo READ-ONLY?**
  - Si SÍ: ¿Es bug crítico? Documentar en commit
  - Si NO: Perfecto, continuar

- [ ] **¿Agregué nueva dependencia?**
  - Justificar necesidad en commit message
  - Verificar que no existe alternativa en deps actuales

- [ ] **¿Cambié estructura de datos?**
  - Crear migración SQL
  - Actualizar tipos TypeScript
  - Verificar compatibilidad con datos existentes

- [ ] **¿Modifiqué Server Action existente?**
  - Verificar que no rompe funcionalidad actual
  - Testear casos edge

- [ ] **¿Agregué nueva feature?**
  - Documentar en `fase2-requisitos.md`
  - Seguir convenciones de `arquitectura.md`

**Formato commit message:**
- `feat:` nuevas features
- `fix:` corrección bugs
- `refactor:` mejora código (solo si necesario)
- `docs:` documentación
- `test:` tests
- `perf:` optimización performance

## 📚 Documentación de Referencia

### Documentos MVP (leer antes de Fase 2):
- `prd.md` - Product Requirements completo
- `planificacion.md` - Roadmap y fases
- `mvp-completado.md` - Estado final MVP, limitaciones, deuda técnica
- `arquitectura.md` - Guía técnica completa
- `importerCSV.md` - Flujo importación CSV
- `tareas.md` - Histórico de tareas

### Documentos Fase 2 (crear según necesidad):
- `fase2-requisitos.md` - Features y bugs Fase 2
- `fase2-tareas.md` - Tareas activas Fase 2

## 🏗️ Stack Tecnológico

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

## 🎯 Funcionalidades MVP Completadas

### 1. Autenticación y Usuarios
- ✅ Login/Logout con Supabase Auth
- ✅ Roles: superadmin, admin, vendedor
- ✅ Middleware protección rutas
- ✅ RLS policies (12 policies)

### 2. Gestión de Tarifas
- ✅ CRUD completo
- ✅ Importación CSV con validación jerárquica
- ✅ Preview interactivo con colores dinámicos
- ✅ Logo dual-mode (archivo local O URL externa)
- ✅ Activar/desactivar tarifas
- ✅ Filtros y búsqueda

### 3. Creación de Presupuestos
- ✅ Formulario 2 pasos (Cliente → Presupuesto)
- ✅ Formulario jerárquico dinámico
- ✅ Cálculos en tiempo real
- ✅ Gestión de estados (6 estados)
- ✅ Listado con filtros
- ✅ Edición presupuestos existentes

### 4. Generación PDF
- ✅ Integración Rapid-PDF API
- ✅ Construcción payload automática
- ✅ Filtrado y renumeración jerárquica
- ✅ Sistema guardado inteligente (sobrescribir/duplicar)
- ✅ Almacenamiento local `/public/pdfs/`

### 5. Dashboard
- ✅ Header navegación global sticky
- ✅ Estadísticas por estado con filtros
- ✅ Accesos rápidos
- ✅ Últimos presupuestos
- ✅ Próximos a caducar
- ✅ Permisos por rol

## 🚀 Roadmap Fase 2

### Prioridad ALTA (Fase 2):
1. **Testing y Calidad**
   - Tests unitarios (helpers, validators)
   - Tests integración (Server Actions)
   - Tests E2E (flujos críticos)
   - Resolver ESLint warnings

2. **Optimización Performance**
   - Paginación en listados
   - Lazy loading imágenes
   - Virtualización listas largas
   - Debounce en búsquedas
   - Code splitting

3. **Mejoras UX**
   - Validación inline todos los campos
   - Mensajes error específicos
   - Accesibilidad (ARIA, keyboard)
   - Optimización mobile

4. **Features Prioritarias**
   - Envío automático PDFs por email
   - Notificaciones (caducidad, cambios estado)
   - Histórico de versiones
   - Exportación Excel/CSV
   - Chat/comentarios internos

5. **DevOps y Deployment**
   - Configuración producción (Vercel)
   - Variables entorno producción
   - Migración DB producción
   - Sistema backup automatizado
   - Monitoreo y logs (Sentry)
   - CI/CD pipeline

### Largo Plazo (Fase 3):
- Integración CRM externo
- Firma digital presupuestos
- Plantillas email personalizables
- Multiidioma
- Monedas alternativas
- Reportes analytics avanzados
- Modo offline/PWA
- API pública

### No Aplica a Este Proyecto:
- ❌ Descuentos/promociones (se manejan con tarifas diferentes)
- ❌ IVA configurable (viene definido en CSV de tarifa)
- ❌ Gestión productos independiente (se usan tarifas independientes)

## 📐 Restricciones Técnicas

- No localStorage/sessionStorage para datos sensibles
- Compatibilidad tablet obligatoria
- Límite 60 segundos generación PDF
- Máximo 200 clientes por empresa (estimado)
- Formato números: español en UI (1.234,56), inglés en DB (1234.56)
- IDs jerárquicos: validación estricta (1, 1.1, 1.1.1, 1.1.1.1)
- Profundidad máxima: 4 niveles

## 🎨 Convenciones de Código

### Nomenclatura
- **Componentes:** PascalCase (`TariffForm.tsx`)
- **Funciones:** camelCase (`getTariffs()`)
- **Tipos:** PascalCase (`interface TariffData`)
- **Constantes:** UPPER_SNAKE_CASE (`const IVA_RATE = 0.21`)
- **Archivos utils:** kebab-case (`pdf-payload-builder.ts`)

### Estructura Server Action
```typescript
'use server'

export async function myAction(params: Params): Promise<ActionResult> {
  // 1. Validación
  // 2. Autenticación
  // 3. Autorización
  // 4. Lógica de negocio
  // 5. Revalidación
  // 6. Retorno { success, data?, error? }
}
```

### Retorno Estandarizado
```typescript
interface ActionResult<T = any> {
  success: boolean
  data?: T
  error?: string
}
```

## 🔧 Puntos Críticos

1. **Formato Numérico:** SIEMPRE almacenar en inglés (1234.56), mostrar en español (1.234,56)
2. **Jerarquía:** Validar IDs antes de guardar, padre debe existir
3. **PDFs:** Timeout 60s, logos URL completa
4. **RLS:** NUNCA usar service_role en cliente
5. **Estados:** Validar transiciones (borrador → pendiente → enviado → {aprobado|rechazado})

## 📊 Métricas MVP

- **Líneas código:** ~15,300
- **Componentes:** 34
- **Server Actions:** 21
- **Páginas:** 13
- **Tablas DB:** 4 (empresas, users, tariffs, budgets)
- **RLS Policies:** 12
- **Migraciones:** 3

---

**Última actualización:** 2025-10-03
**Versión:** MVP 1.0 Completado
