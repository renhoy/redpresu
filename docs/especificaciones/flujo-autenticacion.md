# Flujo de Autenticación - Redpresu

**Proyecto:** jeyca-presu (Redpresu)
**Framework:** Next.js 15.5.4 + Supabase Auth
**Última actualización:** 2025-01-14
**Fase:** Fase 2 - Evolución Funcional

---

## 📋 Índice

1. [Visión General](#visión-general)
2. [Login (Inicio de Sesión)](#login-inicio-de-sesión)
3. [Registro de Usuario](#registro-de-usuario)
4. [Gestión de Sesiones](#gestión-de-sesiones)
5. [Recuperación de Contraseña](#recuperación-de-contraseña)
6. [Cambio de Contraseña](#cambio-de-contraseña)
7. [Logout (Cerrar Sesión)](#logout-cerrar-sesión)
8. [Protección de Rutas](#protección-de-rutas)
9. [Validaciones](#validaciones)
10. [Seguridad](#seguridad)
11. [Dependencias](#dependencias)
12. [Flujos Completos](#flujos-completos)

---

## 🌐 Visión General

Redpresu implementa un **sistema de autenticación robusto** basado en **Supabase Auth** con las siguientes características:

### Stack de Autenticación

```typescript
{
  "backend": "Supabase Auth (PostgreSQL + Row Level Security)",
  "framework": "Next.js 15.5.4 (Server Actions + Middleware)",
  "validación": "Zod 4.1",
  "sesiones": "Cookies HTTP-Only (Supabase Auth Helpers)",
  "email": "Supabase Email Templates",
  "seguridad": "bcrypt (Supabase), RLS policies, CSRF protection"
}
```

### Características Principales

- ✅ **Email + Contraseña** (método principal)
- ✅ **Auto-confirmación de email** en desarrollo (admin API)
- ✅ **Registro público** configurable (ON/OFF)
- ✅ **Recuperación de contraseña** con enlace mágico
- ✅ **Gestión de sesiones** con cookies seguras
- ✅ **Protección de rutas** con middleware + layouts
- ✅ **Roles de usuario** (superadmin, admin, vendedor)
- ✅ **Multi-tenant** (tabla empresas + issuers)

### Arquitectura

```
┌─────────────────────────────────────────────────┐
│               Next.js Middleware                │
│         (Verificación de sesión global)         │
└─────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────┐
│              Supabase Auth Client               │
│    (Gestión de sesiones con cookies)            │
└─────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────┐
│            Server Actions (auth.ts)             │
│  (Login, Register, Reset, Logout, Profile)      │
└─────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────┐
│         Supabase PostgreSQL + RLS               │
│   (auth.users + public.users + issuers)         │
└─────────────────────────────────────────────────┘
```

---

## 🔐 Login (Inicio de Sesión)

### Método de Autenticación

- **Tipo:** Email + Contraseña
- **Proveedor:** Supabase Auth
- **Endpoint:** Server Action `signInAction`

### Formulario de Login

**Ubicación:** `src/components/auth/LoginForm.tsx`

**Campos:**

```typescript
interface LoginFormData {
  email: string        // Email del usuario
  password: string     // Contraseña (mínimo 6 caracteres en login)
}
```

**Validaciones Client-Side:**

```typescript
// Email
- Requerido
- Formato válido: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
- Normalizado a lowercase

// Password
- Requerido
- Mínimo 6 caracteres (solo en login, registro requiere 8)
```

### Server Action de Login

**Archivo:** `src/app/actions/auth.ts`

```typescript
export async function signInAction(
  email: string,
  password: string
): Promise<SignInResult>
```

**Flujo:**

```typescript
1. Normalizar email (trim + lowercase)
2. Llamar a supabase.auth.signInWithPassword()
3. Si error:
   - Mapear a mensaje en español
   - "Invalid login credentials" → "Credenciales de acceso incorrectas"
   - "Email not confirmed" → "Email no confirmado"
   - "Too many requests" → "Demasiados intentos..."
4. Si éxito:
   - Obtener datos del usuario desde public.users (rol, nombre)
   - Redirección según rol:
     · vendedor → /budgets
     · admin/superadmin → /dashboard
5. Retornar { success: true/false, error?: string }
```

**Ejemplo de uso:**

```typescript
const result = await signInAction(email, password)

if (!result.success) {
  // Mostrar error
  setErrors({ general: result.error })
} else {
  // Redirect automático manejado por Server Action
}
```

### Página de Login

**Ubicación:** `src/app/(auth)/login/page.tsx`

**Características:**

- Verifica si el usuario **ya está autenticado** → redirect según rol
- Muestra credenciales de prueba en **modo desarrollo**
- Layout centrado con logo de Redpresu
- Auto-redirect después de login exitoso

**Usuarios de prueba (desarrollo):**

```typescript
Admin: admin@jeyca.net / Admin123!
Vendedor: vendedor@jeyca.net / Vendedor123!
```

### Mensajes de Error

| Error | Mensaje al Usuario |
|-------|-------------------|
| Invalid login credentials | Credenciales de acceso incorrectas |
| Email not confirmed | Email no confirmado |
| Too many requests | Demasiados intentos. Intenta más tarde |
| Network error | Error de conexión |

---

## 📝 Registro de Usuario

### Método de Registro

- **Tipo:** Email + Contraseña + Datos Fiscales
- **Proveedor:** Supabase Auth (Admin API)
- **Auto-confirmación:** SÍ (en desarrollo, usando service role key)
- **Registro público:** Configurable (tabla `config`)

### Formulario de Registro

**Ubicación:** `src/components/auth/RegisterForm.tsx`

**Secciones del Formulario:**

#### 1. Datos de Acceso (Administrador)

```typescript
{
  nombre: string              // Nombre del admin
  apellidos: string           // Apellidos del admin
  email: string               // Email para login
  confirmEmail: string        // Confirmación de email
  password: string            // Contraseña (8+ caracteres)
  confirmPassword: string     // Confirmación de contraseña
}
```

#### 2. Datos Fiscales

```typescript
{
  tipo: 'empresa' | 'autonomo'  // Tipo de emisor (tabs)
  nombreComercial: string        // Razón social o nombre comercial
  nif: string                    // NIF/NIE/CIF (validación con letra control)
  direccionFiscal: string        // Dirección completa
  codigoPostal?: string          // 5 dígitos (opcional)
  ciudad?: string                // Localidad (opcional)
  provincia?: string             // Provincia (opcional)
  pais: string                   // Por defecto: España
  irpfPercentage?: number        // Solo autónomos (por defecto: 15)
}
```

#### 3. Datos de Contacto (Opcionales)

```typescript
{
  telefono?: string         // Teléfono de contacto
  emailContacto?: string    // Email alternativo
  web?: string              // Sitio web
}
```

### Validaciones con Zod

**Archivo:** `src/lib/validators/auth-schemas.ts`

**Schema completo:**

```typescript
export const registerSchema = z.object({
  // Datos admin
  nombre: z.string().min(1).max(50).trim(),
  apellidos: z.string().min(1).max(100).trim(),

  // Auth
  email: z.string().email().toLowerCase().trim(),
  confirmEmail: z.string().email().toLowerCase().trim(),
  password: z.string()
    .min(8)
    .max(128)
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Debe contener mayúscula, minúscula y número'),
  confirmPassword: z.string().min(1),

  // Issuer
  tipo: z.enum(['empresa', 'autonomo']),
  nombreComercial: z.string().min(1).max(100).trim(),
  nif: z.string()
    .min(1)
    .trim()
    .toUpperCase()
    .refine(isValidNIF, getNIFErrorMessage),

  direccionFiscal: z.string().min(1).max(200).trim(),
  codigoPostal: z.string().regex(/^\d{5}$/).optional(),
  ciudad: z.string().max(100).optional(),
  provincia: z.string().max(100).optional(),

  // Contacto
  telefono: z.string().regex(/^[0-9\s\+\-\(\)]+$/).optional(),
  emailContacto: z.string().email().optional(),
  web: z.string().url().optional(),

  // IRPF
  irpfPercentage: z.number().min(0).max(100).optional()
})
.refine(data => data.email === data.confirmEmail, {
  message: 'Los emails no coinciden',
  path: ['confirmEmail']
})
.refine(data => data.password === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword']
})
.refine(data => {
  if (data.tipo === 'autonomo') {
    return data.irpfPercentage !== null && data.irpfPercentage !== undefined
  }
  return true
}, {
  message: 'El % IRPF es obligatorio para autónomos',
  path: ['irpfPercentage']
})
```

### Server Action de Registro

**Archivo:** `src/app/actions/auth.ts`

```typescript
export async function registerUser(
  data: RegisterData
): Promise<RegisterResult>
```

**Flujo de Registro (Transaccional):**

```typescript
1. Validar que NIF no esté duplicado (global en issuers)

2. Crear nueva EMPRESA
   INSERT INTO empresas (nombre, status)
   → Obtener empresa_id

3. Crear usuario en auth.users (Admin API)
   supabaseAdmin.auth.admin.createUser({
     email,
     password,
     email_confirm: true,  // Auto-confirmar en dev
     user_metadata: { tipo, nombre_comercial }
   })
   → Obtener user_id

4. Crear registro en public.users
   INSERT INTO users (id, nombre, apellidos, email, role, empresa_id, status)
   → role = 'admin' (primer usuario de empresa)

5. Crear registro en public.issuers
   INSERT INTO issuers (user_id, company_id, issuers_type, issuers_nif, ...)
   → Datos fiscales y contacto

6. Si TODO OK:
   - Iniciar sesión automáticamente
   - Redirect a /dashboard

7. Si ERROR en cualquier paso:
   - ROLLBACK completo (eliminar empresa, user auth, user public)
   - Retornar error específico
```

**Rollback en caso de error:**

```typescript
// Si falla paso 4 (users):
await supabaseAdmin.auth.admin.deleteUser(userId)
await supabaseAdmin.from('empresas').delete().eq('id', empresaId)

// Si falla paso 5 (issuers):
await supabaseAdmin.from('users').delete().eq('id', userId)
await supabaseAdmin.auth.admin.deleteUser(userId)
await supabaseAdmin.from('empresas').delete().eq('id', empresaId)
```

### Página de Registro

**Ubicación:** `src/app/(auth)/register/page.tsx`

**Características:**

- Verifica si **registro público está habilitado**
  - Si NO → Mostrar mensaje "Registro deshabilitado"
  - Si SÍ → Mostrar formulario
- Verifica si usuario ya autenticado → redirect según rol
- Layout con Header público

**Control de Registro Público:**

```typescript
const registrationEnabled = await isPublicRegistrationEnabled()

if (!registrationEnabled) {
  return (
    <Alert>
      Registro temporalmente deshabilitado.
      Contacta con el administrador.
    </Alert>
  )
}
```

### Diferencias Empresa vs Autónomo

| Campo | Empresa | Autónomo |
|-------|---------|----------|
| **Nombre Comercial** | Razón social (ej: "Mi Empresa S.L.") | Nombre completo (ej: "Juan Pérez") |
| **NIF** | CIF (ej: B12345678) | DNI/NIE (ej: 12345678A) |
| **IRPF** | NULL (no aplica) | 15% (por defecto, configurable) |
| **Layout Form** | 75% nombre + 25% NIF | 50% nombre + 25% NIF + 25% IRPF |

---

## 🔄 Gestión de Sesiones

### Método de Almacenamiento

- **Tipo:** Cookies HTTP-Only
- **Proveedor:** Supabase Auth Helpers
- **Duración:** Según configuración de Supabase (por defecto 7 días)
- **Refresh:** Automático con Supabase Auth

### Cookies de Sesión

**Cookies utilizadas:**

```
sb-<project-ref>-auth-token          # Access token
sb-<project-ref>-auth-token-code-verifier  # PKCE verifier (opcional)
```

**Características:**

- ✅ **HTTP-Only:** No accesibles desde JavaScript
- ✅ **Secure:** Solo HTTPS en producción
- ✅ **SameSite:** Strict/Lax (protección CSRF)
- ✅ **Auto-refresh:** Supabase maneja renovación automática

### Helpers de Sesión

**Archivo:** `src/lib/auth/server.ts`

#### getServerUser()

```typescript
export async function getServerUser() {
  const cookieStore = await cookies()
  const supabase = createServerComponentClient({ cookies: () => cookieStore })

  // Obtener usuario autenticado
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return null
  }

  // Obtener datos completos desde public.users
  const { data: userData } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!userData) {
    return null
  }

  return {
    id: user.id,
    email: user.email,
    ...userData  // nombre, apellidos, role, empresa_id, status
  }
}
```

**Uso en Server Components:**

```typescript
// En layout.tsx o page.tsx
const user = await getServerUser()

if (!user) {
  redirect('/login')
}

// Usar datos del usuario
console.log(user.role)       // 'admin', 'vendedor', 'superadmin'
console.log(user.empresa_id) // ID de la empresa
```

### Verificación de Sesión en Middleware

**Archivo:** `src/middleware.ts`

```typescript
export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  // Obtener sesión desde cookies
  const { data: { session }, error } = await supabase.auth.getSession()

  const isAuthenticated = !error && !!session

  // Rutas públicas
  const publicRoutes = ['/', '/login', '/register', '/forgot-password', '/reset-password']
  const isPublicRoute = publicRoutes.includes(pathname)

  // NO autenticado + ruta privada → /login
  if (!isAuthenticated && !isPublicRoute) {
    return NextResponse.redirect('/login')
  }

  // Autenticado + ruta pública → /dashboard
  if (isAuthenticated && isPublicRoute && pathname !== '/') {
    return NextResponse.redirect('/dashboard')
  }

  return res  // IMPORTANTE: Retornar response de Supabase (preserva cookies)
}
```

### Duración de Sesión

**Configuración en Supabase:**

- **Access Token:** 1 hora (por defecto)
- **Refresh Token:** 7 días (por defecto)
- **Auto-refresh:** Automático cuando access token expira

**Comportamiento:**

```
Usuario hace login
  ↓
Access Token válido por 1 hora
  ↓
Después de 1 hora:
  - Supabase detecta token expirado
  - Usa Refresh Token para obtener nuevo Access Token
  - Actualiza cookies automáticamente
  ↓
Después de 7 días:
  - Refresh Token expira
  - Usuario debe volver a hacer login
```

---

## 🔑 Recuperación de Contraseña

### Flujo de Recuperación

**Páginas involucradas:**

1. `/forgot-password` - Solicitar enlace
2. Email - Recibir enlace mágico
3. `/reset-password` - Cambiar contraseña

### Paso 1: Solicitar Recuperación

**Página:** `src/app/(auth)/forgot-password/page.tsx`

**Formulario:**

```typescript
interface ForgotPasswordFormData {
  email: string  // Email del usuario
}
```

**Validación:**

```typescript
export const forgotPasswordSchema = z.object({
  email: z.string()
    .min(1, 'El email es requerido')
    .email('Email inválido')
    .toLowerCase()
    .trim()
})
```

**Server Action:**

```typescript
export async function requestPasswordReset(
  email: string
): Promise<PasswordResetResult>
```

**Flujo:**

```typescript
1. Validar email
2. Enviar email de recuperación:
   await supabase.auth.resetPasswordForEmail(email, {
     redirectTo: `${BASE_URL}/reset-password`
   })
3. Retornar mensaje genérico (seguridad):
   "Si el email está registrado, recibirás un enlace"
   (No revelar si el email existe o no)
```

**Mensaje de Confirmación:**

```
✉️ Revisa tu Email

Hemos enviado un enlace de recuperación

• Revisa tu bandeja de entrada
• Verifica la carpeta de spam
• El enlace expira en 1 hora
```

### Paso 2: Email de Recuperación

**Contenido del Email (Supabase Template):**

- Asunto: "Recupera tu contraseña - Redpresu"
- Link mágico con formato: `https://app.com/reset-password#access_token=xxx&type=recovery`
- Validez: 1 hora

### Paso 3: Resetear Contraseña

**Página:** `src/app/(auth)/reset-password/page.tsx`

**Verificación de Token:**

```typescript
useEffect(() => {
  const hash = window.location.hash
  const params = new URLSearchParams(hash.substring(1))

  const accessToken = params.get('access_token')
  const type = params.get('type')

  if (!accessToken || type !== 'recovery') {
    setIsValidToken(false)
    return
  }

  setIsValidToken(true)
}, [])
```

**Estados posibles:**

1. **Verificando token...** (Loading)
2. **Token inválido/expirado** → Solicitar nuevo enlace
3. **Token válido** → Mostrar formulario

**Formulario de Reset:**

**Archivo:** `src/components/auth/PasswordResetForm.tsx`

```typescript
interface ResetPasswordFormData {
  password: string         // Nueva contraseña
  confirmPassword: string  // Confirmación
}
```

**Validación:**

```typescript
export const resetPasswordSchema = z.object({
  password: z.string()
    .min(8, 'Mínimo 8 caracteres')
    .max(128)
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Debe contener mayúscula, minúscula y número'),
  confirmPassword: z.string().min(1)
}).refine(data => data.password === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword']
})
```

**Server Action:**

```typescript
export async function resetPassword(
  newPassword: string
): Promise<PasswordResetResult>
```

**Flujo:**

```typescript
1. Validar contraseña (8+ chars, 1 mayúscula, 1 minúscula, 1 número)

2. Verificar sesión activa (del token de recovery):
   const { data: { session } } = await supabase.auth.getSession()
   if (!session) → "Token inválido o expirado"

3. Actualizar contraseña:
   await supabase.auth.updateUser({ password: newPassword })

4. Cerrar sesión:
   await supabase.auth.signOut()
   (Usuario debe hacer login con nueva contraseña)

5. Mensaje de éxito:
   "Contraseña actualizada. Ya puedes iniciar sesión."
```

### Seguridad en Recuperación

- ✅ **Mensajes genéricos:** No revelar si email existe
- ✅ **Token de un solo uso:** Automático con Supabase
- ✅ **Expiración:** 1 hora por defecto
- ✅ **Logout después de reset:** Usuario debe reautenticarse
- ✅ **Validación robusta:** Regex para contraseñas fuertes

---

## 🔒 Cambio de Contraseña

### Desde Perfil de Usuario

**Ubicación:** `src/app/profile/page.tsx`

**Server Action:**

```typescript
export async function updateUserProfile(
  data: UpdateProfileData
): Promise<ProfileResult>
```

**Flujo de Cambio de Contraseña:**

```typescript
interface UpdateProfileData {
  currentPassword?: string  // Contraseña actual
  newPassword?: string      // Nueva contraseña
  // ... otros datos de perfil
}

// Flujo
1. Validar nueva contraseña (8+ chars, complejidad)

2. Verificar contraseña actual:
   await supabase.auth.signInWithPassword({
     email: user.email,
     password: currentPassword
   })
   Si error → "La contraseña actual es incorrecta"

3. Actualizar contraseña:
   await supabase.auth.updateUser({
     password: newPassword
   })

4. Mensaje de éxito:
   "Contraseña actualizada exitosamente"
```

**Validaciones:**

```typescript
// Nueva contraseña
- Mínimo 8 caracteres
- Máximo 128 caracteres
- Al menos 1 mayúscula
- Al menos 1 minúscula
- Al menos 1 número

// Contraseña actual
- Debe coincidir con la almacenada
- Verificación mediante signInWithPassword
```

---

## 🚪 Logout (Cerrar Sesión)

### Server Action de Logout

**Archivo:** `src/app/actions/auth.ts`

```typescript
export async function signOutAction(): Promise<SignInResult>
```

**Flujo:**

```typescript
1. Verificar si hay sesión activa:
   const { data: { session } } = await supabase.auth.getSession()

2. Si NO hay sesión:
   redirect('/')

3. Si hay sesión:
   await supabase.auth.signOut()

4. Redirect a homepage:
   redirect('/')
```

### Componente de Logout

**Ubicación:** `src/components/auth/LogoutButton.tsx`

```typescript
interface LogoutButtonProps {
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  showText?: boolean  // Mostrar texto o solo icono
  className?: string
}
```

**Uso en Header:**

```typescript
// Desktop: Con texto
<LogoutButton
  variant="outline"
  size="sm"
  showText={true}
  className="border-green-600"
/>

// Mobile: Solo icono
<LogoutButton
  variant="outline"
  size="sm"
  showText={false}
/>
```

**Comportamiento:**

```typescript
const handleLogout = async () => {
  const result = await signOutAction()

  if (!result.success) {
    toast.error(result.error)
  } else {
    // Redirect manejado por Server Action
  }
}
```

### Limpieza de Sesión

Al cerrar sesión, Supabase automáticamente:

- ✅ Elimina cookies de sesión
- ✅ Invalida access token
- ✅ Invalida refresh token
- ✅ Limpia localStorage (si se usa)

---

## 🛡️ Protección de Rutas

### Niveles de Protección

Redpresu implementa **3 capas de protección**:

1. **Middleware Global** (Primera línea)
2. **Layouts de Sección** (Segunda línea)
3. **RLS Policies** (Tercera línea - Base de datos)

### Capa 1: Middleware Global

**Archivo:** `src/middleware.ts`

```typescript
// Rutas públicas (sin autenticación)
const publicRoutes = ['/', '/login', '/register', '/forgot-password', '/reset-password']

// Lógica:
if (!isAuthenticated && !isPublicRoute) {
  redirect('/login')
}

if (isAuthenticated && isPublicRoute && pathname !== '/') {
  redirect('/dashboard')
}
```

**Matcher (qué rutas proteger):**

```typescript
export const config = {
  matcher: [
    // Proteger TODAS las rutas excepto:
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

### Capa 2: Layouts de Sección

**Ejemplo:** `src/app/dashboard/layout.tsx`

```typescript
export default async function DashboardLayout({ children }) {
  const user = await getServerUser()

  if (!user) {
    redirect('/login')  // Doble verificación
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

### Capa 3: RLS Policies (Row Level Security)

**Nivel de Base de Datos:**

```sql
-- Ejemplo: Política para tabla users
CREATE POLICY "users_select_policy"
ON users FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Ejemplo: Política para tabla tariffs
CREATE POLICY "tariffs_select_own_empresa"
ON tariffs FOR SELECT
USING (empresa_id = (
  SELECT empresa_id FROM users WHERE id = auth.uid()
));
```

**Características:**

- ✅ **auth.uid()** automático (Supabase extrae de JWT)
- ✅ **Políticas por operación** (SELECT, INSERT, UPDATE, DELETE)
- ✅ **Aislamiento por empresa** (multi-tenant)

### Protección según Rol

**Redirección por Rol:**

```typescript
// Homepage (/)
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

**Navegación según Rol:**

```typescript
const navigation = [
  { name: 'Inicio', href: '/dashboard', show: true },
  { name: 'Tarifas', href: '/tariffs', show: true },
  { name: 'Presupuestos', href: '/budgets', show: true },
  { name: 'Usuarios', href: '/users', show: true },
  {
    name: 'Configuración',
    href: '/settings',
    show: userRole === 'superadmin'  // Solo superadmin
  },
].filter(item => item.show)
```

---

## ✅ Validaciones

### Librería de Validación

- **Framework:** Zod 4.1
- **Ubicación:** `src/lib/validators/auth-schemas.ts`

### Validación de Email

```typescript
z.string()
  .min(1, 'El email es requerido')
  .email('Email inválido')
  .toLowerCase()
  .trim()
```

**Regex utilizado internamente por Zod:**

```regex
/^[^\s@]+@[^\s@]+\.[^\s@]+$/
```

### Validación de Contraseña

**Login (mínimo 6 caracteres):**

```typescript
z.string()
  .min(6, 'La contraseña debe tener al menos 6 caracteres')
```

**Registro/Reset (requisitos fuertes):**

```typescript
z.string()
  .min(8, 'Mínimo 8 caracteres')
  .max(128, 'Máximo 128 caracteres')
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    'Debe contener al menos una mayúscula, una minúscula y un número'
  )
```

**Explicación del Regex:**

```regex
^                # Inicio de string
(?=.*[a-z])      # Lookahead: al menos 1 minúscula
(?=.*[A-Z])      # Lookahead: al menos 1 mayúscula
(?=.*\d)         # Lookahead: al menos 1 dígito
```

### Validación de NIF/NIE/CIF

**Helper:** `src/lib/helpers/nif-validator.ts`

**Dependencia:** `nif-dni-nie-cif-validation`

```typescript
import { isValidNIF, getNIFErrorMessage } from '@/lib/helpers/nif-validator'

nif: z.string()
  .min(1, 'El NIF/NIE/CIF es requerido')
  .trim()
  .toUpperCase()
  .refine(
    (val) => isValidNIF(val),
    (val) => ({ message: getNIFErrorMessage(val) })
  )
```

**Formatos válidos:**

- **DNI:** 12345678A (8 dígitos + letra control)
- **NIE:** X1234567A (X/Y/Z + 7 dígitos + letra)
- **CIF:** B12345678 (Letra + 8 caracteres)

**Validación incluye:**

- ✅ Formato correcto
- ✅ Letra de control válida (DNI/NIE)
- ✅ Dígito de control válido (CIF)

### Validación de Código Postal

```typescript
codigoPostal: z.string()
  .regex(/^\d{5}$/, 'El código postal debe tener 5 dígitos')
  .optional()
```

### Validación de Teléfono

```typescript
telefono: z.string()
  .regex(/^[0-9\s\+\-\(\)]+$/, 'Teléfono inválido')
  .max(20)
  .optional()
```

**Formatos aceptados:**

- `678 912 345`
- `+34 678 912 345`
- `(34) 678-912-345`

### Validación de URL

```typescript
web: z.string()
  .url('URL inválida')
  .optional()
```

**Ejemplos válidos:**

- `https://www.empresa.com`
- `http://empresa.com`
- `https://empresa.com/path`

### Validaciones Custom

**Confirmación de Email:**

```typescript
.refine(
  (data) => data.email === data.confirmEmail,
  {
    message: 'Los emails no coinciden',
    path: ['confirmEmail']
  }
)
```

**Confirmación de Contraseña:**

```typescript
.refine(
  (data) => data.password === data.confirmPassword,
  {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword']
  }
)
```

**IRPF Obligatorio para Autónomos:**

```typescript
.refine(
  (data) => {
    if (data.tipo === 'autonomo') {
      return data.irpfPercentage !== null && data.irpfPercentage !== undefined
    }
    return true
  },
  {
    message: 'El % IRPF es obligatorio para autónomos',
    path: ['irpfPercentage']
  }
)
```

---

## 🔐 Seguridad

### Hashing de Contraseñas

- **Algoritmo:** bcrypt (gestionado por Supabase)
- **Salt rounds:** 10 (por defecto de Supabase)
- **Ubicación:** Supabase Auth (backend)

**Proceso:**

```
1. Usuario envía contraseña en texto plano (HTTPS)
2. Supabase Auth recibe contraseña
3. Genera hash con bcrypt:
   hash = bcrypt.hash(password, saltRounds)
4. Almacena solo el hash en auth.users
5. Nunca se almacena contraseña en texto plano
```

### Protección CSRF

**Método:** SameSite Cookies

```typescript
// Cookies de Supabase configuradas con:
SameSite: 'Lax'  // Protección contra CSRF
Secure: true     // Solo HTTPS en producción
HttpOnly: true   // No accesible desde JS
```

**Protección adicional:**

- ✅ **Origin verification** en middleware
- ✅ **Server Actions** (POST automático en Next.js)
- ✅ **Tokens de sesión** en cookies (no localStorage)

### Prevención de Ataques

#### Rate Limiting

**Supabase Auth incluye:**

- Max intentos de login: 5 por hora (configurable)
- Mensaje: "Too many requests. Try again later"

```typescript
// Manejo en signInAction
if (error.message.includes('Too many requests')) {
  return {
    success: false,
    error: 'Demasiados intentos. Intenta más tarde'
  }
}
```

#### SQL Injection

**Protección:**

- ✅ **Prepared statements** automáticos (Supabase client)
- ✅ **RLS policies** (Row Level Security)
- ✅ **Validación con Zod** (sanitización de inputs)

```typescript
// Ejemplo seguro con Supabase
const { data } = await supabase
  .from('users')
  .select('*')
  .eq('email', email)  // Automáticamente escapa parámetros
```

#### XSS (Cross-Site Scripting)

**Protección:**

- ✅ **React escapa automáticamente** JSX
- ✅ **Content Security Policy** (Next.js)
- ✅ **Sanitización de inputs** con Zod

```typescript
// React escapa automáticamente
<p>{userInput}</p>  // Seguro

// Usar dangerouslySetInnerHTML solo si es necesario
<div dangerouslySetInnerHTML={{ __html: sanitizedHTML }} />
```

#### Session Hijacking

**Protección:**

- ✅ **HTTPS obligatorio** en producción
- ✅ **HttpOnly cookies** (no accesibles desde JS)
- ✅ **Secure cookies** en producción
- ✅ **SameSite cookies** (protección CSRF)
- ✅ **Tokens con expiración** (1 hora access, 7 días refresh)

### Seguridad en Recuperación de Contraseña

**Mejores prácticas implementadas:**

1. **Mensajes genéricos:**
   ```
   "Si el email está registrado, recibirás un enlace"
   (No revelar si el email existe)
   ```

2. **Tokens de un solo uso:**
   - Generados por Supabase Auth
   - Automáticamente invalidados después de uso

3. **Expiración corta:**
   - Validez: 1 hora
   - Automático en Supabase

4. **Logout después de reset:**
   ```typescript
   await supabase.auth.updateUser({ password: newPassword })
   await supabase.auth.signOut()  // Forzar nuevo login
   ```

### Variables de Entorno

**Archivo:** `.env.local`

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...  # Public key (frontend)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...      # Secret key (backend only)

# App
NEXT_PUBLIC_BASE_URL=https://app.redpresu.com
```

**Seguridad de claves:**

- ✅ **ANON_KEY:** Pública, con RLS policies
- ✅ **SERVICE_ROLE_KEY:** Privada, bypass RLS (solo server)
- ✅ **Nunca en cliente:** SERVICE_ROLE_KEY solo en Server Actions

### Auditoría y Logs

**Logs de autenticación:**

```typescript
// Login exitoso
console.log(`[Server Action] Login exitoso: ${email}, Rol: ${role}`)

// Login fallido
console.error('[Server Action] Login error:', error)

// Registro exitoso
console.log(`[registerUser] Registro completado: ${userId}`)

// Logout
console.log('[Server Action] Logout exitoso')
```

**Información registrada:**

- ✅ Email del usuario (pero NO contraseña)
- ✅ Timestamp (automático en logs)
- ✅ Errores detallados (para debugging)
- ✅ User ID (UUID)

---

## 📦 Dependencias

### Autenticación

```json
{
  "@supabase/auth-helpers-nextjs": "^0.10.0",
  "@supabase/supabase-js": "^2.57.4"
}
```

**Uso:**

```typescript
import { createServerActionClient } from '@supabase/auth-helpers-nextjs'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
```

### Validación

```json
{
  "zod": "^4.1.11",
  "nif-dni-nie-cif-validation": "^1.0.10"
}
```

**Uso:**

```typescript
import { z } from 'zod'
import { isValidNIF, getNIFErrorMessage } from '@/lib/helpers/nif-validator'
```

### UI y UX

```json
{
  "sonner": "^2.0.7",  // Toasts de notificación
  "lucide-react": "^0.544.0"  // Iconos
}
```

**Uso:**

```typescript
import { toast } from 'sonner'
import { Loader2, Mail, ArrowLeft } from 'lucide-react'
```

---

## 🔄 Flujos Completos

### Flujo de Login Completo

```
┌─────────────────────────────────────────────────┐
│  1. Usuario visita /login                       │
│     - Middleware verifica sesión                │
│     - Si autenticado → redirect según rol       │
└─────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────┐
│  2. Renderiza LoginForm                         │
│     - Email + Password fields                   │
│     - Validación client-side (Zod)              │
└─────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────┐
│  3. Submit formulario                           │
│     - Validar campos (email válido, password)   │
│     - Llamar signInAction(email, password)      │
└─────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────┐
│  4. signInAction (Server Action)                │
│     - Normalizar email (lowercase, trim)        │
│     - supabase.auth.signInWithPassword()        │
│     - Si error → Mapear mensaje en español      │
└─────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────┐
│  5. Si éxito:                                   │
│     - Supabase crea cookies de sesión           │
│     - Obtener datos user desde public.users     │
│     - Verificar rol                             │
└─────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────┐
│  6. Redirect según rol:                         │
│     - vendedor → /budgets                       │
│     - admin/superadmin → /dashboard             │
│     - Next.js ejecuta redirect()                │
└─────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────┐
│  7. Usuario en página protegida                 │
│     - Middleware verifica cookies               │
│     - Layout verifica getServerUser()           │
│     - Renderiza Header con datos usuario        │
└─────────────────────────────────────────────────┘
```

### Flujo de Registro Completo

```
┌─────────────────────────────────────────────────┐
│  1. Usuario visita /register                    │
│     - Verificar registro público habilitado     │
│     - Si deshabilitado → Mostrar mensaje        │
└─────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────┐
│  2. Renderiza RegisterForm                      │
│     - 3 secciones: Acceso, Fiscales, Contacto   │
│     - Tabs: Empresa vs Autónomo                 │
│     - Validación client-side (Zod)              │
└─────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────┐
│  3. Submit formulario                           │
│     - Validar registerSchema completo           │
│     - Verificar emails coinciden                │
│     - Verificar passwords coinciden             │
│     - Validar NIF con letra control             │
└─────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────┐
│  4. registerUser (Server Action)                │
│     - Iniciar transacción                       │
└─────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────┐
│  5. Paso 1: Validar NIF único                   │
│     - SELECT FROM issuers WHERE nif = ?         │
│     - Si existe → Error: "NIF ya registrado"    │
└─────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────┐
│  6. Paso 2: Crear EMPRESA                       │
│     - INSERT INTO empresas                      │
│     - Obtener empresa_id                        │
└─────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────┐
│  7. Paso 3: Crear usuario AUTH                  │
│     - supabaseAdmin.auth.admin.createUser()     │
│     - email_confirm: true (auto-confirmar)      │
│     - Obtener user_id (UUID)                    │
└─────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────┐
│  8. Paso 4: Crear registro PUBLIC.USERS         │
│     - INSERT INTO users                         │
│     - role: 'admin' (primer usuario)            │
│     - empresa_id: ID del paso 2                 │
└─────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────┐
│  9. Paso 5: Crear registro ISSUERS              │
│     - INSERT INTO issuers                       │
│     - Datos fiscales y contacto                 │
│     - IRPF si tipo = autónomo                   │
└─────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────┐
│  10. Si TODO OK:                                │
│      - Login automático (signInWithPassword)    │
│      - Redirect a /dashboard                    │
└─────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────┐
│  11. Si ERROR en cualquier paso:                │
│      - ROLLBACK completo:                       │
│        · Eliminar issuer (si creado)            │
│        · Eliminar user public (si creado)       │
│        · Eliminar user auth (si creado)         │
│        · Eliminar empresa (siempre)             │
│      - Retornar error específico                │
└─────────────────────────────────────────────────┘
```

### Flujo de Recuperación de Contraseña Completo

```
┌─────────────────────────────────────────────────┐
│  1. Usuario olvida contraseña                   │
│     - Visita /forgot-password                   │
└─────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────┐
│  2. Ingresa email + Submit                      │
│     - Validar email                             │
│     - requestPasswordReset(email)               │
└─────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────┐
│  3. Server Action                               │
│     - supabase.auth.resetPasswordForEmail()     │
│     - redirectTo: /reset-password               │
│     - NO revelar si email existe                │
└─────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────┐
│  4. Mensaje de confirmación                     │
│     "Si el email está registrado, recibirás     │
│      un enlace de recuperación"                 │
└─────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────┐
│  5. Email enviado (Supabase)                    │
│     - Link mágico con token                     │
│     - Formato: /reset-password#access_token=... │
│     - Validez: 1 hora                           │
└─────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────┐
│  6. Usuario click en enlace                     │
│     - Redirige a /reset-password                │
│     - Hash contiene access_token + type         │
└─────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────┐
│  7. Verificar token (client-side)               │
│     - Parsear window.location.hash              │
│     - Validar access_token existe               │
│     - Validar type === 'recovery'               │
└─────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────┐
│  8a. Si token inválido:                         │
│      - Mostrar mensaje error                    │
│      - Botón: "Solicitar nuevo enlace"          │
└─────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────┐
│  8b. Si token válido:                           │
│      - Renderizar PasswordResetForm             │
│      - Campos: password, confirmPassword        │
└─────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────┐
│  9. Submit nueva contraseña                     │
│     - Validar (8+ chars, complejidad)           │
│     - Validar confirmación coincide             │
│     - resetPassword(newPassword)                │
└─────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────┐
│  10. Server Action                              │
│      - Verificar sesión activa (del token)      │
│      - supabase.auth.updateUser({ password })   │
│      - supabase.auth.signOut()                  │
└─────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────┐
│  11. Mensaje de éxito                           │
│      "Contraseña actualizada. Inicia sesión     │
│       con tu nueva contraseña"                  │
│      - Redirect a /login                        │
└─────────────────────────────────────────────────┘
```

---

## 🔍 Debugging y Logs

### Logs de Autenticación

**Todos los Server Actions incluyen logs detallados:**

```typescript
// Login
console.log(`[Server Action] Login exitoso: ${email}, Rol: ${role}`)
console.error('[Server Action] Login error:', error)

// Registro
console.log('[registerUser] Iniciando registro...', { email, tipo })
console.log('[registerUser] Empresa creada:', empresaId)
console.log('[registerUser] Usuario auth creado:', userId)
console.log('[registerUser] Registro en users creado')
console.log('[registerUser] Issuer creado:', issuerId)

// Reset password
console.log('[resetPassword] Iniciando...')
console.log('[resetPassword] Contraseña actualizada exitosamente')

// Logout
console.log('[Server Action] Logout exitoso')
```

### Debugging en Desarrollo

**Credenciales de prueba visibles:**

```typescript
// src/app/(auth)/login/page.tsx
{isDev && (
  <div className="text-xs text-gray-500">
    <div>Admin: admin@jeyca.net / Admin123!</div>
    <div>Vendedor: vendedor@jeyca.net / Vendedor123!</div>
  </div>
)}
```

**Logs de Zod en RegisterForm:**

```typescript
useEffect(() => {
  console.log('[RegisterForm] Estado de errors cambió:', errors)
}, [errors])
```

---

## 🚧 Limitaciones Conocidas

### Autenticación

- **Un único método:** Solo Email + Contraseña (no OAuth)
- **Email único:** No soporta múltiples cuentas con mismo email
- **Sin 2FA:** Autenticación de dos factores no implementada
- **Sin biometría:** No soporta Face ID / Touch ID

### Recuperación de Contraseña

- **Solo por email:** No hay recuperación por SMS/teléfono
- **Expiración fija:** 1 hora (no configurable desde app)
- **Un único intento:** Token se invalida después de uso

### Sesiones

- **Sin multi-dispositivo:** No hay gestión de sesiones activas
- **Sin "remember me":** Duración fija de sesión
- **Sin refresh manual:** Refresh token automático solamente

---

## 🔮 Mejoras Planificadas (Fase 3)

### Autenticación Avanzada

- [ ] **OAuth providers:** Google, Microsoft, Apple
- [ ] **2FA (Two-Factor Auth):** TOTP, SMS
- [ ] **Magic Links:** Login sin contraseña
- [ ] **Biometría:** Face ID / Touch ID (WebAuthn)

### Gestión de Sesiones

- [ ] **Sesiones activas:** Ver y cerrar dispositivos
- [ ] **Remember me:** Opción de sesión extendida
- [ ] **Activity log:** Historial de accesos
- [ ] **Suspicious activity:** Alertas de login sospechoso

### Recuperación Mejorada

- [ ] **SMS recovery:** Código por mensaje de texto
- [ ] **Security questions:** Preguntas de seguridad
- [ ] **Backup codes:** Códigos de respaldo

### UX

- [ ] **Progressive disclosure:** Formularios más simples
- [ ] **Social proof:** "X usuarios ya registrados"
- [ ] **Onboarding:** Tutorial después del registro
- [ ] **Email verification:** Confirmación obligatoria

---

## 📚 Referencias

### Documentación Oficial

- [Supabase Auth](https://supabase.com/docs/guides/auth)
- [Supabase Auth Helpers - Next.js](https://supabase.com/docs/guides/auth/auth-helpers/nextjs)
- [Zod Documentation](https://zod.dev/)
- [Next.js Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)

### Convenciones del Proyecto

- Ver `CLAUDE.md` para reglas de modificación de archivos
- Ver `arquitectura.md` para patrones técnicos
- Ver `estructura-paginas-navegacion.md` para rutas y navegación

---

## 📝 Changelog

### v1.0 (2025-01-14)

- Documentación inicial del flujo de autenticación
- Análisis completo de login, registro, logout
- Documentación de recuperación de contraseña
- Análisis de validaciones con Zod
- Documentación de seguridad (hashing, CSRF, RLS)
- Diagramas de flujos completos

### Próximas versiones

- v1.1: Documentar OAuth providers (Fase 3)
- v1.2: Documentar 2FA implementation (Fase 3)
- v2.0: Documentar biometría y WebAuthn (Fase 3)

---

**Documento generado por:** IA especializada en análisis de aplicaciones web
**Mantenido por:** Equipo de desarrollo
**Próxima revisión:** Fin de Fase 2
