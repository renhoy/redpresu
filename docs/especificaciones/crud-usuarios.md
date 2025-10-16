# CRUD de Usuarios

## Información General

**Aplicación:** Redpresu (JEYCA Presupuestos)
**Framework:** Next.js 15.5.4 (App Router)
**Base de datos:** Supabase (PostgreSQL)
**Autenticación:** Supabase Auth con RLS (Row Level Security)
**Validación:** Zod 4.1
**Fecha:** 2025-01-14

---

## 1. Entidad Usuario

### 1.1 Estructura de la Tabla `public.users`

La tabla `users` extiende la autenticación de Supabase (`auth.users`) con campos personalizados para la aplicación.

**Ubicación:** PostgreSQL - Tabla `public.users`

```sql
CREATE TABLE public.users (
    -- Clave primaria (referencia a auth.users)
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Información personal
    nombre TEXT,                        -- Nombre del usuario
    apellidos TEXT,                     -- Apellidos del usuario
    email TEXT NOT NULL,                -- Email (sincronizado con auth.users)

    -- Sistema de roles
    role TEXT NOT NULL
        CHECK (role IN ('superadmin', 'admin', 'vendedor')),

    -- Multi-tenant
    empresa_id INTEGER NOT NULL DEFAULT 1,

    -- Estado y gestión
    status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'inactive', 'pending')),
    invited_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    last_login TIMESTAMPTZ,

    -- Auditoría
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 1.2 Campos Detallados

| Campo | Tipo | Obligatorio | Descripción |
|-------|------|-------------|-------------|
| `id` | UUID | ✅ | ID único (referencia a `auth.users.id`). Se genera automáticamente al crear usuario en Supabase Auth |
| `nombre` | TEXT | ❌ | Nombre del usuario (máx. 100 caracteres) |
| `apellidos` | TEXT | ❌ | Apellidos del usuario (máx. 100 caracteres) |
| `email` | TEXT | ✅ | Email único del usuario. Sincronizado con `auth.users.email` |
| `role` | TEXT | ✅ | Rol del usuario: `'superadmin'`, `'admin'`, o `'vendedor'` |
| `empresa_id` | INTEGER | ✅ | ID de la empresa (1 en MVP, preparado para multi-tenant) |
| `status` | TEXT | ✅ | Estado: `'active'` (activo), `'inactive'` (desactivado), `'pending'` (pendiente primer login) |
| `invited_by` | UUID | ❌ | ID del usuario que creó/invitó a este usuario (auditoría) |
| `last_login` | TIMESTAMPTZ | ❌ | Timestamp del último inicio de sesión exitoso |
| `created_at` | TIMESTAMPTZ | ✅ | Fecha de creación del usuario |
| `updated_at` | TIMESTAMPTZ | ✅ | Fecha de última actualización (actualizado automáticamente por trigger) |

### 1.3 Roles y Significado

```typescript
type UserRole = 'superadmin' | 'admin' | 'vendedor'
```

- **`superadmin`**:
  - Acceso total al sistema
  - Puede gestionar todas las empresas
  - Puede crear, actualizar y eliminar usuarios
  - Ve todos los usuarios del sistema

- **`admin`**:
  - Acceso completo a su empresa
  - Puede crear usuarios (rol `admin` o `vendedor`)
  - Puede gestionar tarifas y presupuestos de su empresa
  - Ve todos los usuarios de su empresa (excepto superadmins)

- **`vendedor`**:
  - Acceso limitado a sus propios presupuestos
  - Solo puede ver tarifas activas
  - No puede crear otros usuarios
  - Solo ve su propio perfil de usuario

### 1.4 Estados de Usuario

```typescript
type UserStatus = 'active' | 'inactive' | 'pending'
```

- **`active`**: Usuario activo, puede acceder al sistema normalmente
- **`inactive`**: Usuario desactivado (soft delete), no puede acceder
- **`pending`**: Usuario recién creado, debe cambiar contraseña temporal en primer login

### 1.5 Migraciones Relacionadas

**Migración inicial:** `migrations/001_initial_schema.sql`
- Crea tabla `users` con campos básicos: `id`, `role`, `empresa_id`, `name`, `email`

**Migración 007:** `migrations/007_users_status_fields.sql` (Fase 2)
- Añade campos: `status`, `invited_by`, `last_login`
- Añade constraint para validar `status`
- Crea índices para optimizar consultas
- Actualiza políticas RLS para gestión de usuarios por admins

**Migración 009:** `migrations/009_users_nombre_apellidos.sql` (Fase 2)
- Renombra `name` → `nombre`
- Añade campo `apellidos`
- Migra datos existentes dividiendo nombre completo

### 1.6 Índices

```sql
CREATE INDEX idx_users_role ON public.users(role);
CREATE INDEX idx_users_empresa_id ON public.users(empresa_id);
CREATE INDEX idx_users_status ON public.users(status);
CREATE INDEX idx_users_invited_by ON public.users(invited_by);
CREATE INDEX idx_users_last_login ON public.users(last_login);
CREATE INDEX idx_users_empresa_status ON public.users(empresa_id, status);
```

---

## 2. Operaciones CRUD

### 2.1 Arquitectura

**Patrón:** Server Actions de Next.js 15
**Ubicación:** `/src/app/actions/users.ts`
**Cliente Supabase:** `supabaseAdmin` (con `service_role` key para bypass RLS)

> **Nota:** Se usa `supabaseAdmin` en vez del cliente autenticado porque las Server Actions ya validan permisos mediante `getServerUser()` y funciones helper. Esto permite operaciones administrativas (crear usuarios en `auth.users`) que no son posibles con el cliente normal.

### 2.2 CREATE - Crear Usuario

#### Server Action: `createUser()`

**Ruta:** `src/app/actions/users.ts:233-334`
**Endpoint:** No hay endpoint REST (usa Server Action)
**Método:** POST implícito (formulario React)

**Firma:**
```typescript
export async function createUser(data: CreateUserData): Promise<ActionResult>
```

**Input Schema (Zod):**
```typescript
const createUserSchema = z.object({
  email: z.string().email('Email inválido').toLowerCase().trim(),
  nombre: z.string().min(1, 'El nombre es requerido').max(100).trim(),
  apellidos: z.string().min(1, 'Los apellidos son requeridos').max(100).trim(),
  role: z.enum(['vendedor', 'admin', 'superadmin'], {
    required_error: 'El rol es requerido'
  }),
  empresa_id: z.number().int().positive()
})

export type CreateUserData = z.infer<typeof createUserSchema>
```

**Proceso de Creación (Transaccional):**

```typescript
1. Validar permisos → checkAdminPermission()
   - Usuario actual debe ser 'admin' o 'superadmin'
   - Si no: retornar { success: false, error: 'No tienes permisos...' }

2. Validar empresa → data.empresa_id === currentUser.empresa_id
   - Solo puede crear usuarios de su propia empresa
   - Si no: retornar { success: false, error: 'No puedes crear usuarios...' }

3. Validar datos → createUserSchema.parse(data)
   - Email válido y normalizado (lowercase, trim)
   - Nombre y apellidos: 1-100 caracteres
   - Role válido
   - Si falla: retornar error de Zod

4. Generar password temporal → generateTemporaryPassword()
   - 12 caracteres: letras mayúsculas, minúsculas, números, símbolos
   - Ejemplo: "K7m@3PqX9Lw#"

5. Crear usuario en auth.users → supabaseAdmin.auth.admin.createUser()
   - email: data.email
   - password: temporaryPassword
   - email_confirm: true (auto-confirmar email)
   - Si falla: retornar error (ej: "User already registered" → "Este email ya está registrado")

6. Crear registro en public.users → supabaseAdmin.from('users').insert()
   - id: authData.user.id (UUID de auth.users)
   - email, nombre, apellidos, role, empresa_id
   - status: 'pending' (usuario debe cambiar password)
   - invited_by: currentUser.id
   - Si falla: ROLLBACK → eliminar usuario de auth.users

7. Retornar éxito:
   {
     success: true,
     data: userData,
     temporaryPassword: "K7m@3PqX9Lw#" // Para mostrar al admin
   }
```

**Validaciones:**

| Validación | Tipo | Mensaje de Error |
|------------|------|------------------|
| Email vacío | Zod | "Email inválido" |
| Email formato inválido | Zod | "Email inválido" |
| Nombre vacío | Zod | "El nombre es requerido" |
| Nombre > 100 chars | Zod | String demasiado largo |
| Apellidos vacíos | Zod | "Los apellidos son requeridos" |
| Apellidos > 100 chars | Zod | String demasiado largo |
| Role inválido | Zod | "El rol es requerido" |
| Email duplicado | Supabase | "Este email ya está registrado" |
| Usuario no admin/superadmin | Server | "No tienes permisos para crear usuarios" |
| Empresa diferente | Server | "No puedes crear usuarios de otra empresa" |

**Respuesta Exitosa:**
```typescript
{
  success: true,
  data: {
    id: "uuid-del-usuario",
    email: "nuevo@empresa.com",
    nombre: "Juan",
    apellidos: "García López",
    role: "vendedor",
    empresa_id: 1,
    status: "pending",
    invited_by: "uuid-admin",
    last_login: null,
    created_at: "2025-01-14T10:30:00Z",
    updated_at: "2025-01-14T10:30:00Z"
  },
  temporaryPassword: "K7m@3PqX9Lw#"
}
```

**Formulario UI:**
Ubicación: `src/components/users/UserForm.tsx:80-146`

Campos:
- Email (input text, required, disabled en edición)
- Nombre (input text, required)
- Apellidos (input text, required)
- Role (select, options según rol del usuario actual)

**Página:** `src/app/users/create/page.tsx`
**Ruta:** `/users/create`

---

### 2.3 READ - Leer Usuarios

#### 2.3.1 Server Action: `getUsers()`

**Ruta:** `src/app/actions/users.ts:122-172`

**Firma:**
```typescript
export async function getUsers(): Promise<ActionResult<UserWithInviter[]>>
```

**Proceso:**

```typescript
1. Validar acceso → checkUserAccess()
   - Usuario autenticado (cualquier rol puede ver lista)
   - Si no autenticado: retornar error

