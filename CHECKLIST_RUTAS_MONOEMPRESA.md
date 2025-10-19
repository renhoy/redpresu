# Checklist de Rutas: Modo Monoempresa vs Multiempresa

## 📋 Leyenda

- ✅ = Accesible en ambos modos
- 🔒 = Bloqueado en modo monoempresa (redirige)
- 🔓 = Solo accesible en modo multiempresa
- 🔐 = Requiere autenticación en ambos modos

---

## 🔓 RUTAS PÚBLICAS (sin autenticación)

### Modo Multiempresa (multiempresa=true)

| Ruta               | Acceso | Comportamiento                             |
| ------------------ | ------ | ------------------------------------------ |
| `/`                | 🔓     | Muestra landing page pública               |
| `/login`           | ✅     | Muestra formulario de login                |
| `/register`        | 🔓     | Muestra formulario de registro             |
| `/forgot-password` | ✅     | Muestra formulario recuperación contraseña |
| `/reset-password`  | ✅     | Muestra formulario reset contraseña        |
| `/pricing`         | 🔓     | Muestra página de precios (si existe)      |

### Modo Monoempresa (multiempresa=false)

| Ruta               | Acceso | Comportamiento                             | Redirect                                   |
| ------------------ | ------ | ------------------------------------------ | ------------------------------------------ |
| `/`                | 🔒     | **Bloqueado**                              | → `/login` (no auth) o `/dashboard` (auth) |
| `/login`           | ✅     | Muestra formulario de login                | -                                          |
| `/register`        | 🔒     | **Bloqueado siempre**                      | → `/login`                                 |
| `/forgot-password` | ✅     | Muestra formulario recuperación contraseña | -                                          |
| `/reset-password`  | ✅     | Muestra formulario reset contraseña        | -                                          |
| `/pricing`         | 🔒     | **Bloqueado**                              | → `/login` (no auth) o `/dashboard` (auth) |

---

## 🔐 RUTAS PRIVADAS (requieren autenticación)

### Dashboard y Core

| Ruta         | Modo Multi | Modo Mono | Notas                        |
| ------------ | ---------- | --------- | ---------------------------- |
| `/dashboard` | ✅         | ✅        | Principal página autenticada |
| `/profile`   | ✅         | ✅        | Perfil de usuario            |
| `/settings`  | ✅         | ✅        | Configuración                |

### Tarifas

| Ruta                 | Modo Multi | Modo Mono | Notas                           |
| -------------------- | ---------- | --------- | ------------------------------- |
| `/tariffs`           | ✅         | ✅        | Listado de tarifas              |
| `/tariffs/create`    | ✅         | ✅        | Crear nueva tarifa              |
| `/tariffs/[id]/edit` | ✅         | ✅        | Editar tarifa existente         |
| `/tariffs/import`    | ✅         | ✅        | Importar tarifas desde CSV/JSON |

### Presupuestos

| Ruta                     | Modo Multi | Modo Mono | Notas                   |
| ------------------------ | ---------- | --------- | ----------------------- |
| `/budgets`               | ✅         | ✅        | Listado de presupuestos |
| `/budgets/create`        | ✅         | ✅        | Crear nuevo presupuesto |
| `/budgets/[id]/edit`     | ✅         | ✅        | Editar presupuesto      |
| `/budgets/[id]/versions` | ✅         | ✅        | Historial de versiones  |
| `/budgets/import`        | ✅         | ✅        | Importar presupuestos   |

### Usuarios (admin/superadmin)

| Ruta               | Modo Multi | Modo Mono | Notas                       |
| ------------------ | ---------- | --------- | --------------------------- |
| `/users`           | ✅         | ✅        | Listado de usuarios (admin) |
| `/users/[id]/edit` | ✅         | ✅        | Editar usuario (admin)      |

### Ayuda

| Ruta           | Modo Multi | Modo Mono | Notas                        |
| -------------- | ---------- | --------- | ---------------------------- |
| `/help`        | ✅         | ✅        | Índice de ayuda              |
| `/help/[slug]` | ✅         | ✅        | Artículo de ayuda específico |

### Suscripciones (Bloque 11 - Stripe)

| Ruta                     | Modo Multi | Modo Mono | Notas                                |
| ------------------------ | ---------- | --------- | ------------------------------------ |
| `/subscriptions`         | 🔓         | 🔒        | **Bloqueado en mono** → `/dashboard` |
| `/subscriptions/success` | 🔓         | 🔒        | **Bloqueado en mono** → `/dashboard` |
| `/subscriptions/cancel`  | 🔓         | 🔒        | **Bloqueado en mono** → `/dashboard` |

---

## 🔌 API ROUTES

### Webhooks

| Ruta                   | Modo Multi | Modo Mono | Notas                          |
| ---------------------- | ---------- | --------- | ------------------------------ |
| `/api/webhooks/stripe` | 🔓         | ⚠️        | Funcional pero sin uso en mono |

### PDF Generation

| Ruta                | Modo Multi | Modo Mono | Notas                               |
| ------------------- | ---------- | --------- | ----------------------------------- |
| `/api/generate-pdf` | ✅         | ✅        | Generación de PDFs (auth requerida) |

### Auth

| Ruta                      | Modo Multi | Modo Mono | Notas                         |
| ------------------------- | ---------- | --------- | ----------------------------- |
| `/api/auth/callback`      | ✅         | ✅        | Callback OAuth Supabase       |
| `/api/auth/[...nextauth]` | ✅         | ✅        | NextAuth handlers (si aplica) |

---

## 🧪 CHECKLIST DE TESTING MANUAL

### Testing Modo MULTIEMPRESA (multiempresa=true)

