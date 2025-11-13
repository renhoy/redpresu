-- ============================================
-- Migración 000: Crear Schema redpresu
-- ============================================
-- Esta migración debe ejecutarse ANTES de cualquier otra
-- Crea el schema 'redpresu' y mueve todas las tablas desde public
--
-- Fecha: 2025-01-29
-- IMPORTANTE: Ejecutar en Supabase Studio (SQL Editor)
-- ============================================

BEGIN;

-- 1. Crear schema redpresu si no existe
CREATE SCHEMA IF NOT EXISTS redpresu;

-- 2. Otorgar permisos al schema
GRANT USAGE ON SCHEMA redpresu TO postgres, anon, authenticated, service_role;
GRANT ALL ON SCHEMA redpresu TO postgres, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA redpresu TO postgres, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA redpresu TO postgres, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA redpresu TO postgres, service_role;

-- Permisos por defecto para objetos futuros
ALTER DEFAULT PRIVILEGES IN SCHEMA redpresu GRANT ALL ON TABLES TO postgres, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA redpresu GRANT ALL ON SEQUENCES TO postgres, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA redpresu GRANT ALL ON FUNCTIONS TO postgres, service_role;

-- 3. Mover todas las tablas con prefijo redpresu_ desde public a redpresu (sin prefijo)
DO $$
DECLARE
    table_record RECORD;
    old_name TEXT;
    new_name TEXT;
BEGIN
    FOR table_record IN
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename LIKE 'redpresu_%'
    LOOP
        old_name := table_record.tablename;
        new_name := REPLACE(old_name, 'redpresu_', '');

        -- Mover y renombrar tabla
        EXECUTE format('ALTER TABLE public.%I SET SCHEMA redpresu', old_name);
        EXECUTE format('ALTER TABLE redpresu.%I RENAME TO %I', old_name, new_name);

        RAISE NOTICE 'Movida: public.% → redpresu.%', old_name, new_name;
    END LOOP;
END $$;

-- 4. Mover políticas RLS
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN
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
        WHERE schemaname = 'public'
        AND tablename LIKE 'redpresu_%'
    LOOP
        -- Las políticas se mueven automáticamente con las tablas
        RAISE NOTICE 'Política movida: %.% - %',
            policy_record.schemaname,
            policy_record.tablename,
            policy_record.policyname;
    END LOOP;
END $$;

-- 5. Actualizar search_path (opcional, para facilitar acceso)
-- NOTA: Esto es opcional y puede no ser necesario si usas schema explícito en queries
-- ALTER DATABASE postgres SET search_path TO redpresu, public;

COMMIT;

-- ============================================
-- VERIFICACIÓN
-- ============================================
-- Ejecutar estas queries para verificar:

-- Ver tablas en schema redpresu:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'redpresu';

-- Ver políticas RLS:
-- SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname = 'redpresu';

-- Contar registros (ejemplo):
-- SELECT COUNT(*) FROM redpresu.users;

-- ============================================
-- ROLLBACK (SI NECESITAS REVERTIR)
-- ============================================
-- PRECAUCIÓN: Esto revierte TODO el cambio
--
-- BEGIN;
--
-- -- Mover tablas de vuelta a public con prefijo
-- DO $$
-- DECLARE
--     table_record RECORD;
--     old_name TEXT;
--     new_name TEXT;
-- BEGIN
--     FOR table_record IN
--         SELECT tablename
--         FROM pg_tables
--         WHERE schemaname = 'redpresu'
--     LOOP
--         old_name := table_record.tablename;
--         new_name := 'redpresu_' || old_name;
--
--         EXECUTE format('ALTER TABLE redpresu.%I SET SCHEMA public', old_name);
--         EXECUTE format('ALTER TABLE public.%I RENAME TO %I', old_name, new_name);
--
--         RAISE NOTICE 'Revertida: redpresu.% → public.%', old_name, new_name;
--     END LOOP;
-- END $$;
--
-- -- Eliminar schema
-- DROP SCHEMA IF EXISTS redpresu CASCADE;
--
-- COMMIT;
