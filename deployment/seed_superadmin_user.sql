-- ============================================
-- SEED SUPERADMIN USER
-- ============================================
-- Fecha: 2025-11-18
-- Descripción: Crea el usuario superadmin para la Empresa Demo
-- Uso: Ejecutar DESPUÉS de seed_initial_data.sql y ANTES de seed_demo_issuer.sql
-- IMPORTANTE: Este script crea el usuario en auth.users Y en redpresu.users
-- ============================================

BEGIN;

-- ============================================
-- 1. VERIFICAR QUE LA EMPRESA DEMO EXISTE
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM redpresu.companies WHERE id = 1 AND name = 'Empresa Demo'
  ) THEN
    RAISE EXCEPTION 'Empresa Demo (ID=1) no existe. Ejecutar seed_initial_data.sql primero.';
  END IF;

  RAISE NOTICE '✅ Empresa Demo existe';
END $$;

-- ============================================
-- 2. CREAR USUARIO SUPERADMIN EN auth.users
-- ============================================
-- NOTA: Supabase requiere que uses la función auth.admin_create_user()
-- o que lo crees manualmente desde el dashboard de Supabase
-- Este INSERT directo puede no funcionar dependiendo de tu configuración

-- OPCIÓN MANUAL (RECOMENDADO):
-- 1. Ve al dashboard de Supabase > Authentication > Users
-- 2. Clic en "Add user"
-- 3. Email: superadmin@demo.com
-- 4. Password: (elige una contraseña segura)
-- 5. Confirma el usuario automáticamente
-- 6. Copia el UUID generado
-- 7. Modifica este script para usar ese UUID específico

RAISE NOTICE '';
RAISE NOTICE '═══════════════════════════════════════════════════════════════';
RAISE NOTICE '⚠️  ACCIÓN REQUERIDA: CREAR USUARIO EN SUPABASE DASHBOARD';
RAISE NOTICE '═══════════════════════════════════════════════════════════════';
RAISE NOTICE '';
RAISE NOTICE 'Para crear el usuario superadmin:';
RAISE NOTICE '1. Ve a tu dashboard de Supabase';
RAISE NOTICE '2. Navega a: Authentication > Users';
RAISE NOTICE '3. Clic en "Add user"';
RAISE NOTICE '4. Email: superadmin@demo.com';
RAISE NOTICE '5. Password: (elige una contraseña segura)';
RAISE NOTICE '6. Auto Confirm User: YES';
RAISE NOTICE '7. Copia el UUID generado';
RAISE NOTICE '';
RAISE NOTICE 'Después de crear el usuario:';
RAISE NOTICE '1. Ejecuta: SELECT id FROM auth.users WHERE email = ''superadmin@demo.com'';';
RAISE NOTICE '2. Copia el UUID';
RAISE NOTICE '3. Ejecuta el siguiente INSERT con ese UUID:';
RAISE NOTICE '';
RAISE NOTICE 'INSERT INTO redpresu.users (id, company_id, email, name, last_name, role, status, created_at, updated_at)';
RAISE NOTICE 'VALUES (';
RAISE NOTICE '  ''TU-UUID-AQUI''::uuid,';
RAISE NOTICE '  1,';
RAISE NOTICE '  ''superadmin@demo.com'',';
RAISE NOTICE '  ''Super'',';
RAISE NOTICE '  ''Admin'',';
RAISE NOTICE '  ''superadmin'',';
RAISE NOTICE '  ''active'',';
RAISE NOTICE '  NOW(),';
RAISE NOTICE '  NOW()';
RAISE NOTICE ') ON CONFLICT (id) DO NOTHING;';
RAISE NOTICE '';
RAISE NOTICE '═══════════════════════════════════════════════════════════════';

-- ============================================
-- VERIFICACIÓN (ejecutar después de crear el usuario manualmente)
-- ============================================

/*
-- Verificar que el usuario existe en auth.users
SELECT id, email, created_at
FROM auth.users
WHERE email = 'superadmin@demo.com';

-- Verificar que el usuario existe en redpresu.users
SELECT id, email, name, last_name, role, company_id
FROM redpresu.users
WHERE email = 'superadmin@demo.com';
*/

COMMIT;

-- ============================================
-- EJEMPLO: Si ya tienes el UUID del usuario de auth.users
-- ============================================

/*
-- Reemplaza 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' con el UUID real

BEGIN;

INSERT INTO redpresu.users (
  id,
  company_id,
  email,
  name,
  last_name,
  role,
  status,
  created_at,
  updated_at
)
VALUES (
  'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'::uuid,  -- UUID de auth.users
  1,                                              -- company_id: Empresa Demo
  'superadmin@demo.com',                          -- email
  'Super',                                        -- name
  'Admin',                                        -- last_name
  'superadmin',                                   -- role
  'active',                                       -- status
  NOW(),                                          -- created_at
  NOW()                                           -- updated_at
)
ON CONFLICT (id) DO UPDATE
SET
  company_id = EXCLUDED.company_id,
  email = EXCLUDED.email,
  name = EXCLUDED.name,
  last_name = EXCLUDED.last_name,
  role = EXCLUDED.role,
  status = EXCLUDED.status,
  updated_at = NOW();

COMMIT;

-- Verificar
SELECT
  u.id,
  u.email,
  u.name,
  u.last_name,
  u.role,
  u.company_id,
  c.name as company_name
FROM redpresu.users u
JOIN redpresu.companies c ON c.id = u.company_id
WHERE u.email = 'superadmin@demo.com';
*/
