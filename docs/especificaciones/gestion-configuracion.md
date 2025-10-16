# Gestión de Configuración

## Información General

**Aplicación:** Redpresu (JEYCA Presupuestos)
**Framework:** Next.js 15.5.4 (App Router)
**Base de datos:** Supabase (PostgreSQL)
**Fecha:** 2025-01-14

---

## 1. Resumen Ejecutivo

La aplicación utiliza un **sistema híbrido de configuración** que combina:

1. **Variables de entorno** (`.env.local`) - Para configuración de infraestructura y claves secretas
2. **Tabla `config` en base de datos** - Para configuración dinámica del sistema accesible desde la UI
3. **Constantes en código** - Para valores inmutables y configuración del sistema

**Arquitectura de configuración:**
- **Nivel 1 (Infraestructura):** Variables de entorno → Nunca cambian en runtime
- **Nivel 2 (Sistema):** Tabla `config` → Modificable por superadmin vía UI
- **Nivel 3 (Aplicación):** Constantes TypeScript → Hardcodeadas en el código

---

## 2. Variables de Entorno

### 2.1 Archivo de Configuración

**Ubicación:** `.env.local` (raíz del proyecto)

> **Nota:** Este archivo está en `.gitignore` y NO se versiona por seguridad. Cada entorno (desarrollo, staging, producción) tiene su propia copia.

**Contenido del archivo `.env.local`:**

```bash
# =====================================================
# SUPABASE - Base de datos y autenticación
# =====================================================

# URL del proyecto Supabase (servidor local con SSH tunnel)
NEXT_PUBLIC_SUPABASE_URL=http://localhost:8002

# Clave anónima pública (cliente)
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Clave de servicio (servidor) - SECRET, nunca exponer en cliente
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# =====================================================
# RAPID-PDF - Servicio de generación de PDFs
# =====================================================

# URL del servicio Rapid-PDF
RAPID_PDF_URL=http://localhost:3001

# API Key para autenticación con Rapid-PDF
RAPID_PDF_API_KEY=rapid-pdf-secret-key-2025

# Modo debug (solo guardar payload sin generar PDF)
RAPID_PDF_DEBUG_ONLY=false

# =====================================================
# APLICACIÓN - URLs y configuración general
# =====================================================

# URL base de la aplicación (para construcción de URLs absolutas)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# URL base pública (alternativa, usado en algunos contextos)
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# URL base de la API (opcional, por defecto /api)
NEXT_PUBLIC_API_URL=/api
```

### 2.2 Variables Detalladas

#### Variables NEXT_PUBLIC_* (Públicas)

Estas variables están **expuestas en el cliente** (navegador) y son accesibles desde componentes React.

| Variable | Tipo | Descripción | Uso |
|----------|------|-------------|-----|
| `NEXT_PUBLIC_SUPABASE_URL` | URL | URL del proyecto Supabase | Cliente Supabase en navegador y servidor |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | JWT | Clave anónima de Supabase | Autenticación del lado del cliente |
| `NEXT_PUBLIC_APP_URL` | URL | URL base de la aplicación | Construcción de URLs absolutas (emails, redirects) |
| `NEXT_PUBLIC_BASE_URL` | URL | URL base alternativa | Usado en constantes del sistema |
| `NEXT_PUBLIC_API_URL` | URL | Ruta base de la API | Requests a API routes (por defecto `/api`) |

**Ejemplo de uso:**

```typescript
// src/lib/supabase/client.ts
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

#### Variables Privadas (Solo Servidor)

Estas variables **NO** están expuestas en el cliente. Solo accesibles en servidor (API routes, Server Actions, Server Components).

| Variable | Tipo | Descripción | Uso |
|----------|------|-------------|-----|
| `SUPABASE_SERVICE_ROLE_KEY` | JWT | Clave de servicio de Supabase | Bypasear RLS, operaciones administrativas |
| `RAPID_PDF_URL` | URL | URL del servicio Rapid-PDF | Generar PDFs de presupuestos |
| `RAPID_PDF_API_KEY` | String | API Key de Rapid-PDF | Autenticación con servicio externo |
| `RAPID_PDF_DEBUG_ONLY` | Boolean | Modo debug (no generar PDF) | Testing y desarrollo |

**Ejemplo de uso:**

```typescript
// src/lib/supabase/server.ts
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceRoleKey, // Solo servidor
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)
```

```typescript
// src/app/actions/budgets.ts
const RAPID_PDF_URL = process.env.RAPID_PDF_URL
const RAPID_PDF_API_KEY = process.env.RAPID_PDF_API_KEY

const response = await fetch(`${RAPID_PDF_URL}/generate`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': RAPID_PDF_API_KEY
  },
  body: JSON.stringify(pdfPayload)
})
```

### 2.3 Validación de Variables

**Ubicación:** `src/lib/supabase/client.ts` y `src/lib/supabase/server.ts`

```typescript
// Validación en tiempo de inicialización
if (!supabaseUrl) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_URL')
}

if (!supabaseAnonKey) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_ANON_KEY')
}

if (!supabaseServiceRoleKey) {
  throw new Error('Missing env.SUPABASE_SERVICE_ROLE_KEY')
}
```

Si alguna variable requerida no está definida, la aplicación **falla en el arranque** con un error claro.

### 2.4 Variables por Entorno

| Entorno | Archivo | Ejemplo URL Supabase | Ejemplo APP_URL |
|---------|---------|---------------------|-----------------|
| **Desarrollo** | `.env.local` | `http://localhost:8002` | `http://localhost:3000` |
| **Staging** | Variables en Vercel | `https://staging.supabase.co` | `https://staging.jeyca.com` |
| **Producción** | Variables en Vercel | `https://prod.supabase.co` | `https://jeyca.com` |

> **Nota:** En Vercel, las variables de entorno se configuran en el dashboard (Settings → Environment Variables).

---

## 3. Tabla `config` - Configuración en Base de Datos

### 3.1 Estructura de la Tabla

**Migración:** `migrations/013_config_table.sql`

```sql
CREATE TABLE IF NOT EXISTS public.config (
  key text NOT NULL,                              -- Clave única
  value jsonb NOT NULL,                           -- Valor en JSON
  description text,                               -- Descripción del parámetro
  category text NOT NULL DEFAULT 'general',       -- Categoría (general, fiscal, pdf, defaults)
  is_system boolean NOT NULL DEFAULT false,       -- Si es true, crítico para el sistema
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT config_pkey PRIMARY KEY (key)
);
```

**Índices:**

```sql
CREATE INDEX idx_config_category ON public.config(category);
CREATE INDEX idx_config_is_system ON public.config(is_system);
```

### 3.2 Campos Detallados

| Campo | Tipo | Obligatorio | Descripción |
|-------|------|-------------|-------------|
| `key` | TEXT | ✅ | Clave única de configuración (ej: `iva_re_equivalences`) |
| `value` | JSONB | ✅ | Valor en formato JSON para flexibilidad (string, object, array, number, boolean) |
| `description` | TEXT | ❌ | Descripción legible del parámetro |
| `category` | TEXT | ✅ | Categoría: `general`, `fiscal`, `pdf`, `defaults` |
| `is_system` | BOOLEAN | ✅ | Si es `true`, es crítico para el sistema |
| `created_at` | TIMESTAMPTZ | ✅ | Fecha de creación |
| `updated_at` | TIMESTAMPTZ | ✅ | Fecha de última actualización |

