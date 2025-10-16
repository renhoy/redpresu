# Estructura de Páginas y Navegación - Redpresu

**Proyecto:** jeyca-presu (Redpresu)
**Framework:** Next.js 15.5.4 (App Router)
**Última actualización:** 2025-01-14
**Fase:** Fase 2 - Evolución Funcional

---

## 📋 Índice

1. [Visión General](#visión-general)
2. [Páginas Principales](#páginas-principales)
3. [Estructura de Carpetas](#estructura-de-carpetas)
4. [Sistema de Enrutamiento](#sistema-de-enrutamiento)
5. [Protección de Rutas](#protección-de-rutas)
6. [Sistema de Navegación](#sistema-de-navegación)
7. [Layouts y Agrupaciones](#layouts-y-agrupaciones)
8. [Rutas Dinámicas](#rutas-dinámicas)
9. [API Routes](#api-routes)
10. [Responsividad](#responsividad)
11. [Dependencias Clave](#dependencias-clave)

---

## 🌐 Visión General

Redpresu es una aplicación web para gestión de presupuestos profesionales construida con **Next.js 15.5.4** utilizando el **App Router**. La aplicación implementa:

- **SSR (Server-Side Rendering)** para todas las páginas
- **Autenticación con Supabase Auth**
- **Protección de rutas mediante middleware**
- **Route Groups** para organizar rutas sin afectar URLs
- **Layouts anidados** para compartir UI común
- **Server Actions** para operaciones de base de datos

### Stack Tecnológico de Navegación

```json
{
  "framework": "Next.js 15.5.4",
  "router": "App Router (file-based)",
  "autenticación": "@supabase/auth-helpers-nextjs",
  "iconos": "lucide-react",
  "componentes": "shadcn/ui (Radix UI)"
}
```

---

## 📄 Páginas Principales

### Rutas Públicas (Sin autenticación)

| Página | Ruta | Descripción | Componente |
|--------|------|-------------|------------|
| **Homepage** | `/` | Landing page con información del producto | `src/app/page.tsx` |
| **Login** | `/login` | Inicio de sesión | `src/app/(auth)/login/page.tsx` |
| **Registro** | `/register` | Registro de nuevos usuarios | `src/app/(auth)/register/page.tsx` |
| **Recuperar contraseña** | `/forgot-password` | Solicitud de recuperación | `src/app/(auth)/forgot-password/page.tsx` |
| **Resetear contraseña** | `/reset-password` | Cambio de contraseña con token | `src/app/(auth)/reset-password/page.tsx` |

### Rutas Protegidas (Requieren autenticación)

#### Dashboard y Resumen

| Página | Ruta | Descripción | Roles | Componente |
|--------|------|-------------|-------|------------|
| **Dashboard** | `/dashboard` | Resumen de estadísticas y accesos rápidos | Todos | `src/app/dashboard/page.tsx` |
| **Perfil** | `/profile` | Configuración de perfil de usuario | Todos | `src/app/profile/page.tsx` |

#### Gestión de Tarifas

| Página | Ruta | Descripción | Roles | Componente |
|--------|------|-------------|-------|------------|
| **Listar Tarifas** | `/tariffs` | Listado completo de tarifas | Todos | `src/app/tariffs/page.tsx` |
| **Crear Tarifa** | `/tariffs/create` | Formulario de nueva tarifa | Admin+ | `src/app/tariffs/create/page.tsx` |
| **Editar Tarifa** | `/tariffs/edit/[id]` | Formulario de edición | Admin+ | `src/app/tariffs/edit/[id]/page.tsx` |

#### Gestión de Presupuestos

| Página | Ruta | Descripción | Roles | Componente |
|--------|------|-------------|-------|------------|
| **Listar Presupuestos** | `/budgets` | Listado completo de presupuestos | Todos | `src/app/budgets/page.tsx` |
| **Crear Presupuesto** | `/budgets/create` | Formulario de nuevo presupuesto (2 pasos) | Todos | `src/app/budgets/create/page.tsx` |
| **Versiones** | `/budgets/[id]/versions` | Historial de versiones de un presupuesto | Todos | `src/app/budgets/[id]/versions/page.tsx` |

#### Gestión de Usuarios

| Página | Ruta | Descripción | Roles | Componente |
|--------|------|-------------|-------|------------|
| **Listar Usuarios** | `/users` | CRUD de usuarios de la empresa | Admin+ | `src/app/users/page.tsx` |
| **Crear Usuario** | `/users/create` | Formulario de nuevo usuario | Admin+ | `src/app/users/create/page.tsx` |
| **Editar Usuario** | `/users/[id]/edit` | Formulario de edición | Admin+ | `src/app/users/[id]/edit/page.tsx` |

#### Configuración Global

| Página | Ruta | Descripción | Roles | Componente |
|--------|------|-------------|-------|------------|
| **Configuración** | `/settings` | Configuración global del sistema | Superadmin | `src/app/settings/page.tsx` |

---

## 📁 Estructura de Carpetas

### Convención de Nombres

- **Carpetas:** `kebab-case` (e.g., `forgot-password`)
- **Componentes:** `PascalCase.tsx` (e.g., `Header.tsx`)
- **Archivos especiales Next.js:** `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`
- **Route Groups:** `(nombre)` entre paréntesis (no afecta URL)

### Árbol de Directorios

```
src/app/
├── (auth)/                      # Route Group: Rutas de autenticación
│   ├── login/
│   │   └── page.tsx            # /login
│   ├── register/
│   │   └── page.tsx            # /register
│   ├── forgot-password/
│   │   └── page.tsx            # /forgot-password
│   └── reset-password/
│       └── page.tsx            # /reset-password
│
├── (dashboard)/                 # Route Group: Layout compartido (NOTA: actualmente no usado)
│   └── layout.tsx
│
├── dashboard/
│   ├── layout.tsx              # Layout con Header
│   └── page.tsx                # /dashboard
│
├── tariffs/
│   ├── layout.tsx              # Layout con Header
│   ├── page.tsx                # /tariffs
│   ├── create/
│   │   └── page.tsx            # /tariffs/create
│   └── edit/
│       └── [id]/
│           └── page.tsx        # /tariffs/edit/:id
│
├── budgets/
│   ├── layout.tsx              # Layout con Header
│   ├── page.tsx                # /budgets
│   ├── create/
│   │   └── page.tsx            # /budgets/create
│   └── [id]/
│       └── versions/
│           └── page.tsx        # /budgets/:id/versions
│
├── users/
│   ├── layout.tsx              # Layout con Header
│   ├── page.tsx                # /users
│   ├── create/
│   │   └── page.tsx            # /users/create
│   └── [id]/
│       └── edit/
│           └── page.tsx        # /users/:id/edit
│
├── profile/
│   └── page.tsx                # /profile
│
├── settings/
│   ├── layout.tsx              # Layout con Header
│   └── page.tsx                # /settings
│
├── actions/                    # Server Actions (no son rutas)
│   ├── auth.ts
│   ├── tariffs.ts
│   ├── budgets.ts
│   ├── users.ts
│   ├── config.ts
│   └── dashboard.ts
│
├── api/                        # API Routes (REST endpoints)
│   ├── test-connection/
│   ├── verify-setup/
│   ├── debug-config/
│   ├── fix-config/
│   └── user/
│       └── issuer/
│
├── layout.tsx                  # Root layout (Geist fonts, Toaster)
└── page.tsx                    # Homepage (landing page)
```

### Convención de Route Groups

**Route Groups** permiten organizar rutas sin afectar la URL:

- `(auth)/` → Agrupa rutas de autenticación, pero NO añade `/auth` a la URL
- `(dashboard)/` → Definido pero no usado actualmente
- Útil para compartir layouts entre rutas relacionadas

**Ejemplo:**

```
src/app/(auth)/login/page.tsx → URL: /login (NO /auth/login)
```

---

## 🛣️ Sistema de Enrutamiento

### Next.js App Router (File-Based Routing)

Next.js 15 usa **file-based routing** donde:

- Cada carpeta con `page.tsx` se convierte en una ruta
- `layout.tsx` define UI compartida entre rutas hijas
- `[param]` crea rutas dinámicas
- `(grupo)` agrupa sin afectar URL

### Archivos Especiales

| Archivo | Propósito | Ejemplo |
|---------|-----------|---------|
| `page.tsx` | Define el contenido de la ruta | `/dashboard/page.tsx` → `/dashboard` |
| `layout.tsx` | UI compartida entre rutas hijas | Header común en `/tariffs/layout.tsx` |
| `loading.tsx` | UI de carga (Suspense boundary) | Skeleton mientras carga |
| `error.tsx` | Manejo de errores | Error boundary de React |
| `not-found.tsx` | Página 404 personalizada | 404 cuando ruta no existe |

### Navegación Programática

```typescript
// Con Link (preferido para enlaces)
import Link from 'next/link'
<Link href="/dashboard">Dashboard</Link>

// Con Router (para navegación dinámica)
import { useRouter } from 'next/navigation'
const router = useRouter()
router.push('/dashboard')

// Con redirect (Server Components)
import { redirect } from 'next/navigation'
redirect('/login')
```

---

## 🔒 Protección de Rutas

### Middleware Global

**Archivo:** `src/middleware.ts`

El middleware se ejecuta **antes** de cada request para verificar autenticación:

```typescript
// Rutas públicas (sin autenticación)
const publicRoutes = [
  '/',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password'
]

// Lógica de protección:
// 1. Si NO autenticado + ruta privada → redirect /login
// 2. Si autenticado + ruta pública → redirect /dashboard
// 3. Si autenticado + ruta privada → permitir acceso
```

**Configuración del Matcher:**

```typescript
export const config = {
  matcher: [
    // Excluir archivos estáticos, imágenes, _next
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

### Protección en Layouts

**Doble capa de protección:** Además del middleware, cada layout de rutas protegidas verifica autenticación:

```typescript
// src/app/dashboard/layout.tsx
export default async function DashboardLayout({ children }) {
  const user = await getServerUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div>
      <Header userRole={user.role} userName={user.nombre} />
      <main>{children}</main>
    </div>
  )
}
```

**Layouts con protección:**

- `/dashboard/layout.tsx`
- `/tariffs/layout.tsx`
- `/budgets/layout.tsx`
- `/users/layout.tsx`
- `/settings/layout.tsx`

### Autenticación con Supabase

```typescript
// Obtener usuario en Server Component
import { getServerUser } from '@/lib/auth/server'

const user = await getServerUser()
// user contiene: { id, email, nombre, role, empresa_id }
```

**Dependencia:** `@supabase/auth-helpers-nextjs`

### Redirección según Rol

Homepage (`/page.tsx`) redirige automáticamente según rol:

```typescript
if (user) {
  switch (user.role) {
    case 'superadmin':
    case 'admin':
      redirect('/dashboard')
    case 'vendedor':
      redirect('/budgets')
    default:
      redirect('/dashboard')
  }
}
```

---

## 🧭 Sistema de Navegación

### Header Común

**Componente:** `src/components/layout/Header.tsx`

Header sticky presente en **todas las páginas autenticadas**:

```tsx
<header className="sticky top-0 z-50 bg-white shadow-sm border-b">
  <div className="container mx-auto px-4">
    <div className="flex items-center justify-between h-16">
      {/* Logo */}
      {/* Navegación Desktop/Mobile */}
      {/* User info + Logout */}
    </div>
  </div>
</header>
```

**Características:**

- **Posición:** `sticky top-0` (siempre visible al hacer scroll)
- **Z-index:** `z-50` (sobre todos los elementos)
- **Altura:** `h-16` (64px)
- **Responsive:** Cambia entre desktop y mobile

### Navegación Desktop

**Breakpoint:** `lg:` (≥1024px)

```tsx
<nav className="hidden lg:flex items-center space-x-4">
  <Link href="/dashboard">
    <Button>Inicio</Button>
  </Link>
  <Link href="/tariffs">
    <Button className="bg-cyan-600">Tarifas</Button>
  </Link>
  <Link href="/budgets">
    <Button className="bg-lime-500">Presupuestos</Button>
  </Link>
  <Link href="/users">
    <Button className="bg-lime-500">Usuarios</Button>
  </Link>
  {isSuperadmin && (
    <Link href="/settings">
      <Button className="bg-lime-500">Configuración</Button>
    </Link>
  )}
</nav>
```

**Características:**

- Botones con texto completo e icono
- Color especial para Tarifas (cyan-600)
- Estado activo: `text-lime-700 bg-lime-50`
- Configuración visible solo para superadmin

### Navegación Mobile

**Breakpoint:** `< lg` (<1024px)

```tsx
<nav className="flex lg:hidden items-center gap-2">
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <Link href="/dashboard">
          <Button size="icon">
            <Home className="w-5 h-5" />
          </Button>
        </Link>
      </TooltipTrigger>
      <TooltipContent>Inicio</TooltipContent>
    </Tooltip>
  </TooltipProvider>
  {/* Resto de iconos con tooltips */}
</nav>
```

**Características:**

- Solo iconos (sin texto)
- Tooltips para indicar función
- Botones cuadrados (`size="icon"`)
- Estado activo: Border lime-500
- Touch-friendly (≥44×44px)

### Items de Navegación según Rol

```typescript
const navigation = [
  { name: 'Inicio', href: '/dashboard', icon: Home, show: true },
  { name: 'Tarifas', href: '/tariffs', icon: FileText, show: true },
  { name: 'Presupuestos', href: '/budgets', icon: Receipt, show: true },
  { name: 'Usuarios', href: '/users', icon: Users, show: true },
  {
    name: 'Configuración',
    href: '/settings',
    icon: Settings,
    show: userRole === 'superadmin'
  },
].filter(item => item.show)
```

**Permisos:**

- **Todos los roles:** Inicio, Tarifas, Presupuestos, Usuarios
- **Solo Superadmin:** Configuración

### Información de Usuario

**Desktop:**

```tsx
<div className="flex items-center gap-2">
  <CircleUser className="h-8 w-8" />
  <div>
    <span className="text-sm font-medium">{userName}</span>
    <span className="text-xs text-gray-500">{roleLabel}</span>
  </div>
</div>
```

**Mobile:**

```tsx
<Tooltip>
  <TooltipTrigger>
    <CircleUser className="h-5 w-5" />
  </TooltipTrigger>
  <TooltipContent>
    <span>{userName}</span>
    <span>{roleLabel}</span>
  </TooltipContent>
</Tooltip>
```

### Botón de Logout

**Componente:** `src/components/auth/LogoutButton.tsx`

- Desktop: Botón con texto "Cerrar Sesión"
- Mobile: Solo icono (LogOut) con tooltip
- Color: `border-green-600 text-green-600`

---

## 🎨 Layouts y Agrupaciones

### Root Layout

**Archivo:** `src/app/layout.tsx`

Layout global que envuelve toda la aplicación:

```tsx
export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        {children}
        <Toaster position="top-right" />
      </body>
    </html>
  )
}
```

**Responsabilidades:**

- Cargar fuentes (Geist Sans, Geist Mono)
- Configurar idioma (`lang="es"`)
- Toaster global (notificaciones con Sonner)
- Estilos base

### Layouts de Secciones

Cada sección principal tiene su propio layout que incluye Header:

#### Dashboard Layout

```tsx
// src/app/dashboard/layout.tsx
export default async function DashboardLayout({ children }) {
  const user = await getServerUser()
  if (!user) redirect('/login')

  return (
    <div className="min-h-screen bg-background">
      <Header userRole={user.role} userName={user.nombre} />
      <main className="pt-16">{children}</main>
    </div>
  )
}
```

**Nota:** `pt-16` compensa altura del header sticky.

#### Tariffs, Budgets, Users, Settings Layouts

Estructura idéntica al Dashboard Layout:

```tsx
// src/app/tariffs/layout.tsx (ejemplo)
export default async function TariffsLayout({ children }) {
  const user = await getServerUser()
  if (!user) redirect('/login')

  return (
    <div className="min-h-screen bg-background">
      <Header userRole={user.role} userName={user.nombre} />
      <main>{children}</main>
    </div>
  )
}
```

### Layout de Autenticación (Route Group)

**Archivo:** `src/app/(auth)/layout.tsx` (SI EXISTE)

Potencial layout compartido para rutas de autenticación (login, register, etc.):

```tsx
export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen bg-lime-50">
      {/* Header público sin navegación */}
      {children}
    </div>
  )
}
```

**Nota:** Actualmente las rutas (auth) no tienen layout específico, cada página renderiza su propio header público.

---

## 🔗 Rutas Dinámicas

### Parámetros de Ruta

Next.js App Router usa carpetas `[param]` para rutas dinámicas:

#### Editar Tarifa

```
src/app/tariffs/edit/[id]/page.tsx
→ URL: /tariffs/edit/123
→ Params: { id: "123" }
```

**Acceso a parámetros:**

```typescript
// Server Component
export default async function EditTariffPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  // Usar id...
}
```

#### Editar Usuario

```
src/app/users/[id]/edit/page.tsx
→ URL: /users/456/edit
→ Params: { id: "456" }
```

#### Versiones de Presupuesto

```
src/app/budgets/[id]/versions/page.tsx
→ URL: /budgets/789/versions
→ Params: { id: "789" }
```

### Query Params (searchParams)

**Uso común:**

- Filtros en listados
- Preselección de elementos
- Estado compartido entre páginas

**Ejemplo - Presupuestos:**

```typescript
// URL: /budgets?budget_id=123&tariff_id=456

export default async function BudgetsPage({
  searchParams
}: {
  searchParams: Promise<{ budget_id?: string; tariff_id?: string }>
}) {
  const { budget_id, tariff_id } = await searchParams

  // Filtrar presupuestos por budget_id o tariff_id
}
```

**Ejemplo - Crear Presupuesto:**

```typescript
// URL: /budgets/create?tariff_id=123&budget_id=456

// Precargar tarifa específica y/o presupuesto existente
```

**Ejemplo - Tarifas:**

```typescript
// URL: /tariffs?tariff_id=789

// Resaltar tarifa específica en el listado
```

---

## 🌐 API Routes

### Endpoints REST

La aplicación incluye API Routes para operaciones específicas:

| Endpoint | Método | Propósito |
|----------|--------|-----------|
| `/api/test-connection` | GET | Verificar conexión a BD |
| `/api/verify-setup` | GET | Verificar configuración inicial |
| `/api/debug-config` | GET | Debug de configuración |
| `/api/fix-config` | POST | Reparar configuración |
| `/api/user/issuer` | GET | Obtener datos del emisor del usuario |

**Estructura:**

```
src/app/api/
├── test-connection/
│   └── route.ts          # export async function GET()
├── verify-setup/
│   └── route.ts
└── user/
    └── issuer/
        └── route.ts
```

**Ejemplo de uso:**

```typescript
// src/components/budgets/BudgetForm.tsx
const response = await fetch('/api/user/issuer')
const data = await response.json()
```

---

## 📱 Responsividad

### Breakpoints Tailwind

```typescript
sm: 640px    // Smartphones landscape
md: 768px    // Tablets
lg: 1024px   // Desktop
xl: 1280px   // Desktop grande
2xl: 1400px  // Container max-width (custom)
```

### Estrategia Mobile-First

La aplicación usa **mobile-first approach**:

1. Estilos base para mobile
2. Media queries `md:`, `lg:` para desktop
3. Tooltips para compensar hover en mobile
4. Touch-friendly (botones ≥36×36px)

### Header Responsive

**Mobile (<1024px):**

- Logo + iconos de navegación
- Solo iconos con tooltips
- User icon con tooltip
- Logout icon con tooltip

**Desktop (≥1024px):**

- Logo + navegación completa con texto
- User info completa (nombre + rol)
- Logout button con texto

### Grid Layouts Responsive

**Dashboard Stats:**

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
  {/* 1 col mobile → 2 col tablet → 4 col desktop */}
</div>
```

**Listados:**

```tsx
<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
  {/* 1 col mobile → 2 col desktop */}
</div>
```

**Accesos Rápidos:**

```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
  {/* 1 col mobile → 2 col tablet → 3 col desktop */}
</div>
```

### Tablas Responsive

```tsx
<div className="overflow-x-auto">
  <Table>
    {/* Scroll horizontal en mobile */}
  </Table>
</div>
```

### Formularios Responsive

**Grids proporcionales:**

```tsx
// Nombre (75%) + NIF (25%)
<div className="grid grid-cols-4 gap-4">
  <div className="col-span-3">{/* Nombre */}</div>
  <div className="col-span-1">{/* NIF */}</div>
</div>
```

**Stack vertical en mobile:**

```tsx
<div className="flex flex-col sm:flex-row gap-4">
  {/* Stack vertical en mobile, horizontal en tablet+ */}
</div>
```

---

## 📦 Dependencias Clave

### Routing y Framework

```json
{
  "next": "15.5.4",
  "react": "19.1.0",
  "react-dom": "19.1.0"
}
```

**Características de Next.js 15:**

- App Router (file-based routing)
- Server Components por defecto
- Server Actions para mutaciones
- Turbopack (dev y build más rápidos)

### Autenticación

```json
{
  "@supabase/auth-helpers-nextjs": "^0.10.0",
  "@supabase/supabase-js": "^2.57.4"
}
```

**Funcionalidades:**

- Middleware para protección de rutas
- Server-side session management
- Helper para crear clientes de Supabase
- RLS (Row Level Security) integration

### Componentes UI

```json
{
  "@radix-ui/react-navigation-menu": "^1.2.14",
  "@radix-ui/react-tooltip": "^1.2.8",
  "@radix-ui/react-dialog": "^1.1.15",
  "lucide-react": "^0.544.0"
}
```

**Uso en navegación:**

- `@radix-ui/react-tooltip`: Tooltips en mobile
- `lucide-react`: Iconos de navegación

### Notificaciones

```json
{
  "sonner": "^2.0.7"
}
```

**Uso:**

- Toaster global en Root Layout
- Notificaciones toast para feedback
- Posición: `top-right`

### Validación

```json
{
  "zod": "^4.1.11"
}
```

**Uso:**

- Validación de formularios
- Validación de Server Actions
- Type-safe schemas

---

## 🔄 Flujos de Navegación

### Flujo de Login

```
1. Usuario visita /login
2. Completa formulario
3. Server Action autentica con Supabase
4. Si éxito:
   - Middleware detecta sesión
   - Redirige a /dashboard (o /budgets si vendedor)
5. Si error:
   - Toast con error
   - Permanece en /login
```

### Flujo de Logout

```
1. Usuario click en LogoutButton
2. Server Action cierra sesión en Supabase
3. Middleware detecta NO hay sesión
4. Redirige a /login
```

### Flujo de Acceso a Ruta Protegida

```
1. Usuario intenta acceder a /dashboard
2. Middleware verifica sesión:
   - Si NO autenticado → redirect /login
   - Si autenticado → continuar
3. Layout verifica autenticación (doble capa)
4. Si todo OK → renderiza página
```

### Flujo de Creación de Presupuesto

```
1. Usuario en /budgets
2. Click en "Crear Presupuesto"
3. Selecciona tarifa → redirect /budgets/create?tariff_id=123
4. Página carga:
   - Paso 1: Datos del cliente
   - Paso 2: Datos del presupuesto
5. Guardar → Server Action
6. Redirect a /budgets?budget_id=nuevo-id
```

### Flujo de Edición

```
1. Usuario en listado (tarifas, presupuestos, usuarios)
2. Click en "Editar"
3. Redirect a ruta dinámica:
   - /tariffs/edit/123
   - /users/456/edit
4. Formulario precargado con datos
5. Guardar → Server Action → actualiza BD
6. Redirect a listado o misma página
```

---

## 📊 Mapa de Navegación Visual

```
Homepage (/)
│
├─ [No autenticado]
│  ├── /login
│  ├── /register
│  ├── /forgot-password
│  └── /reset-password
│
└─ [Autenticado] → /dashboard
   │
   ├── Dashboard (/dashboard)
   │   └── Accesos rápidos a:
   │       ├── Crear Tarifa
   │       ├── Ver Tarifas
   │       └── Ver Presupuestos
   │
   ├── Tarifas (/tariffs)
   │   ├── /tariffs/create
   │   └── /tariffs/edit/[id]
   │
   ├── Presupuestos (/budgets)
   │   ├── /budgets/create?tariff_id=X
   │   └── /budgets/[id]/versions
   │
   ├── Usuarios (/users) [Admin+]
   │   ├── /users/create
   │   └── /users/[id]/edit
   │
   ├── Perfil (/profile)
   │
   └── Configuración (/settings) [Superadmin]
```

---

## 🎯 Patrones de Navegación

### Patrón "Listar → Crear → Editar"

Todas las secciones siguen este patrón:

1. **Listar:** Tabla con datos y botón "Crear"
2. **Crear:** Formulario completo → Guardar → Volver a listar
3. **Editar:** Formulario precargado → Guardar → Volver a listar

**Ejemplo - Tarifas:**

```
/tariffs → [Crear Tarifa] → /tariffs/create → [Guardar] → /tariffs
/tariffs → [Editar ✏️] → /tariffs/edit/123 → [Guardar] → /tariffs
```

### Patrón "Selección → Acción"

Para presupuestos que dependen de tarifas:

```
/tariffs → [Crear Presupuesto 📄] → /budgets/create?tariff_id=123
```

### Patrón "Filtro por Query Params"

Mantener contexto al navegar:

```
/budgets/create → [Guardar] → /budgets?budget_id=nuevo-id
/tariffs → [Presupuesto de tarifa X] → /budgets?tariff_id=X
```

---

## 🚧 Limitaciones Conocidas

### Navegación

- **Sin breadcrumbs:** No hay migas de pan para mostrar jerarquía
- **Sin navegación lateral:** Todo en header horizontal
- **Sin submenu:** Navegación plana de un nivel
- **Sin historial visual:** No se muestra "última página visitada"

### Responsividad

- **Tablas largas:** Scroll horizontal puede ser incómodo en mobile
- **Formularios complejos:** Muchos campos en pantalla pequeña
- **Tooltips:** Requieren long-press en mobile (no ideal)

### Accesibilidad

- **Sin skip-to-content:** No hay enlace para saltar navegación
- **Focus trap:** Modales no tienen trap de focus completo
- **Keyboard shortcuts:** No hay atajos de teclado documentados

---

## 🔮 Mejoras Planificadas (Fase 3)

### Navegación

- [ ] Breadcrumbs en páginas profundas
- [ ] Search global (Cmd+K)
- [ ] Historial de navegación reciente
- [ ] Favoritos/Bookmarks de rutas

### Mobile

- [ ] Bottom navigation bar (alternativa a header)
- [ ] Swipe gestures para navegar
- [ ] Mobile-specific layouts

### Accesibilidad

- [ ] Skip-to-content link
- [ ] Keyboard shortcuts globales
- [ ] Focus management mejorado
- [ ] Screen reader testing completo

---

## 📚 Referencias

### Documentación Oficial

- [Next.js App Router](https://nextjs.org/docs/app)
- [Next.js Routing](https://nextjs.org/docs/app/building-your-application/routing)
- [Supabase Auth Helpers](https://supabase.com/docs/guides/auth/auth-helpers/nextjs)

### Convenciones del Proyecto

- Ver `CLAUDE.md` para reglas de modificación de archivos
- Ver `arquitectura.md` para patrones técnicos
- Ver `design.md` para sistema de diseño UI

---

## 📝 Changelog

### v1.0 (2025-01-14)

- Documentación inicial de estructura de páginas
- Análisis completo de sistema de navegación
- Documentación de protección de rutas
- Mapeo de todas las rutas públicas y privadas

### Próximas versiones

- v1.1: Documentar rutas de Fase 2 (versiones, notas)
- v1.2: Añadir diagramas de flujo visuales
- v2.0: Documentar navegación responsive mejorada

---

**Documento generado por:** IA especializada en análisis de aplicaciones web
**Mantenido por:** Equipo de desarrollo
**Próxima revisión:** Fin de Fase 2
