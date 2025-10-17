-- ============================================
-- DIAGNÓSTICO: Estado actual de la migración 031
-- ============================================
-- Ejecuta estas queries en Supabase para ver qué se aplicó
-- y qué falta por aplicar
-- ============================================

-- 1. ¿Qué tablas existen con prefijo redpresu_?
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND (table_name LIKE 'redpresu_%' OR table_name IN ('config', 'empresas', 'users', 'issuers', 'tariffs', 'budgets', 'budget_versions', 'budget_notes'))
ORDER BY table_name;

-- Esperado:
-- ✅ redpresu_budget_notes
-- ✅ redpresu_budget_versions
-- ✅ redpresu_budgets
-- ✅ redpresu_companies
-- ✅ redpresu_config
-- ✅ redpresu_issuers
-- ✅ redpresu_tariffs
-- ✅ redpresu_users

-- 2. ¿Existe el campo company_id en redpresu_users?
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'redpresu_users'
  AND column_name IN ('company_id', 'empresa_id')
ORDER BY column_name;

-- Esperado: company_id (integer)
-- Si sale empresa_id = FALTA RENOMBRAR

-- 3. ¿Existe el campo company_id en redpresu_budgets?
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'redpresu_budgets'
  AND column_name IN ('company_id', 'empresa_id')
ORDER BY column_name;

-- Esperado: company_id (integer)

-- 4. ¿Existe el campo company_id en redpresu_tariffs?
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'redpresu_tariffs'
  AND column_name IN ('company_id', 'empresa_id')
ORDER BY column_name;

-- Esperado: company_id (integer)

-- 5. ¿Existe el campo company_id en redpresu_issuers?
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'redpresu_issuers'
  AND column_name IN ('company_id', 'empresa_id')
ORDER BY column_name;

-- Esperado: company_id (integer)

-- 6. ¿Existe el campo total_pay en redpresu_budgets?
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'redpresu_budgets'
  AND column_name IN ('total_pay', 'total_pagar')
ORDER BY column_name;

-- Esperado: total_pay (numeric)

-- 7. ¿Existe el campo re_apply en redpresu_budgets?
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'redpresu_budgets'
  AND column_name IN ('re_apply', 're_aplica')
ORDER BY column_name;

-- Esperado: re_apply (boolean)

-- 8. ¿Existe el campo name en redpresu_companies?
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'redpresu_companies'
  AND column_name IN ('name', 'nombre')
ORDER BY column_name;

-- Esperado: name (text)

-- 9. ¿Existen las funciones SQL?
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('get_user_empresa_id', 'get_user_role_by_id', 'get_next_budget_version_number')
ORDER BY routine_name;

-- Esperado: 3 funciones

-- 10. ¿Existen las políticas RLS?
SELECT tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('redpresu_users', 'redpresu_tariffs', 'redpresu_budgets')
ORDER BY tablename, policyname;

-- Esperado: 12 políticas (4 por tabla)

-- ============================================
-- RESUMEN DE DIAGNÓSTICO
-- ============================================
-- Ejecuta todas las queries anteriores y anota los resultados.
-- Compara con lo esperado para saber qué falta aplicar.