### 3.3 Categorías de Configuración

| Categoría | Descripción | Ejemplos |
|-----------|-------------|----------|
| `general` | Configuración general del sistema | `app_mode`, `public_registration_enabled` |
| `fiscal` | Configuración fiscal (IVA, RE, IRPF) | `iva_re_equivalences` |
| `pdf` | Configuración de plantillas PDF | `pdf_templates`, `pdf_template_default` |
| `defaults` | Valores por defecto | `default_colors`, `default_primary_color`, `default_secondary_color` |

### 3.4 Configuraciones Iniciales

#### 3.4.1 IVA a Recargo de Equivalencia

**Migración:** `migrations/013_config_table.sql:40-48`

```sql
INSERT INTO public.config (key, value, description, category, is_system)
VALUES (
  'iva_re_equivalences',
  '{"21": 5.2, "10": 1.4, "4": 0.5}'::jsonb,
  'Equivalencias IVA a Recargo de Equivalencia según normativa española',
  'fiscal',
  true
) ON CONFLICT (key) DO NOTHING;
```

**Estructura del valor:**

```json
{
  "21": 5.2,    // IVA 21% → RE 5.2%
  "10": 1.4,    // IVA 10% → RE 1.4%
  "4": 0.5      // IVA 4% → RE 0.5%
}
```

**Uso:**

```typescript
// src/lib/helpers/config-helpers.ts:81-90
export async function getIVAtoREEquivalences(): Promise<IVAtoREEquivalences> {
  const equivalences = await getConfigValue<IVAtoREEquivalences>('iva_re_equivalences')

  // Valores por defecto según normativa española
  return equivalences || {
    '21': 5.2,
    '10': 1.4,
    '4': 0.5
  }
}
```

#### 3.4.2 Plantillas PDF Disponibles

**Migración:** `migrations/013_config_table.sql:50-62`

```sql
INSERT INTO public.config (key, value, description, category, is_system)
VALUES (
  'pdf_templates',
  '[
    {"id": "modern", "name": "Moderna", "description": "Diseño limpio y minimalista"},
    {"id": "classic", "name": "Clásica", "description": "Diseño tradicional profesional"},
    {"id": "elegant", "name": "Elegante", "description": "Diseño sofisticado con detalles"}
  ]'::jsonb,
  'Plantillas de PDF disponibles para presupuestos',
  'pdf',
  true
) ON CONFLICT (key) DO NOTHING;
```

**Estructura del valor:**

```json
[
  {
    "id": "modern",
    "name": "Moderna",
    "description": "Diseño limpio y minimalista"
  },
  {
    "id": "classic",
    "name": "Clásica",
    "description": "Diseño tradicional profesional"
  },
  {
    "id": "elegant",
    "name": "Elegante",
    "description": "Diseño sofisticado con detalles"
  }
]
```

**Uso:**

```typescript
// src/lib/helpers/config-helpers.ts:105-114
export async function getPDFTemplates(): Promise<PDFTemplate[]> {
  const templates = await getConfigValue<PDFTemplate[]>('pdf_templates')

  // Plantillas por defecto
  return templates || [
    { id: 'modern', name: 'Moderna', description: 'Diseño limpio y minimalista' },
    { id: 'classic', name: 'Clásica', description: 'Diseño tradicional profesional' },
    { id: 'elegant', name: 'Elegante', description: 'Diseño sofisticado con detalles' }
  ]
}
```

#### 3.4.3 Plantilla PDF por Defecto

```sql
INSERT INTO public.config (key, value, description, category, is_system)
VALUES (
  'pdf_template_default',
  '"modern"'::jsonb,
  'Plantilla PDF por defecto para nuevos presupuestos',
  'pdf',
  false
) ON CONFLICT (key) DO NOTHING;
```

**Uso:**

```typescript
export async function getDefaultPDFTemplate(): Promise<string> {
  const template = await getConfigValue<string>('pdf_template_default')
  return template || 'modern'
}
```

#### 3.4.4 Colores por Defecto

```sql
INSERT INTO public.config (key, value, description, category, is_system)
VALUES (
  'default_colors',
  '{"primary": "#e8951c", "secondary": "#109c61"}'::jsonb,
  'Colores por defecto para pre-cargar en nuevas tarifas',
  'defaults',
  false
) ON CONFLICT (key) DO NOTHING;
```

**Estructura del valor:**

```json
{
  "primary": "#e8951c",      // Color primario (naranja)
  "secondary": "#109c61"     // Color secundario (verde)
}
```

#### 3.4.5 Modo de Aplicación

**Migración:** `migrations/022_config_environment.sql:10-17`

```sql
INSERT INTO public.config (key, value, description, category, is_system)
VALUES (
  'app_mode',
  '"development"'::jsonb,
  'Modo de aplicación: development o production',
  'general',
  false
) ON CONFLICT (key) DO NOTHING;
```

**Valores posibles:** `"development"` | `"production"`

**Uso:**

```typescript
// src/lib/helpers/config-helpers.ts:177-189
export async function getAppMode(): Promise<'development' | 'production'> {
  const mode = await getConfigValue<string>('app_mode')
  return (mode === 'production' ? 'production' : 'development') as 'development' | 'production'
}

export async function isDevelopmentMode(): Promise<boolean> {
  const mode = await getAppMode()
  return mode === 'development'
}
```

#### 3.4.6 Registro Público Habilitado

**Migración:** `migrations/022_config_environment.sql:22-29`

```sql
INSERT INTO public.config (key, value, description, category, is_system)
VALUES (
  'public_registration_enabled',
  'true'::jsonb,
  'Permitir que empresas y autónomos se registren públicamente',
  'general',
  false
) ON CONFLICT (key) DO NOTHING;
```

**Uso:**

```typescript
export async function isPublicRegistrationEnabled(): Promise<boolean> {
  const enabled = await getConfigValue<boolean>('public_registration_enabled')
  return enabled ?? true // Por defecto está habilitado
}
```

### 3.5 Row Level Security (RLS)

**Políticas RLS:** `migrations/013_config_table.sql:85-115`

#### SELECT - Todos los autenticados pueden leer

```sql
CREATE POLICY "config_select_policy"
  ON public.config FOR SELECT
  USING (auth.uid() IS NOT NULL);
```

**Permite:** Cualquier usuario autenticado puede leer la configuración.

#### INSERT - Solo superadmin

```sql
CREATE POLICY "config_insert_policy"
  ON public.config FOR INSERT
  WITH CHECK (
    public.get_user_role_by_id(auth.uid()) = 'superadmin'
  );
```

**Permite:** Solo superadmin puede crear nuevas configuraciones.

#### UPDATE - Solo superadmin

```sql
CREATE POLICY "config_update_policy"
  ON public.config FOR UPDATE
  USING (
    public.get_user_role_by_id(auth.uid()) = 'superadmin'
  )
  WITH CHECK (
    public.get_user_role_by_id(auth.uid()) = 'superadmin'
  );
```

