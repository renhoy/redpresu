-- Script para encontrar referencias a la tabla antigua redpresu_companies

-- 1. Buscar triggers que referencian redpresu_companies
SELECT
  t.tgname AS trigger_name,
  c.relname AS table_name,
  pg_get_triggerdef(t.oid) AS trigger_definition
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE pg_get_triggerdef(t.oid) ILIKE '%redpresu_companies%'
ORDER BY c.relname, t.tgname;

-- 2. Buscar foreign keys que referencian redpresu_companies
SELECT
  tc.constraint_name,
  tc.table_schema,
  tc.table_name,
  kcu.column_name,
  ccu.table_schema AS foreign_table_schema,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND (ccu.table_name = 'redpresu_companies' OR tc.table_name = 'redpresu_companies');

-- 3. Buscar funciones que referencian redpresu_companies
SELECT
  n.nspname AS schema_name,
  p.proname AS function_name,
  pg_get_functiondef(p.oid) AS function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE pg_get_functiondef(p.oid) ILIKE '%redpresu_companies%'
ORDER BY schema_name, function_name;

-- 4. Buscar políticas RLS que referencian redpresu_companies
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE qual::text ILIKE '%redpresu_companies%'
   OR with_check::text ILIKE '%redpresu_companies%';