2. Construir query base:
   SELECT users.*,
          inviter.nombre, inviter.apellidos, inviter.email
   FROM users
   LEFT JOIN users AS inviter ON users.invited_by = inviter.id
   WHERE users.empresa_id = currentUser.empresa_id

3. Filtrar según rol:
   - Si role === 'superadmin': Ver TODOS los usuarios (sin filtro)
   - Si role !== 'superadmin': OCULTAR superadmins (.neq('role', 'superadmin'))

4. Ordenar por fecha de creación DESC

5. Formatear datos:
   - Mapear inviter a inviter_name (nombre completo) e inviter_email

6. Retornar lista de usuarios
```

**Permisos por Rol:**

| Rol | Qué ve |
|-----|--------|
| `superadmin` | Todos los usuarios de todas las empresas |
| `admin` | Todos los usuarios de su empresa (excepto superadmins) |
| `vendedor` | Todos los usuarios de su empresa (excepto superadmins), pero solo puede editar su perfil |

**Respuesta:**
```typescript
{
  success: true,
  data: [
    {
      id: "uuid-1",
      email: "admin@empresa.com",
      nombre: "María",
      apellidos: "López",
      role: "admin",
      empresa_id: 1,
      status: "active",
      invited_by: null,
      inviter_name: undefined,
      inviter_email: undefined,
      last_login: "2025-01-14T09:00:00Z",
      created_at: "2024-09-01T00:00:00Z",
      updated_at: "2025-01-14T09:00:00Z"
    },
    {
      id: "uuid-2",
      email: "vendedor@empresa.com",
      nombre: "Juan",
      apellidos: "García",
      role: "vendedor",
      empresa_id: 1,
      status: "pending",
      invited_by: "uuid-1",
      inviter_name: "María López",
      inviter_email: "admin@empresa.com",
      last_login: null,
      created_at: "2025-01-14T10:30:00Z",
      updated_at: "2025-01-14T10:30:00Z"
    }
  ]
}
```

**Componente UI:**
Ubicación: `src/components/users/UserTable.tsx`

Vista Desktop (lg+):
- Tabla con columnas: Usuario, Email, Estado, Invitado por, Último acceso, Acciones
- Acciones: Editar, Activar/Desactivar, Reenviar invitación (si pending)

Vista Mobile/Tablet:
- Cards con componente `UserCard.tsx`

**Página:** `src/app/users/page.tsx`
**Ruta:** `/users`

#### 2.3.2 Server Action: `getUserById()`

**Ruta:** `src/app/actions/users.ts:177-228`

**Firma:**
```typescript
export async function getUserById(userId: string): Promise<ActionResult<UserWithInviter>>
```

**Proceso:**

```typescript
1. Validar acceso → checkUserAccess()

2. Validar permiso específico:
   - Si role === 'vendedor' AND userId !== currentUser.id:
     → retornar error "No tienes permisos para ver este usuario"

3. Query usuario:
   SELECT users.*, inviter.*
   WHERE users.id = userId
     AND users.empresa_id = currentUser.empresa_id

4. Formatear datos (incluir inviter_name, inviter_email)

5. Retornar usuario
```

**Permisos:**

| Rol | Puede ver |
|-----|-----------|
| `superadmin` | Cualquier usuario de cualquier empresa |
| `admin` | Cualquier usuario de su empresa |
| `vendedor` | Solo su propio usuario |

**Ruta:** No tiene ruta específica (se usa en página de edición)

---

### 2.4 UPDATE - Actualizar Usuario

#### Server Action: `updateUser()`

**Ruta:** `src/app/actions/users.ts:339-413`

**Firma:**
```typescript
export async function updateUser(
  userId: string,
  data: UpdateUserData
): Promise<ActionResult>
```

**Input Schema (Zod):**
```typescript
const updateUserSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido').max(100).trim().optional(),
  apellidos: z.string().min(1, 'Los apellidos son requeridos').max(100).trim().optional(),
  role: z.enum(['vendedor', 'admin', 'superadmin']).optional(),
  status: z.enum(['active', 'inactive', 'pending']).optional()
})

export type UpdateUserData = z.infer<typeof updateUserSchema>
```

**Proceso:**

```typescript
1. Validar permisos → checkAdminPermission()
   - Usuario actual debe ser 'admin' o 'superadmin'
   - Si no: retornar error

2. Validar datos → updateUserSchema.parse(data)
   - Todos los campos son opcionales
   - Si falla: retornar error de Zod

3. Verificar usuario objetivo:
   SELECT empresa_id, role FROM users WHERE id = userId
   - Verificar que existe
   - Verificar que pertenece a la misma empresa

4. Prevenir auto-despromoción:
   - Si userId === currentUser.id AND data.role !== currentUser.role:
     → retornar error "No puedes cambiar tu propio rol"

5. Actualizar usuario:
   UPDATE users
   SET nombre = ?, apellidos = ?, role = ?, status = ?, updated_at = NOW()
   WHERE id = userId

6. Retornar usuario actualizado
```

**Validaciones:**

| Validación | Tipo | Mensaje |
|------------|------|---------|
| Usuario no admin/superadmin | Server | "No tienes permisos para actualizar usuarios" |
| Usuario de otra empresa | Server | "No puedes actualizar usuarios de otra empresa" |
| Cambiar propio rol | Server | "No puedes cambiar tu propio rol" |
| Usuario no encontrado | Server | "Usuario no encontrado" |
| Nombre inválido | Zod | "El nombre es requerido" |
| Apellidos inválidos | Zod | "Los apellidos son requeridos" |

**Campos Editables:**

| Campo | Admin puede editar | Vendedor puede editar (solo su perfil) |
|-------|-------------------|----------------------------------------|
| `email` | ❌ No | ❌ No |
| `nombre` | ✅ Sí | ✅ Sí |
| `apellidos` | ✅ Sí | ✅ Sí |
| `role` | ✅ Sí | ❌ No |
| `status` | ✅ Sí | ❌ No |
| `empresa_id` | ❌ No | ❌ No |

**Formulario UI:**
Ubicación: `src/components/users/UserForm.tsx` (modo `edit`)

**Página:** `src/app/users/[id]/edit/page.tsx`
**Ruta:** `/users/:id/edit`

#### Server Action: `toggleUserStatus()`

**Ruta:** `src/app/actions/users.ts:418-420`

**Firma:**
```typescript
export async function toggleUserStatus(
  userId: string,
  newStatus: 'active' | 'inactive'
): Promise<ActionResult>
```

**Proceso:**
```typescript
// Wrapper simple de updateUser() para cambiar solo el status
return updateUser(userId, { status: newStatus })
```

**UI:**
Botón "Activar/Desactivar" en tabla de usuarios (`UserTable.tsx:215-238`)

---

### 2.5 DELETE - Eliminar Usuario

#### Server Action: `deleteUser()`

**Ruta:** `src/app/actions/users.ts:425-471`

**Firma:**
```typescript
export async function deleteUser(userId: string): Promise<ActionResult>
```

**Proceso:**

```typescript
1. Validar permisos → checkAdminPermission()
   - Usuario debe ser 'admin' o 'superadmin'

2. Validar rol específico:
   - SOLO 'superadmin' puede eliminar permanentemente
   - Si admin intenta: retornar error "Solo superadmin puede eliminar..."

3. Prevenir auto-eliminación:
   - Si userId === currentUser.id:
     → retornar error "No puedes eliminarte a ti mismo"

4. Verificar usuario objetivo:
   - Verificar que existe
   - Verificar que pertenece a la misma empresa

5. Eliminar de auth.users (cascada a public.users):
   supabaseAdmin.auth.admin.deleteUser(userId)
   - Esto automáticamente elimina de public.users por ON DELETE CASCADE

6. Retornar éxito
```

**Validaciones:**

| Validación | Mensaje |
|------------|---------|
| Usuario no superadmin | "Solo superadmin puede eliminar usuarios permanentemente" |
| Auto-eliminación | "No puedes eliminarte a ti mismo" |
| Usuario de otra empresa | "Usuario no encontrado" |
| Error Supabase Auth | "Error al eliminar usuario" |

**Permisos:**

| Rol | Puede eliminar |
|-----|----------------|
| `superadmin` | ✅ Cualquier usuario (excepto a sí mismo) |
| `admin` | ❌ No (usar soft delete via `status: 'inactive'`) |
| `vendedor` | ❌ No |

> **Nota:** En la práctica, se recomienda usar **soft delete** (cambiar `status` a `'inactive'`) en vez de eliminación física. La eliminación física solo está disponible para superadmins y se usa en casos excepcionales.

**UI:** No hay botón de eliminación física en la interfaz actual. Se usa soft delete exclusivamente.

---

## 3. Validaciones

### 3.1 Schemas Zod

Ubicación: `src/app/actions/users.ts:39-57`

#### 3.1.1 Schema de Creación

```typescript
const createUserSchema = z.object({
  email: z.string()
    .email('Email inválido')
    .toLowerCase()
    .trim(),

  nombre: z.string()
    .min(1, 'El nombre es requerido')
    .max(100)
    .trim(),

  apellidos: z.string()
    .min(1, 'Los apellidos son requeridos')
    .max(100)
    .trim(),

  role: z.enum(['vendedor', 'admin', 'superadmin'], {
    required_error: 'El rol es requerido'
  }),

  empresa_id: z.number()
    .int()
    .positive()
})
```

**Transformaciones:**
- `email`: Convertido a minúsculas y sin espacios
- `nombre`: Sin espacios al inicio/final
- `apellidos`: Sin espacios al inicio/final

#### 3.1.2 Schema de Actualización

```typescript
const updateUserSchema = z.object({
  nombre: z.string()
    .min(1, 'El nombre es requerido')
    .max(100)
    .trim()
    .optional(),

  apellidos: z.string()
    .min(1, 'Los apellidos son requeridos')
    .max(100)
    .trim()
    .optional(),

  role: z.enum(['vendedor', 'admin', 'superadmin'])
    .optional(),

  status: z.enum(['active', 'inactive', 'pending'])
    .optional()
})
```

**Diferencias con schema de creación:**
- Todos los campos son opcionales (`.optional()`)
- No incluye `email` (no se puede cambiar)
- No incluye `empresa_id` (no se puede cambiar)
- Añade `status` (solo en actualización)

### 3.2 Validaciones de Base de Datos

#### Constraints de Tabla

```sql
-- Rol válido
CHECK (role IN ('superadmin', 'admin', 'vendedor'))

