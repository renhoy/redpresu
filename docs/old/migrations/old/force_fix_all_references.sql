-- ============================================
-- Fix agresivo: Eliminar TODAS las referencias antiguas
-- ============================================
-- Este script elimina todos los objetos que referencian
-- public.redpresu_companies o redpresu_companies incorrectamente
-- ============================================

BEGIN;

-- PASO 1: Eliminar todos los triggers que referencian companies
DO $$
DECLARE
    trigger_rec RECORD;
BEGIN
    FOR trigger_rec IN
        SELECT
            n.nspname as schema_name,
            c.relname as table_name,
            t.tgname as trigger_name,
            pg_get_triggerdef(t.oid) as trigger_def
        FROM pg_trigger t
        JOIN pg_class c ON t.tgrelid = c.oid
        JOIN pg_namespace n ON c.relnamespace = n.oid
        WHERE NOT t.tgisinternal
          AND pg_get_triggerdef(t.oid) ILIKE '%companies%'
          AND n.nspname = 'redpresu'
    LOOP
        RAISE NOTICE 'Eliminando trigger: %.% en %.%',
            trigger_rec.schema_name,
            trigger_rec.trigger_name,
            trigger_rec.schema_name,
            trigger_rec.table_name;

        EXECUTE format('DROP TRIGGER IF EXISTS %I ON %I.%I CASCADE',
            trigger_rec.trigger_name,
            trigger_rec.schema_name,
            trigger_rec.table_name);
    END LOOP;
END $$;

-- PASO 2: Eliminar todas las funciones que referencian companies
DO $$
DECLARE
    func_rec RECORD;
BEGIN
    FOR func_rec IN
        SELECT
            n.nspname as schema_name,
            p.proname as function_name,
            pg_get_functiondef(p.oid) as function_def
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE pg_get_functiondef(p.oid) ILIKE '%redpresu_companies%'
    LOOP
        RAISE NOTICE 'Eliminando función: %.%',
            func_rec.schema_name,
            func_rec.function_name;

        EXECUTE format('DROP FUNCTION IF EXISTS %I.%I CASCADE',
            func_rec.schema_name,
            func_rec.function_name);
    END LOOP;
END $$;

-- PASO 3: Eliminar políticas RLS problemáticas en users
DO $$
DECLARE
    policy_rec RECORD;
BEGIN
    FOR policy_rec IN
        SELECT
            schemaname,
            tablename,
            policyname
        FROM pg_policies
        WHERE schemaname = 'redpresu'
          AND tablename = 'users'
          AND (COALESCE(qual::text, '') ILIKE '%companies%'
               OR COALESCE(with_check::text, '') ILIKE '%companies%')
    LOOP
        RAISE NOTICE 'Eliminando política RLS: %.% en %.%',
            policy_rec.schemaname,
            policy_rec.policyname,
            policy_rec.schemaname,
            policy_rec.tablename;

        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',
            policy_rec.policyname,
            policy_rec.schemaname,
            policy_rec.tablename);
    END LOOP;
END $$;

-- PASO 4: Eliminar TODOS los foreign keys en users.company_id
DO $$
DECLARE
    fk_name TEXT;
BEGIN
    FOR fk_name IN
        SELECT constraint_name
        FROM information_schema.table_constraints
        WHERE table_schema = 'redpresu'
          AND table_name = 'users'
          AND constraint_type = 'FOREIGN KEY'
    LOOP
        RAISE NOTICE 'Eliminando FK: %', fk_name;
        EXECUTE format('ALTER TABLE redpresu.users DROP CONSTRAINT IF EXISTS %I CASCADE', fk_name);
    END LOOP;
END $$;

-- PASO 5: Crear FK nuevo correctamente
ALTER TABLE redpresu.users
ADD CONSTRAINT users_company_id_fkey
FOREIGN KEY (company_id)
REFERENCES redpresu.companies(id)
ON DELETE RESTRICT
ON UPDATE CASCADE;

DO $$
BEGIN
    RAISE NOTICE '✓ FK creado: users.company_id -> redpresu.companies.id';
END $$;

-- PASO 6: Recrear políticas RLS básicas para users (si se eliminaron)
DO $$
BEGIN
    -- Permitir a usuarios ver sus propios datos
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'redpresu'
          AND tablename = 'users'
          AND policyname = 'Users can view their own data'
    ) THEN
        CREATE POLICY "Users can view their own data"
        ON redpresu.users
        FOR SELECT
        USING (auth.uid() = id);

        RAISE NOTICE 'Recreada política: Users can view their own data';
    END IF;

    -- Permitir a usuarios actualizar sus propios datos
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'redpresu'
          AND tablename = 'users'
          AND policyname = 'Users can update their own data'
    ) THEN
        CREATE POLICY "Users can update their own data"
        ON redpresu.users
        FOR UPDATE
        USING (auth.uid() = id);

        RAISE NOTICE 'Recreada política: Users can update their own data';
    END IF;
END $$;

COMMIT;

-- ============================================
-- Verificación
-- ============================================
SELECT 'Verificando FK...' as paso;

SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_schema || '.' || ccu.table_name as referencias
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_schema = 'redpresu'
  AND tc.table_name = 'users'
  AND tc.constraint_type = 'FOREIGN KEY'
  AND kcu.column_name = 'company_id';
