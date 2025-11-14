-- ============================================
-- Diagnóstico completo: Buscar TODAS las referencias
-- ============================================
-- Ejecuta cada sección por separado si hay errores
-- ============================================

-- ============================================
-- SECCIÓN 1: TRIGGERS
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '=== BUSCANDO TRIGGERS ===';
END $$;

SELECT
    'TRIGGER' as tipo,
    n.nspname || '.' || c.relname as ubicacion,
    t.tgname as nombre,
    LEFT(pg_get_triggerdef(t.oid), 200) as definicion_preview
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE NOT t.tgisinternal
  AND pg_get_triggerdef(t.oid) ILIKE '%companies%'
ORDER BY n.nspname, c.relname, t.tgname;

-- ============================================
-- SECCIÓN 2: FUNCIONES
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '=== BUSCANDO FUNCIONES ===';
END $$;

SELECT
    'FUNCTION' as tipo,
    n.nspname as schema,
    p.proname as nombre,
    LEFT(pg_get_functiondef(p.oid), 200) as definicion_preview
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE pg_get_functiondef(p.oid) ILIKE '%companies%'
ORDER BY n.nspname, p.proname;

-- ============================================
-- SECCIÓN 3: POLÍTICAS RLS
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '=== BUSCANDO POLÍTICAS RLS ===';
END $$;

SELECT
    'RLS POLICY' as tipo,
    schemaname,
    tablename,
    policyname as nombre,
    cmd as comando,
    LEFT(COALESCE(qual::text, 'NULL'), 100) as qual_preview
FROM pg_policies
WHERE schemaname = 'redpresu'
  AND (COALESCE(qual::text, '') ILIKE '%companies%'
       OR COALESCE(with_check::text, '') ILIKE '%companies%')
ORDER BY schemaname, tablename, policyname;

-- ============================================
-- SECCIÓN 4: FOREIGN KEYS
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '=== BUSCANDO FOREIGN KEYS ===';
END $$;

SELECT
    'FOREIGN KEY' as tipo,
    tc.table_schema,
    tc.table_name,
    tc.constraint_name as nombre,
    kcu.column_name as columna,
    ccu.table_schema || '.' || ccu.table_name as tabla_referenciada
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'redpresu'
  AND tc.table_name = 'users'
  AND kcu.column_name = 'company_id'
ORDER BY tc.table_schema, tc.table_name, tc.constraint_name;

-- ============================================
-- SECCIÓN 5: VIEWS
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '=== BUSCANDO VIEWS ===';
END $$;

SELECT
    'VIEW' as tipo,
    schemaname,
    viewname as nombre,
    LEFT(definition, 150) as definicion_preview
FROM pg_views
WHERE definition ILIKE '%companies%'
  AND schemaname IN ('redpresu', 'public')
ORDER BY schemaname, viewname;

-- ============================================
-- SECCIÓN 6: VERIFICAR TABLA COMPANIES
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '=== VERIFICANDO TABLA COMPANIES ===';
END $$;

-- Ver si existe public.redpresu_companies (NO debería existir)
SELECT
    'TABLE CHECK' as tipo,
    schemaname,
    tablename,
    'TABLA ANTIGUA - DEBE SER ELIMINADA' as nota
FROM pg_tables
WHERE tablename = 'redpresu_companies'
  AND schemaname = 'public';

-- Ver si existe redpresu.companies (SÍ debe existir)
SELECT
    'TABLE CHECK' as tipo,
    schemaname,
    tablename,
    'TABLA NUEVA - OK' as nota
FROM pg_tables
WHERE tablename = 'companies'
  AND schemaname = 'redpresu';

-- ============================================
-- RESUMEN FINAL
-- ============================================
DO $$
DECLARE
    trigger_count INTEGER;
    function_count INTEGER;
    policy_count INTEGER;
BEGIN
    RAISE NOTICE '=== RESUMEN ===';

    -- Contar triggers problemáticos
    SELECT COUNT(*) INTO trigger_count
    FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE NOT t.tgisinternal
      AND pg_get_triggerdef(t.oid) ILIKE '%companies%';

    RAISE NOTICE 'Triggers encontrados: %', trigger_count;

    -- Contar funciones problemáticas
    SELECT COUNT(*) INTO function_count
    FROM pg_proc p
    WHERE pg_get_functiondef(p.oid) ILIKE '%companies%';

    RAISE NOTICE 'Funciones encontradas: %', function_count;

    -- Contar políticas problemáticas
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE schemaname = 'redpresu'
      AND (COALESCE(qual::text, '') ILIKE '%companies%'
           OR COALESCE(with_check::text, '') ILIKE '%companies%');

    RAISE NOTICE 'Políticas RLS encontradas: %', policy_count;
END $$;
