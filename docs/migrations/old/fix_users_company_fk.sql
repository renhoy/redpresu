-- ============================================
-- Fix: Actualizar Foreign Key de users.company_id
-- ============================================
-- Este script actualiza la foreign key de users.company_id
-- para que apunte a redpresu.companies en lugar de
-- public.redpresu_companies (que ya no existe)
-- ============================================

BEGIN;

-- 1. Identificar la foreign key actual
SELECT
    tc.constraint_name,
    tc.table_schema,
    tc.table_name,
    kcu.column_name,
    ccu.table_schema AS foreign_table_schema,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
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
  AND kcu.column_name = 'company_id';

-- 2. Eliminar foreign key antigua (ajusta el nombre según lo que muestre la query anterior)
-- Nombres comunes: users_company_id_fkey, redpresu_users_company_id_fkey, etc.
DO $$
DECLARE
    fk_name TEXT;
BEGIN
    -- Buscar el nombre de la constraint
    SELECT constraint_name INTO fk_name
    FROM information_schema.table_constraints
    WHERE table_schema = 'redpresu'
      AND table_name = 'users'
      AND constraint_type = 'FOREIGN KEY'
      AND constraint_name LIKE '%company_id%';

    IF fk_name IS NOT NULL THEN
        RAISE NOTICE 'Eliminando foreign key: %', fk_name;
        EXECUTE format('ALTER TABLE redpresu.users DROP CONSTRAINT IF EXISTS %I', fk_name);
    ELSE
        RAISE NOTICE 'No se encontró foreign key para company_id';
    END IF;
END $$;

-- 3. Recrear foreign key apuntando a redpresu.companies
ALTER TABLE redpresu.users
ADD CONSTRAINT users_company_id_fkey
FOREIGN KEY (company_id)
REFERENCES redpresu.companies(id)
ON DELETE RESTRICT
ON UPDATE CASCADE;

DO $$
BEGIN
    RAISE NOTICE 'Foreign key recreada: users.company_id -> redpresu.companies.id';
END $$;

COMMIT;

-- ============================================
-- Verificación
-- ============================================
-- Ejecuta esto para verificar que funciona:
-- SELECT
--     tc.constraint_name,
--     tc.table_name,
--     kcu.column_name,
--     ccu.table_schema AS foreign_schema,
--     ccu.table_name AS foreign_table,
--     ccu.column_name AS foreign_column
-- FROM information_schema.table_constraints AS tc
-- JOIN information_schema.key_column_usage AS kcu
--   ON tc.constraint_name = kcu.constraint_name
-- JOIN information_schema.constraint_column_usage AS ccu
--   ON ccu.constraint_name = tc.constraint_name
-- WHERE tc.table_schema = 'redpresu'
--   AND tc.table_name = 'users'
--   AND tc.constraint_type = 'FOREIGN KEY'
--   AND kcu.column_name = 'company_id';
