-- ============================================
-- Diagnóstico completo: Buscar TODAS las referencias
-- ============================================

-- 1. Buscar en triggers
SELECT
    'TRIGGER' as tipo,
    n.nspname || '.' || c.relname as ubicacion,
    t.tgname as nombre,
    pg_get_triggerdef(t.oid) as definicion
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE NOT t.tgisinternal
  AND pg_get_triggerdef(t.oid) ILIKE '%companies%'
ORDER BY n.nspname, c.relname, t.tgname;

-- 2. Buscar en funciones
SELECT
    'FUNCTION' as tipo,
    n.nspname as ubicacion,
    p.proname as nombre,
    pg_get_functiondef(p.oid) as definicion
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE pg_get_functiondef(p.oid) ILIKE '%companies%'
ORDER BY n.nspname, p.proname;

-- 3. Buscar en políticas RLS
SELECT
    'RLS POLICY' as tipo,
    schemaname || '.' || tablename as ubicacion,
    policyname as nombre,
    'qual: ' || COALESCE(qual::text, 'NULL') || ', with_check: ' || COALESCE(with_check::text, 'NULL') as definicion
FROM pg_policies
WHERE schemaname = 'redpresu'
  AND (COALESCE(qual::text, '') ILIKE '%companies%'
       OR COALESCE(with_check::text, '') ILIKE '%companies%')
ORDER BY schemaname, tablename, policyname;

-- 4. Buscar en foreign keys
SELECT
    'FOREIGN KEY' as tipo,
    tc.table_schema || '.' || tc.table_name as ubicacion,
    tc.constraint_name as nombre,
    'Column: ' || kcu.column_name || ' -> ' || ccu.table_schema || '.' || ccu.table_name || '.' || ccu.column_name as definicion
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND (tc.table_name ILIKE '%companies%'
       OR ccu.table_name ILIKE '%companies%')
ORDER BY tc.table_schema, tc.table_name, tc.constraint_name;

-- 5. Buscar en views
SELECT
    'VIEW' as tipo,
    schemaname || '.' || viewname as ubicacion,
    viewname as nombre,
    LEFT(definition, 100) as definicion
FROM pg_views
WHERE definition ILIKE '%companies%'
ORDER BY schemaname, viewname;

-- 6. Ver estructura actual de la tabla users
SELECT
    'TABLE COLUMN' as tipo,
    'redpresu.users' as ubicacion,
    column_name as nombre,
    data_type || COALESCE(' REFERENCES ' ||
        (SELECT ccu.table_schema || '.' || ccu.table_name
         FROM information_schema.table_constraints tc
         JOIN information_schema.constraint_column_usage ccu
           ON tc.constraint_name = ccu.constraint_name
         WHERE tc.table_schema = 'redpresu'
           AND tc.table_name = 'users'
           AND tc.constraint_type = 'FOREIGN KEY'
           AND column_name = c.column_name
         LIMIT 1), '') as definicion
FROM information_schema.columns c
WHERE table_schema = 'redpresu'
  AND table_name = 'users'
  AND column_name = 'company_id';
