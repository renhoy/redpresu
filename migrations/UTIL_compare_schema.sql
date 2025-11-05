-- ============================================
-- SCRIPT DE COMPARACIÓN DE SCHEMA
-- ============================================
-- INSTRUCCIONES:
-- 1. Ejecuta este script en BASE DE DATOS 1 (ej: Desarrollo)
-- 2. Copia el resultado completo
-- 3. Ejecuta este script en BASE DE DATOS 2 (ej: Producción)
-- 4. Copia el resultado completo
-- 5. Usa un diff tool (VSCode, diff, meld) para comparar ambos resultados
-- ============================================

-- ============================================
-- 1. TABLAS EXISTENTES
-- ============================================
SELECT
  '=== TABLAS ===' as seccion,
  table_name,
  null as detalle,
  null as extra
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE 'redpresu_%'
ORDER BY table_name;

-- ============================================
-- 2. COLUMNAS DE CADA TABLA
-- ============================================
SELECT
  '=== COLUMNAS ===' as seccion,
  table_name,
  column_name || ' ' || data_type ||
    CASE
      WHEN character_maximum_length IS NOT NULL
      THEN '(' || character_maximum_length || ')'
      ELSE ''
    END ||
    CASE
      WHEN is_nullable = 'NO' THEN ' NOT NULL'
      ELSE ' NULLABLE'
    END as detalle,
  column_default as extra
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name LIKE 'redpresu_%'
ORDER BY table_name, ordinal_position;

-- ============================================
-- 3. PRIMARY KEYS
-- ============================================
SELECT
  '=== PRIMARY KEYS ===' as seccion,
  tc.table_name,
  string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) as detalle,
  tc.constraint_name as extra
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
WHERE tc.constraint_type = 'PRIMARY KEY'
  AND tc.table_schema = 'public'
  AND tc.table_name LIKE 'redpresu_%'
GROUP BY tc.table_name, tc.constraint_name
ORDER BY tc.table_name;

-- ============================================
-- 4. FOREIGN KEYS
-- ============================================
SELECT
  '=== FOREIGN KEYS ===' as seccion,
  tc.table_name,
  kcu.column_name || ' -> ' || ccu.table_name || '(' || ccu.column_name || ')' as detalle,
  tc.constraint_name as extra
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND tc.table_name LIKE 'redpresu_%'
ORDER BY tc.table_name, kcu.column_name;

-- ============================================
-- 5. ÍNDICES
-- ============================================
SELECT
  '=== INDICES ===' as seccion,
  tablename as table_name,
  indexname as detalle,
  indexdef as extra
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename LIKE 'redpresu_%'
ORDER BY tablename, indexname;

-- ============================================
-- 6. POLÍTICAS RLS
-- ============================================
SELECT
  '=== RLS POLICIES ===' as seccion,
  tablename as table_name,
  policyname as detalle,
  cmd || ' | ' || qual as extra
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename LIKE 'redpresu_%'
ORDER BY tablename, policyname;

-- ============================================
-- 7. RLS HABILITADO EN TABLAS
-- ============================================
SELECT
  '=== RLS ENABLED ===' as seccion,
  c.relname as table_name,
  CASE
    WHEN c.relrowsecurity THEN 'RLS ENABLED'
    ELSE 'RLS DISABLED'
  END as detalle,
  null as extra
FROM pg_class c
WHERE c.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  AND c.relkind = 'r'
  AND c.relname LIKE 'redpresu_%'
ORDER BY c.relname;

-- ============================================
-- 8. VALORES EN redpresu_config (KEYS)
-- ============================================
SELECT
  '=== CONFIG KEYS ===' as seccion,
  'redpresu_config' as table_name,
  key as detalle,
  category || ' | system=' || is_system::text as extra
FROM public.redpresu_config
ORDER BY category, key;

-- ============================================
-- 9. CONTEO DE REGISTROS
-- ============================================
-- NOTA: Esto requiere consultas dinámicas, hacerlo manual:

SELECT '=== RECORD COUNTS ===' as info;

SELECT 'redpresu_budgets' as table_name, COUNT(*) as records FROM public.redpresu_budgets
UNION ALL
SELECT 'redpresu_config', COUNT(*) FROM public.redpresu_config
UNION ALL
SELECT 'redpresu_subscriptions', COUNT(*) FROM public.redpresu_subscriptions
UNION ALL
SELECT 'redpresu_tariffs', COUNT(*) FROM public.redpresu_tariffs
ORDER BY table_name;

-- ============================================
-- 10. RESUMEN FINAL
-- ============================================
SELECT
  '=== RESUMEN ===' as seccion,
  'Total tablas redpresu_*' as table_name,
  COUNT(*)::text as detalle,
  null as extra
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE 'redpresu_%';

-- ============================================
-- FIN DEL SCRIPT
-- ============================================
