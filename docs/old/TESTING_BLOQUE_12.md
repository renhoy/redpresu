# Testing - Bloque 12: Modo Monoempresa/Multiempresa

## Objetivo

Verificar que el sistema funciona correctamente en ambos modos:
- **Modo Multiempresa (SaaS):** Comportamiento actual, múltiples empresas, registro público, suscripciones
- **Modo Monoempresa (On-premise):** Una sola empresa, sin registro público, sin suscripciones

---

## Pre-requisitos

### 1. Ejecutar Migración 031

```bash
# Conectarse a la BD de Supabase y ejecutar:
psql -h <SUPABASE_DB_HOST> -U postgres -d postgres -f docs/migrations/031_add_multiempresa_config.sql
```

**O desde Supabase Dashboard:**
1. Ir a SQL Editor
2. Copiar contenido de `docs/migrations/031_add_multiempresa_config.sql`
3. Ejecutar

**Verificar:**
```sql
SELECT config_key, config_value FROM config WHERE config_key = 'multiempresa';
-- Debe retornar: multiempresa | true
```

### 2. Verificar Implementación

**Archivos que deben existir:**
- ✅ `src/lib/helpers/app-mode.ts` - Helpers isMultiEmpresa(), getDefaultEmpresaId()
- ✅ `src/middleware.ts` - Routing condicional
- ✅ `src/components/layout/Header.tsx` - Navegación adaptada

---

## Casos de Prueba

### Test 1: Modo Multiempresa (Default) ✅

**Objetivo:** Verificar comportamiento SaaS normal

**Pasos:**
1. Verificar config en BD:
   ```sql
   SELECT config_value FROM config WHERE config_key = 'multiempresa';
   -- Esperado: true
   ```

2. Reiniciar servidor (para limpiar cache):
   ```bash
   # Ctrl+C y luego
   npm run dev
   ```

3. **Testing Header Público (sin autenticar):**
   - Ir a `http://localhost:3000/`
   - ✅ Debe mostrar enlace "Registro"
   - ✅ Debe mostrar enlace "Precios" (si suscripciones están habilitadas)
   - ✅ Debe mostrar enlace "Acceso"

4. **Testing Registro:**
   - Ir a `http://localhost:3000/register`
   - ✅ Página debe cargar correctamente (NO redirigir a /login)
   - ✅ Formulario de registro visible

5. **Testing Suscripciones:**
   - Login como admin
   - Ir a `http://localhost:3000/subscriptions`
   - ✅ Página debe cargar (NO redirigir a /dashboard)
   - ✅ Planes visibles

**Resultado Esperado:** ✅ Todo funciona como SaaS

---

### Test 2: Modo Monoempresa 🔄

**Objetivo:** Verificar bloqueo de registro y suscripciones

**Pasos:**
1. Cambiar config en BD:
   ```sql
   UPDATE config SET config_value = 'false' WHERE config_key = 'multiempresa';
   ```

2. Invalidar cache (OPCIONAL - esperar 1 minuto O reiniciar servidor):
   ```bash
   # Opción A: Esperar 1 minuto (TTL del cache)
   # Opción B: Reiniciar servidor
   # Ctrl+C y luego
   npm run dev
   ```

3. **Testing Header Público (sin autenticar):**
   - Ir a `http://localhost:3000/`
   - ✅ NO debe mostrar enlace "Registro"
   - ✅ NO debe mostrar enlace "Precios"
   - ✅ SÍ debe mostrar enlace "Acceso"

4. **Testing Redirect Registro:**
   - Ir manualmente a `http://localhost:3000/register`
   - ✅ Debe redirigir automáticamente a `/login`

5. **Testing Redirect Suscripciones:**
   - Login como admin
   - Ir a `http://localhost:3000/subscriptions`
   - ✅ Debe redirigir automáticamente a `/dashboard`

6. **Testing Landing:**
   - Ir a `http://localhost:3000/` (sin autenticar)
   - ✅ Debe redirigir a `/login` directamente

**Resultado Esperado:** ✅ Registro y suscripciones bloqueados

---

### Test 3: Cambio de Modo en Caliente ⚡

**Objetivo:** Verificar que el cache se actualiza después del TTL

**Pasos:**
1. Configurar modo MONO:
   ```sql
   UPDATE config SET config_value = 'false' WHERE config_key = 'multiempresa';
   ```

2. Verificar comportamiento MONO:
   - Ir a `/register` → debe redirigir a `/login` ✅