#### Rutas Públicas

- [ ] `/` → ✅ Muestra landing page
- [ ] `/login` → ✅ Muestra formulario login
- [ ] `/register` → ✅ Muestra formulario registro
- [ ] `/forgot-password` → ✅ Muestra formulario recuperación
- [ ] `/reset-password` → ✅ Muestra formulario reset
- [ ] `/pricing` → ✅ Muestra página de precios

#### Header Público

- [ ] Header muestra: "Precios", "Acceso", "Registro"
- [ ] Click en "Registro" → `/register`
- [ ] Click en "Precios" → `/pricing`
- [ ] Click en "Acceso" → `/login`

#### Rutas Privadas (requiere login)

- [ ] `/dashboard` → ✅ Accesible
- [ ] `/tariffs` → ✅ Accesible
- [ ] `/budgets` → ✅ Accesible
- [ ] `/users` → ✅ Accesible (admin)
- [ ] `/subscriptions` → ✅ Accesible
- [ ] `/help` → ✅ Accesible

#### UserMenu Autenticado

- [ ] UserMenu muestra enlace "Suscripciones" (si Stripe habilitado)
- [ ] Click en "Suscripciones" → `/subscriptions`

---

### Testing Modo MONOEMPRESA (multiempresa=false)

#### Preparación

```sql
-- Ejecutar en Supabase SQL Editor:
UPDATE public.redpresu_config SET value = 'false'::jsonb WHERE key = 'multiempresa';
```

**IMPORTANTE:** Reiniciar servidor después (cache 1min): `npm run dev`

#### Rutas Bloqueadas (sin autenticación)

- [ ] `/` → 🔒 Redirige a `/login`
- [ ] `/register` → 🔒 Redirige a `/login`
- [ ] `/pricing` → 🔒 Redirige a `/login`

#### Rutas Bloqueadas (con autenticación)

- [ ] Login como admin
- [ ] `/` → 🔒 Redirige a `/dashboard`
- [ ] `/register` → 🔒 Redirige a `/login`
- [ ] `/subscriptions` → 🔒 Redirige a `/dashboard`
- [ ] `/pricing` → 🔒 Redirige a `/dashboard`

#### Header Público (sin autenticación)

- [ ] Header muestra solo: "Acceso"
- [ ] Header NO muestra: "Precios" ni "Registro"

#### Header Autenticado

- [ ] UserMenu NO muestra enlace "Suscripciones"
- [ ] Intentar acceder manualmente a `/subscriptions` → redirige a `/dashboard`

#### Rutas Permitidas (sin cambios)

- [ ] `/login` → ✅ Accesible
- [ ] `/forgot-password` → ✅ Accesible
- [ ] `/reset-password` → ✅ Accesible
- [ ] `/dashboard` → ✅ Accesible (auth)
- [ ] `/tariffs` → ✅ Accesible (auth)
- [ ] `/budgets` → ✅ Accesible (auth)
- [ ] `/users` → ✅ Accesible (auth + admin)
- [ ] `/help` → ✅ Accesible (auth)

---

## 🐛 Console Logs Esperados

### Modo Multiempresa (true)

```
[isMultiEmpresa] Modo actual: MULTIEMPRESA
[Middleware] Path: /, Auth: false, Public: true, MultiEmpresa: true
```

### Modo Monoempresa (false)

```
[isMultiEmpresa] Modo actual: MONOEMPRESA
[Middleware] Modo mono: / → /login
[Middleware] Modo mono: bloqueando /register → /login
[Middleware] Modo mono: bloqueando /subscriptions → /dashboard
[Middleware] Modo mono: bloqueando /pricing → /login
```

---

## ✅ Resumen de Diferencias Clave

| Aspecto                            | Multiempresa                    | Monoempresa                     |
| ---------------------------------- | ------------------------------- | ------------------------------- |
| **Landing page (/)**               | Pública visible                 | Bloqueada → /login o /dashboard |
| **Registro (/register)**           | Accesible                       | Bloqueado → /login              |
| **Pricing (/pricing)**             | Accesible                       | Bloqueado → /login o /dashboard |
| **Suscripciones (/subscriptions)** | Accesible                       | Bloqueado → /dashboard          |
| **Header público**                 | "Precios", "Acceso", "Registro" | Solo "Acceso"                   |
| **UserMenu (Suscripciones)**       | Visible (si Stripe activo)      | Oculto                          |
| **Rutas core**                     | Sin cambios                     | Sin cambios                     |

---

## 🔧 Troubleshooting

### Problema: Ruta no redirige correctamente

**Solución:**

1. Verificar console logs del middleware
2. Confirmar valor de `multiempresa` en BD:

```sql
SELECT key, value FROM public.redpresu_config WHERE key = 'multiempresa';
```

3. Reiniciar servidor (cache 1min)
4. Limpiar cache navegador (Ctrl+Shift+R)

### Problema: Header muestra enlaces incorrectos

**Solución:**

1. Verificar que layout pasa prop `multiempresa` a Header
2. Inspeccionar props en React DevTools
3. Verificar logs: `[isMultiEmpresa] Modo actual: ...`

### Problema: Modo no cambia después de UPDATE

**Solución:**

1. Esperar 1 minuto (cache TTL)
2. O reiniciar servidor: `npm run dev`
3. O invalidar cache manualmente en código:

```typescript
import { invalidateAppModeCache } from "@/lib/helpers/app-mode";
invalidateAppModeCache();
```

---

**Documento:** Checklist Rutas Monoempresa
**Versión:** 1.0
**Fecha:** 2025-01-19
**Relacionado:** Bloque 12 - Modo Monoempresa/Multiempresa
