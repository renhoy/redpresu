# Arquitectura Técnica - jeyca-presu

## 🏗️ Stack Tecnológico

### Frontend
- **Framework:** Next.js 15.5.4 (App Router)
- **Lenguaje:** TypeScript 5
- **Runtime React:** React 19.1.0
- **Estilos:** Tailwind CSS 3.4 + tailwindcss-animate
- **Componentes UI:** shadcn/ui (basado en Radix UI)
- **Iconos:** Lucide React
- **Notificaciones:** Sonner (toast notifications)
- **Utilidades CSS:** clsx + tailwind-merge + class-variance-authority

### Backend
- **Runtime:** Next.js Server Actions (App Router)
- **Base de datos:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth (@supabase/auth-helpers-nextjs)
- **Validación:** Zod 4.1
- **Storage:** Local filesystem (`/public/pdfs/`, `/public/logos/`)

### Servicios Externos
- **PDF Generation:** Rapid-PDF API (microservicio externo)
- **Deploy:** Vercel (recomendado) / compatible con cualquier host Next.js
- **Database hosting:** Supabase Cloud

### Build Tool
- **Bundler:** Turbopack (Next.js 15 experimental)
- **Dev server:** `next dev --turbopack`
- **Production build:** `next build --turbopack`

## 📂 Estructura de Carpetas

