-- ============================================================================
-- Verificar triggers y constraints existentes en la tabla users
-- ============================================================================

-- 1. Ver todos los triggers en la tabla redpresu.users
SELECT
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'redpresu'
  AND event_object_table = 'users'
ORDER BY trigger_name;

-- 2. Ver todas las funciones relacionadas con usuarios
SELECT
    routine_name,
    routine_type,
    routine_definition
FROM information_schema.routines
WHERE routine_schema = 'redpresu'
  AND routine_name LIKE '%user%'
ORDER BY routine_name;

-- 3. Ver constraints en la tabla users
SELECT
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'redpresu.users'::regclass
ORDER BY conname;
