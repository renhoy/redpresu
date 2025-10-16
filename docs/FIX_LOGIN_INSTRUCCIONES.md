# 🔧 Fix Error de Login - Instrucciones Completas

## 📋 Problema Identificado

**Error en consola:**
```
[getServerUser] Error fetching user data: {}
```

**Causa raíz:**
Recursión infinita en las políticas RLS (Row Level Security) de la tabla `users`:

1. `getServerUser()` intenta leer la tabla `users`
2. La política RLS `users_select_policy` llama a `get_user_role()`
3. `get_user_role()` intenta leer la tabla `users` de nuevo
4. **Deadlock circular** → Error vacío `{}`

## ✅ Solución Aplicada

He preparado un script SQL consolidado que aplica **3 migraciones** en orden:

### Migración 009: Estructura de Datos
- Renombra columna `name` → `nombre`
- Añade columna `apellidos`
- Migra datos existentes dividiendo nombres completos

### Migración 010: Funciones Helper RLS
- Crea `get_user_empresa_id(uuid)` con SECURITY DEFINER
- Crea `get_user_role_by_id(uuid)` con SECURITY DEFINER
- Recrea todas las políticas RLS usando estas funciones

### Migración 014: Optimización Lectura Propia
- Permite que cada usuario lea su propio registro **sin** llamar funciones
- Evita completamente la recursión RLS

## 🚀 Pasos para Aplicar el Fix

### 1️⃣ Abrir Supabase Dashboard

```
https://supabase.com/dashboard/project/TU_PROJECT_ID/sql/new
```

### 2️⃣ Copiar el Script SQL

El script está en:
```
/migrations/EJECUTAR_FIX_LOGIN_COMPLETO.sql
```

### 3️⃣ Ejecutar en SQL Editor

1. Abre el archivo `EJECUTAR_FIX_LOGIN_COMPLETO.sql`
2. Copia **TODO** el contenido (incluye BEGIN/COMMIT)
3. Pégalo en el SQL Editor de Supabase
4. Click en **"Run"** o presiona `Cmd+Enter`

### 4️⃣ Verificar Resultado

Deberías ver mensajes como:
```sql
NOTICE: Columna "name" renombrada a "nombre"
NOTICE: Migración 009 completada: Columnas nombre y apellidos
NOTICE: Migración 010 completada: Funciones helper RLS creadas
NOTICE: Migración 010 completada: Políticas RLS recreadas
NOTICE: Migración 014 completada: Política users_select optimizada
```

Y al final, tres tablas de verificación mostrando:
- ✅ Columnas: `nombre`, `apellidos` (NO `name`)
- ✅ Políticas: 4 políticas RLS recreadas
- ✅ Funciones: 2 funciones helper con SECURITY DEFINER

### 5️⃣ Probar el Login

1. Recarga la aplicación en el navegador (Cmd+R)
2. Intenta hacer login con tus credenciales
3. **Ya NO debería aparecer el error** `[getServerUser] Error fetching user data: {}`
4. El login debería redirigir correctamente a:
   - `/dashboard` si eres admin/superadmin
   - `/budgets` si eres vendedor

## 🧪 Testing Post-Fix

### Usuarios de Prueba (del seed data):

**Admin:**
- Email: `admin@jeyca.net`
- Password: `Admin123!`
- Debería redirigir a `/dashboard`

**Vendedor:**
- Email: `vendedor@jeyca.net`
- Password: `Vendedor123!`
- Debería redirigir a `/budgets`

### Verificaciones Adicionales:

1. **Header muestra usuario correctamente:**
   - Nombre completo visible
   - Rol mostrado
   - Botón logout funcional

2. **No hay errores en consola:**
   - Sin `[getServerUser] Error fetching user data`
   - Sin errores de RLS

3. **Navegación funciona:**
   - Dashboard carga correctamente
   - Listado de presupuestos accesible
   - Listado de tarifas accesible

## 🔍 Troubleshooting

### Si el error persiste después del fix:

#### Opción 1: Verificar que la migración se aplicó

Ejecuta en SQL Editor de Supabase:

```sql
-- Verificar columnas
SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'users'
  AND column_name IN ('nombre', 'apellidos', 'name');

-- Debería mostrar: nombre, apellidos (NO name)
```

#### Opción 2: Verificar funciones helper

```sql
-- Verificar funciones existen
SELECT proname, prosecdef
FROM pg_proc
WHERE proname IN ('get_user_empresa_id', 'get_user_role_by_id');

-- Ambas deberían tener prosecdef = true (SECURITY DEFINER)
```

#### Opción 3: Verificar políticas RLS

```sql
-- Verificar política users_select
SELECT definition
FROM pg_policies
WHERE tablename = 'users'
  AND policyname = 'users_select_policy';

-- Debería contener: id = auth.uid() OR empresa_id = ...
```

### Si ves errores diferentes:

#### Error: "column name does not exist"
- La columna `name` aún existe en tu BD
- Re-ejecuta la migración 009 manualmente

#### Error: "infinite recursion detected"
- Las políticas RLS aún tienen el problema
- Re-ejecuta las migraciones 010 y 014

#### Error: "function get_user_empresa_id does not exist"
- Las funciones helper no se crearon
- Re-ejecuta la migración 010

## 📝 Cambios en el Código (Ya Aplicados)

He modificado estos archivos para usar `select('*')` en vez de campos específicos:

### `src/app/actions/auth.ts`
- **Línea 46:** `select('*')` en vez de `select('role, nombre, apellidos')`
- **Línea 621:** `select('*')` en vez de `select('id, name, email, role, empresa_id')`

Estos cambios aseguran que se obtengan todos los campos de la tabla `users`, incluyendo `nombre`, `apellidos`, `status`, `empresa_id`, etc.

## 📊 Estado Actual

- ✅ **Código TypeScript:** Corregido
- ⏳ **Base de Datos:** Requiere aplicar migración
- ⏳ **Testing:** Pendiente de tu verificación

## 🎯 Siguiente Paso

**Ejecuta el script SQL** `EJECUTAR_FIX_LOGIN_COMPLETO.sql` en Supabase y confirma que el login funciona correctamente.

---

**Archivo generado:** 2025-01-16
**Versión:** 1.0
**Status:** Ready to execute