```
jeyca-presu/
├── src/
│   ├── app/                          # App Router (Next.js 15)
│   │   ├── (auth)/                   # Route Group: Autenticación
│   │   │   └── login/                # Página de login
│   │   │       ├── page.tsx
│   │   │       └── layout.tsx
│   │   │
│   │   ├── (dashboard)/              # Route Group: Dashboard layout
│   │   │   └── layout.tsx            # Layout compartido dashboard
│   │   │
│   │   ├── actions/                  # Server Actions
│   │   │   ├── auth.ts               # Login, logout, registro
│   │   │   ├── tariffs.ts            # CRUD tarifas, upload CSV/logo
│   │   │   ├── budgets.ts            # CRUD presupuestos, PDF, duplicado
│   │   │   └── dashboard.ts          # Estadísticas y métricas
│   │   │
│   │   ├── api/                      # API Routes (testing/debug)
│   │   │   ├── test-connection/      # Test conexión Supabase
│   │   │   └── verify-setup/         # Verificar setup DB
│   │   │
│   │   ├── dashboard/                # Módulo Dashboard
│   │   │   ├── page.tsx              # Página principal
│   │   │   └── layout.tsx            # Layout con Header
│   │   │
│   │   ├── tariffs/                  # Módulo Tarifas
│   │   │   ├── page.tsx              # Listado tarifas
│   │   │   ├── create/               # Crear tarifa
│   │   │   │   └── page.tsx
│   │   │   ├── edit/                 # Editar tarifa
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx
│   │   │   └── layout.tsx            # Layout con Header
│   │   │
│   │   ├── budgets/                  # Módulo Presupuestos
│   │   │   ├── page.tsx              # Listado presupuestos
│   │   │   ├── create/               # Crear presupuesto
│   │   │   │   └── page.tsx
│   │   │   ├── edit/                 # Editar presupuesto
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx
│   │   │   └── layout.tsx            # Layout con Header
│   │   │
│   │   ├── layout.tsx                # Root layout
│   │   ├── page.tsx                  # Home (redirect)
│   │   ├── globals.css               # Estilos globales + Tailwind
│   │   └── favicon.ico
│   │
│   ├── components/                   # Componentes React
│   │   ├── ui/                       # shadcn/ui components
│   │   │   ├── accordion.tsx
│   │   │   ├── alert-dialog.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── checkbox.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── dropdown-menu.tsx
│   │   │   ├── input.tsx
│   │   │   ├── label.tsx
│   │   │   ├── select.tsx
│   │   │   ├── skeleton.tsx
│   │   │   ├── table.tsx
│   │   │   ├── tabs.tsx
│   │   │   ├── textarea.tsx
│   │   │   └── tooltip.tsx
│   │   │
│   │   ├── auth/                     # Componentes autenticación
│   │   │   ├── LoginForm.tsx         # Formulario login
│   │   │   ├── LogoutButton.tsx      # Botón logout
│   │   │   └── ProtectedRoute.tsx    # HOC protección rutas
│   │   │
│   │   ├── tariffs/                  # Componentes tarifas (8)
│   │   │   ├── TariffForm.tsx        # Formulario crear/editar
│   │   │   ├── TariffFormFields.tsx  # Campos del formulario
│   │   │   ├── TariffList.tsx        # Tabla listado
│   │   │   ├── TariffRow.tsx         # Fila con acciones
│   │   │   ├── TariffFilters.tsx     # Filtros búsqueda
│   │   │   ├── CSVUploadPreview.tsx  # Upload y preview CSV
│   │   │   ├── HierarchyPreview.tsx  # Preview jerárquico
│   │   │   └── LogoUploader.tsx      # Upload logo (archivo/URL)
│   │   │
│   │   ├── budgets/                  # Componentes presupuestos (3)
│   │   │   ├── BudgetForm.tsx        # Formulario 2 pasos
│   │   │   ├── BudgetHierarchyForm.tsx # Formulario jerárquico
│   │   │   └── BudgetsTable.tsx      # Tabla listado
│   │   │
│   │   ├── dashboard/                # Componentes dashboard (1)
│   │   │   └── DashboardClient.tsx   # Dashboard interactivo
│   │   │
│   │   └── layout/                   # Componentes layout (1)
│   │       └── Header.tsx            # Header global sticky
│   │
│   ├── hooks/                        # React Hooks personalizados
│   │   └── useAuth.ts                # Hook autenticación
│   │
│   ├── lib/                          # Utilidades compartidas
│   │   ├── auth/                     # Autenticación
│   │   │   ├── server.ts             # Helpers auth servidor
│   │   │   └── supabase-auth.ts      # Cliente Supabase Auth
│   │   │
│   │   ├── constants/                # Constantes globales (7)
│   │   │   ├── calculations.ts       # Constantes cálculos (IVA_RATE)
│   │   │   ├── csv.ts                # Headers CSV, separadores
│   │   │   ├── levels.ts             # Niveles jerárquicos
│   │   │   ├── messages.ts           # Mensajes usuario
│   │   │   ├── roles.ts              # Roles de usuario
│   │   │   ├── statuses.ts           # Estados presupuesto
│   │   │   └── index.ts              # Barrel export
│   │   │
│   │   ├── helpers/                  # Funciones utilidad (8)
│   │   │   ├── calculation-helpers.ts    # Cálculos IVA/totales
│   │   │   ├── calculation-types.ts      # Tipos cálculos
│   │   │   ├── csv-errors.ts             # Manejo errores CSV
│   │   │   ├── csv-utils.ts              # Utilidades CSV
│   │   │   ├── format.ts                 # Formato números/fechas
│   │   │   ├── normalization-utils.ts    # Normalización datos
│   │   │   ├── pdf-payload-builder.ts    # Construcción payload PDF
│   │   │   └── transformation-utils.ts   # Transformaciones datos
│   │   │
│   │   ├── supabase/                 # Clientes Supabase
│   │   │   ├── client.ts             # Cliente browser
│   │   │   └── server.ts             # Cliente servidor
│   │   │
│   │   ├── types/                    # Tipos TypeScript
│   │   │   └── database.ts           # Tipos generados DB
│   │   │
│   │   ├── utils/                    # Utilidades generales
│   │   │   ├── calculations.ts       # Cálculos complejos
│   │   │   └── index.ts              # cn() helper
│   │   │
│   │   ├── validators/               # Validadores Zod (6)
│   │   │   ├── budget-validator.ts   # Schema presupuestos
│   │   │   ├── csv-converter.ts      # CSV → JSON
│   │   │   ├── csv-parser.ts         # Parser CSV robusto
│   │   │   ├── csv-types.ts          # Tipos CSV
│   │   │   ├── data-transformer.ts   # Transformaciones
│   │   │   └── index.ts              # Barrel export
│   │   │
│   │   └── utils.ts                  # cn() helper (Tailwind)
│   │
│   └── middleware.ts                 # Middleware autenticación
│
├── public/                           # Archivos estáticos
│   ├── pdfs/                         # PDFs generados (no git)
│   └── logos/                        # Logos subidos (no git)
│
├── migrations/                       # Migraciones SQL
│   ├── 001_initial_schema.sql        # Schema inicial
│   ├── 002_rls_policies.sql          # RLS policies
│   └── 003_seed_data.sql             # Datos de prueba
│
├── docs/                             # Documentación proyecto
│   └── modules/                      # Docs por módulo
│       ├── 01-database-tareas.md
│       ├── 02-auth-tareas.md
│       ├── 03-common-tareas.md
│       └── 04-tariff-management-tareas.md
│
├── package.json                      # Dependencias
├── tsconfig.json                     # Config TypeScript
├── tailwind.config.ts                # Config Tailwind
├── next.config.ts                    # Config Next.js
├── auth.config.ts                    # Config autenticación
├── components.json                   # Config shadcn/ui
├── mvp-completado.md                 # Estado MVP
├── arquitectura.md                   # Este documento
├── planificacion.md                  # Planificación proyecto
├── tareas.md                         # Tareas completadas
└── CLAUDE.md                         # Instrucciones Claude Code

Total archivos TypeScript: 80+
Total líneas código: ~15,300
```