**Permite:** Solo superadmin puede actualizar configuraciones (incluyendo `is_system: true`).

#### DELETE - Solo superadmin y solo si NO es sistema

```sql
CREATE POLICY "config_delete_policy"
  ON public.config FOR DELETE
  USING (
    public.get_user_role_by_id(auth.uid()) = 'superadmin'
    AND is_system = false
  );
```

**Permite:** Solo superadmin puede eliminar configuraciones **no críticas** (`is_system = false`).

**Matriz de Permisos:**

| Rol | SELECT | INSERT | UPDATE | DELETE |
|-----|--------|--------|--------|--------|
| **Superadmin** | ✅ Todas | ✅ Sí | ✅ Todas (incluye `is_system: true`) | ✅ Solo `is_system: false` |
| **Admin** | ✅ Todas | ❌ No | ❌ No | ❌ No |
| **Vendedor** | ✅ Todas | ❌ No | ❌ No | ❌ No |
| **No autenticado** | ❌ No | ❌ No | ❌ No | ❌ No |

---

## 4. Server Actions - Gestión de Configuración

**Ubicación:** `src/app/actions/config.ts`

### 4.1 Listar Toda la Configuración

```typescript
export async function getAllConfig(): Promise<{
  success: boolean
  data?: ConfigRow[]
  error?: string
}>
```

**Permisos:** Solo superadmin
**Retorna:** Todas las configuraciones ordenadas por `category, key`

**Uso:**

```typescript
// src/app/settings/page.tsx
const result = await getAllConfig()

if (result.success) {
  const config = result.data || []
  // Agrupar por categoría...
}
```

### 4.2 Listar Configuración por Categoría

```typescript
export async function getConfigByCategory(category: string): Promise<{
  success: boolean
  data?: ConfigRow[]
  error?: string
}>
```

**Permisos:** Solo superadmin
**Parámetros:** `category` - `'general'` | `'fiscal'` | `'pdf'` | `'defaults'`
**Retorna:** Configuraciones de la categoría ordenadas por `key`

**Ejemplo:**

```typescript
const result = await getConfigByCategory('fiscal')
// Retorna: iva_re_equivalences, etc.
```

### 4.3 Actualizar Valor de Configuración

```typescript
export async function updateConfigValue(
  key: string,
  value: unknown,
  description?: string
): Promise<{
  success: boolean
  error?: string
}>
```

**Permisos:** Solo superadmin
**Parámetros:**
- `key` - Clave de configuración a actualizar
- `value` - Nuevo valor (cualquier tipo JSON: string, number, object, array, boolean)
- `description` - (Opcional) Nueva descripción

**Proceso:**

1. Verificar que el usuario es superadmin
2. Verificar que la clave existe
3. Actualizar `value` y `description`
4. Actualizar `updated_at` automáticamente
5. Revalidar `/settings` para refrescar UI

**Ejemplo:**

```typescript
const result = await updateConfigValue(
  'pdf_template_default',
  'classic', // Cambiar de 'modern' a 'classic'
  'Plantilla clásica por defecto'
)

if (result.success) {
  toast.success('Configuración actualizada')
}
```

### 4.4 Crear Nueva Configuración

```typescript
export async function createConfigValue(
  key: string,
  value: unknown,
  description: string,
  category: string = 'general',
  isSystem: boolean = false
): Promise<{
  success: boolean
  error?: string
}>
```

**Permisos:** Solo superadmin
**Parámetros:**
- `key` - Clave única de configuración
- `value` - Valor inicial
- `description` - Descripción del parámetro
- `category` - Categoría (por defecto `'general'`)
- `isSystem` - Si es crítico para el sistema (por defecto `false`)

**Ejemplo:**

```typescript
const result = await createConfigValue(
  'max_budget_items',
  100,
  'Número máximo de items por presupuesto',
  'general',
  false
)
```

### 4.5 Eliminar Configuración

```typescript
export async function deleteConfigValue(key: string): Promise<{
  success: boolean
  error?: string
}>
```

**Permisos:** Solo superadmin
**Restricción:** Solo puede eliminar configuraciones con `is_system: false`

**Validación automática en RLS:**

```sql
-- RLS Policy impide eliminar is_system: true
AND is_system = false
```

### 4.6 Acciones Públicas (No Requieren Superadmin)

Estas acciones son accesibles por **cualquier usuario autenticado** o incluso desde Server Components sin validación de rol.

#### Obtener Equivalencias IVA-RE

```typescript
export async function getIVAtoREEquivalencesAction(): Promise<{
  success: boolean
  data?: Record<string, number>
  error?: string
}>
```

**Permisos:** Público
**Retorna:** Objeto con equivalencias IVA → RE

**Fallback:** Si no existe en BD, retorna valores por defecto:

```javascript
{
  '21.00': 5.20,
  '10.00': 1.40,
  '4.00': 0.50
}
```

#### Obtener Plantillas PDF

```typescript
export async function getPDFTemplatesAction(): Promise<{
  success: boolean
  data?: PDFTemplate[]
  error?: string
}>
```

**Permisos:** Público
**Retorna:** Array de plantillas disponibles

**Fallback:** Si no existe en BD, retorna plantillas por defecto.

#### Obtener Valores por Defecto de Tarifa

```typescript
export async function getTariffDefaultsAction(): Promise<{
  success: boolean
  data?: TariffDefaults
  error?: string
}>
```

**Permisos:** Público
**Retorna:**

```typescript
interface TariffDefaults {
  primary_color: string      // ej: '#e8951c'
  secondary_color: string    // ej: '#109c61'
  template: string           // ej: '41200-00001'
}
```

**Proceso:**

1. Consultar `default_primary_color`, `default_secondary_color`, `default_pdf_template`
2. Si alguna no existe, usar valores hardcodeados
3. Retornar objeto combinado

**Uso:**

```typescript
// Al crear una nueva tarifa, pre-cargar con valores por defecto
const defaults = await getTariffDefaultsAction()

setFormData({
  primary_color: defaults.data.primary_color,
  secondary_color: defaults.data.secondary_color,
  template: defaults.data.template
})
```

---

## 5. Helpers de Configuración

**Ubicación:** `src/lib/helpers/config-helpers.ts`

### 5.1 Helpers Genéricos

#### getConfigValue<T>()

```typescript
export async function getConfigValue<T = unknown>(key: string): Promise<T | null>
```

**Descripción:** Obtiene un valor de configuración por su clave. Retorna `null` si no existe.

**Uso:**

```typescript
const maxItems = await getConfigValue<number>('max_budget_items')
// Retorna: 100 o null

const colors = await getConfigValue<{ primary: string, secondary: string }>('default_colors')
// Retorna: { primary: '#e8951c', secondary: '#109c61' }
```

#### setConfigValue()

```typescript
export async function setConfigValue(
  key: string,
  value: unknown,
  description?: string,
  category?: string
): Promise<{ success: boolean; error?: string }>
```

**Descripción:** Crea o actualiza una configuración (upsert).

**Uso:**

```typescript
await setConfigValue(
  'company_name',
  'JEYCA Presupuestos',
  'Nombre de la empresa',
  'general'
)
```