-- Status válido
CHECK (status IN ('active', 'inactive', 'pending'))

-- Email único (heredado de auth.users)
UNIQUE (email) -- En auth.users

-- ID válido (referencia obligatoria)
FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE

-- Inviter válido (si existe)
FOREIGN KEY (invited_by) REFERENCES public.users(id) ON DELETE SET NULL
```

#### Trigger de Actualización

```sql
CREATE TRIGGER trigger_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

Actualiza automáticamente `updated_at` a `NOW()` en cada UPDATE.

### 3.3 Validaciones de Negocio (Server Actions)

Ubicación: `src/app/actions/users.ts:66-101`

#### Helper: `checkAdminPermission()`

```typescript
async function checkAdminPermission(): Promise<{
  allowed: boolean
  currentUser: { id: string; role: string; empresa_id: number } | null
}>
```

**Valida:**
- Usuario autenticado (`getServerUser()`)
- Rol es `'admin'` o `'superadmin'`

**Usado en:**
- `createUser()`
- `updateUser()`
- `deleteUser()`

#### Helper: `checkUserAccess()`

```typescript
async function checkUserAccess(): Promise<{
  allowed: boolean
  currentUser: { id: string; role: string; empresa_id: number } | null
}>
```

**Valida:**
- Usuario autenticado (`getServerUser()`)

**Usado en:**
- `getUsers()` (cualquier rol puede ver lista)
- `getUserById()` (con validación adicional para vendedor)

#### Validaciones Específicas

**En `createUser()`:**
```typescript
// 1. Usuario debe ser admin/superadmin
if (!allowed) {
  return { success: false, error: 'No tienes permisos para crear usuarios' }
}

// 2. Solo puede crear usuarios de su empresa
if (data.empresa_id !== currentUser.empresa_id) {
  return { success: false, error: 'No puedes crear usuarios de otra empresa' }
}

// 3. Email no duplicado (validado por Supabase Auth)
// Si ya existe: { success: false, error: 'Este email ya está registrado' }
```

**En `updateUser()`:**
```typescript
// 1. Usuario debe ser admin/superadmin
if (!allowed) {
  return { success: false, error: 'No tienes permisos para actualizar usuarios' }
}

// 2. Usuario objetivo debe ser de la misma empresa
if (targetUser.empresa_id !== currentUser.empresa_id) {
  return { success: false, error: 'No puedes actualizar usuarios de otra empresa' }
}

// 3. No puede cambiar su propio rol
if (userId === currentUser.id && data.role && data.role !== currentUser.role) {
  return { success: false, error: 'No puedes cambiar tu propio rol' }
}
```

**En `deleteUser()`:**
```typescript
// 1. Solo superadmin puede eliminar
if (!allowed || currentUser.role !== 'superadmin') {
  return { success: false, error: 'Solo superadmin puede eliminar usuarios permanentemente' }
}

// 2. No puede auto-eliminarse
if (userId === currentUser.id) {
  return { success: false, error: 'No puedes eliminarte a ti mismo' }
}

// 3. Usuario debe ser de la misma empresa
if (!targetUser || targetUser.empresa_id !== currentUser.empresa_id) {
  return { success: false, error: 'Usuario no encontrado' }
}
```

**En `getUserById()`:**
```typescript
// Vendedor solo puede ver su propio usuario
if (currentUser.role === 'vendedor' && userId !== currentUser.id) {
  return { success: false, error: 'No tienes permisos para ver este usuario' }
}
```

### 3.4 Validaciones de Formulario (Client-Side)

Ubicación: `src/components/users/UserForm.tsx`

#### Validación HTML5

```tsx
<Input
  type="email"
  required
  // Navegador valida formato email antes de submit
/>

<Input
  type="text"
  required
  // Navegador valida campo no vacío
/>
```

#### Validación en Tiempo Real

```typescript
const handleInputChange = (field: keyof FormData) => (
  e: React.ChangeEvent<HTMLInputElement>
) => {
  // Actualizar valor
  setFormData(prev => ({
    ...prev,
    [field]: e.target.value
  }))

  // Limpiar error del campo al empezar a escribir
  if (errors[field]) {
    setErrors(prev => {
      const newErrors = { ...prev }
      delete newErrors[field]
      return newErrors
    })
  }
}
```

#### Validación Pre-Submit

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()
  setErrors({}) // Limpiar errores previos

  // Validación implícita por required en inputs
  // Validación server-side en Server Action
}
```

---

## 4. Permisos y Seguridad

### 4.1 Row Level Security (RLS)

#### 4.1.1 Políticas RLS para `users`

Ubicación: `migrations/002_rls_policies.sql` (inicial) y `migrations/007_users_status_fields.sql` (actualizado)

**Función Helper:**

```sql
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT role
  FROM public.users
  WHERE id = auth.uid()
  LIMIT 1;
$$;
```

Esta función se usa en todas las políticas para obtener el rol del usuario autenticado.

#### 4.1.2 Política SELECT

```sql
CREATE POLICY "users_select_policy"
  ON public.users FOR SELECT
  USING (
    empresa_id = (
      SELECT empresa_id
      FROM public.users
      WHERE id = auth.uid()
    )
  );
```

**Permisos:**
- Usuarios ven usuarios de su misma empresa
- Filtro adicional en Server Action:
  - Superadmin ve TODOS
  - Admin/Vendedor NO ven superadmins

**Matriz de Visibilidad:**

| Usuario Actual | Puede Ver |
|----------------|-----------|
| Superadmin | Todos los usuarios de todas las empresas |
| Admin de Empresa 1 | Usuarios de Empresa 1 (excepto superadmins) |
| Vendedor de Empresa 1 | Usuarios de Empresa 1 (excepto superadmins) |

#### 4.1.3 Política INSERT

```sql
CREATE POLICY "users_insert_policy"
  ON public.users FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('admin', 'superadmin')
      AND empresa_id = users.empresa_id
    )
  );
```

**Permisos:**
- Solo admin y superadmin pueden insertar
- Solo pueden insertar usuarios de su propia empresa

> **Nota:** En la práctica, la inserción se hace con `supabaseAdmin` (bypassing RLS), pero la validación se hace en la Server Action.

#### 4.1.4 Política UPDATE

```sql
CREATE POLICY "users_update_policy"
  ON public.users FOR UPDATE
  USING (
    -- User updates their own profile
    id = auth.uid()
    OR
    -- Admin/superadmin updates users in their company
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.role IN ('admin', 'superadmin')
      AND u.empresa_id = users.empresa_id
    )
  );
```

**Permisos:**
- Usuario puede actualizar su propio perfil
- Admin/Superadmin pueden actualizar usuarios de su empresa

**Matriz de Permisos UPDATE:**

| Usuario Actual | Puede Actualizar |
|----------------|------------------|
| Superadmin | Cualquier usuario de cualquier empresa |
| Admin de Empresa 1 | Usuarios de Empresa 1 + su propio perfil |
| Vendedor de Empresa 1 | Solo su propio perfil |

#### 4.1.5 Política DELETE

```sql
CREATE POLICY "users_delete_policy"
  ON public.users FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role = 'superadmin'
    )
  );
