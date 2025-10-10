# Feature: Configuración de Entorno (Development/Production)

**Fecha:** 2025-01-10
**Tipo:** Nueva funcionalidad - Configuración de entorno

---

## 📋 Resumen

Implementación de configuraciones para controlar el comportamiento de la aplicación según el entorno (development/production):

1. **Modo de aplicación** (`app_mode`): development o production
2. **Registro público** (`public_registration_enabled`): habilitar/deshabilitar registro de usuarios

---

## 🎯 Funcionalidades Implementadas

### 1. Modo de Aplicación (Development/Production)

**Configuración:** `app_mode`
- Valores: `"development"` o `"production"`
- Por defecto: `"development"`

**Comportamiento según modo:**

#### En Development:
- ✅ Muestra usuarios de prueba en página de login
- ✅ Muestra texto "Compatible con tablets y dispositivos móviles"
- ✅ Imprime payload PDF completo en consola del servidor
- ✅ Logs detallados en consola

#### En Production:
- ✅ NO muestra usuarios de prueba
- ✅ NO muestra texto de compatibilidad
- ✅ NO imprime payload PDF en consola
- ✅ Logs mínimos

### 2. Registro Público

**Configuración:** `public_registration_enabled`
- Valores: `true` o `false`
- Por defecto: `true`

**Comportamiento:**

#### Si está habilitado (`true`):
- ✅ Usuarios pueden acceder a `/register`
- ✅ Formulario de registro visible
- ✅ Empresas y autónomos pueden registrarse

#### Si está deshabilitado (`false`):
- ✅ Página `/register` muestra mensaje de "Registro deshabilitado"
- ✅ Link para volver al login
- ✅ Solo superadmin puede crear usuarios desde panel

---

## 📁 Archivos Modificados

### Migraciones SQL

#### `migrations/022_config_environment.sql`
- Inserta configuración `app_mode` con valor `"development"`
- Inserta configuración `public_registration_enabled` con valor `true`

### Helpers

#### `src/lib/helpers/config-helpers.ts`
Funciones agregadas:
```typescript
// Obtiene el modo: 'development' | 'production'
export async function getAppMode(): Promise<'development' | 'production'>

// Verifica si está en desarrollo
export async function isDevelopmentMode(): Promise<boolean>

// Verifica si registro público está habilitado
export async function isPublicRegistrationEnabled(): Promise<boolean>
```

### Páginas

#### `src/app/(auth)/login/page.tsx`
- Convertida de Client Component a Server Component
- Obtiene `isDevelopmentMode()` en servidor
- Renderiza usuarios de prueba solo si `isDev === true`
- Código simplificado (sin useEffect)

**Antes (Client Component):**
```tsx
'use client'
export default function LoginPage() {
  useEffect(() => { /* auth check */ })
  // Siempre mostraba usuarios de prueba
}
```

**Ahora (Server Component):**
```tsx
export default async function LoginPage() {
  const user = await getServerUser()
  if (user) redirect('/dashboard')

  const isDev = await isDevelopmentMode()

  return (
    // {isDev && <div>Usuarios de prueba...</div>}
  )
}
```

#### `src/app/(auth)/register/page.tsx`
- Convertida de Client Component a Server Component
- Obtiene `isPublicRegistrationEnabled()` en servidor
- Muestra mensaje de "Registro deshabilitado" si `registrationEnabled === false`
- Código simplificado (sin useEffect)

**Antes (Client Component):**
```tsx
'use client'
export default function RegisterPage() {
  useEffect(() => { /* auth check */ })
  // Siempre permitía registro
}
```

**Ahora (Server Component):**
```tsx
export default async function RegisterPage() {
  const user = await getServerUser()
  if (user) redirect('/dashboard')

  const registrationEnabled = await isPublicRegistrationEnabled()

  if (!registrationEnabled) {
    return <div>Registro deshabilitado...</div>
  }

  return <RegisterForm />
}
```

### Server Actions

#### `src/app/actions/budgets.ts` (función `generateBudgetPDF`)
- Importa `isDevelopmentMode()` dinámicamente
- Imprime payload completo solo en modo desarrollo

**Cambio:**
```typescript
// Obtener modo de aplicación para logs
const { isDevelopmentMode } = await import('@/lib/helpers/config-helpers')
const isDev = await isDevelopmentMode()

// En modo desarrollo, imprimir payload en consola
if (isDev) {
  console.log('[generateBudgetPDF] DEVELOPMENT MODE - Payload:', JSON.stringify(payload, null, 2))
}
```

---

## 🔧 Cómo Usar

### Cambiar Modo de Aplicación

#### Opción 1: SQL Editor (Supabase)
```sql
UPDATE public.config
SET value = '"production"'::jsonb
WHERE key = 'app_mode';
```