### 5.2 Helpers Específicos

#### getIVAtoREEquivalences()

```typescript
export async function getIVAtoREEquivalences(): Promise<IVAtoREEquivalences>
```

**Retorna:** Objeto con equivalencias IVA → RE
**Fallback:** Valores por defecto según normativa española

```typescript
const equivalences = await getIVAtoREEquivalences()
const re = equivalences['21'] // 5.2
```

#### getPDFTemplates()

```typescript
export async function getPDFTemplates(): Promise<PDFTemplate[]>
```

**Retorna:** Array de plantillas PDF disponibles
**Fallback:** Plantillas hardcodeadas (`modern`, `classic`, `elegant`)

#### getDefaultPDFTemplate()

```typescript
export async function getDefaultPDFTemplate(): Promise<string>
```

**Retorna:** ID de la plantilla por defecto (ej: `'modern'`)
**Fallback:** `'modern'`

#### getDefaultColors()

```typescript
export async function getDefaultColors(): Promise<DefaultColors>
```

**Retorna:**

```typescript
{
  primary: '#e8951c',
  secondary: '#109c61'
}
```

**Fallback:** Colores hardcodeados

#### getConfigByCategory()

```typescript
export async function getConfigByCategory(category: string): Promise<Array<{
  key: string
  value: unknown
  description: string | null
}>>
```

**Retorna:** Array de configuraciones de la categoría
**Fallback:** Array vacío `[]`

#### getAppMode()

```typescript
export async function getAppMode(): Promise<'development' | 'production'>
```

**Retorna:** Modo de aplicación
**Fallback:** `'development'`

#### isDevelopmentMode()

```typescript
export async function isDevelopmentMode(): Promise<boolean>
```

**Retorna:** `true` si está en modo desarrollo

#### isPublicRegistrationEnabled()

```typescript
export async function isPublicRegistrationEnabled(): Promise<boolean>
```

**Retorna:** `true` si el registro público está habilitado
**Fallback:** `true`

---

## 6. Interfaz de Usuario - Página de Configuración

### 6.1 Página `/settings`

**Ubicación:** `src/app/settings/page.tsx`
**Ruta:** `/settings`
**Permisos:** Solo superadmin

**Verificación de Acceso:**

```typescript
const user = await getServerUser()

if (!user) {
  redirect('/login')
}

if (user.role !== 'superadmin') {
  redirect('/dashboard')
}
```

**Flujo:**

1. Verificar que el usuario es superadmin
2. Cargar toda la configuración con `getAllConfig()`
3. Agrupar configuraciones por categoría
4. Renderizar tablas por categoría

**UI:**

```tsx
<div className="min-h-screen bg-lime-50">
  <div className="container mx-auto px-4 py-6">
    <h1 className="text-2xl font-bold">Configuración del Sistema</h1>
    <p className="text-sm text-muted-foreground">
      Gestión de configuración global (solo superadmin)
    </p>

    {/* Configuración por categorías */}
    <div className="space-y-8">
      {Object.entries(configByCategory).map(([category, items]) => (
        <div key={category}>
          <h2 className="text-xl font-semibold capitalize">{category}</h2>
          <ConfigTable config={items} />
        </div>
      ))}
    </div>
  </div>
</div>
```

### 6.2 Componente `ConfigTable`

**Ubicación:** `src/components/settings/ConfigTable.tsx`

**Props:**

```typescript
interface ConfigTableProps {
  config: ConfigRow[]
}
```

**Características:**

- **Tabla responsive** con columnas: Clave, Descripción, Valor, Acciones
- **Botón Editar** (icono de lápiz) para abrir dialog de edición
- **Dialog de edición** con:
  - Input para `description` (Textarea)
  - Input para `value` (Textarea con formato JSON)
  - Validación de JSON válido
  - Botones: Cancelar, Guardar

**Edición de Valores:**

```tsx
const handleEdit = (item: ConfigRow) => {
  setEditingConfig(item)
  setEditValue(JSON.stringify(item.value, null, 2)) // Formatear JSON
  setEditDescription(item.description || '')
}

const handleSave = async () => {
  const parsedValue = JSON.parse(editValue) // Validar JSON

  const result = await updateConfigValue(
    editingConfig.key,
    parsedValue,
    editDescription
  )

  if (result.success) {
    toast.success('Configuración actualizada')
    router.refresh() // Recargar página
  }
}
```

**Vista de Valores:**

```tsx
<pre className="text-xs bg-muted p-2 rounded max-h-20 overflow-auto">
  {formatValue(item.value)}
</pre>
```

**Formato:**

- `string` → Mostrar tal cual
- `object` | `array` → `JSON.stringify(value, null, 2)`

**Ejemplo de Edición:**

1. Usuario click en botón Editar
2. Dialog se abre con valor actual en JSON:
   ```json
   {
     "21": 5.2,
     "10": 1.4,
     "4": 0.5
   }
   ```
3. Usuario modifica el JSON:
   ```json
   {
     "21": 5.2,
     "10": 1.4,
     "4": 0.5,
     "5": 0.62
   }
   ```
4. Usuario click en "Guardar"
5. Sistema valida JSON y actualiza en BD
6. Toast de éxito y página se refresca

---

## 7. Constantes del Sistema

**Ubicación:** `src/lib/constants/index.ts`

### 7.1 Constantes Globales

```typescript
export const SYSTEM_CONSTANTS = {
  // Identificadores
  APP_NAME: 'Jeyca Presupuestos',
  APP_VERSION: '1.0.0',
  API_VERSION: 'v1',

  // Configuración de la aplicación
  DEFAULT_LOCALE: 'es',
  SUPPORTED_LOCALES: ['es', 'en'] as const,
  DEFAULT_CURRENCY: 'EUR',
  DEFAULT_TIMEZONE: 'Europe/Madrid',

  // Límites del sistema
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_FILENAME_LENGTH: 255,
  MAX_DESCRIPTION_LENGTH: 1000,
  MAX_NAME_LENGTH: 100,

  // Timeouts
  API_TIMEOUT: 30000, // 30 segundos
  FILE_UPLOAD_TIMEOUT: 120000, // 2 minutos
  PDF_GENERATION_TIMEOUT: 60000, // 1 minuto

  // Paginación
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,

  // Validación
  MIN_PASSWORD_LENGTH: 8,
  MAX_PASSWORD_LENGTH: 128,
  PASSWORD_REGEX: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/,

  // URLs de la aplicación
  BASE_URL: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
  API_BASE_URL: process.env.NEXT_PUBLIC_API_URL || '/api',

  // Rutas
  ROUTES: {
    HOME: '/',
    LOGIN: '/login',
    REGISTER: '/register',
    DASHBOARD: '/dashboard',
    BUDGETS: '/budgets',
    CLIENTS: '/clients',
    TARIFFS: '/tariffs',
    SETTINGS: '/settings',
    PROFILE: '/profile'
  }
} as const;
```

### 7.2 Constantes de UI