## 🔄 Patrones de Diseño

### 1. Server Actions Pattern

**Ubicación:** `src/app/actions/*.ts`

**Convención:**
```typescript
'use server'

export async function myAction(params: Params): Promise<ActionResult> {
  // 1. Validación de entrada
  const parsed = schema.safeParse(params)
  if (!parsed.success) {
    return { success: false, error: 'Validación fallida' }
  }

  // 2. Autenticación
  const user = await getServerUser()
  if (!user) {
    return { success: false, error: 'No autenticado' }
  }

  // 3. Autorización (opcional)
  if (user.role !== 'admin') {
    return { success: false, error: 'Sin permisos' }
  }

  // 4. Lógica de negocio
  try {
    const result = await supabaseAdmin
      .from('table')
      .insert(data)
      .select()

    if (result.error) {
      return { success: false, error: result.error.message }
    }

    // 5. Revalidación (opcional)
    revalidatePath('/path')

    // 6. Retorno estandarizado
    return { success: true, data: result.data }

  } catch (error) {
    console.error('[myAction] Error:', error)
    return { success: false, error: 'Error inesperado' }
  }
}
```

**Tipo de retorno estándar:**
```typescript
interface ActionResult<T = any> {
  success: boolean
  data?: T
  error?: string
}
```

### 2. Validación con Zod

**Client-side (no usado actualmente):**
- React Hook Form + Zod schema (sin implementar completamente)

**Server-side:**
```typescript
// src/lib/validators/csv-parser.ts
import { z } from 'zod'

const csvRowSchema = z.object({
  id: z.string().regex(/^\d+(\.\d+)*$/),
  nombre: z.string().min(1),
  descripcion: z.string().optional(),
  precio: z.number().or(z.string())
})

export function validateCSV(data: unknown) {
  const parsed = csvRowSchema.array().safeParse(data)
  if (!parsed.success) {
    return { valid: false, errors: parsed.error.issues }
  }
  return { valid: true, data: parsed.data }
}
```

### 3. RLS (Row Level Security)

**Patrón:** Policies basadas en `empresa_id` y `role`

**Ejemplo real (budgets):**
```sql
-- Lectura: usuarios ven presupuestos de su empresa
CREATE POLICY "budgets_select_same_empresa"
ON budgets FOR SELECT
USING (
  empresa_id = (
    SELECT empresa_id FROM users
    WHERE id = auth.uid()
  )
)

-- Vendedor solo ve sus presupuestos
CREATE POLICY "budgets_select_vendedor_own"
ON budgets FOR SELECT
USING (
  user_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND role = 'vendedor'
  )
)

-- Admin/Superadmin ven todos de su empresa
CREATE POLICY "budgets_select_admin"
ON budgets FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role IN ('admin', 'superadmin')
    AND empresa_id = budgets.empresa_id
  )
)
```

**Total policies:** 12 (3 por tabla: users, tariffs, budgets, + algunas adicionales)

### 4. Componentes Client vs Server

**Server Components (por defecto):**
```typescript
// src/app/dashboard/page.tsx
export default async function DashboardPage() {
  const user = await getServerUser()
  const stats = await getDashboardStats()

  return <DashboardClient user={user} initialStats={stats} />
}
```

