-- ============================================
-- Fix completo: Limpiar datos + Recrear FK
-- ============================================
-- Este script hace todo el proceso:
-- 1. Identificar usuarios huérfanos
-- 2. Asignarlos a company_id = 1 (Demo)
-- 3. Eliminar FK antiguo si existe
-- 4. Crear FK nuevo apuntando a redpresu.companies
-- ============================================

BEGIN;

-- PASO 1: Verificar el problema
DO $$
DECLARE
    orphan_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO orphan_count
    FROM redpresu.users u
    LEFT JOIN redpresu.companies c ON u.company_id = c.id
    WHERE c.id IS NULL;

    RAISE NOTICE 'Usuarios con company_id huérfano: %', orphan_count;

    IF orphan_count > 0 THEN
        RAISE NOTICE 'Se asignarán a company_id = 1 (Demo)';
    END IF;
END $$;

-- PASO 2: Mostrar usuarios que se van a corregir
SELECT
    u.id,
    u.email,
    u.name || ' ' || u.last_name as nombre_completo,
    u.role,
    u.company_id as company_id_invalido,
    u.status
FROM redpresu.users u
LEFT JOIN redpresu.companies c ON u.company_id = c.id
WHERE c.id IS NULL;

-- PASO 3: Corregir usuarios huérfanos -> asignar a company_id = 1
UPDATE redpresu.users u
SET company_id = 1,
    updated_at = NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM redpresu.companies c WHERE c.id = u.company_id
);

-- PASO 4: Eliminar FK antiguo (si existe)
DO $$
DECLARE
    fk_name TEXT;
BEGIN
    -- Buscar todas las constraints FK en company_id
    FOR fk_name IN
        SELECT constraint_name
        FROM information_schema.table_constraints
        WHERE table_schema = 'redpresu'
          AND table_name = 'users'
          AND constraint_type = 'FOREIGN KEY'
          AND constraint_name ILIKE '%company%'
    LOOP
        RAISE NOTICE 'Eliminando FK: %', fk_name;
        EXECUTE format('ALTER TABLE redpresu.users DROP CONSTRAINT IF EXISTS %I', fk_name);
    END LOOP;
END $$;

-- PASO 5: Crear FK nuevo
ALTER TABLE redpresu.users
ADD CONSTRAINT users_company_id_fkey
FOREIGN KEY (company_id)
REFERENCES redpresu.companies(id)
ON DELETE RESTRICT
ON UPDATE CASCADE;

-- PASO 6: Verificar que funcionó
DO $$
DECLARE
    fk_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE table_schema = 'redpresu'
          AND table_name = 'users'
          AND constraint_name = 'users_company_id_fkey'
          AND constraint_type = 'FOREIGN KEY'
    ) INTO fk_exists;

    IF fk_exists THEN
        RAISE NOTICE '✓ FK creado correctamente: users.company_id -> redpresu.companies.id';
    ELSE
        RAISE EXCEPTION 'Error: FK no se creó correctamente';
    END IF;
END $$;

COMMIT;

-- ============================================
-- Verificación final
-- ============================================
-- Ejecuta esto después para verificar:
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_schema AS foreign_schema,
    ccu.table_name AS foreign_table,
    ccu.column_name AS foreign_column
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_schema = 'redpresu'
  AND tc.table_name = 'users'
  AND tc.constraint_type = 'FOREIGN KEY'
  AND kcu.column_name = 'company_id';
