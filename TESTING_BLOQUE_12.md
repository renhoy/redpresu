# Testing Bloque 12: Modo Monoempresa/Multiempresa

## 📋 Preparación

### 1. Ejecutar migración 031 en Supabase

**Desde Supabase SQL Editor:**
1. Ir a tu proyecto Supabase → SQL Editor
2. Copiar todo el contenido de `migrations/031_add_multiempresa_config.sql`
3. Pegar en SQL Editor
4. Click en "Run" o Ctrl+Enter

### 2. Verificar migración exitosa

La misma migración incluye una query de verificación al final. O ejecuta manualmente:

```sql
SELECT key, value, description, category, is_system, created_at
FROM public.redpresu_config
WHERE key = 'multiempresa';
```

**Resultado esperado:**
```
key          | value | description                              | category | is_system
multiempresa | true  | Modo de operación: true=multiempresa...  | general  | true
```

---

## 🧪 Testing Modo MULTIEMPRESA (SaaS - actual)

### Preparar entorno
```sql
-- Asegurar que está en modo multi (desde Supabase SQL Editor)
UPDATE public.redpresu_config SET value = 'true'::jsonb WHERE key = 'multiempresa';
```

### Tests a realizar:

#### 1. Landing page pública (/)
- [ ] Ir a `http://localhost:3000/`
- [ ] ✅ Se muestra landing pública con hero, features, CTA
- [ ] ✅ Header muestra: "Precios", "Acceso", "Registro"
- [ ] ✅ Click en "Registro" lleva a `/register`

#### 2. Registro público
- [ ] Ir a `/register`
- [ ] ✅ Se muestra formulario de registro
- [ ] ✅ Permite registrarse (no redirige a login)

#### 3. Pricing
- [ ] Ir a `/pricing`
- [ ] ✅ Se muestra página de precios (si existe)
- [ ] ✅ No redirige a /404

#### 4. Suscripciones (si Bloque 11 activo)
- [ ] Login como admin
- [ ] Ir a `/subscriptions`
- [ ] ✅ Se muestra página de suscripciones (si existe)
- [ ] ✅ No redirige a /dashboard
- [ ] ✅ UserMenu muestra enlace "Suscripciones"

#### 5. Console logs
Abrir DevTools → Console, verificar:
```
[isMultiEmpresa] Modo actual: MULTIEMPRESA
```

---

## 🧪 Testing Modo MONOEMPRESA (On-premise)

### Preparar entorno
```sql
-- Cambiar a modo monoempresa (desde Supabase SQL Editor)
UPDATE public.redpresu_config SET value = 'false'::jsonb WHERE key = 'multiempresa';
```

**IMPORTANTE:** Reiniciar servidor después de cambiar el modo (cache de 1min):
```bash
# Detener servidor
# Iniciar de nuevo: npm run dev
```

### Tests a realizar:

#### 1. Landing page redirige a login
- [ ] Cerrar sesión (logout)
- [ ] Ir a `http://localhost:3000/`
- [ ] ✅ Redirige automáticamente a `/login`
- [ ] ✅ NO se muestra landing pública

#### 2. Registro bloqueado
- [ ] Intentar ir a `/register`
- [ ] ✅ Redirige automáticamente a `/login`
- [ ] ✅ NO permite acceder a registro

#### 3. Header público simplificado
- [ ] Cerrar sesión
- [ ] Inspeccionar header en `/login`
- [ ] ✅ Solo muestra: "Acceso" (sin "Precios" ni "Registro")

#### 4. Suscripciones bloqueadas
- [ ] Login como admin
- [ ] Intentar ir a `/subscriptions`
- [ ] ✅ Redirige a `/dashboard`
- [ ] ✅ UserMenu NO muestra enlace "Suscripciones"

#### 5. Pricing bloqueado (indirectamente)
- [ ] Cerrar sesión
- [ ] Header público NO muestra enlace "Precios"
- [ ] ✅ No hay forma de acceder a /pricing desde UI

#### 6. Console logs
Abrir DevTools → Console, verificar:
```
[isMultiEmpresa] Modo actual: MONOEMPRESA
[Middleware] Modo mono: / → /login
[Middleware] Modo mono: bloqueando /register → /login
[Middleware] Modo mono: bloqueando /subscriptions → /dashboard
```

---

## 🔄 Testing Cambio de Modo en Caliente

### 1. Desde modo MULTI → MONO
```sql
UPDATE public.redpresu_config SET value = 'false'::jsonb WHERE key = 'multiempresa';
```

- [ ] Esperar 1 minuto (cache TTL)
- [ ] Recargar página
- [ ] ✅ Comportamiento cambia a modo mono sin reiniciar servidor

### 2. Desde modo MONO → MULTI
```sql
UPDATE public.redpresu_config SET value = 'true'::jsonb WHERE key = 'multiempresa';
```

- [ ] Esperar 1 minuto (cache TTL)
- [ ] Recargar página
- [ ] ✅ Comportamiento cambia a modo multi sin reiniciar servidor

### 3. Invalidación manual de cache (opcional)
Para testing rápido, llamar desde código:
```typescript
import { invalidateAppModeCache } from '@/lib/helpers/app-mode';
invalidateAppModeCache(); // Fuerza recarga inmediata
```

---

## 🐛 Troubleshooting

### Problema: Modo no cambia después de UPDATE
**Solución:**
1. Esperar 1 minuto (cache)
2. O reiniciar servidor: `npm run dev`
3. O invalidar cache manualmente (ver arriba)

### Problema: Error "config key 'multiempresa' not found"
**Solución:**
- Verificar que migración 031 se ejecutó correctamente
- Ejecutar query de verificación:
```sql
SELECT * FROM public.redpresu_config WHERE key = 'multiempresa';
```

### Problema: Redirects no funcionan
**Solución:**
- Verificar console logs del middleware
- Verificar que `isMultiEmpresa()` retorna valor correcto
- Limpiar cache del navegador (Ctrl+Shift+R)

### Problema: Header público muestra enlaces incorrectos
**Solución:**
- Verificar que layout pasa prop `multiempresa` a Header
- Inspeccionar props en React DevTools
- Verificar logs: `[isMultiEmpresa] Modo actual: ...`

---

## ✅ Checklist Final

### Modo Multiempresa (SaaS)
- [ ] Landing `/` se muestra (no redirige)
- [ ] Header público: "Precios", "Acceso", "Registro"
- [ ] `/register` accesible
- [ ] `/subscriptions` accesible (si Bloque 11)
- [ ] UserMenu muestra "Suscripciones" (si admin + Bloque 11)

### Modo Monoempresa (On-premise)
- [ ] `/` → `/login` (redirige)
- [ ] Header público: solo "Acceso"
- [ ] `/register` → `/login` (bloqueado)
- [ ] `/subscriptions` → `/dashboard` (bloqueado)
- [ ] UserMenu NO muestra "Suscripciones"

### Funcionalidad Core
- [ ] Cambio de modo funciona (con 1min delay o restart)
- [ ] Cache funciona correctamente
- [ ] No hay errores en console
- [ ] No hay warnings de React
- [ ] BD preservada (cambiar modo no afecta datos)

---

## 📊 Resultado Esperado

**Si todos los tests pasan:**
✅ Bloque 12 funciona correctamente
✅ Modo multiempresa y monoempresa operativos
✅ Aplicación lista para deployment flexible (SaaS o on-premise)

**Si algún test falla:**
❌ Revisar troubleshooting
❌ Verificar console logs
❌ Verificar migración ejecutada
❌ Verificar props en componentes