**Client Components (con interactividad):**
```typescript
// src/components/dashboard/DashboardClient.tsx
'use client'

import { useState } from 'react'

export function DashboardClient({ user, initialStats }) {
  const [period, setPeriod] = useState('month')
  // ... lógica interactiva
}
```

**Patrón:** Server Component carga datos → pasa a Client Component para interactividad

### 5. Formularios

**Patrón actual:** Formularios controlados con `useState`

```typescript
'use client'

export function TariffForm() {
  const [formData, setFormData] = useState<TariffData>({})
  const [errors, setErrors] = useState<Errors>({})

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    // Validación manual
    const validationErrors = validateForm(formData)
    if (validationErrors) {
      setErrors(validationErrors)
      return
    }

    // Llamada Server Action
    const result = await createTariff(formData)
    if (result.success) {
      toast.success('Tarifa creada')
      router.push('/tariffs')
    } else {
      toast.error(result.error)
    }
  }

  return <form onSubmit={handleSubmit}>...</form>
}
```

**Nota:** React Hook Form no está implementado completamente (importado pero sin usar)

## 🗄️ Modelo de Datos

### Tablas Principales

#### `public.users`
```sql
id UUID PRIMARY KEY REFERENCES auth.users(id)
role TEXT ('superadmin' | 'admin' | 'vendedor')
empresa_id INTEGER (siempre 1 en MVP)
name TEXT
email TEXT
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

#### `public.tariffs`
```sql
id UUID PRIMARY KEY
empresa_id INTEGER
-- Datos básicos
title TEXT
description TEXT
-- Datos empresa
name TEXT (nombre empresa)
nif TEXT
address TEXT
contact TEXT
logo_url TEXT (archivo local o URL externa)
-- Configuración
template TEXT
primary_color TEXT ('#000000')
secondary_color TEXT ('#666666')
-- Notas
summary_note TEXT
conditions_note TEXT
legal_note TEXT
-- Estado
status TEXT ('Activa' | 'Inactiva')
validity INTEGER (días)
-- Datos tarifa
json_tariff_data JSONB (estructura jerárquica)
-- Timestamps
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

#### `public.budgets`
```sql
id UUID PRIMARY KEY
empresa_id INTEGER
tariff_id UUID REFERENCES tariffs(id)
user_id UUID REFERENCES auth.users(id)
-- Snapshot tarifa
json_tariff_data JSONB (copia al crear)
-- Datos cliente
client_type TEXT ('particular' | 'autonomo' | 'empresa')
client_name TEXT
client_nif_nie TEXT
client_phone TEXT
client_email TEXT
client_web TEXT
client_address TEXT
client_postal_code TEXT
client_locality TEXT
client_province TEXT
client_acceptance BOOLEAN
-- Datos presupuesto
json_budget_data JSONB (items con cantidades)
status TEXT ('borrador' | 'pendiente' | 'enviado' | 'aprobado' | 'rechazado' | 'caducado')
-- Totales
base DECIMAL(10,2)
iva DECIMAL(10,2)
total DECIMAL(10,2)
-- Validez
start_date DATE
end_date DATE
validity_days INTEGER
-- PDF
pdf_url TEXT
-- Timestamps
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

### Relaciones

```
auth.users (Supabase Auth)
    ↓ (1:1)
public.users
    ↓ (1:N)
