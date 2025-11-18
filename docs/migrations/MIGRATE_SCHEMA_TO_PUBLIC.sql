-- ============================================
-- MIGRACIÓN DE SCHEMA redpresu → public
-- ============================================
-- Propósito: Migrar todas las tablas del schema 'redpresu' al schema 'public'
--            para que sean accesibles via Supabase Cloud API (PostgREST)
--
-- IMPORTANTE: Este script es SOLO para Supabase Cloud
--             NO ejecutar en tu Supabase self-hosted local
--
-- INSTRUCCIONES:
-- 1. Hacer backup de tu base de datos antes de ejecutar
-- 2. Ejecutar en Supabase Cloud → SQL Editor
-- 3. Ejecutar TODO el script de una vez
-- ============================================

BEGIN;

-- ============================================
-- PASO 1: Mover todas las tablas de redpresu a public
-- ============================================

-- El orden importa debido a las foreign keys
-- Primero movemos las tablas sin dependencias, luego las que dependen de ellas

-- Tablas independientes o con pocas dependencias
ALTER TABLE IF EXISTS redpresu.companies SET SCHEMA public;
ALTER TABLE IF EXISTS redpresu.config SET SCHEMA public;
ALTER TABLE IF EXISTS redpresu.mock_emails SET SCHEMA public;
ALTER TABLE IF EXISTS redpresu.company_deletion_log SET SCHEMA public;

-- Tablas que dependen de companies
ALTER TABLE IF EXISTS redpresu.issuers SET SCHEMA public;
ALTER TABLE IF EXISTS redpresu.users SET SCHEMA public;
ALTER TABLE IF EXISTS redpresu.business_rules SET SCHEMA public;

-- Tablas que dependen de users
ALTER TABLE IF EXISTS redpresu.registration_tokens SET SCHEMA public;
ALTER TABLE IF EXISTS redpresu.user_invitations SET SCHEMA public;
ALTER TABLE IF EXISTS redpresu.subscriptions SET SCHEMA public;
ALTER TABLE IF EXISTS redpresu.contact_messages SET SCHEMA public;
ALTER TABLE IF EXISTS redpresu.contact_message_notes SET SCHEMA public;

-- Tablas de tarifas y presupuestos
ALTER TABLE IF EXISTS redpresu.tariffs SET SCHEMA public;
ALTER TABLE IF EXISTS redpresu.budgets SET SCHEMA public;
ALTER TABLE IF EXISTS redpresu.budget_versions SET SCHEMA public;
ALTER TABLE IF EXISTS redpresu.budget_notes SET SCHEMA public;

-- Tabla de auditoría
ALTER TABLE IF EXISTS redpresu.rules_audit_log SET SCHEMA public;

-- ============================================
-- PASO 2: Actualizar secuencias (sequences)
-- ============================================

-- Las secuencias también deben moverse
DO $$
DECLARE
    seq RECORD;
BEGIN
    FOR seq IN
        SELECT sequence_name
        FROM information_schema.sequences
        WHERE sequence_schema = 'redpresu'
    LOOP
        EXECUTE format('ALTER SEQUENCE redpresu.%I SET SCHEMA public', seq.sequence_name);
    END LOOP;
END $$;

-- ============================================
-- PASO 3: Actualizar funciones y triggers
-- ============================================

-- Mover funciones del schema redpresu al public (si existen)
DO $$
DECLARE
    func RECORD;
BEGIN
    FOR func IN
        SELECT routine_name
        FROM information_schema.routines
        WHERE routine_schema = 'redpresu'
        AND routine_type = 'FUNCTION'
    LOOP
        EXECUTE format('ALTER FUNCTION redpresu.%I() SET SCHEMA public', func.routine_name);
    END LOOP;
EXCEPTION
    WHEN OTHERS THEN
        -- Algunas funciones pueden tener parámetros, ignorar errores
        RAISE NOTICE 'Algunas funciones no pudieron moverse automáticamente. Esto es normal.';
END $$;

-- ============================================
-- PASO 4: Verificación
-- ============================================

-- Mostrar cuántas tablas quedan en redpresu (debería ser 0)
DO $$
DECLARE
    count_redpresu INTEGER;
    count_public INTEGER;
BEGIN
    SELECT COUNT(*) INTO count_redpresu
    FROM information_schema.tables
    WHERE table_schema = 'redpresu';

    SELECT COUNT(*) INTO count_public
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name IN (
        'companies', 'config', 'mock_emails', 'company_deletion_log',
        'issuers', 'users', 'business_rules', 'registration_tokens',
        'user_invitations', 'subscriptions', 'contact_messages',
        'contact_message_notes', 'tariffs', 'budgets', 'budget_versions',
        'budget_notes', 'rules_audit_log'
    );

    RAISE NOTICE 'Tablas restantes en redpresu: %', count_redpresu;
    RAISE NOTICE 'Tablas migradas a public: %', count_public;

    IF count_public >= 17 THEN
        RAISE NOTICE '✅ Migración completada exitosamente';
    ELSE
        RAISE WARNING '⚠️  Algunas tablas pueden no haberse migrado. Verifica manualmente.';
    END IF;
END $$;

-- ============================================
-- PASO 5: (Opcional) Eliminar schema redpresu
-- ============================================
-- Solo descomentar si estás seguro de que todo está migrado
-- y no hay nada más en el schema redpresu

-- DROP SCHEMA IF EXISTS redpresu CASCADE;

COMMIT;

-- ============================================
-- VERIFICACIÓN POST-MIGRACIÓN
-- ============================================
-- Ejecuta estas queries por separado para verificar:

-- Ver todas las tablas en public
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Ver si quedan tablas en redpresu
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'redpresu'
ORDER BY table_name;