```

**Permisos:**
- Solo superadmin puede eliminar usuarios físicamente

### 4.2 Permisos en Server Actions

#### Matriz de Permisos Completa

| Operación | Superadmin | Admin | Vendedor |
|-----------|-----------|-------|----------|
| **CREATE** | ✅ Sí (cualquier empresa) | ✅ Sí (su empresa) | ❌ No |
| **READ (lista)** | ✅ Todos los usuarios | ✅ Usuarios de su empresa (sin superadmins) | ✅ Usuarios de su empresa (sin superadmins) |
| **READ (individual)** | ✅ Cualquier usuario | ✅ Usuarios de su empresa | ✅ Solo su perfil |
| **UPDATE** | ✅ Cualquier usuario | ✅ Usuarios de su empresa | ✅ Solo su perfil (sin cambiar rol/status) |
| **DELETE** | ✅ Cualquier usuario (excepto a sí mismo) | ❌ No (usar soft delete) | ❌ No |
| **Toggle Status** | ✅ Sí | ✅ Sí | ❌ No |

#### Restricciones Especiales

**Creación de Usuarios con Rol Superadmin:**

Ubicación: `src/components/users/UserForm.tsx:168-190`

```typescript
const getAvailableRoles = () => {
  if (currentUserRole === 'superadmin') {
    return [
      { value: 'vendedor', label: 'Vendedor' },
      { value: 'admin', label: 'Admin' },
      { value: 'superadmin', label: 'Superadmin' }
    ]
  } else if (currentUserRole === 'admin') {
    // Admin NO puede crear superadmins
    return [
      { value: 'vendedor', label: 'Vendedor' },
      { value: 'admin', label: 'Admin' }
    ]
  }
}
```

**Matriz de Creación por Rol:**

| Usuario Creador | Puede Crear Vendedor | Puede Crear Admin | Puede Crear Superadmin |
|-----------------|---------------------|-------------------|----------------------|
| Superadmin | ✅ | ✅ | ✅ |
| Admin | ✅ | ✅ | ❌ |
| Vendedor | ❌ | ❌ | ❌ |

### 4.3 Seguridad de Contraseñas

#### Generación de Password Temporal

Ubicación: `src/app/actions/users.ts:106-113`

```typescript
function generateTemporaryPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%'
  let password = ''
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}
```

**Características:**
- Longitud: 12 caracteres
- Mayúsculas: A-Z (sin I, O para evitar confusión)
- Minúsculas: a-z (sin l para evitar confusión)
- Números: 2-9 (sin 0, 1 para evitar confusión)
- Símbolos: `!@#$%`

**Ejemplo:** `K7m@3PqX9Lw#`

#### Almacenamiento

- Contraseñas hasheadas con **bcrypt** (gestionado por Supabase Auth)
- No se almacena password en `public.users`
- Password temporal se muestra UNA VEZ al admin después de creación

#### Flujo de Primer Login

```
1. Admin crea usuario
   → status: 'pending'
   → password: temporal generada

2. Admin copia password y la envía al usuario (email/mensaje seguro)

3. Usuario hace login con password temporal
   → Supabase Auth valida credenciales
   → updateUserLastLogin() actualiza last_login

4. [FUTURO] Sistema detecta status: 'pending'
   → Redirige a página de cambio de contraseña obligatorio
   → Usuario establece nueva contraseña
   → status: 'pending' → 'active'
```

> **Nota:** Actualmente la funcionalidad de cambio de contraseña obligatorio en primer login NO está implementada. El status `'pending'` está preparado para esta feature futura.

### 4.4 Auditoría

#### Campos de Auditoría

| Campo | Propósito |
|-------|-----------|
| `created_at` | Cuándo se creó el usuario |
| `updated_at` | Última modificación del registro |
| `invited_by` | Quién creó/invitó al usuario |
| `last_login` | Última vez que el usuario accedió al sistema |

#### Función de Actualización de Last Login

Ubicación: `migrations/007_users_status_fields.sql:108-118`

```sql
CREATE OR REPLACE FUNCTION public.update_user_last_login(user_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE public.users
  SET last_login = NOW()
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Uso:** Llamada desde Server Action `signInAction()` en `src/app/actions/auth.ts` después de login exitoso.

#### Trazabilidad

**Creación:**
```typescript
{
  id: "uuid-nuevo",
  invited_by: "uuid-admin-creador",
  created_at: "2025-01-14T10:30:00Z"
}
```

**Consulta:**
```sql
SELECT u.nombre, u.apellidos, u.email,
       i.nombre AS inviter_nombre, i.apellidos AS inviter_apellidos
FROM users u
LEFT JOIN users i ON u.invited_by = i.id
WHERE u.id = 'uuid-nuevo'
```

**Resultado:**
```
Juan García López - Invitado por María López (admin@empresa.com)
```

---

## 5. Rutas y Navegación

### 5.1 Rutas de la Aplicación

#### Estructura de Archivos

```
src/app/users/
├── layout.tsx              # Layout wrapper con auth check
├── page.tsx                # Lista de usuarios (GET /users)
├── create/
│   └── page.tsx            # Crear usuario (GET /users/create)
└── [id]/
    └── edit/
        └── page.tsx        # Editar usuario (GET /users/:id/edit)
```

#### Rutas Disponibles

| Ruta | Método | Componente | Descripción |
|------|--------|-----------|-------------|
| `/users` | GET | `UsersPage` | Lista de usuarios con tabla |
| `/users/create` | GET | `CreateUserPage` | Formulario de creación de usuario |
| `/users/:id/edit` | GET | `EditUserPage` | Formulario de edición de usuario |

### 5.2 Protección de Rutas

#### Layout de Usuarios

Ubicación: `src/app/users/layout.tsx`

```typescript
export default async function UsersLayout({ children }: { children: React.ReactNode }) {
  const user = await getServerUser()

  if (!user) {
    redirect('/login')
  }

  // Cualquier rol autenticado puede acceder
  // (las restricciones están en los componentes y Server Actions)

  return <>{children}</>
}
```

**Protección:**
- Usuario debe estar autenticado
- Cualquier rol puede acceder (vendedor, admin, superadmin)
- Permisos granulares se aplican en:
  - Server Actions (qué puede hacer)
  - Componentes UI (qué puede ver)

#### Middleware Global

Ubicación: `src/middleware.ts`

```typescript
const publicRoutes = ['/', '/login', '/register', '/forgot-password', '/reset-password']

// Si NO autenticado y ruta privada → /login
// Si autenticado y ruta pública → /dashboard
```

**Efecto en `/users`:**
- Usuario NO autenticado → Redirigido a `/login`
- Usuario autenticado → Puede acceder

### 5.3 Navegación en Header

Ubicación: `src/components/layout/Header.tsx`

**Desktop:**
```tsx
<Button variant="ghost" asChild>
  <Link href="/users">
    <Users className="mr-2 h-5 w-5" />
    Usuarios
  </Link>
</Button>
```

**Mobile:**
```tsx
<TooltipTrigger asChild>
  <Button variant="ghost" size="icon" asChild>
    <Link href="/users">
      <Users className="h-5 w-5" />
    </Link>
  </Button>
</TooltipTrigger>
<TooltipContent>Usuarios</TooltipContent>
```

**Visibilidad:** Todos los roles ven el enlace (restricciones aplicadas en la página)

### 5.4 Páginas Detalladas

#### 5.4.1 Lista de Usuarios - `/users`

**Ubicación:** `src/app/users/page.tsx`

**Características:**
- Server Component (renderizado en servidor)
- Obtiene usuario actual: `await getServerUser()`
- Carga lista de usuarios: `await getUsers()`
- Muestra estadísticas: Total, Activos, Pendientes
- Botón "Nuevo Usuario" (solo para admin/superadmin)

**UI:**
```tsx
<div className="min-h-screen bg-lime-50">
  <div className="container mx-auto py-10">
    {/* Header con título y botón Nuevo Usuario */}

    {/* Cards de estadísticas */}
    <div className="grid gap-4 md:grid-cols-3">
      <Card>Total Usuarios: {users.length}</Card>
      <Card>Activos: {activos}</Card>
      <Card>Pendientes: {pendientes}</Card>
    </div>

    {/* Tabla/Cards de usuarios */}
    <UserTable
      users={users}
      currentUserId={user.id}
      currentUserRole={user.role}
    />
  </div>
</div>
```

**Permisos UI:**
```typescript
const canCreateUsers = ['admin', 'superadmin'].includes(user.role)

{canCreateUsers && (
  <Button asChild>
    <Link href="/users/create">Nuevo Usuario</Link>
  </Button>
)}
```

#### 5.4.2 Crear Usuario - `/users/create`

**Ubicación:** `src/app/users/create/page.tsx`

**Verificación de Permisos:**
```typescript
const user = await getServerUser()

if (!['admin', 'superadmin'].includes(user.role)) {
  redirect('/users')
}
```

**UI:**
- Formulario con campos: email, nombre, apellidos, role
- Al crear con éxito → Muestra password temporal
- Usuario puede copiar password al portapapeles
- Botón "Volver a Usuarios" después de crear

#### 5.4.3 Editar Usuario - `/users/:id/edit`

**Ubicación:** `src/app/users/[id]/edit/page.tsx`

**Verificación de Permisos:**
```typescript
const user = await getServerUser()
const targetUserId = params.id

// Vendedor solo puede editar su propio perfil
if (user.role === 'vendedor' && targetUserId !== user.id) {
  redirect('/users')
}

// Admin/Superadmin pueden editar cualquier usuario de su empresa
```

**UI:**
- Formulario con email deshabilitado (no editable)
- Campos editables: nombre, apellidos, role (si admin/superadmin), status (si admin/superadmin)
- Botón "Guardar Cambios" y "Cancelar"

### 5.5 Navegación Condicional

#### En Tabla de Usuarios

Ubicación: `src/components/users/UserTable.tsx`

**Acciones por Rol:**

```tsx
{currentUserRole === 'vendedor' && user.id !== currentUserId ? (
  // Vendedor viendo otro usuario → Sin acciones
  <span className="text-muted-foreground">-</span>
) : (
  <>
    {/* Botón Editar - Todos pueden editar (su perfil o usuarios de su empresa) */}
    <Button variant="outline" size="icon" asChild>
      <Link href={`/users/${user.id}/edit`}>
        <Pencil className="h-4 w-4" />
      </Link>
    </Button>

    {/* Botón Activar/Desactivar - Solo admin/superadmin */}
    {currentUserRole !== 'vendedor' && (
      <Button onClick={() => toggleUserStatus(user.id)}>
        {user.status === 'active' ? <UserX /> : <UserCheck />}
      </Button>
    )}

    {/* Botón Reenviar invitación - Solo si pending y admin/superadmin */}
    {user.status === 'pending' && currentUserRole !== 'vendedor' && (
      <Button>
        <Mail />
      </Button>
    )}
  </>
)}
```

---

## 6. Componentes UI

### 6.1 Componentes Principales

#### 6.1.1 UserForm

**Ubicación:** `src/components/users/UserForm.tsx`

**Props:**
```typescript
interface UserFormProps {
  mode: 'create' | 'edit'
  user?: User
  empresaId: number
  currentUserRole?: string
}
```

**Estados:**
```typescript
const [formData, setFormData] = useState<FormData>({
  email: '',
  nombre: '',
  apellidos: '',
  role: 'vendedor',
  status: 'active'
})

