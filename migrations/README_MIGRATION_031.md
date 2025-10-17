# 🔄 Migración 031: Unificación de Nomenclatura a Inglés

## ⚠️ IMPORTANTE - LEER ANTES DE EJECUTAR

Esta migración realiza cambios **MASIVOS** en la base de datos:
- Renombra **8 tablas** con prefijo `redpresu_`
- Renombra **4 campos** a inglés
- Actualiza **3 funciones SQL**
- Recrea **8 políticas RLS**

**TODO EL CÓDIGO TYPESCRIPT YA ESTÁ ACTUALIZADO** ✅

---

## 📋 Checklist Pre-Migración

- [ ] **BACKUP COMPLETO** de la base de datos
- [ ] Verificar que NO hay usuarios activos en el sistema
- [ ] Tener acceso de superadmin a Supabase
- [ ] Revisar el archivo de migración completo

---

## 🗂️ Cambios en Tablas

### Tablas Renombradas (prefijo redpresu_):

| Antes | Después |
|-------|---------|
| `tariffs` | `redpresu_tariffs` |
| `budgets` | `redpresu_budgets` |
| `users` | `redpresu_users` |
| `issuers` | `redpresu_issuers` |
| `empresas` | `redpresu_companies` |
| `config` | `redpresu_config` |
| `budget_versions` | `redpresu_budget_versions` |
| `budget_notes` | `redpresu_budget_notes` |

---

## 🔧 Cambios en Campos

### budget_versions:
- `total_pagar` → `total_pay`

### budgets:
- `empresa_id` → `company_id`
- `total_pagar` → `total_pay`
- `re_aplica` → `re_apply`

### empresas (ahora redpresu_companies):
- `nombre` → `name`

### tariffs:
- `empresa_id` → `company_id`

---

## ⚙️ Funciones SQL Actualizadas

1. **`get_next_budget_version_number()`**
   - Ahora consulta `redpresu_budgets`

2. **`get_user_empresa_id()`**
   - Ahora consulta `redpresu_users.company_id`
   - **Mantiene el nombre** para compatibilidad con políticas RLS

3. **`get_user_role_by_id()`**
   - Ahora consulta `redpresu_users`

---

## 🔒 Políticas RLS Recreadas

### redpresu_tariffs (4 políticas):
- `tariffs_select_policy`: usuarios de la misma empresa
- `tariffs_insert_policy`: usuarios autenticados en su empresa
- `tariffs_update_policy`: creador o admin/superadmin
- `tariffs_delete_policy`: solo admin/superadmin

### redpresu_budgets (4 políticas):
- `budgets_select_policy`: usuarios de la misma empresa o superadmin
- `budgets_insert_policy`: usuarios autenticados
- `budgets_update_policy`: creador o admin/superadmin
- `budgets_delete_policy`: admin/superadmin de la empresa

---

## 🚀 Cómo Ejecutar la Migración

### Opción 1: Supabase SQL Editor (Recomendado)

1. Accede a tu proyecto en Supabase
2. Ve a **SQL Editor**
3. Abre el archivo `EJECUTAR_031_rename_tables_and_fields_to_english.sql`
4. Copia TODO el contenido
5. Pégalo en el editor
6. Haz clic en **Run**

### Opción 2: psql (Comando)

```bash
psql -d <tu_database_url> -f migrations/EJECUTAR_031_rename_tables_and_fields_to_english.sql
```

---

## ✅ Verificación Post-Migración

### 1. Verificar tablas renombradas:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE 'redpresu_%'
ORDER BY table_name;
```

**Esperado:** 8 tablas con prefijo `redpresu_`

### 2. Verificar campos renombrados:

```sql
-- Verificar company_id en budgets
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'redpresu_budgets'
  AND column_name = 'company_id';

-- Verificar total_pay en budgets
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'redpresu_budgets'
  AND column_name = 'total_pay';
```

### 3. Verificar funciones:

```sql
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('get_user_empresa_id', 'get_user_role_by_id', 'get_next_budget_version_number');
```

**Esperado:** 3 funciones

### 4. Verificar políticas RLS:

```sql
SELECT tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('redpresu_tariffs', 'redpresu_budgets')
ORDER BY tablename, policyname;
```

**Esperado:** 8 políticas (4 por tabla)

---

## 🧪 Testing Post-Migración

### 1. Verificar Login:
- [ ] Login como superadmin funciona
- [ ] Login como admin funciona
- [ ] Login como vendedor funciona

### 2. Verificar Tarifas:
- [ ] Listar tarifas funciona
- [ ] Crear tarifa funciona
- [ ] Editar tarifa funciona
- [ ] Eliminar tarifa funciona

### 3. Verificar Presupuestos:
- [ ] Listar presupuestos funciona
- [ ] Crear presupuesto funciona
- [ ] Editar presupuesto funciona
- [ ] Generar PDF funciona

### 4. Verificar Config:
- [ ] `/settings` carga correctamente
- [ ] Editar config funciona
- [ ] Botón ojo en `default_empresa_id` funciona

---

## 🔄 Rollback (Si es necesario)

Si algo sale mal, ejecuta el rollback comentado al final del archivo de migración:

```sql
BEGIN;

-- PASO 1: Renombrar tablas a nombres originales
ALTER TABLE public.redpresu_config RENAME TO config;
ALTER TABLE public.redpresu_companies RENAME TO empresas;
ALTER TABLE public.redpresu_users RENAME TO users;
ALTER TABLE public.redpresu_issuers RENAME TO issuers;
ALTER TABLE public.redpresu_tariffs RENAME TO tariffs;
ALTER TABLE public.redpresu_budgets RENAME TO budgets;
ALTER TABLE public.redpresu_budget_versions RENAME TO budget_versions;
ALTER TABLE public.redpresu_budget_notes RENAME TO budget_notes;

-- PASO 2: Renombrar campos a nombres originales
ALTER TABLE public.budget_versions RENAME COLUMN total_pay TO total_pagar;
ALTER TABLE public.budgets RENAME COLUMN company_id TO empresa_id;
ALTER TABLE public.budgets RENAME COLUMN total_pay TO total_pagar;
ALTER TABLE public.budgets RENAME COLUMN re_apply TO re_aplica;
ALTER TABLE public.empresas RENAME COLUMN name TO nombre;
ALTER TABLE public.tariffs RENAME COLUMN company_id TO empresa_id;

COMMIT;
```

⚠️ **IMPORTANTE:** Después del rollback, debes revertir también el código TypeScript:
```bash
git revert 9326ad8
```

---

## 📞 Soporte

Si encuentras problemas:
1. **NO HAGAS MÁS CAMBIOS** en la BD
2. Documenta el error exacto
3. Verifica los logs de Supabase
4. Considera hacer rollback

---

## ✨ Beneficios Post-Migración

- ✅ Nomenclatura consistente en inglés
- ✅ Prefijo `redpresu_` evita conflictos con otras apps
- ✅ Código más mantenible y profesional
- ✅ Mejor compatibilidad con ORMs y herramientas
- ✅ Facilita onboarding de nuevos desarrolladores

---

**Fecha de Migración:** 2025-01-17
**Versión:** 031
**Estado:** ✅ Código TypeScript actualizado, listo para migración SQL