#### Opción 2: Panel de Configuración (Superadmin)
1. Ir a `/settings`
2. Buscar `app_mode`
3. Cambiar valor a `"development"` o `"production"`
4. Guardar

### Habilitar/Deshabilitar Registro Público

#### Opción 1: SQL Editor (Supabase)
```sql
-- Deshabilitar registro
UPDATE public.config
SET value = 'false'::jsonb
WHERE key = 'public_registration_enabled';

-- Habilitar registro
UPDATE public.config
SET value = 'true'::jsonb
WHERE key = 'public_registration_enabled';
```

#### Opción 2: Panel de Configuración (Superadmin)
1. Ir a `/settings`
2. Buscar `public_registration_enabled`
3. Cambiar valor a `true` o `false`
4. Guardar

---

## 🧪 Testing

### Casos de Prueba

#### Test 1: Modo Development - Login
1. Configurar `app_mode = "development"`
2. Ir a `/login`
3. ✅ Debe mostrar: "Compatible con tablets..."
4. ✅ Debe mostrar usuarios de prueba

#### Test 2: Modo Production - Login
1. Configurar `app_mode = "production"`
2. Ir a `/login`
3. ✅ NO debe mostrar compatibilidad
4. ✅ NO debe mostrar usuarios de prueba

#### Test 3: Registro Habilitado
1. Configurar `public_registration_enabled = true`
2. Ir a `/register`
3. ✅ Debe mostrar formulario de registro
4. ✅ Puede registrarse correctamente

#### Test 4: Registro Deshabilitado
1. Configurar `public_registration_enabled = false`
2. Ir a `/register`
3. ✅ Debe mostrar mensaje "Registro deshabilitado"
4. ✅ Debe mostrar link para volver a login
5. ✅ NO debe poder registrarse

#### Test 5: Payload PDF en Development
1. Configurar `app_mode = "development"`
2. Crear presupuesto y generar PDF
3. ✅ Debe imprimir payload completo en consola servidor

#### Test 6: Payload PDF en Production
1. Configurar `app_mode = "production"`
2. Crear presupuesto y generar PDF
3. ✅ NO debe imprimir payload en consola

---

## 📊 Base de Datos

### Nuevas Configuraciones

| Key | Value | Description | Category | is_system |
|-----|-------|-------------|----------|-----------|
| `app_mode` | `"development"` | Modo de aplicación | general | false |
| `public_registration_enabled` | `true` | Permitir registro público | general | false |

### Consulta para Ver Configuraciones

```sql
SELECT key, value, description, category, is_system
FROM public.config
WHERE key IN ('app_mode', 'public_registration_enabled')
ORDER BY key;
```

---

## 🚀 Beneficios

### Para Desarrollo:
- ✅ Usuarios de prueba visibles facilitan testing
- ✅ Payload PDF en consola ayuda a debugging
- ✅ Información de compatibilidad para QA

### Para Producción:
- ✅ Interfaz limpia sin información de debug
- ✅ Sin datos sensibles en logs (payload)
- ✅ Mejor experiencia de usuario

### Para Administración:
- ✅ Control centralizado desde panel
- ✅ Posibilidad de cerrar registro temporalmente
- ✅ Cambios sin necesidad de redeploy

---

## ⚠️ Consideraciones

### Seguridad:
- Las configuraciones NO son `is_system`, por lo que **superadmin puede modificarlas**
- El modo por defecto es `development` (cambiar a `production` al deploy)
- El registro público está habilitado por defecto

### Performance:
- Las funciones `isDevelopmentMode()` y `isPublicRegistrationEnabled()` hacen queries a BD
- Se ejecutan en Server Components (no afecta cliente)
- Considerar caché si se vuelve un bottleneck

### Migración:
- Al ejecutar migration 022, todas las instancias quedan en modo `development`
- **IMPORTANTE:** Cambiar a `production` manualmente después del deploy

---

## 🔄 Próximos Pasos (Opcional)

### Mejoras Futuras:
1. **Caché de configuraciones** en Redis o memoria
2. **Panel de configuración mejorado** con toggle switches
3. **Notificación** cuando se cambia el modo
4. **Logs de auditoría** de cambios de configuración
5. **Variables de entorno** como fallback si BD no está disponible

---

## 📝 Checklist Pre-Deploy

Antes de pasar a producción:

- [ ] Ejecutar migration `022_config_environment.sql`
- [ ] Cambiar `app_mode` a `"production"` en BD
- [ ] Decidir si mantener `public_registration_enabled` en `true` o `false`
- [ ] Testing en staging con modo production
- [ ] Verificar que NO se imprimen payloads en logs
- [ ] Verificar que NO se muestran usuarios de prueba en login

---

**Autor:** Claude Code Assistant
**Fecha:** 2025-01-10
**Migración:** 022
**Estado:** ✅ Implementado