const [errors, setErrors] = useState<Record<string, string>>({})
const [isLoading, setIsLoading] = useState(false)
const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null)
const [copiedPassword, setCopiedPassword] = useState(false)
```

**Flujo de Creación:**

```
1. Usuario rellena formulario
   ↓
2. handleSubmit() → createUser(data)
   ↓
3. Si success → Guardar temporaryPassword en estado
   ↓
4. Renderizar vista de "Usuario Creado"
   - Mostrar email del usuario
   - Mostrar password temporal
   - Botón copiar al portapapeles
   ↓
5. Usuario copia password
   ↓
6. Botón "Volver a Usuarios" → /users
```

**Flujo de Edición:**

```
1. Usuario modifica campos
   ↓
2. handleSubmit() → updateUser(userId, data)
   ↓
3. Si success → toast.success() + redirect('/users')
```

**Campos del Formulario:**

```tsx
{/* Email - Solo en creación */}
{mode === 'create' && (
  <Input id="email" type="email" required />
)}

{mode === 'edit' && (
  <div className="p-3 bg-muted">
    {formData.email}
    <p className="text-xs">El email no se puede modificar</p>
  </div>
)}

{/* Nombre y Apellidos */}
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  <Input id="nombre" required />
  <Input id="apellidos" required />
</div>

{/* Rol */}
<Select value={formData.role} onValueChange={handleSelectChange('role')}>
  {availableRoles.map(role => (
    <SelectItem key={role.value} value={role.value}>
      {role.label}
    </SelectItem>
  ))}
</Select>

{/* Status - Solo en edición y solo admin/superadmin */}
{mode === 'edit' && currentUserRole !== 'vendedor' && (
  <Select value={formData.status} onValueChange={handleSelectChange('status')}>
    <SelectItem value="active">Activo</SelectItem>
    <SelectItem value="inactive">Inactivo</SelectItem>
    <SelectItem value="pending">Pendiente</SelectItem>
  </Select>
)}
```

**Roles Disponibles por Usuario:**

| Usuario Actual | Roles que puede asignar |
|----------------|------------------------|
| Superadmin | Vendedor, Admin, Superadmin |
| Admin | Vendedor, Admin |
| Vendedor | No puede crear (campo disabled) |

#### 6.1.2 UserTable

**Ubicación:** `src/components/users/UserTable.tsx`

**Props:**
```typescript
interface UserTableProps {
  users: UserWithInviter[]
  currentUserId: string
  currentUserRole: string
}
```

**Estados:**
```typescript
const [users, setUsers] = useState(initialUsers)
const [selectedUser, setSelectedUser] = useState<UserWithInviter | null>(null)
const [isToggleDialogOpen, setIsToggleDialogOpen] = useState(false)
const [isLoading, setIsLoading] = useState(false)
```

**Estructura:**

```tsx
{/* Vista Desktop (lg+) */}
<div className="hidden lg:block">
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead>Usuario</TableHead>
        <TableHead>Email</TableHead>
        <TableHead>Estado</TableHead>
        <TableHead>Invitado por</TableHead>
        <TableHead>Último acceso</TableHead>
        <TableHead>Acciones</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {users.map(user => (
        <TableRow key={user.id}>
          {/* Columnas con datos */}
        </TableRow>
      ))}
    </TableBody>
  </Table>
</div>

{/* Vista Mobile/Tablet */}
<div className="lg:hidden">
  {users.map(user => (
    <UserCard
      key={user.id}
      user={user}
      currentUserId={currentUserId}
      currentUserRole={currentUserRole}
      onToggleStatus={handleToggleStatusFromCard}
    />
  ))}
</div>

{/* Dialog de confirmación para cambio de status */}
<AlertDialog open={isToggleDialogOpen}>
  <AlertDialogContent>
    <AlertDialogTitle>
      {selectedUser?.status === 'active' ? 'Desactivar' : 'Activar'} usuario
    </AlertDialogTitle>
    <AlertDialogDescription>
      ¿Estás seguro de que quieres {accion} a {nombre}?
    </AlertDialogDescription>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancelar</AlertDialogCancel>
      <AlertDialogAction onClick={handleToggleStatus}>Confirmar</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

**Badges de Estado:**

```typescript
const getRoleBadge = (role: string) => {
  const variants = {
    superadmin: 'destructive',  // Rojo
    admin: 'default',            // Azul
    vendedor: 'secondary'        // Gris
  }

  const labels = {
    superadmin: 'Superadmin',
    admin: 'Admin',
    vendedor: 'Vendedor'
  }

  return <Badge variant={variants[role]}>{labels[role]}</Badge>
}

const getStatusBadge = (status: string) => {
  const variants = {
    active: 'default',      // Verde
    inactive: 'secondary',  // Gris
    pending: 'outline'      // Naranja
  }

  const labels = {
    active: 'Activo',
    inactive: 'Inactivo',
    pending: 'Pendiente'
  }

  return <Badge variant={variants[status]}>{labels[status]}</Badge>
}
```

**Acciones:**

```tsx
{/* Editar */}
<Tooltip>
  <TooltipTrigger asChild>
    <Button variant="outline" size="icon" asChild>
      <Link href={`/users/${user.id}/edit`}>
        <Pencil className="h-4 w-4" />
      </Link>
    </Button>
  </TooltipTrigger>
  <TooltipContent>Editar</TooltipContent>
</Tooltip>

{/* Activar/Desactivar - Solo admin/superadmin */}
{currentUserRole !== 'vendedor' && (
  <Tooltip>
    <TooltipTrigger asChild>
      <Button
        variant="outline"
        size="icon"
        onClick={() => {
          setSelectedUser(user)
          setIsToggleDialogOpen(true)
        }}
        className={user.status === 'active'
          ? 'border-orange-500 text-orange-600'
          : 'border-green-600 text-green-600'}
      >
        {user.status === 'active' ? <UserX /> : <UserCheck />}
      </Button>
    </TooltipTrigger>
    <TooltipContent>
      {user.status === 'active' ? 'Desactivar' : 'Activar'}
    </TooltipContent>
  </Tooltip>
)}

{/* Reenviar invitación - Solo si pending y admin/superadmin */}
{user.status === 'pending' && currentUserRole !== 'vendedor' && (
  <Tooltip>
    <TooltipTrigger asChild>
      <Button variant="outline" size="icon">
        <Mail className="h-4 w-4" />
      </Button>
    </TooltipTrigger>
    <TooltipContent>Reenviar invitación</TooltipContent>
  </Tooltip>
)}
```

#### 6.1.3 UserCard (Mobile)

**Ubicación:** `src/components/users/UserCard.tsx`

**Props:**
```typescript
interface UserCardProps {
  user: UserWithInviter
  currentUserId: string
  currentUserRole: string
  onToggleStatus: (user: UserWithInviter) => void
  formatDate: (date: string | null) => string
}
```

**Estructura:**

```tsx
<Card className="mb-4">
  <CardHeader>
    <div className="flex items-start justify-between">
      {/* Nombre y rol */}
      <div>
        <CardTitle>{user.nombre} {user.apellidos}</CardTitle>
        <CardDescription>{user.email}</CardDescription>
      </div>

      {/* Badges de rol y estado */}
      <div className="flex gap-2">
        {getRoleBadge(user.role)}
        {getStatusBadge(user.status)}
      </div>
    </div>
  </CardHeader>

  <CardContent>
    {/* Información adicional */}
    <div className="space-y-2 text-sm">
      {user.inviter_name && (
        <div>
          <span className="font-medium">Invitado por:</span> {user.inviter_name}
        </div>
      )}

      <div>
        <span className="font-medium">Último acceso:</span> {formatDate(user.last_login)}
      </div>
    </div>
  </CardContent>

  <CardFooter>
    {/* Botones de acción */}
    <div className="flex gap-2 w-full">
      <Button variant="outline" className="flex-1" asChild>
        <Link href={`/users/${user.id}/edit`}>
          <Pencil className="mr-2 h-4 w-4" />
          Editar
        </Link>
      </Button>

      {currentUserRole !== 'vendedor' && (
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => onToggleStatus(user)}
        >
          {user.status === 'active' ? (
            <>
              <UserX className="mr-2 h-4 w-4" />
              Desactivar
            </>
          ) : (
            <>
              <UserCheck className="mr-2 h-4 w-4" />
              Activar
            </>
          )}
        </Button>
      )}
    </div>
  </CardFooter>
</Card>
```

### 6.2 Componentes shadcn/ui Utilizados

| Componente | Uso |
|------------|-----|
| `Button` | Acciones (Crear, Editar, Guardar, Cancelar, Activar/Desactivar) |
| `Input` | Campos de texto (email, nombre, apellidos) |
| `Label` | Etiquetas de formularios |
| `Select` | Selectores (role, status) |
| `Card` | Contenedor de formulario y cards mobile |
| `Table` | Lista de usuarios (desktop) |
| `Badge` | Indicadores de rol y estado |
| `Alert` | Mensajes de error |
| `AlertDialog` | Confirmación de cambio de estado |
| `Tooltip` | Ayuda contextual en iconos |
| `Sonner (toast)` | Notificaciones temporales |