```typescript
export const UI_CONSTANTS = {
  // Breakpoints (Tailwind CSS)
  BREAKPOINTS: {
    SM: 640,
    MD: 768,
    LG: 1024,
    XL: 1280,
    '2XL': 1536
  },

  // Z-index layers
  Z_INDEX: {
    DROPDOWN: 1000,
    STICKY: 1020,
    FIXED: 1030,
    MODAL_BACKDROP: 1040,
    MODAL: 1050,
    POPOVER: 1060,
    TOOLTIP: 1070,
    TOAST: 1080
  },

  // Animaciones
  ANIMATION_DURATION: {
    FAST: 150,
    NORMAL: 300,
    SLOW: 500
  }
} as const;
```

### 7.3 Claves de Almacenamiento

```typescript
export const STORAGE_KEYS = {
  // localStorage keys
  USER_PREFERENCES: 'user_preferences',
  THEME: 'theme',
  LANGUAGE: 'language',
  SIDEBAR_STATE: 'sidebar_state',
  TABLE_PREFERENCES: 'table_preferences',

  // sessionStorage keys
  FORM_DRAFTS: 'form_drafts',
  NAVIGATION_STATE: 'navigation_state',
  TEMP_DATA: 'temp_data'
} as const;
```

> **Nota:** Actualmente estas claves están definidas pero **no se utilizan** en la aplicación. No hay almacenamiento en `localStorage` o `sessionStorage` implementado.

---

## 8. Almacenamiento y Persistencia

### 8.1 Tabla de Almacenamiento por Tipo

| Tipo de Configuración | Ubicación | Modificable en Runtime | Acceso | Persistencia |
|----------------------|-----------|------------------------|--------|--------------|
| **Variables de entorno** | `.env.local` | ❌ No | Solo servidor (privadas) o cliente+servidor (públicas) | Reinicio requerido |
| **Tabla `config`** | PostgreSQL (`public.config`) | ✅ Sí (UI) | Lectura: Todos autenticados<br>Escritura: Solo superadmin | Inmediata (BD) |
| **Constantes TypeScript** | `src/lib/constants/` | ❌ No (hardcodeadas) | Código fuente | Build requerido |

### 8.2 Flujo de Configuración

```
┌──────────────────────────────────────────────────────────────┐
│                    ARRANQUE DE LA APLICACIÓN                  │
└──────────────────────────────────────────────────────────────┘
                            │
                            ↓
┌──────────────────────────────────────────────────────────────┐
│ 1. CARGAR VARIABLES DE ENTORNO                                │
│    - Leer .env.local                                          │
│    - Validar variables requeridas                             │
│    - Crear clientes Supabase (client y admin)                 │
└──────────────────────────────────────────────────────────────┘
                            │
                            ↓
┌──────────────────────────────────────────────────────────────┐
│ 2. INICIALIZAR CONSTANTES DEL SISTEMA                        │
│    - Cargar src/lib/constants/                                │
│    - Establecer límites, timeouts, rutas                      │
└──────────────────────────────────────────────────────────────┘
                            │
                            ↓
┌──────────────────────────────────────────────────────────────┐
│ 3. RUNTIME: CONSULTAR TABLA CONFIG (cuando sea necesario)    │
│    - getPDFTemplates() → SELECT * FROM config WHERE key=...  │
│    - getIVAtoREEquivalences()                                 │
│    - getAppMode()                                             │
│    - Fallback a valores por defecto si no existe             │
└──────────────────────────────────────────────────────────────┘
```

### 8.3 Jerarquía de Valores

**Orden de precedencia** (de mayor a menor prioridad):

1. **Tabla `config`** (si existe el valor en BD) → Máxima prioridad
2. **Valores por defecto en código** (fallback en helpers)
3. **Constantes TypeScript** (valores inmutables)

**Ejemplo:**

```typescript
// Helper con fallback
export async function getPDFTemplates(): Promise<PDFTemplate[]> {
  const templates = await getConfigValue<PDFTemplate[]>('pdf_templates')

  // Si existe en BD → Retornar valor de BD (prioridad 1)
  if (templates) {
    return templates
  }

  // Si NO existe en BD → Retornar fallback hardcodeado (prioridad 2)
  return [
    { id: 'modern', name: 'Moderna', description: 'Diseño limpio y minimalista' },
    { id: 'classic', name: 'Clásica', description: 'Diseño tradicional profesional' },
    { id: 'elegant', name: 'Elegante', description: 'Diseño sofisticado con detalles' }
  ]
}
```

### 8.4 Caché y Revalidación

**Next.js Server Components:**
- Por defecto, las consultas a la BD se **cachean** en el servidor
- Uso de `revalidatePath('/settings')` después de actualizar configuración

**Ejemplo:**

```typescript
// src/app/actions/config.ts:143
export async function updateConfigValue(...) {
  // ... actualizar en BD

  revalidatePath('/settings') // Revalidar página de configuración
  return { success: true }
}
```

**Efecto:**
- Después de actualizar una configuración, la página `/settings` se regenera
- Los usuarios ven los cambios inmediatamente al recargar
- Otras páginas que usen la config se actualizan en la siguiente petición

**No hay caché en cliente:**
- Las configuraciones se consultan en **servidor** (Server Components o Server Actions)
- No se almacenan en `localStorage` ni `sessionStorage`
- Cada request obtiene datos frescos de la BD

---

## 9. Casos de Uso Comunes

### 9.1 Cambiar Plantilla PDF por Defecto

**Actor:** Superadmin

**Flujo:**

1. Acceder a `/settings`
2. Localizar categoría **"pdf"**
3. Buscar clave `pdf_template_default`
4. Click en botón Editar
5. Modificar valor de `"modern"` a `"classic"`:
   ```json
   "classic"
   ```
6. Guardar
7. A partir de ahora, nuevas tarifas usan plantilla `classic` por defecto

### 9.2 Actualizar Equivalencias IVA-RE

**Actor:** Superadmin

**Escenario:** Cambio en normativa fiscal española

**Flujo:**

1. Acceder a `/settings`
2. Localizar categoría **"fiscal"**
3. Buscar clave `iva_re_equivalences`
4. Click en Editar
5. Modificar JSON:
   ```json
   {
     "21": 5.2,
     "10": 1.4,
     "4": 0.5,
     "5": 0.62
   }
   ```
6. Guardar
7. Nuevos presupuestos calculan RE con los nuevos valores

### 9.3 Añadir Nueva Plantilla PDF

**Actor:** Superadmin

**Flujo:**

1. Acceder a `/settings`
2. Buscar `pdf_templates`
3. Editar valor JSON:
   ```json
   [
     { "id": "modern", "name": "Moderna", "description": "Diseño limpio" },
     { "id": "classic", "name": "Clásica", "description": "Diseño tradicional" },
     { "id": "elegant", "name": "Elegante", "description": "Diseño sofisticado" },
     { "id": "corporate", "name": "Corporativa", "description": "Diseño empresarial formal" }
   ]
   ```
4. Guardar
5. Actualizar Rapid-PDF para soportar nueva plantilla `corporate`
6. Usuarios pueden seleccionar nueva plantilla al crear tarifas

### 9.4 Cambiar Colores por Defecto

**Actor:** Superadmin

**Flujo:**

1. Acceder a `/settings`
2. Buscar `default_colors`
3. Editar valor:
   ```json
   {
     "primary": "#1a73e8",
     "secondary": "#34a853"
   }
   ```
