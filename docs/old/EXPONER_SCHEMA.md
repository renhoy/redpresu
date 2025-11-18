# 🔧 Exponer Schema `redpresu` en Supabase API

## ⚠️ Problema Actual

Error: `The schema must be one of the following: public, storage, graphql_public`

**Causa:** El schema `redpresu` existe en la base de datos, pero NO está expuesto en la API REST de Supabase (PostgREST).

---

## ✅ Solución: Exponer el Schema

### **Método 1: Via SQL (RÁPIDO)**

Ejecuta esto en **Supabase Studio → SQL Editor**:

```sql
-- 1. Exponer schema redpresu en PostgREST
ALTER DATABASE postgres SET "app.settings.db_schema" = 'redpresu, public, storage';

-- 2. Reiniciar PostgREST (la configuración se aplicará automáticamente)
-- No necesitas hacer nada, Supabase lo detectará

-- 3. Verificar configuración actual
SHOW "app.settings.db_schema";
```

**Importante:** Después de ejecutar esto:
1. Espera 1-2 minutos
2. Reinicia tu servidor Next.js: `npm run dev`

---

### **Método 2: Via Configuración de Supabase (MÁS COMPLEJO)**

Si el método 1 no funciona, necesitas modificar la configuración de PostgREST:

1. Ve a **Supabase Dashboard**
2. **Settings** → **API**
3. Busca **"Exposed Schemas"** o similar
4. Añade `redpresu` a la lista
5. Guarda cambios

**Nota:** Esta opción puede no estar disponible en la UI de Supabase Cloud. En ese caso, usa el Método 1 (SQL).

---

### **Método 3: Alternativa - Crear Vistas en Schema Public (NO RECOMENDADO)**

Si no puedes exponer el schema, otra opción es crear vistas en `public` que apunten a `redpresu`:

```sql
-- Crear vistas en public que apunten a redpresu
CREATE OR REPLACE VIEW public.users AS
SELECT * FROM redpresu.users;

CREATE OR REPLACE VIEW public.tariffs AS
SELECT * FROM redpresu.tariffs;

-- Repetir para todas las tablas...
```

**Inconveniente:** Tienes que crear vistas para TODAS las tablas.

---

## 🧪 Verificar que Funcionó

Después de exponer el schema, ejecuta esto en SQL Editor:

```sql
-- Ver schemas expuestos
SHOW "app.settings.db_schema";
-- Debería incluir: redpresu, public, storage

-- Probar acceso al schema
SELECT COUNT(*) FROM redpresu.users;
-- Si funciona aquí, funcionará en la API
```

Luego reinicia tu servidor Next.js y prueba login.

---

## 🔍 Solución Alternativa Temporal (Si nada funciona)

Si no puedes exponer el schema, puedes revertir temporalmente el código para usar `public` en lugar de `redpresu`:

```typescript
// src/lib/supabase/server.ts y client.ts
db: {
  schema: "public"  // Cambiar a public temporalmente
}
```

Pero esto requiere que tus tablas estén en `public` con el prefijo `redpresu_`.

---

## 📚 Referencias

- [PostgREST Schema Isolation](https://postgrest.org/en/stable/schema_isolation.html)
- [Supabase Custom Schemas](https://supabase.com/docs/guides/api#using-custom-schemas)

---

**Fecha:** 2025-01-29
**Error Code:** PGRST106
**Related Commit:** 81aad92