---

## 7. Flujos de Trabajo Completos

### 7.1 Flujo de Creación de Usuario

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. ADMIN ACCEDE A CREAR USUARIO                                 │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. VERIFICACIÓN DE PERMISOS                                      │
│    - getServerUser()                                             │
│    - Si role !== 'admin' y !== 'superadmin' → redirect('/users')│
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. RENDERIZAR FORMULARIO                                         │
│    - UserForm mode="create"                                      │
│    - Campos: email, nombre, apellidos, role                      │
│    - Roles disponibles según currentUserRole                     │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. USUARIO RELLENA FORMULARIO                                    │
│    - Email: nuevo@empresa.com                                    │
│    - Nombre: Juan                                                │
│    - Apellidos: García López                                     │
│    - Role: vendedor                                              │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 5. SUBMIT FORMULARIO                                             │
│    - handleSubmit() → createUser(data)                           │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 6. SERVER ACTION: createUser()                                   │
│    a) checkAdminPermission() → Validar permisos                  │
│    b) Validar empresa_id === currentUser.empresa_id              │
│    c) createUserSchema.parse(data) → Validar datos               │
│    d) generateTemporaryPassword() → "K7m@3PqX9Lw#"               │
│    e) supabaseAdmin.auth.admin.createUser() → Crear en auth.users│
│    f) supabaseAdmin.from('users').insert() → Crear en public.users│
│       - status: 'pending'                                        │
│       - invited_by: currentUser.id                               │
│    g) Si error en (f) → ROLLBACK: deleteUser(authData.user.id)  │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 7. RESPUESTA EXITOSA                                             │
│    {                                                             │
│      success: true,                                              │
│      data: { ...userData },                                      │
│      temporaryPassword: "K7m@3PqX9Lw#"                           │
│    }                                                             │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 8. ACTUALIZAR UI                                                 │
│    - setTemporaryPassword("K7m@3PqX9Lw#")                        │
│    - Renderizar vista "Usuario Creado"                           │
│    - Mostrar email y password temporal                           │
│    - Botón copiar al portapapeles                                │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 9. ADMIN COPIA PASSWORD                                          │
│    - handleCopyPassword()                                        │
│    - navigator.clipboard.writeText(temporaryPassword)            │
│    - toast.success("Contraseña copiada")                         │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 10. ADMIN ENVÍA CREDENCIALES AL USUARIO                          │
│     - Email, mensaje seguro, etc.                                │
│     - Email: nuevo@empresa.com                                   │
│     - Password: K7m@3PqX9Lw#                                     │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 11. ADMIN VUELVE A LISTA DE USUARIOS                             │
│     - Botón "Volver a Usuarios" → router.push('/users')          │
│     - router.refresh() → Recargar lista actualizada              │
└─────────────────────────────────────────────────────────────────┘
```

### 7.2 Flujo de Edición de Usuario

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. USUARIO ACCEDE A EDITAR                                       │
│    - Desde tabla: Click en botón Editar                          │
│    - O desde URL: /users/:id/edit                                │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. VERIFICACIÓN DE PERMISOS                                      │
│    - getServerUser()                                             │
│    - Si vendedor AND id !== currentUser.id → redirect('/users')  │
│    - Si admin/superadmin → OK                                    │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. CARGAR DATOS DEL USUARIO                                      │
│    - getUserById(params.id)                                      │
│    - Si error → Mostrar mensaje de error                         │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. RENDERIZAR FORMULARIO                                         │
│    - UserForm mode="edit" user={userData}                        │
│    - Email deshabilitado (no editable)                           │
│    - Campos editables: nombre, apellidos                         │
│    - Si admin/superadmin: role, status también editables         │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 5. USUARIO MODIFICA CAMPOS                                       │
│    - Cambiar nombre: Juan → Juan Carlos                          │
│    - Cambiar status: pending → active (si admin)                 │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 6. SUBMIT FORMULARIO                                             │
│    - handleSubmit() → updateUser(userId, changedData)            │
│    - Solo envía campos modificados                               │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 7. SERVER ACTION: updateUser()                                   │
│    a) checkAdminPermission() → Validar permisos                  │
│    b) updateUserSchema.parse(data) → Validar datos               │
│    c) Verificar usuario objetivo existe y es de misma empresa    │
│    d) Prevenir auto-despromoción de rol                          │
│    e) supabaseAdmin.from('users').update() → Actualizar          │
│       - updated_at actualizado por trigger                       │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 8. RESPUESTA EXITOSA                                             │
│    {                                                             │
│      success: true,                                              │
│      data: { ...updatedUser }                                    │
│    }                                                             │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 9. ACTUALIZAR UI                                                 │
│    - toast.success("Usuario actualizado correctamente")          │
│    - router.push('/users')                                       │
│    - router.refresh() → Recargar lista                           │
└─────────────────────────────────────────────────────────────────┘
```

### 7.3 Flujo de Activar/Desactivar Usuario

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. ADMIN CLICK EN BOTÓN ACTIVAR/DESACTIVAR                       │
│    - Desde tabla de usuarios                                     │
│    - Icono UserX (desactivar) o UserCheck (activar)              │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. ABRIR DIALOG DE CONFIRMACIÓN                                  │
│    - setSelectedUser(user)                                       │
│    - setIsToggleDialogOpen(true)                                 │
│    - Mensaje: "¿Estás seguro de que quieres [acción] a [nombre]?"│
│    - Si desactivar: Advertencia "No podrá acceder al sistema"    │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. USUARIO CONFIRMA                                              │
│    - Click en botón "Confirmar"                                  │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. EJECUTAR ACCIÓN                                               │
│    - handleToggleStatus()                                        │
│    - newStatus = selectedUser.status === 'active' ? 'inactive' : 'active'│
│    - toggleUserStatus(selectedUser.id, newStatus)                │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 5. SERVER ACTION: toggleUserStatus()                             │
│    - Wrapper de updateUser(userId, { status: newStatus })        │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 6. ACTUALIZAR UI LOCAL                                           │
│    - setUsers(prev => prev.map(u =>                              │
│        u.id === selectedUser.id ? { ...u, status: newStatus } : u│
│      ))                                                          │
│    - toast.success("Usuario activado/desactivado correctamente") │
│    - router.refresh()                                            │
│    - setIsToggleDialogOpen(false)                                │
└─────────────────────────────────────────────────────────────────┘
```

### 7.4 Flujo de Primer Login (Usuario Nuevo)

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. USUARIO RECIBE CREDENCIALES                                   │
│    - Email: nuevo@empresa.com                                    │
│    - Password temporal: K7m@3PqX9Lw#                             │
│    - Status en BD: 'pending'                                     │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. USUARIO ACCEDE A /login                                       │
│    - Ingresa email y password temporal                           │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. SUBMIT LOGIN                                                  │
│    - signInAction(email, password)                               │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. VALIDACIÓN SUPABASE AUTH                                      │
│    - supabase.auth.signInWithPassword()                          │
│    - Valida email y password hasheada                            │
│    - Si OK → Crear sesión (cookie HTTP-Only)                     │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 5. ACTUALIZAR LAST_LOGIN                                         │
│    - update_user_last_login(user.id)                             │
│    - last_login = NOW()                                          │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 6. REDIRIGIR A DASHBOARD                                         │
│    - redirect('/dashboard')                                      │
│    - Usuario autenticado correctamente                           │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 7. [FUTURO] DETECTAR STATUS PENDING                              │
│    - Middleware o layout verifica user.status === 'pending'      │
│    - Redirigir a /change-password (página obligatoria)           │
│    - Usuario establece nueva contraseña                          │
│    - status: 'pending' → 'active'                                │
└─────────────────────────────────────────────────────────────────┘

NOTA: Actualmente el paso 7 NO está implementado. El usuario puede
seguir usando la password temporal indefinidamente. Esta funcionalidad
está preparada en la estructura de datos pero pendiente de desarrollo.
```

---

## 8. Dependencias

### 8.1 Dependencias de Producción

```json
{
  "next": "15.5.4",
  "react": "19.1.0",
  "react-dom": "19.1.0",
  "@supabase/supabase-js": "^2.x",
  "@supabase/auth-helpers-nextjs": "^0.x",
  "zod": "^4.1.0",
  "lucide-react": "^0.x",
  "sonner": "^1.x"
}
```

### 8.2 Componentes shadcn/ui

Instalados en `src/components/ui/`:

- `button.tsx`
- `input.tsx`
- `label.tsx`
- `select.tsx`
- `card.tsx`
- `table.tsx`
- `badge.tsx`
- `alert.tsx`
- `alert-dialog.tsx`
- `tooltip.tsx`

### 8.3 Configuración Tailwind

```typescript
// tailwind.config.ts
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: 'hsl(var(--primary))',
        // ...
      }
    }
  }
}
```

```css
/* src/app/globals.css */
:root {
  --primary: 84 81% 44%; /* Lime green */
}

body {
  background: #f7fee7; /* lime-50 */
}
```

---

## 9. Tipos TypeScript

### 9.1 Tipos de Entidad

```typescript
// src/app/actions/users.ts:16-28
export interface User {
  id: string
  email: string
  nombre: string | null
  apellidos: string | null
  role: 'vendedor' | 'admin' | 'superadmin'
  empresa_id: number
  status: 'active' | 'inactive' | 'pending'
  invited_by: string | null
  last_login: string | null
  created_at: string
  updated_at: string
}

export interface UserWithInviter extends User {
  inviter_name?: string
  inviter_email?: string
}
```

### 9.2 Tipos de Datos de Formulario

