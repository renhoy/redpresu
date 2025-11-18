-- ============================================
-- SEED ISSUER DE EMPRESA DEMO
-- ============================================
-- Fecha: 2025-11-17
-- Descripción: Inserta el issuer (emisor) por defecto para la Empresa Demo
-- Uso: Ejecutar DESPUÉS de crear el usuario superadmin
-- IMPORTANTE: Este script requiere que exista un usuario superadmin con ID específico
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
-- 2. VERIFICAR QUE EXISTE UN USUARIO SUPERADMIN
-- ============================================

DO $$
DECLARE
  superadmin_count INTEGER;
  superadmin_email TEXT;
BEGIN
  -- Contar usuarios en redpresu.users con rol superadmin
  SELECT COUNT(*), MAX(email) INTO superadmin_count, superadmin_email
  FROM redpresu.users
  WHERE role = 'superadmin' AND company_id = 1 AND status = 'active';

  IF superadmin_count = 0 THEN
    RAISE EXCEPTION '❌ No existe un usuario superadmin para Empresa Demo.

Por favor, ejecuta los siguientes pasos:

1. Crear usuario en Supabase Dashboard:
   - Ve a: Authentication > Users
   - Clic en "Add user"
   - Email: superadmin@demo.com
   - Password: (elige una contraseña segura)
   - Auto Confirm User: YES
   - Copia el UUID generado

2. Insertar en redpresu.users:
   INSERT INTO redpresu.users (id, company_id, email, name, last_name, role, status, created_at, updated_at)
   VALUES (''TU-UUID-DE-AUTH-USERS''::uuid, 1, ''superadmin@demo.com'', ''Super'', ''Admin'', ''superadmin'', ''active'', NOW(), NOW());

3. Volver a ejecutar este script (seed_demo_issuer.sql)

Consulta: deployment/seed_superadmin_user.sql para más detalles.';
  END IF;

  RAISE NOTICE '✅ Usuario superadmin encontrado: %', superadmin_email;
END $$;

-- ============================================
-- 3. INSERTAR ISSUER PARA EMPRESA DEMO
-- ============================================
-- NOTA: Este issuer está asociado al usuario superadmin
-- Se detecta automáticamente el primer usuario con rol superadmin

INSERT INTO redpresu.issuers (
  id,
  user_id,
  company_id,
  type,
  name,
  nif,
  address,
  postal_code,
  locality,
  province,
  country,
  phone,
  email,
  web,
  irpf_percentage,
  logo_url,
  note,
  created_at,
  updated_at,
  deleted_at
)
VALUES (
  'adc5b25e-7874-46bf-98a0-d2db9ba842cc'::uuid,  -- ID del issuer
  (SELECT id FROM redpresu.users WHERE role = 'superadmin' AND company_id = 1 AND status = 'active' LIMIT 1), -- user_id del superadmin (detectado automáticamente)
  1,                                               -- company_id: Empresa Demo
  'autonomo',                                      -- type
  'Demo',                                          -- name
  'B36936926',                                     -- nif
  'Calle Demo, 369',                               -- address
  '36900',                                         -- postal_code
  'Localidad Demo',                                -- locality
  'Provincia Demo',                                -- province
  'España',                                        -- country
  '963 369 369',                                   -- phone
  'demo@demo.com',                                 -- email
  'https://demo.com',                              -- web
  15.00,                                           -- irpf_percentage
  NULL,                                            -- logo_url
  NULL,                                            -- note
  '2025-10-09 16:46:05.051308+00'::timestamptz,   -- created_at
  NOW(),                                           -- updated_at
  NULL                                             -- deleted_at
)
ON CONFLICT (id) DO UPDATE
SET
  user_id = EXCLUDED.user_id,
  company_id = EXCLUDED.company_id,
  type = EXCLUDED.type,
  name = EXCLUDED.name,
  nif = EXCLUDED.nif,
  address = EXCLUDED.address,
  postal_code = EXCLUDED.postal_code,
  locality = EXCLUDED.locality,
  province = EXCLUDED.province,
  country = EXCLUDED.country,
  phone = EXCLUDED.phone,
  email = EXCLUDED.email,
  web = EXCLUDED.web,
  irpf_percentage = EXCLUDED.irpf_percentage,
  updated_at = NOW();

-- ============================================
-- RESUMEN FINAL
-- ============================================

DO $$
DECLARE
  issuer_count INTEGER;
  issuer_user_id UUID;
  issuer_name TEXT;
BEGIN
  -- Contar issuers de Empresa Demo
  SELECT COUNT(*) INTO issuer_count
  FROM redpresu.issuers
  WHERE company_id = 1;

  -- Obtener detalles del issuer
  SELECT user_id, name INTO issuer_user_id, issuer_name
  FROM redpresu.issuers
  WHERE company_id = 1
  LIMIT 1;

  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ ISSUER DE EMPRESA DEMO CREADO EXITOSAMENTE';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE 'Resumen:';
  RAISE NOTICE '  - Issuers para Empresa Demo: % registro(s)', issuer_count;
  RAISE NOTICE '  - Nombre del issuer: %', issuer_name;
  RAISE NOTICE '  - User ID asociado: %', issuer_user_id;
  RAISE NOTICE '';
  RAISE NOTICE 'Datos del Issuer:';
  RAISE NOTICE '  ✅ Nombre: Demo';
  RAISE NOTICE '  ✅ NIF: B36936926';
  RAISE NOTICE '  ✅ Tipo: Autónomo';
  RAISE NOTICE '  ✅ Email: demo@demo.com';
  RAISE NOTICE '  ✅ Teléfono: 963 369 369';
  RAISE NOTICE '  ✅ Dirección: Calle Demo, 369, 36900 Localidad Demo';
  RAISE NOTICE '  ✅ IRPF: 15%';
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
END $$;

COMMIT;

-- ============================================
-- VERIFICACIÓN POST-INSERCIÓN (ejecutar manualmente si deseas)
-- ============================================

/*
-- Ver el issuer creado
SELECT
  id,
  user_id,
  company_id,
  type,
  name,
  nif,
  email,
  phone,
  address,
  created_at
FROM redpresu.issuers
WHERE company_id = 1;

-- Ver qué usuario está asociado
SELECT
  u.email,
  u.name,
  u.last_name,
  u.role
FROM auth.users au
JOIN redpresu.users u ON u.id = au.id
WHERE u.id = (SELECT user_id FROM redpresu.issuers WHERE company_id = 1 LIMIT 1);
*/

-- ============================================
-- ROLLBACK (documentado, NO ejecutar sin necesidad)
-- ============================================

/*
BEGIN;

-- Eliminar issuer de Empresa Demo
DELETE FROM redpresu.issuers
WHERE company_id = 1 AND id = 'adc5b25e-7874-46bf-98a0-d2db9ba842cc'::uuid;

COMMIT;
*/