4. Guardar
5. Nuevas tarifas se crean con estos colores por defecto

### 9.5 Desactivar Registro Público

**Actor:** Superadmin

**Escenario:** Solo se permiten usuarios invitados por admin

**Flujo:**

1. Acceder a `/settings`
2. Buscar `public_registration_enabled`
3. Editar valor de `true` a `false`:
   ```json
   false
   ```
4. Guardar
5. Página `/register` redirige o muestra mensaje "Registro deshabilitado"
6. Solo superadmin puede crear usuarios vía `/users/create`

### 9.6 Cambiar Modo de Aplicación

**Actor:** Superadmin

**Flujo:**

1. Acceder a `/settings`
2. Buscar `app_mode`
3. Cambiar de `"development"` a `"production"`:
   ```json
   "production"
   ```
4. Guardar
5. Efectos:
   - Se ocultan logs de debug
   - Se ocultan usuarios de prueba
   - Se activan optimizaciones de producción

---

## 10. Tipos TypeScript

### 10.1 Tipos de Tabla Config

```typescript
// Generado automáticamente desde schema de Supabase
type ConfigRow = Database['public']['Tables']['config']['Row']

// Estructura:
{
  key: string
  value: any // jsonb
  description: string | null
  category: string
  is_system: boolean
  created_at: string
  updated_at: string
}
```

### 10.2 Tipos de Valores Específicos

```typescript
// IVA a Recargo de Equivalencia
export interface IVAtoREEquivalences {
  [ivaPercent: string]: number
  // Ejemplo: { "21": 5.2, "10": 1.4, "4": 0.5 }
}

// Plantilla PDF
export interface PDFTemplate {
  id: string
  name: string
  description: string
}

// Valores por defecto de tarifa
export interface TariffDefaults {
  primary_color: string
  secondary_color: string
  template: string
}

// Colores por defecto
export interface DefaultColors {
  primary: string
  secondary: string
}
```

### 10.3 Tipos de Respuesta de Actions

```typescript
// Respuesta genérica de Server Action
interface ActionResult<T = any> {
  success: boolean
  data?: T
  error?: string
}

// Ejemplos de uso:
// - getAllConfig(): Promise<ActionResult<ConfigRow[]>>
// - updateConfigValue(): Promise<ActionResult>
// - getIVAtoREEquivalencesAction(): Promise<ActionResult<Record<string, number>>>
```

---

## 11. Seguridad

### 11.1 Variables de Entorno

**Protección de Secretos:**

✅ **Correcto:**
- Variables privadas (`SUPABASE_SERVICE_ROLE_KEY`, `RAPID_PDF_API_KEY`) **NO** tienen prefijo `NEXT_PUBLIC_`
- Solo accesibles en servidor (API routes, Server Actions, Server Components)
- Nunca expuestas en bundle del cliente

❌ **Incorrecto:**
```typescript
// NUNCA hacer esto
const apiKey = process.env.SUPABASE_SERVICE_ROLE_KEY // En componente cliente
console.log(apiKey) // Expone secret en navegador
```

**Validación en Tiempo de Build:**

```typescript
// src/lib/supabase/server.ts
if (!supabaseServiceRoleKey) {
  throw new Error('Missing env.SUPABASE_SERVICE_ROLE_KEY')
}
```

**Efecto:** Si falta alguna variable crítica, la aplicación **no arranca**.

### 11.2 Tabla Config

**Row Level Security (RLS):**

✅ **Lectura Pública (autenticados):**
- Cualquier usuario autenticado puede leer configuración
- Necesario para funcionalidades como obtener plantillas PDF, colores por defecto

✅ **Escritura Restringida (solo superadmin):**
- Solo superadmin puede crear, actualizar o eliminar configuraciones
- Validado tanto en RLS como en Server Actions

**Protección de Configuraciones Críticas:**

```sql
-- No se pueden eliminar configuraciones con is_system: true
CREATE POLICY "config_delete_policy"
  ON public.config FOR DELETE
  USING (
    public.get_user_role_by_id(auth.uid()) = 'superadmin'
    AND is_system = false -- IMPORTANTE
  );
```

**Efecto:**
- Configuraciones como `iva_re_equivalences` o `pdf_templates` (marcadas con `is_system: true`) **NO** se pueden eliminar accidentalmente
- Solo se pueden **actualizar**, no eliminar

### 11.3 Validación de Entrada

**JSON Válido:**

Componente `ConfigTable` valida que el valor editado sea JSON válido:

```typescript
try {
  const parsedValue = JSON.parse(editValue)
  // Si llega aquí, es JSON válido
} catch (error) {
  toast.error('Error: JSON inválido')
  return
}
```

**Efecto:** No se pueden guardar valores que rompan el formato JSON.

### 11.4 Auditoría

**Timestamps Automáticos:**

```sql
created_at timestamp with time zone NOT NULL DEFAULT now()
updated_at timestamp with time zone NOT NULL DEFAULT now()
```

**Trigger de Actualización:**

Aunque no está explícito en la migración 013, se podría añadir un trigger similar a otras tablas:

```sql
CREATE TRIGGER trigger_config_updated_at
  BEFORE UPDATE ON public.config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

**Recomendación:** Añadir campo `updated_by uuid REFERENCES users(id)` para rastrear quién modificó cada configuración.

---

## 12. Limitaciones Conocidas

### 12.1 Funcionalidades Pendientes

1. **No hay historial de cambios**
   - No se rastrea quién modificó cada configuración
   - No se guarda el valor anterior
   - **Recomendación:** Crear tabla `config_audit` con:
     ```sql
     CREATE TABLE config_audit (
       id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
       config_key text NOT NULL,
       old_value jsonb,
       new_value jsonb,
       changed_by uuid REFERENCES users(id),
       changed_at timestamptz DEFAULT now()
     );
     ```

2. **No hay validación de tipos de valores**
   - Se puede guardar cualquier JSON en `value`
   - No hay schema validation para cada clave
   - **Recomendación:** Implementar validación con JSON Schema o Zod

3. **No hay configuraciones por usuario**
   - Toda la configuración es global (sistema)
   - No hay preferencias personales de usuario
   - **Recomendación:** Crear tabla `user_preferences` si es necesario

4. **No hay versionado de configuración**
   - No se puede hacer rollback a versión anterior
   - **Recomendación:** Sistema de versionado con tags (v1, v2, etc.)

5. **No hay importación/exportación de configuración**
   - No se puede exportar toda la config a JSON
   - No se puede importar desde archivo
   - **Recomendación:** Server Actions para export/import

6. **No hay notificaciones de cambios**
   - Cambios en config no notifican a usuarios afectados
   - **Recomendación:** Sistema de eventos o webhooks

### 12.2 Restricciones Técnicas

1. **No hay caché optimizado**
   - Cada consulta hace un query a la BD
   - Podría implementarse caché en memoria con Redis

2. **No hay ambiente de staging**
   - Los cambios en config afectan inmediatamente a producción
   - **Recomendación:** Duplicar tabla config con sufijo `_staging`

3. **Valores JSONB son genéricos**
   - TypeScript no puede inferir tipos específicos
   - Se requieren type assertions (`as Record<string, number>`)

4. **No hay UI para crear nuevas configuraciones**
   - Solo se pueden editar configuraciones existentes
   - Crear nuevas requiere SQL manual o Server Action directa

### 12.3 UX Mejorable

1. **Editor JSON básico**
   - Textarea simple, no hay syntax highlighting
   - No hay validación en tiempo real
   - **Recomendación:** Integrar editor Monaco o CodeMirror

2. **No hay búsqueda/filtrado**
   - Si hay muchas configuraciones, difícil encontrar una específica
   - **Recomendación:** Input de búsqueda por clave o descripción

3. **No hay documentación in-app**
   - No se explica qué hace cada configuración
   - **Recomendación:** Tooltips o modal de ayuda

---

## 13. Diagramas

### 13.1 Diagrama de Arquitectura de Configuración

```
┌────────────────────────────────────────────────────────────────┐
│                    ARQUITECTURA DE CONFIGURACIÓN                │
└────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│ NIVEL 1: VARIABLES DE ENTORNO (.env.local)                       │
│                                                                   │
│  - NEXT_PUBLIC_SUPABASE_URL              [PÚBLICO]               │
│  - NEXT_PUBLIC_SUPABASE_ANON_KEY         [PÚBLICO]               │
│  - SUPABASE_SERVICE_ROLE_KEY             [PRIVADO]               │
│  - RAPID_PDF_URL                         [PRIVADO]               │
│  - RAPID_PDF_API_KEY                     [PRIVADO]               │
│  - NEXT_PUBLIC_APP_URL                   [PÚBLICO]               │
│                                                                   │
│  ✅ Modificable: Solo con reinicio                               │
│  ✅ Seguridad: Variables privadas solo en servidor               │
└──────────────────────────────────────────────────────────────────┘
                            ↓ Usado por ↓
