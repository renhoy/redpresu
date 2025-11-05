-- ============================================
-- FIX: Configurar contraseña para superadmin
-- ============================================
-- Usuario: josivela+super@gmail.com
-- Password: Password-123
-- ============================================

BEGIN;

-- 1. Verificar que la extensión pgcrypto está habilitada
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Actualizar contraseña con hash bcrypt
UPDATE auth.users
SET
  encrypted_password = crypt('Password-123', gen_salt('bf')),
  email_confirmed_at = NOW(),
  email_change_confirm_status = 0,
  updated_at = NOW()
WHERE email = 'josivela+super@gmail.com';

-- 3. Verificar que el usuario está activo en redpresu_users
UPDATE public.redpresu_users
SET
  status = 'active',
  updated_at = NOW()
WHERE email = 'josivela+super@gmail.com';

-- 4. Verificar actualización
DO $$
DECLARE
  user_exists BOOLEAN;
  encrypted_pwd TEXT;
BEGIN
  -- Verificar que el usuario existe
  SELECT EXISTS(
    SELECT 1 FROM auth.users WHERE email = 'josivela+super@gmail.com'
  ) INTO user_exists;

  IF user_exists THEN
    SELECT encrypted_password INTO encrypted_pwd
    FROM auth.users
    WHERE email = 'josivela+super@gmail.com';

    IF encrypted_pwd IS NOT NULL AND encrypted_pwd != '' THEN
      RAISE NOTICE '✅ Contraseña actualizada correctamente';
      RAISE NOTICE 'Email: josivela+super@gmail.com';
      RAISE NOTICE 'Password: Password-123';
    ELSE
      RAISE EXCEPTION '❌ Error: La contraseña no se actualizó';
    END IF;
  ELSE
    RAISE EXCEPTION '❌ Error: Usuario no existe';
  END IF;
END $$;

COMMIT;

-- ============================================
-- VERIFICACIÓN POST-EJECUCIÓN
-- ============================================

-- Ver estado del usuario
SELECT
  id,
  email,
  email_confirmed_at,
  LENGTH(encrypted_password) as pwd_length,
  created_at,
  updated_at
FROM auth.users
WHERE email = 'josivela+super@gmail.com';

-- Ver usuario en redpresu_users
SELECT
  id,
  email,
  role,
  company_id,
  status
FROM redpresu_users
WHERE email = 'josivela+super@gmail.com';