```typescript
// Creación
export type CreateUserData = z.infer<typeof createUserSchema>
// {
//   email: string
//   nombre: string
//   apellidos: string
//   role: 'vendedor' | 'admin' | 'superadmin'
//   empresa_id: number
// }

// Actualización
export type UpdateUserData = z.infer<typeof updateUserSchema>
// {
//   nombre?: string
//   apellidos?: string
//   role?: 'vendedor' | 'admin' | 'superadmin'
//   status?: 'active' | 'inactive' | 'pending'
// }
```

### 9.3 Tipos de Respuesta

```typescript
// Tipo de respuesta genérico de Server Actions
interface ActionResult<T = any> {
  success: boolean
  data?: T
  error?: string
  temporaryPassword?: string // Solo en createUser
}

// Ejemplos de uso:
// - getUsers(): Promise<ActionResult<UserWithInviter[]>>
// - getUserById(): Promise<ActionResult<UserWithInviter>>
// - createUser(): Promise<ActionResult<User>>
// - updateUser(): Promise<ActionResult<User>>
// - deleteUser(): Promise<ActionResult>
```

---

## 10. Testing y Validación

### 10.1 Casos de Prueba

#### Creación de Usuario

| Caso | Input | Output Esperado |
|------|-------|-----------------|
| Usuario válido | `{ email: "test@empresa.com", nombre: "Test", apellidos: "User", role: "vendedor", empresa_id: 1 }` | `{ success: true, data: {...}, temporaryPassword: "..." }` |
| Email duplicado | Email ya existente | `{ success: false, error: "Este email ya está registrado" }` |
| Email inválido | `"no-es-email"` | `{ success: false, error: "Email inválido" }` |
| Nombre vacío | `{ nombre: "" }` | `{ success: false, error: "El nombre es requerido" }` |
| Rol inválido | `{ role: "invalid" }` | Error de Zod |
| Vendedor intenta crear | Usuario con role "vendedor" | `{ success: false, error: "No tienes permisos..." }` |
| Admin crea en otra empresa | `{ empresa_id: 2 }` | `{ success: false, error: "No puedes crear usuarios de otra empresa" }` |

#### Actualización de Usuario

| Caso | Input | Output Esperado |
|------|-------|-----------------|
| Actualización válida | `{ nombre: "Nuevo Nombre" }` | `{ success: true, data: {...} }` |
| Sin cambios | `{}` | Mensaje "No hay cambios que guardar" |
| Cambiar propio rol | Admin intenta cambiar su propio rol | `{ success: false, error: "No puedes cambiar tu propio rol" }` |
| Usuario de otra empresa | ID de usuario de empresa_id 2 | `{ success: false, error: "No puedes actualizar usuarios de otra empresa" }` |
| Vendedor edita otro usuario | Vendedor intenta editar ID diferente | `{ success: false, error: "No tienes permisos..." }` |

#### Eliminación de Usuario

| Caso | Input | Output Esperado |
|------|-------|-----------------|
| Superadmin elimina usuario | Superadmin + userId válido | `{ success: true }` |
| Admin intenta eliminar | Admin + userId | `{ success: false, error: "Solo superadmin puede eliminar..." }` |
| Auto-eliminación | userId === currentUser.id | `{ success: false, error: "No puedes eliminarte a ti mismo" }` |

### 10.2 Validación Manual

**Checklist de validación:**

- [ ] Admin puede crear usuario vendedor
- [ ] Admin puede crear usuario admin
- [ ] Admin NO puede crear usuario superadmin
- [ ] Superadmin puede crear cualquier rol
- [ ] Vendedor NO puede crear usuarios
- [ ] Password temporal se genera correctamente (12 caracteres)
- [ ] Password temporal se puede copiar al portapapeles
- [ ] Email duplicado muestra error correcto
- [ ] Usuario creado tiene status "pending"
- [ ] Campo invited_by se guarda correctamente
- [ ] Admin puede editar usuarios de su empresa
- [ ] Vendedor solo puede editar su propio perfil
- [ ] Email NO es editable
- [ ] Role NO es editable por vendedor
- [ ] Status NO es editable por vendedor
- [ ] Admin NO puede cambiar su propio rol
- [ ] Activar/Desactivar muestra confirmación
- [ ] Usuario inactivo NO aparece en listado de activos
- [ ] Superadmin puede eliminar usuarios
- [ ] Admin NO puede eliminar usuarios
- [ ] Usuario NO puede auto-eliminarse
- [ ] Tabla responsive muestra cards en mobile
- [ ] Badges de rol y status se muestran correctamente
- [ ] Last login se actualiza en login

---

## 11. Limitaciones Conocidas

### 11.1 Funcionalidad Pendiente

1. **Cambio de contraseña obligatorio en primer login**
   - Status `'pending'` está preparado pero no implementado
   - Usuario puede seguir usando password temporal indefinidamente
   - Recomendado: Implementar página `/change-password` obligatoria

2. **Envío automático de email con password temporal**
   - Actualmente se muestra en pantalla y admin debe copiar/enviar manualmente
   - Recomendado: Integrar con Supabase Email Templates o servicio SMTP

3. **Reenvío de invitación**
   - Botón existe en UI pero funcionalidad no implementada
   - Recomendado: Regenerar password temporal y enviar email

4. **Eliminación física de usuarios**
   - Solo disponible para superadmin
   - NO hay botón en UI (uso solo vía API/consola)
   - Recomendado: Usar soft delete (status: 'inactive') exclusivamente

5. **Búsqueda y filtrado de usuarios**
   - Lista muestra todos los usuarios sin filtros
   - Recomendado: Añadir búsqueda por nombre/email, filtro por rol/status

6. **Paginación**
   - Si hay muchos usuarios (>100), puede haber problemas de performance
   - Recomendado: Implementar paginación o scroll infinito

### 11.2 Restricciones Técnicas

1. **Multi-tenant limitado**
   - `empresa_id` siempre es 1 en MVP
   - Preparado para multi-tenant pero no activado

2. **RLS Policies**
   - Se usa `supabaseAdmin` que bypassa RLS
   - Validaciones se hacen manualmente en Server Actions
   - Mejora futura: Usar cliente autenticado y confiar en RLS

3. **Validación de email**
   - No se verifica si el email es real/activo
   - Solo se valida formato

4. **Permisos granulares**
   - Sistema de roles es simple (3 roles fijos)
   - No hay permisos personalizados por usuario

### 11.3 UX Mejorable

1. **Feedback visual**
   - No hay indicador de "guardando..." en algunos casos
   - Recomendado: Añadir skeletons y loaders consistentes

2. **Navegación breadcrumbs**
   - No hay indicación de "dónde estoy" en formularios
   - Recomendado: Añadir breadcrumbs (Inicio > Usuarios > Crear)

3. **Confirmación de salida**
   - Si hay cambios sin guardar y usuario sale, se pierden
   - Recomendado: Añadir dialog "¿Seguro que quieres salir?"

---

## 12. Seguridad

### 12.1 Medidas Implementadas

✅ **Autenticación:**
- Supabase Auth con bcrypt para passwords
- HTTP-Only cookies para sesiones
- No se expone service_role key en cliente

✅ **Autorización:**
- RLS policies en PostgreSQL
- Validación de permisos en Server Actions
- checkAdminPermission() y checkUserAccess()

✅ **Validación:**
- Zod schemas en servidor (nunca confiar en cliente)
- Sanitización de inputs (trim, toLowerCase)
- Constraints de BD (CHECK, FOREIGN KEY)

✅ **Auditoría:**
- Campo invited_by (quién creó al usuario)
- Campo last_login (cuándo accedió)
- Timestamps created_at y updated_at

✅ **Prevención de errores:**
- No permitir auto-despromoción de rol
- No permitir auto-eliminación
- Rollback transaccional en creación de usuario

### 12.2 Mejoras de Seguridad Recomendadas

⚠️ **Rate Limiting:**
- Limitar intentos de creación de usuarios (ej: 10 por hora)
- Prevenir spam de invitaciones

⚠️ **Logging:**
- Registrar acciones críticas (creación, eliminación, cambio de rol)
- Auditoría completa de cambios en usuarios

⚠️ **Validación de Email:**
- Verificar que email pertenece a dominio corporativo
- Prevenir creación de usuarios con emails externos

⚠️ **Expiración de Passwords Temporales:**
- Password temporal válida solo 24-48 horas
- Después debe solicitar reset de contraseña

⚠️ **2FA (Two-Factor Authentication):**
- Para roles admin y superadmin
- Supabase Auth soporta MFA

---

## 13. Diagramas

### 13.1 Diagrama de Entidades

```
┌──────────────────────────────────────────────────────────────┐
│                       auth.users                              │
│                     (Supabase Auth)                           │
├──────────────────────────────────────────────────────────────┤
│ id (UUID) PK                                                  │
│ email (TEXT) UNIQUE                                           │
│ encrypted_password (TEXT)                                     │
│ created_at (TIMESTAMPTZ)                                      │
│ ...otros campos de Supabase Auth                              │
└──────────────────────────────────────────────────────────────┘
                            │
                            │ REFERENCES (id) ON DELETE CASCADE
                            ↓
┌──────────────────────────────────────────────────────────────┐
│                     public.users                              │
│              (Extensión de auth.users)                        │
├──────────────────────────────────────────────────────────────┤
│ id (UUID) PK FK → auth.users(id)                              │
│ email (TEXT) NOT NULL                                         │
│ nombre (TEXT)                                                 │
│ apellidos (TEXT)                                              │
│ role (TEXT) CHECK(IN('superadmin','admin','vendedor'))       │
│ empresa_id (INTEGER) NOT NULL DEFAULT 1                       │
│ status (TEXT) CHECK(IN('active','inactive','pending'))       │
│ invited_by (UUID) FK → users(id) ON DELETE SET NULL          │
│ last_login (TIMESTAMPTZ)                                      │
│ created_at (TIMESTAMPTZ) NOT NULL DEFAULT NOW()               │
│ updated_at (TIMESTAMPTZ) NOT NULL DEFAULT NOW()               │
└──────────────────────────────────────────────────────────────┘
                            │
                            │ REFERENCES (invited_by)
                            ↓
                     ┌──────────────┐
                     │  public.users │
                     │   (inviter)   │
                     └──────────────┘
```