┌──────────────────────────────────────────────────────────────────┐
│ CLIENTES SUPABASE                                                 │
│                                                                   │
│  ┌─────────────────────┐       ┌──────────────────────┐         │
│  │ supabase (client)   │       │ supabaseAdmin        │         │
│  │ - Cliente público   │       │ - Service role       │         │
│  │ - Con RLS           │       │ - Bypasea RLS        │         │
│  └─────────────────────┘       └──────────────────────┘         │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│ NIVEL 2: TABLA CONFIG (Base de Datos)                            │
│                                                                   │
│  ┌────────────────────────────────────────────────────┐         │
│  │ public.config                                       │         │
│  ├────────────────────────────────────────────────────┤         │
│  │ key: iva_re_equivalences                            │         │
│  │ value: {"21": 5.2, "10": 1.4, "4": 0.5}            │         │
│  │ category: fiscal                                    │         │
│  │ is_system: true                                     │         │
│  ├────────────────────────────────────────────────────┤         │
│  │ key: pdf_templates                                  │         │
│  │ value: [{"id":"modern",...}, {"id":"classic",...}] │         │
│  │ category: pdf                                       │         │
│  │ is_system: true                                     │         │
│  ├────────────────────────────────────────────────────┤         │
│  │ key: app_mode                                       │         │
│  │ value: "development"                                │         │
│  │ category: general                                   │         │
│  │ is_system: false                                    │         │
│  └────────────────────────────────────────────────────┘         │
│                                                                   │
│  ✅ Modificable: Sí, vía UI (/settings) por superadmin           │
│  ✅ Lectura: Todos los usuarios autenticados                     │
│  ✅ Escritura: Solo superadmin                                   │
└──────────────────────────────────────────────────────────────────┘
                            ↓ Accedida por ↓
┌──────────────────────────────────────────────────────────────────┐
│ SERVER ACTIONS & HELPERS                                          │
│                                                                   │
│  ┌──────────────────────┐      ┌────────────────────────┐       │
│  │ Server Actions       │      │ Helpers                │       │
│  │ (Superadmin)         │      │ (Cualquier role)       │       │
│  ├──────────────────────┤      ├────────────────────────┤       │
│  │ - getAllConfig()     │      │ - getConfigValue<T>()  │       │
│  │ - updateConfigValue()│      │ - getPDFTemplates()    │       │
│  │ - createConfigValue()│      │ - getAppMode()         │       │
│  │ - deleteConfigValue()│      │ - getIVAtoREEquiv...() │       │
│  └──────────────────────┘      └────────────────────────┘       │
│                                                                   │
│  ↓ Retorna valores con fallback                                  │
│                                                                   │
│  ┌─────────────────────────────────────────────────────┐        │
│  │ FALLBACK: Valores por defecto hardcodeados          │        │
│  │ Si NO existe en BD, retornar valores del código     │        │
│  └─────────────────────────────────────────────────────┘        │
└──────────────────────────────────────────────────────────────────┘
                            ↓ Usado por ↓
┌──────────────────────────────────────────────────────────────────┐
│ NIVEL 3: CONSTANTES TYPESCRIPT (Código)                          │
│                                                                   │
│  ┌────────────────────────────────────────────────────┐         │
│  │ src/lib/constants/index.ts                          │         │
│  ├────────────────────────────────────────────────────┤         │
│  │ - SYSTEM_CONSTANTS                                  │         │
│  │   - APP_NAME: 'Jeyca Presupuestos'                  │         │
│  │   - DEFAULT_LOCALE: 'es'                            │         │
│  │   - MAX_FILE_SIZE: 10485760                         │         │
│  │                                                      │         │
│  │ - UI_CONSTANTS                                       │         │
│  │   - BREAKPOINTS: { SM: 640, MD: 768, ... }          │         │
│  │   - Z_INDEX: { MODAL: 1050, ... }                   │         │
│  │                                                      │         │
│  │ - STORAGE_KEYS (no usado actualmente)               │         │
│  └────────────────────────────────────────────────────┘         │
│                                                                   │
│  ✅ Modificable: Solo con rebuild                                │
│  ✅ Valores inmutables del sistema                               │
└──────────────────────────────────────────────────────────────────┘
```

### 13.2 Flujo de Acceso a Configuración

```
┌────────────────────────────────────────────────────────────┐
│ FLUJO: Obtener Plantillas PDF                              │
└────────────────────────────────────────────────────────────┘

                    ┌─────────────────┐
                    │ Usuario crea    │
                    │ nueva tarifa    │
                    └─────────────────┘
                            │
                            ↓
                ┌───────────────────────────┐
                │ Componente TariffForm     │
                │ llama getPDFTemplates()   │
                └───────────────────────────┘
                            │
                            ↓
        ┌───────────────────────────────────────────┐
        │ Helper: getPDFTemplates()                 │
        │ (src/lib/helpers/config-helpers.ts)       │
        └───────────────────────────────────────────┘
                            │
                            ↓
        ┌───────────────────────────────────────────┐
        │ getConfigValue<PDFTemplate[]>()           │
        │ SELECT value FROM config                  │
        │ WHERE key = 'pdf_templates'               │
        └───────────────────────────────────────────┘
                            │
                ┌───────────┴────────────┐
                ↓                        ↓
        ┌──────────────┐        ┌───────────────────┐
        │ ¿Existe en   │        │ NO existe en BD   │
        │ BD?          │        └───────────────────┘
        └──────────────┘                │
                │                       ↓
                ↓               ┌──────────────────────┐
        ┌──────────────────┐   │ Retornar FALLBACK    │
        │ Retornar valor   │   │ hardcodeado:         │
        │ de BD            │   │ [                    │
        │ (prioridad 1)    │   │   {id: 'modern',...},│
        │                  │   │   {id: 'classic',...}│
        └──────────────────┘   │ ]                    │
                │               └──────────────────────┘
                │                       │
                └───────────┬───────────┘
                            ↓
                ┌───────────────────────────┐
                │ Retornar array de         │
                │ plantillas a TariffForm   │
                └───────────────────────────┘
                            │
                            ↓
                ┌───────────────────────────┐
                │ Renderizar selector       │
                │ <Select>                  │
                │   <option>Moderna</option>│
                │   <option>Clásica</option>│
                │   <option>Elegante</option>│
                │ </Select>                 │
                └───────────────────────────┘