3. **SIN REINICIAR SERVIDOR**, cambiar a modo MULTI:
   ```sql
   UPDATE config SET config_value = 'true' WHERE config_key = 'multiempresa';
   ```

4. **Esperar 61 segundos** (TTL del cache es 60 segundos)

5. Verificar comportamiento MULTI:
   - Ir a `/register` → debe mostrar formulario ✅

**Resultado Esperado:** ✅ Cache se actualiza automáticamente después de 1 minuto

---

### Test 4: Middleware Redirects 🔀

**Objetivo:** Verificar que todos los redirects del middleware funcionan

**Configuración:** Modo MONOEMPRESA

**Casos:**

| URL Accedida | Autenticado | Redirect Esperado | ✅ |
|--------------|-------------|-------------------|---|
| `/` | NO | `/login` | |
| `/register` | NO | `/login` | |
| `/subscriptions` | SÍ (admin) | `/dashboard` | |
| `/pricing` | NO | `/login` | |
| `/login` | NO | (sin cambio) | |
| `/dashboard` | SÍ | (sin cambio) | |

**Pasos:**
1. Configurar modo MONO en BD
2. Reiniciar servidor
3. Para cada fila de la tabla, verificar el redirect

**Resultado Esperado:** ✅ Todos los redirects funcionan correctamente

---

### Test 5: Header Condicional 🎨

**Objetivo:** Verificar que el Header muestra/oculta elementos según modo

**Pasos:**

**Modo MULTI:**
```sql
UPDATE config SET config_value = 'true' WHERE config_key = 'multiempresa';
```
1. Reiniciar servidor
2. Ir a `/` (sin autenticar)
3. ✅ Header debe mostrar:
   - Logo "Redpresu"
   - Enlace "Precios" (si suscripciones habilitadas)
   - Botón "Registro" (verde)
   - Enlace "Acceso"

**Modo MONO:**
```sql
UPDATE config SET config_value = 'false' WHERE config_key = 'multiempresa';
```
1. Reiniciar servidor
2. Ir a `/` (sin autenticar)
3. ✅ Header debe mostrar:
   - Logo "Redpresu"
   - Enlace "Acceso"
   - **NO** debe mostrar "Precios"
   - **NO** debe mostrar "Registro"

**Resultado Esperado:** ✅ Header se adapta correctamente

---

### Test 6: UserMenu Suscripciones 📊

**Objetivo:** Verificar que el UserMenu oculta "Suscripción" en modo MONO

**Pasos:**

**Modo MULTI:**
1. Login como admin
2. Abrir menú de usuario (icono circular arriba derecha)
3. ✅ Debe mostrar opción "Suscripción" con icono CreditCard

**Modo MONO:**
1. Login como admin
2. Abrir menú de usuario
3. ✅ **NO** debe mostrar opción "Suscripción"

**Resultado Esperado:** ✅ Menú se adapta correctamente

---

## Checklist Final

Antes de marcar Bloque 12 como completado:

- [ ] Migración 031 ejecutada en BD
- [ ] Test 1: Modo MULTI funciona ✅
- [ ] Test 2: Modo MONO funciona ✅
- [ ] Test 3: Cache se actualiza después de TTL ✅
- [ ] Test 4: Todos los redirects funcionan ✅
- [ ] Test 5: Header condicional correcto ✅
- [ ] Test 6: UserMenu condicional correcto ✅
- [ ] Sin errores en consola del servidor
- [ ] Sin errores en consola del navegador

---

## Rollback (Si es necesario)

Si algo falla, volver a modo MULTI:

```sql
UPDATE config SET config_value = 'true' WHERE config_key = 'multiempresa';
```

Luego reiniciar servidor o esperar 1 minuto.

---

## Notas

### Cache TTL
- El cache del modo dura **60 segundos** (1 minuto)
- Después de cambiar la config en BD, los cambios se ven:
  - Inmediatamente si reinicias el servidor
  - Después de 1 minuto si NO reinicias

### Función invalidateAppModeCache()
- Existe en `app-mode.ts` pero **no se usa automáticamente**
- Es para testing manual o CLI tools
- En producción, el cache se invalida solo por TTL

### Modo por Defecto
- Si la config 'multiempresa' **no existe** en BD → asume MULTI (más restrictivo)
- Si hay **error** leyendo config → asume MULTI (fail-safe)

---

**Documento creado:** 2025-11-17
**Última actualización:** 2025-11-17
**Estado:** Listo para testing