### 13.2 Diagrama de Flujo de Permisos

```
                    ┌─────────────────┐
                    │ Usuario Accede  │
                    │  a /users       │
                    └─────────────────┘
                            │
                            ↓
                ┌──────────────────────────┐
                │   getServerUser()         │
                │   Obtener rol del usuario │
                └──────────────────────────┘
                            │
                ┌───────────┴───────────────┬───────────────┐
                ↓                           ↓               ↓
         ┌────────────┐            ┌─────────────┐  ┌───────────┐
         │ SUPERADMIN │            │    ADMIN    │  │  VENDEDOR │
         └────────────┘            └─────────────┘  └───────────┘
                │                           │               │
                ↓                           ↓               ↓
    ┌───────────────────────┐  ┌────────────────────┐  ┌──────────────────┐
    │ Ve TODOS los usuarios │  │ Ve usuarios de su  │  │ Ve usuarios de   │
    │ de todas las empresas │  │ empresa (sin      │  │ su empresa (sin  │
    │                       │  │ superadmins)       │  │ superadmins)     │
    └───────────────────────┘  └────────────────────┘  └──────────────────┘
                │                           │               │
                ↓                           ↓               ↓
    ┌───────────────────────┐  ┌────────────────────┐  ┌──────────────────┐
    │ Puede CREAR usuarios  │  │ Puede CREAR users  │  │ NO puede crear   │
    │ con cualquier rol     │  │ (admin y vendedor) │  │ usuarios         │
    └───────────────────────┘  └────────────────────┘  └──────────────────┘
                │                           │               │
                ↓                           ↓               ↓
    ┌───────────────────────┐  ┌────────────────────┐  ┌──────────────────┐
    │ Puede EDITAR          │  │ Puede EDITAR users │  │ Solo puede editar│
    │ cualquier usuario     │  │ de su empresa      │  │ su propio perfil │
    └───────────────────────┘  └────────────────────┘  └──────────────────┘
                │                           │               │
                ↓                           ↓               ↓
    ┌───────────────────────┐  ┌────────────────────┐  ┌──────────────────┐
    │ Puede ELIMINAR        │  │ NO puede eliminar  │  │ NO puede eliminar│
    │ físicamente usuarios  │  │ (usar soft delete) │  │ usuarios         │
    └───────────────────────┘  └────────────────────┘  └──────────────────┘
```

---

## 14. Referencias

### 14.1 Archivos Principales

| Archivo | Ruta | Descripción |
|---------|------|-------------|
| Server Actions | `src/app/actions/users.ts` | Todas las operaciones CRUD |
| Formulario | `src/components/users/UserForm.tsx` | Crear/Editar usuario |
| Tabla | `src/components/users/UserTable.tsx` | Lista de usuarios (desktop) |
| Card | `src/components/users/UserCard.tsx` | Card de usuario (mobile) |
| Página Lista | `src/app/users/page.tsx` | Página principal de usuarios |
| Página Crear | `src/app/users/create/page.tsx` | Página de creación |
| Página Editar | `src/app/users/[id]/edit/page.tsx` | Página de edición |
| Layout | `src/app/users/layout.tsx` | Layout con auth check |
| Migración 001 | `migrations/001_initial_schema.sql` | Tabla users inicial |
| Migración 007 | `migrations/007_users_status_fields.sql` | Campos status, invited_by, last_login |
| Migración 009 | `migrations/009_users_nombre_apellidos.sql` | Renombrar name → nombre, añadir apellidos |
| RLS Policies | `migrations/002_rls_policies.sql` | Políticas de seguridad iniciales |

### 14.2 Documentación Relacionada

- **PRD (Product Requirements Document):** `/docs/prd.md`
- **Arquitectura:** `/docs/arquitectura.md`
- **Flujo de Autenticación:** `/docs/especificaciones/flujo-autenticacion.md`
- **Estructura de Páginas:** `/docs/especificaciones/estructura-paginas-navegacion.md`
- **Design System:** `/design.md`

### 14.3 Documentación Externa

- **Next.js 15:** https://nextjs.org/docs
- **Supabase Auth:** https://supabase.com/docs/guides/auth
- **Zod:** https://zod.dev/
- **shadcn/ui:** https://ui.shadcn.com/
- **Tailwind CSS:** https://tailwindcss.com/docs

---

## Apéndice: Ejemplos de Código

### A.1 Ejemplo de Creación de Usuario (Full Code)

```typescript
// src/app/actions/users.ts

export async function createUser(data: CreateUserData): Promise<ActionResult> {
  try {
    console.log('[createUser] Iniciando...', data.email)

    // 1. Validar permisos
    const { allowed, currentUser } = await checkAdminPermission()

    if (!allowed) {
      return {
        success: false,
        error: 'No tienes permisos para crear usuarios'
      }
    }

    // 2. Validar que sea de la misma empresa
    if (data.empresa_id !== currentUser.empresa_id) {
      return {
        success: false,
        error: 'No puedes crear usuarios de otra empresa'
      }
    }

    // 3. Validar schema
    try {
      createUserSchema.parse(data)
    } catch (error) {
      const zodError = error as z.ZodError
      return {
        success: false,
        error: zodError.errors?.[0]?.message || 'Datos inválidos'
      }
    }

    // 4. Generar password temporal
    const temporaryPassword = generateTemporaryPassword()

    // 5. Crear usuario en auth.users
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: temporaryPassword,
      email_confirm: true
    })

    if (authError) {
      console.error('[createUser] Error auth:', authError)
      return {
        success: false,
        error: authError.message === 'User already registered'
          ? 'Este email ya está registrado'
          : 'Error al crear usuario en sistema de autenticación'
      }
    }

    if (!authData.user) {
      return {
        success: false,
        error: 'Error al crear usuario'
      }
    }

    // 6. Crear registro en public.users
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .insert({
        id: authData.user.id,
        email: data.email,
        nombre: data.nombre,
        apellidos: data.apellidos,
        role: data.role,
        empresa_id: data.empresa_id,
        status: 'pending',
        invited_by: currentUser.id
      })
      .select()
      .single()

    if (userError) {
      // Rollback: eliminar usuario de auth
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)

      console.error('[createUser] Error DB:', userError)
      return {
        success: false,
        error: 'Error al crear registro de usuario'
      }
    }

    console.log('[createUser] Éxito:', userData.id)

    return {
      success: true,
      data: userData,
      temporaryPassword
    }

  } catch (error) {
    console.error('[createUser] Error inesperado:', error)
    return {
      success: false,
      error: 'Error inesperado al crear usuario'
    }
  }
}
```

### A.2 Ejemplo de Componente UserForm (Snippet)

```tsx
// src/components/users/UserForm.tsx

export default function UserForm({ mode, user, empresaId, currentUserRole }: UserFormProps) {
  const [formData, setFormData] = useState<FormData>({
    email: user?.email || '',
    nombre: user?.nombre || '',
    apellidos: user?.apellidos || '',
    role: user?.role || 'vendedor',
    status: user?.status || 'active'
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})
    setIsLoading(true)

    try {
      if (mode === 'create') {
        const createData: CreateUserData = {
          email: formData.email,
          nombre: formData.nombre,
          apellidos: formData.apellidos,
          role: formData.role,
          empresa_id: empresaId
        }

        const result = await createUser(createData)

        if (!result.success) {
          setErrors({ general: result.error || 'Error al crear usuario' })
          return
        }

        if (result.temporaryPassword) {
          setTemporaryPassword(result.temporaryPassword)
        }

        toast.success('Usuario creado correctamente')
      } else {
        // Código de actualización...
      }
    } catch (error) {
      setErrors({
        general: error instanceof Error ? error.message : 'Error inesperado'
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{mode === 'create' ? 'Crear Usuario' : 'Editar Usuario'}</CardTitle>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange('email')}
              required
            />
          </div>

          {/* Nombre y Apellidos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre *</Label>
              <Input
                id="nombre"
                type="text"
                value={formData.nombre}
                onChange={handleInputChange('nombre')}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="apellidos">Apellidos *</Label>
              <Input
                id="apellidos"
                type="text"
                value={formData.apellidos}
                onChange={handleInputChange('apellidos')}
                required
              />
            </div>
          </div>

          {/* Rol */}
          <div className="space-y-2">
            <Label htmlFor="role">Rol *</Label>
            <Select
              value={formData.role}
              onValueChange={handleSelectChange('role')}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableRoles.map((role) => (
                  <SelectItem key={role.value} value={role.value}>
                    {role.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>

        <CardFooter className="flex gap-4">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => router.push('/users')}
          >
            Cancelar
          </Button>
          <Button type="submit" className="flex-1" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {mode === 'create' ? 'Creando...' : 'Guardando...'}
              </>
            ) : (
              mode === 'create' ? 'Crear Usuario' : 'Guardar Cambios'
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
```

---

**Fin del Documento**

**Versión:** 1.0
**Última actualización:** 2025-01-14
**Autor:** Análisis de Claude Code