public.budgets ← (N:1) → public.tariffs
```

- `users.empresa_id` → `empresas.id` (tabla no creada en MVP, valor fijo 1)
- `tariffs.empresa_id` → misma lógica
- `budgets.tariff_id` → `tariffs.id` (ON DELETE RESTRICT)
- `budgets.user_id` → `auth.users.id` (ON DELETE RESTRICT)

### Estructura JSON

**`json_tariff_data` (tarifas):**
```json
{
  "chapters": [
    {
      "id": "1",
      "nombre": "Capítulo 1",
      "descripcion": "...",
      "precio": 0,
      "children": [
        {
          "id": "1.1",
          "nombre": "Subcapítulo 1.1",
          "precio": 0,
          "children": [
            {
              "id": "1.1.1",
              "nombre": "Apartado 1.1.1",
              "precio": 0,
              "children": [
                {
                  "id": "1.1.1.1",
                  "nombre": "Partida",
                  "descripcion": "...",
                  "precio": 123.45,
                  "children": []
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

**`json_budget_data` (presupuestos):**
```json
{
  "chapters": [
    {
      "id": "1",
      "nombre": "...",
      "amount": 0,
      "children": [
        {
          "id": "1.1.1.1",
          "nombre": "Partida",
          "precio": 123.45,
          "amount": 5,
          "total": 617.25
        }
      ]
    }
  ]
}
```

## 🔐 Autenticación y Autorización

### Flujo de Autenticación

1. **Login** → `loginUser(email, password)` Server Action
2. Supabase Auth genera JWT con claims:
   ```json
   {
     "sub": "user-uuid",
     "email": "user@example.com",
     "role": "authenticated",
     "app_metadata": {},
     "user_metadata": {}
   }
   ```
3. Middleware verifica JWT en cada request protegido
4. Server Actions obtienen usuario: `await getServerUser()`
5. RLS policies filtran datos automáticamente

### Roles y Permisos

| Rol | Tarifas | Presupuestos | Usuarios |
|-----|---------|--------------|----------|
| **superadmin** | CRUD completo | Todos de la empresa | Ver todos |
| **admin** | Crear, editar | Todos de la empresa | Ver de empresa |
| **vendedor** | Solo lectura | Solo los suyos | Solo su perfil |

**Implementación:**
- Checks en Server Actions: `if (user.role !== 'admin') return error`
- RLS policies automáticas en DB
- UI condicional: botones ocultos según rol

### Middleware de Autenticación

**Ubicación:** `src/middleware.ts`

```typescript
export async function middleware(request: NextRequest) {
  const supabase = createMiddlewareClient({ req: request, res: response })
  const { data: { session } } = await supabase.auth.getSession()

  // Rutas públicas
  if (request.nextUrl.pathname.startsWith('/login')) {
    return response
  }

  // Redirect si no autenticado
  if (!session) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
}
```

## 📝 Convenciones de Código

### Nomenclatura

- **Archivos componentes:** PascalCase + extensión `.tsx`
  - ✅ `TariffForm.tsx`
  - ❌ `tariff-form.tsx`

- **Archivos utils/helpers:** kebab-case + extensión `.ts`
  - ✅ `pdf-payload-builder.ts`
  - ✅ `calculation-helpers.ts`

- **Componentes React:** PascalCase
  - ✅ `export function TariffForm() {}`

- **Funciones:** camelCase
  - ✅ `getTariffs()`, `calculateTotals()`

- **Tipos/Interfaces:** PascalCase
  - ✅ `interface TariffData {}`
  - ✅ `type ActionResult = {}`

- **Constantes:** UPPER_SNAKE_CASE
  - ✅ `const IVA_RATE = 0.21`
  - ✅ `const MAX_FILE_SIZE = 2 * 1024 * 1024`

### Estructura de Componente

```typescript
// 1. Directiva 'use client' (si aplica)
'use client'

// 2. Imports externos
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

// 3. Imports internos
import { Button } from '@/components/ui/button'
import { getTariffs } from '@/app/actions/tariffs'

// 4. Imports tipos
import type { Tariff } from '@/lib/types/database'

// 5. Tipos/Interfaces del componente
interface TariffFormProps {
  tariff?: Tariff
  onSuccess?: () => void
}

// 6. Componente
export function TariffForm({ tariff, onSuccess }: TariffFormProps) {
  // 6.1. Hooks de estado
  const [formData, setFormData] = useState({})
  const [loading, setLoading] = useState(false)

  // 6.2. Hooks de router/navegación
  const router = useRouter()

  // 6.3. Handlers
  const handleSubmit = async (e: FormEvent) => {
    // lógica
  }

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  // 6.4. Effects
  useEffect(() => {
    // inicialización
  }, [])

  // 6.5. Helpers internos
  const validateForm = () => {
    // validación
  }

  // 6.6. Render
  return (
    <form onSubmit={handleSubmit}>
      {/* JSX */}
    </form>
  )
}
```

### Estructura Server Action

```typescript
'use server'

import { cookies } from 'next/headers'
import { createServerActionClient } from '@supabase/auth-helpers-nextjs'
import { getServerUser } from '@/lib/auth/server'
import { revalidatePath } from 'next/cache'

/**
 * Descripción de la acción
 * @param params - Descripción parámetros
 * @returns ActionResult con data o error
 */
export async function myAction(params: MyParams): Promise<ActionResult> {
  try {
    console.log('[myAction] Iniciando...')

    // 1. Validación entrada
    if (!params.field) {
      return { success: false, error: 'Campo requerido' }
    }

    // 2. Autenticación
    const user = await getServerUser()
    if (!user) {
      return { success: false, error: 'No autenticado' }
    }

    // 3. Autorización (opcional)
    if (user.role === 'vendedor') {
      return { success: false, error: 'Sin permisos' }
    }

    // 4. Lógica de negocio
    const cookieStore = await cookies()
    const supabase = createServerActionClient({ cookies: () => cookieStore })

    const { data, error } = await supabase
      .from('table')
      .insert({ ...params, empresa_id: user.empresa_id })
      .select()
      .single()

    if (error) {
      console.error('[myAction] Error DB:', error)
      return { success: false, error: error.message }
    }

    // 5. Revalidación cache
    revalidatePath('/path')

    // 6. Log éxito
    console.log('[myAction] Éxito:', data.id)

    // 7. Retorno
    return { success: true, data }

  } catch (error) {
    console.error('[myAction] Error inesperado:', error)
    return { success: false, error: 'Error inesperado' }
  }
}
```

## 🎨 Estilos y UI

### Tailwind CSS

**Configuración:** `tailwind.config.ts`

```typescript
{
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        primary: 'hsl(var(--primary))',
        destructive: 'hsl(var(--destructive))',
        // ... shadcn/ui colors
      }
    }
  },
  plugins: [require('tailwindcss-animate')]
}
```

**CSS Variables:** `src/app/globals.css`

```css
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: 222.2 47.4% 11.2%;
  --destructive: 0 84.2% 60.2%;
  /* ... más variables */
}

.dark {
  --background: 222.2 84% 4.9%;
  /* ... dark mode (no implementado) */
}
```

### shadcn/ui

**Componentes instalados:**
- Accordion, Alert Dialog, Badge, Button, Card, Checkbox
- Dialog, Dropdown Menu, Input, Label, Select
- Skeleton, Table, Tabs, Textarea, Tooltip

**Patrón de uso:**
```typescript
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader } from '@/components/ui/dialog'

<Button variant="destructive" size="sm">
  Eliminar
</Button>
```

**Customización:** Mínima, solo colores en `tailwind.config.ts`

### Colores Dinámicos (Tarifas)

**NO IMPLEMENTADO** en MVP. Se guardan en DB pero no se aplican en UI.

**Estructura preparada:**
```typescript
// tariffs.primary_color → '#FF5733'
// tariffs.secondary_color → '#336699'

// Uso futuro:
<div style={{
  '--color-primary': tariff.primary_color,
  '--color-secondary': tariff.secondary_color
}}>
```

### Responsive

**Estrategia:** Mobile-first con breakpoints Tailwind

```typescript
<div className="
  w-full          // Mobile
  md:w-1/2        // Tablet
  lg:w-1/3        // Desktop
">
```

**Breakpoints Tailwind:**
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px
- `2xl`: 1536px

## 🔧 Utilidades Clave

### Formato de Números

**Ubicación:** `src/lib/helpers/format.ts`

```typescript
// Español: 1234.56 → "1.234,56 €"
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR'
  }).format(value)
}

// Parseo español: "1.234,56" → 1234.56
export function parseSpanishNumber(str: string): number {
  const normalized = str
    .replace(/\./g, '')       // Quitar separador miles
    .replace(/,/g, '.')       // Coma → punto decimal
  return parseFloat(normalized)
}

// Formato español: 1234.56 → "1.234,56"
export function formatSpanishNumber(num: number): string {
  return num.toLocaleString('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}
```

### Validadores CSV

**Ubicación:** `src/lib/validators/csv-parser.ts`

```typescript
// Validar estructura CSV
export function validateCSVStructure(data: any[]): ValidationResult {
  const requiredHeaders = ['id', 'nombre', 'precio']
  const headers = Object.keys(data[0] || {})

  const missing = requiredHeaders.filter(h => !headers.includes(h))
  if (missing.length > 0) {
    return { valid: false, error: `Faltan columnas: ${missing.join(', ')}` }
  }

  return { valid: true }
}

// Validar IDs jerárquicos
export function validateHierarchy(items: CSVRow[]): ValidationResult {
  for (const item of items) {
    if (item.id.includes('.')) {
      const parentId = item.id.split('.').slice(0, -1).join('.')
      const parentExists = items.some(i => i.id === parentId)

      if (!parentExists) {
        return {
          valid: false,
          error: `ID ${item.id} requiere padre ${parentId}`
        }
      }
    }
  }

  return { valid: true }
}
```

### Cálculos Presupuesto

**Ubicación:** `src/lib/helpers/calculation-helpers.ts`

```typescript
const IVA_RATE = 0.21

// Calcular totales de un item
export function calculateItemTotals(precio: number, cantidad: number) {
  const base = precio * cantidad
  const iva = base * IVA_RATE
  const total = base + iva

  return { base, iva, total }
}

// Propagar cantidades jerárquicamente
export function propagateAmounts(node: HierarchyNode): number {
  if (node.children.length === 0) {
    // Hoja: calcular total directo
    return (node.precio || 0) * (node.amount || 0)
  }

  // Nodo: sumar totales de hijos
  const childrenTotal = node.children.reduce((sum, child) => {
    return sum + propagateAmounts(child)
  }, 0)

  node.total = childrenTotal
  return childrenTotal
}
```

### Construcción Payload PDF

**Ubicación:** `src/lib/helpers/pdf-payload-builder.ts`

```typescript
export function buildPDFPayload(budget: Budget, tariff: Tariff) {
  // 1. Filtrar items con amount > 0
  const filteredItems = filterNonZeroItems(budget.json_budget_data)

  // 2. Renumerar IDs (1, 2, 3...)
  const renumbered = renumberHierarchicalIds(filteredItems)

  // 3. Extraer chapters para summary
  const chapters = extractChapters(renumbered)

  // 4. Calcular totales
  const totals = calculateTotals(renumbered)

  // 5. Construir payload
  return {
    company: {
      name: tariff.name,
      logo: buildLogoUrl(tariff.logo_url),
      // ...
    },
    client: {
      name: budget.client_name,
      // ...
    },
    items: renumbered,
    summary: { chapters },
    totals: {
      base: formatSpanishNumber(totals.base),
      iva: formatSpanishNumber(totals.iva),
      total: formatSpanishNumber(totals.total)
    }
  }
}
```

## 📦 Dependencias Críticas

### Producción

```json
{
  "next": "15.5.4",                     // Framework
  "react": "19.1.0",                    // UI library
  "@supabase/supabase-js": "^2.57.4",   // Cliente Supabase
  "@supabase/auth-helpers-nextjs": "^0.10.0", // Auth Next.js
  "zod": "^4.1.11",                     // Validación
  "@radix-ui/*": "^1.x",                // shadcn/ui base
  "lucide-react": "^0.544.0",           // Iconos
  "sonner": "^2.0.7",                   // Toasts
  "tailwind-merge": "^3.3.1",           // Merge clases Tailwind
  "class-variance-authority": "^0.7.1", // Variantes componentes
  "clsx": "^2.1.1"                      // Conditional classes
}
```

### Desarrollo

```json
{
  "typescript": "^5",
  "@types/node": "^20",
  "@types/react": "^19",
  "@types/react-dom": "^19",
  "eslint": "^9",
  "eslint-config-next": "15.5.4",
  "tailwindcss": "^3.4.17",
  "autoprefixer": "^10.4.21",
  "postcss": "^8.5.6"
}
```

### Ausencias Notables

- ❌ **React Hook Form** - Importado pero NO usado
- ❌ **PapaParse** - NO instalado (CSV parsing manual)
- ❌ **date-fns / dayjs** - NO usado (Date nativo)
- ❌ **axios** - NO usado (fetch nativo)
- ❌ **Testing libs** - Sin Jest, Vitest, Cypress, etc.

## 🚨 Puntos Críticos

### 1. Formato Numérico

**REGLA DE ORO:**
- **Almacenamiento DB:** SIEMPRE formato inglés (punto decimal) `1234.56`
- **Display UI:** SIEMPRE formato español (coma decimal) `1.234,56`
- **Input usuario:** Parser acepta AMBOS formatos

**Implementación:**
```typescript
// ❌ INCORRECTO
database.insert({ precio: "1.234,56" })

// ✅ CORRECTO
const precioNumber = parseSpanishNumber("1.234,56") // → 1234.56
database.insert({ precio: precioNumber })
```

### 2. Jerarquía de IDs

**Validación OBLIGATORIA antes de guardar:**

```typescript
// IDs válidos: 1, 1.1, 1.1.1, 1.1.1.1
// IDs inválidos: 1.1.1 sin 1.1 existiendo

// Profundidad máxima: 4 niveles
const levels = id.split('.')
if (levels.length > 4) {
  return { error: 'Máximo 4 niveles' }
}

// Padre debe existir
if (id.includes('.')) {
  const parentId = id.split('.').slice(0, -1).join('.')
  const parentExists = items.some(i => i.id === parentId)
  if (!parentExists) {
    return { error: `Padre ${parentId} no existe` }
  }
}
```

### 3. PDFs

**Timeout:** 60 segundos máximo

```typescript
const controller = new AbortController()
const timeoutId = setTimeout(() => controller.abort(), 60000)

const response = await fetch(RAPID_PDF_URL, {
  signal: controller.signal,
  // ...
})
```

**Logos:** URL completa (local o externa)

```typescript
// Logo local: /logos/empresa.png
const logoUrl = tariff.logo_url.startsWith('http')
  ? tariff.logo_url
  : `${process.env.NEXT_PUBLIC_APP_URL}${tariff.logo_url}`
```

**Payload:** Estructura específica para Rapid-PDF (ver `pdf-payload-builder.ts`)

### 4. RLS y Service Role

**❌ NUNCA** usar `supabaseAdmin` (service_role) en componentes cliente

```typescript
// ❌ PELIGROSO
'use client'
import { supabaseAdmin } from '@/lib/supabase/server'
// Expone service_role key al cliente

// ✅ CORRECTO
'use client'
// Llamar Server Action que usa supabaseAdmin internamente
await createTariff(data)
```

**✅ SIEMPRE** queries client-side filtran por empresa automáticamente (RLS)

### 5. Estado Presupuesto

**Transiciones válidas:**
```
borrador → pendiente → enviado → {aprobado | rechazado}
                              ↓
                          caducado (automático por validez)
```

**Implementar validación:**
```typescript
const VALID_TRANSITIONS = {
  borrador: ['pendiente'],
  pendiente: ['enviado', 'borrador'],
  enviado: ['aprobado', 'rechazado'],
  aprobado: [],
  rechazado: [],
  caducado: []
}

if (!VALID_TRANSITIONS[currentStatus].includes(newStatus)) {
  return { error: 'Transición inválida' }
}
```

## 🧪 Testing (NO implementado en MVP)

### Estrategia Futura Fase 2

**Unit Tests:**
- Helpers: `format.ts`, `calculation-helpers.ts`
- Validators: `csv-parser.ts`, `budget-validator.ts`
- Tool: Vitest (recomendado para Next.js)

**Integration Tests:**
- Server Actions completas
- Mock de Supabase con `supabase-js-mock`
- Verificar RLS policies

**E2E Tests:**
- Flujo crear tarifa (CSV → Preview → Guardar)
- Flujo crear presupuesto (Tarifa → Cliente → Items → PDF)
- Tool: Playwright (recomendado para Next.js)

## 📚 Referencias

### Documentación Oficial
- [Next.js 15 App Router](https://nextjs.org/docs)
- [React 19 Docs](https://react.dev)
- [Supabase Docs](https://supabase.com/docs)
- [shadcn/ui](https://ui.shadcn.com)
- [Tailwind CSS](https://tailwindcss.com)
- [Zod](https://zod.dev)

### APIs Externas
- **Rapid-PDF:** (documentación privada, URL en env var)

### Recursos Proyecto
- PRD: (no disponible en repo)
- Diseño Figma: (no disponible en repo)
- API Docs: Ver `mvp-completado.md` para features

---

**Documento:** Arquitectura Técnica
**Versión:** 1.0
**Última actualización:** 2025-10-03
**Estado:** MVP Fase 1 completado