```

### 13.3 Flujo de Edición de Configuración

```
┌────────────────────────────────────────────────────────────┐
│ FLUJO: Superadmin Edita Configuración                      │
└────────────────────────────────────────────────────────────┘

        ┌─────────────────────────────┐
        │ Superadmin accede a         │
        │ /settings                   │
        └─────────────────────────────┘
                    │
                    ↓
        ┌─────────────────────────────┐
        │ Verificar rol               │
        │ if (user.role !== 'superadmin')│
        │   redirect('/dashboard')     │
        └─────────────────────────────┘
                    │ Superadmin ✓
                    ↓
        ┌─────────────────────────────┐
        │ getAllConfig()              │
        │ SELECT * FROM config        │
        │ ORDER BY category, key      │
        └─────────────────────────────┘
                    │
                    ↓
        ┌─────────────────────────────┐
        │ Renderizar ConfigTable      │
        │ por categoría               │
        └─────────────────────────────┘
                    │
                    ↓
        ┌─────────────────────────────┐
        │ Usuario click en            │
        │ botón Editar (icono lápiz)  │
        └─────────────────────────────┘
                    │
                    ↓
        ┌─────────────────────────────┐
        │ Abrir Dialog con:           │
        │ - description (Textarea)    │
        │ - value (Textarea JSON)     │
        └─────────────────────────────┘
                    │
                    ↓
        ┌─────────────────────────────┐
        │ Usuario modifica JSON       │
        │ de:                         │
        │ {"21": 5.2, "10": 1.4}      │
        │ a:                          │
        │ {"21": 5.2, "10": 1.4, "5": 0.62}│
        └─────────────────────────────┘
                    │
                    ↓
        ┌─────────────────────────────┐
        │ Usuario click en "Guardar"  │
        └─────────────────────────────┘
                    │
                    ↓
        ┌─────────────────────────────┐
        │ Validar JSON                │
        │ try { JSON.parse(value) }   │
        └─────────────────────────────┘
                    │
        ┌───────────┴──────────────┐
        ↓                          ↓
┌──────────────┐          ┌────────────────┐
│ JSON válido  │          │ JSON inválido  │
└──────────────┘          └────────────────┘
        │                          │
        ↓                          ↓
┌──────────────────────┐  ┌────────────────┐
│ updateConfigValue()  │  │ toast.error()  │
│ key, parsedValue,    │  │ 'JSON inválido'│
│ description          │  └────────────────┘
└──────────────────────┘
        │
        ↓
┌──────────────────────────────┐
│ UPDATE config                 │
│ SET value = ...,              │
│     description = ...,        │
│     updated_at = NOW()        │
│ WHERE key = ...               │
└──────────────────────────────┘
        │
        ↓
┌──────────────────────────────┐
│ revalidatePath('/settings')   │
└──────────────────────────────┘
        │
        ↓
┌──────────────────────────────┐
│ toast.success()               │
│ 'Configuración actualizada'   │
└──────────────────────────────┘
        │
        ↓
┌──────────────────────────────┐
│ router.refresh()              │
│ Recargar página con nuevos    │
│ valores de BD                 │
└──────────────────────────────┘
```

---

## 14. Referencias

### 14.1 Archivos Principales

| Archivo | Ruta | Descripción |
|---------|------|-------------|
| **Variables de entorno** | `.env.local` | Configuración de infraestructura |
| **Server Actions** | `src/app/actions/config.ts` | CRUD de configuración |
| **Helpers** | `src/lib/helpers/config-helpers.ts` | Funciones auxiliares |
| **Página Settings** | `src/app/settings/page.tsx` | UI de configuración |
| **Componente Tabla** | `src/components/settings/ConfigTable.tsx` | Tabla de configuraciones |
| **Migración Config** | `migrations/013_config_table.sql` | Crear tabla config |
| **Migración Env** | `migrations/022_config_environment.sql` | Configs de entorno |
| **Cliente Supabase** | `src/lib/supabase/client.ts` | Cliente público |
| **Admin Supabase** | `src/lib/supabase/server.ts` | Cliente admin |
| **Constantes** | `src/lib/constants/index.ts` | Constantes del sistema |

### 14.2 Documentación Relacionada

- **PRD (Product Requirements Document):** `/docs/prd.md`
- **Arquitectura:** `/docs/arquitectura.md`
- **CRUD de Usuarios:** `/docs/especificaciones/crud-usuarios.md`
- **Flujo de Autenticación:** `/docs/especificaciones/flujo-autenticacion.md`
- **Design System:** `/design.md`

### 14.3 Documentación Externa

- **Next.js Environment Variables:** https://nextjs.org/docs/app/building-your-application/configuring/environment-variables
- **Supabase Auth:** https://supabase.com/docs/guides/auth
- **Supabase RLS:** https://supabase.com/docs/guides/auth/row-level-security
- **PostgreSQL JSONB:** https://www.postgresql.org/docs/current/datatype-json.html

---

## 15. Conclusión

El sistema de configuración de Redpresu utiliza una **arquitectura híbrida de tres niveles**:

1. **Variables de entorno** para configuración de infraestructura (URLs, claves secretas)
2. **Tabla `config` en base de datos** para configuración dinámica modificable por superadmin
3. **Constantes TypeScript** para valores inmutables del sistema

Esta arquitectura proporciona:
- ✅ **Seguridad:** Variables secretas solo en servidor
- ✅ **Flexibilidad:** Configuración dinámica sin redeploy
- ✅ **Fallbacks:** Valores por defecto si la BD no tiene configuración
- ✅ **Control de acceso:** Solo superadmin modifica configuración crítica
- ✅ **Auditoría:** Timestamps de creación y actualización

**Próximos pasos recomendados:**
1. Implementar historial de cambios (`config_audit`)
2. Añadir validación de tipos con JSON Schema
3. Mejorar editor JSON en UI (syntax highlighting)
4. Implementar import/export de configuración
5. Crear configuraciones por usuario (preferencias personales)

---

**Documento:** Gestión de Configuración
**Versión:** 1.0
**Fecha:** 2025-01-14
**Autor:** Análisis de Claude Code
