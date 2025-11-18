-- ============================================
-- Fix: Actualizar referencias a public.redpresu_companies
-- ============================================
-- Este script encuentra y recrea funciones que referencian
-- la tabla antigua public.redpresu_companies
-- ============================================

BEGIN;

-- 1. Buscar y listar funciones problemáticas
DO $$
DECLARE
    func_record RECORD;
    old_def TEXT;
    new_def TEXT;
BEGIN
    RAISE NOTICE 'Buscando funciones que referencian public.redpresu_companies...';

    FOR func_record IN
        SELECT
            n.nspname AS schema_name,
            p.proname AS function_name,
            pg_get_functiondef(p.oid) AS function_def
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE pg_get_functiondef(p.oid) ILIKE '%public.redpresu_companies%'
           OR pg_get_functiondef(p.oid) ILIKE '%redpresu_companies%'
    LOOP
        RAISE NOTICE 'Encontrada: %.%', func_record.schema_name, func_record.function_name;
        RAISE NOTICE 'Definición: %', func_record.function_def;
    END LOOP;
END $$;

-- 2. Buscar triggers problemáticos
DO $$
DECLARE
    trigger_record RECORD;
BEGIN
    RAISE NOTICE 'Buscando triggers que referencian public.redpresu_companies...';

    FOR trigger_record IN
        SELECT
            t.tgname AS trigger_name,
            c.relname AS table_name,
            n.nspname AS schema_name,
            pg_get_triggerdef(t.oid) AS trigger_def
        FROM pg_trigger t
        JOIN pg_class c ON t.tgrelid = c.oid
        JOIN pg_namespace n ON c.relnamespace = n.oid
        WHERE pg_get_triggerdef(t.oid) ILIKE '%redpresu_companies%'
          AND NOT t.tgisinternal
    LOOP
        RAISE NOTICE 'Encontrado: %.% en %.%',
            trigger_record.schema_name,
            trigger_record.trigger_name,
            trigger_record.schema_name,
            trigger_record.table_name;
        RAISE NOTICE 'Definición: %', trigger_record.trigger_def;
    END LOOP;
END $$;

-- 3. Actualizar foreign keys si existen
DO $$
DECLARE
    fk_record RECORD;
BEGIN
    RAISE NOTICE 'Buscando foreign keys que referencian redpresu_companies...';

    FOR fk_record IN
        SELECT
            tc.constraint_name,
            tc.table_schema,
            tc.table_name,
            kcu.column_name,
            ccu.table_name AS foreign_table_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND (ccu.table_name = 'redpresu_companies' OR tc.table_name = 'redpresu_companies')
    LOOP
        RAISE NOTICE 'FK encontrada: % en %.% referenciando %',
            fk_record.constraint_name,
            fk_record.table_schema,
            fk_record.table_name,
            fk_record.foreign_table_name;

        -- Si la FK apunta a redpresu_companies en public, necesita recrearse
        IF fk_record.foreign_table_name = 'redpresu_companies' THEN
            RAISE NOTICE 'Esta FK necesita actualizarse manualmente';
        END IF;
    END LOOP;
END $$;

COMMIT;

-- ============================================
-- Instrucciones
-- ============================================
-- 1. Ejecuta este script en Supabase SQL Editor
-- 2. Revisa los NOTICE en los logs para ver qué se encontró
-- 3. Para cada función/trigger encontrado, necesitarás:
--    a) Guardar su definición
--    b) Borrarla con CASCADE si es necesario
--    c) Recrearla con las referencias correctas a redpresu.companies
-- ============================================
