# 🔄 Guía: Migración a Schema `redpresu`

## ⚠️ IMPORTANTE: Error Actual

Tu aplicación está mostrando este error:
```
The schema must be one of the following: public, storage, graphql_public
relation "public.users" does not exist
```

**Causa:** El código ya está configurado para usar `schema: 'redpresu'`, pero ese schema **NO existe** en tu base de datos Supabase.

---

## 📋 Pasos para Solucionar

### **PASO 1: Crear Schema en Supabase** ✅ HACER PRIMERO

1. Abre [Supabase Studio](https://supabase.com/dashboard)
2. Selecciona tu proyecto
3. Ve a **SQL Editor**
4. Abre el archivo: `docs/migrations/000_create_schema_redpresu.sql`
5. Copia **TODO** el contenido
6. Pégalo en el SQL Editor
7. Haz clic en **Run** (o presiona `Ctrl/Cmd + Enter`)

**¿Qué hace esta migración?**
- Crea el schema `redpresu`
- Mueve todas las tablas `public.redpresu_*` a `redpresu.*` (sin prefijo)
- Mueve automáticamente las políticas RLS
- Otorga permisos necesarios

**Ejemplo de lo que sucede:**
```
public.redpresu_users       → redpresu.users
public.redpresu_tariffs     → redpresu.tariffs
public.redpresu_budgets     → redpresu.budgets
public.redpresu_companies   → redpresu.companies
... (todas las tablas)
```

---

### **PASO 2: Verificar que Funcionó**

Ejecuta estas queries en el SQL Editor para confirmar:

```sql
-- 1. Ver schema creado
SELECT schema_name
FROM information_schema.schemata
WHERE schema_name = 'redpresu';
-- Debe devolver: redpresu

-- 2. Ver tablas en el schema
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'redpresu'
ORDER BY table_name;
-- Debe listar: users, tariffs, budgets, companies, etc.

-- 3. Contar usuarios (ejemplo)
SELECT COUNT(*) FROM redpresu.users;
-- Debe devolver el número de usuarios que tenías

-- 4. Verificar políticas RLS
SELECT tablename, policyname
FROM pg_policies
WHERE schemaname = 'redpresu'
ORDER BY tablename;
-- Debe listar todas las políticas RLS
```

---

### **PASO 3: Aplicar Migraciones Pendientes**

Ahora aplica las migraciones pendientes del registro:

#### **Migración 046_b: Añadir campo password**
```bash
# Archivo: docs/migrations/046_b_add_password_to_tokens.sql
```
Copia y ejecuta en SQL Editor.

#### **Migración 046_c: Eliminar campo last_name**
```bash
# Archivo: docs/migrations/046_c_remove_last_name_from_tokens.sql
```
Copia y ejecuta en SQL Editor.

---

### **PASO 4: Reiniciar Servidor de Desarrollo**

Una vez aplicadas las migraciones en Supabase:

```bash
# Detén el servidor (Ctrl+C)
npm run dev
```

---

## 🔍 Solución de Problemas

### Error: "Ya existen tablas en schema redpresu"

Si ya intentaste crear el schema manualmente antes, ejecuta esto primero:

```sql
-- Ver qué tablas existen
SELECT tablename FROM pg_tables WHERE schemaname = 'redpresu';

-- Si están con prefijo, la migración las renombrará correctamente
-- Si están SIN prefijo, la migración las saltará (ya están bien)
```

---

### Error: "Permission denied for schema redpresu"

Ejecuta estos comandos para otorgar permisos:

```sql
GRANT USAGE ON SCHEMA redpresu TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA redpresu TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA redpresu TO anon, authenticated, service_role;
```

---

### Error: "No existe la tabla redpresu_users en public"

Si tus tablas ya estaban sin prefijo en `public`:

1. **Opción A:** Renombrar manualmente con prefijo primero
   ```sql
   ALTER TABLE public.users RENAME TO redpresu_users;
   -- Repetir para todas las tablas
   ```

2. **Opción B:** Modificar la migración 000 para mover tablas sin prefijo
   ```sql
   -- Reemplazar el loop en la migración con:
   ALTER TABLE public.users SET SCHEMA redpresu;
   ALTER TABLE public.tariffs SET SCHEMA redpresu;
   -- etc.
   ```

---

## 📊 Estado Actual del Código

El código ya está listo para usar `schema: 'redpresu'`:

✅ `src/lib/supabase/server.ts` - schema configurado
✅ `src/lib/supabase/client.ts` - schema configurado
✅ 306 queries actualizadas - sin prefijos
✅ Joins corregidos - propiedades actualizadas
✅ Scripts auxiliares - actualizados

**Solo falta la base de datos en Supabase.**

---

## 🎯 Resumen

1. ✅ **Ejecutar:** `docs/migrations/000_create_schema_redpresu.sql` en Supabase
2. ✅ **Verificar:** Queries de verificación
3. ✅ **Aplicar:** Migraciones 046_b y 046_c
4. ✅ **Reiniciar:** `npm run dev`
5. ✅ **Probar:** Login y operaciones básicas

---

## 🆘 Si Sigues con Problemas

Si después de ejecutar la migración sigues viendo errores:

1. **Comparte el output** de estas queries:
   ```sql
   \dn  -- Listar schemas
   \dt redpresu.*  -- Listar tablas en redpresu
   SELECT * FROM pg_policies WHERE schemaname = 'redpresu' LIMIT 5;
   ```

2. **Verifica las variables de entorno:**
   ```bash
   # .env.local
   NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key
   ```

3. **Revisa los logs** del servidor Next.js

---

**Archivo creado:** `2025-01-29`
**Commit relacionado:** `401bd78`
