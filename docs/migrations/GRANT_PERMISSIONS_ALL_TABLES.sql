-- ============================================
-- DAR PERMISOS A TODAS LAS TABLAS EN PUBLIC
-- ============================================
-- Propósito: Dar permisos completos a service_role en todas las tablas
--            para que supabaseAdmin pueda acceder a ellas
--
-- EJECUTAR EN: Supabase Cloud → SQL Editor
-- ============================================

BEGIN;

-- ============================================
-- PASO 1: Dar permisos a service_role en TODAS las tablas existentes
-- ============================================

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- ============================================
-- PASO 2: Configurar permisos por defecto para tablas FUTURAS
-- ============================================

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;

-- ============================================
-- PASO 3: Dar permisos a authenticated (usuarios autenticados)
-- ============================================

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO authenticated;

-- ============================================
-- PASO 4: Dar permisos a anon (usuarios anónimos - solo lectura)
-- ============================================

GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

-- ============================================
-- PASO 5: Verificar que se aplicaron los permisos
-- ============================================

-- Mostrar todas las tablas y sus permisos para service_role
SELECT DISTINCT
    t.tablename,
    CASE
        WHEN EXISTS (
            SELECT 1
            FROM information_schema.role_table_grants
            WHERE table_schema = 'public'
            AND table_name = t.tablename
            AND grantee = 'service_role'
        ) THEN '✅ SI'
        ELSE '❌ NO'
    END as tiene_permisos_service_role
FROM pg_tables t
WHERE t.schemaname = 'public'
ORDER BY t.tablename;

-- Contar cuántas tablas tienen permisos
DO $$
DECLARE
    total_tables INTEGER;
    tables_with_perms INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_tables
    FROM pg_tables
    WHERE schemaname = 'public';

    SELECT COUNT(DISTINCT table_name) INTO tables_with_perms
    FROM information_schema.role_table_grants
    WHERE table_schema = 'public'
    AND grantee = 'service_role';

    RAISE NOTICE '========================================';
    RAISE NOTICE 'Total de tablas en public: %', total_tables;
    RAISE NOTICE 'Tablas con permisos service_role: %', tables_with_perms;

    IF total_tables = tables_with_perms THEN
        RAISE NOTICE '✅ TODOS LOS PERMISOS CONFIGURADOS CORRECTAMENTE';
    ELSE
        RAISE WARNING '⚠️  Faltan % tablas por configurar', (total_tables - tables_with_perms);
    END IF;
    RAISE NOTICE '========================================';
END $$;

COMMIT;
