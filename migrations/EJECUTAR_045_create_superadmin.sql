-- ============================================
-- Migración 045: Crear Superadmin Principal
-- ============================================
-- Descripción: Crea el usuario superadmin josivela+super@gmail.com
-- Fecha: 2025-01-29
-- Autor: Claude Code
--
-- Datos del superadmin:
-- - Email: josivela+super@gmail.com
-- - Nombre: José Ignacio
-- - Apellido: Vela
-- - Contraseña: Xtatil-2025
-- - Rol: superadmin
-- - Empresa: 1 (Jeyca Sistemas)
--
-- IMPORTANTE: Esta migración es idempotente (se puede ejecutar múltiples veces)
-- ============================================

BEGIN;

-- ============================================
-- 1. GARANTIZAR QUE EMPRESA 1 EXISTE
-- ============================================

DO $$
DECLARE
  v_company_exists BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM public.redpresu_companies WHERE id = 1
  ) INTO v_company_exists;

  IF NOT v_company_exists THEN
    -- Crear empresa 1
    INSERT INTO public.redpresu_companies (id, name, status, created_at, updated_at)
    VALUES (1, 'Jeyca Sistemas (Sistema)', 'active', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;

    RAISE NOTICE '✓ Empresa 1 creada';
  ELSE
    -- Asegurar que está activa
    UPDATE public.redpresu_companies
    SET status = 'active', updated_at = NOW()
    WHERE id = 1 AND status != 'active';

    IF FOUND THEN
      RAISE NOTICE '✓ Empresa 1 reactivada';
    ELSE
      RAISE NOTICE '✓ Empresa 1 ya existe y está activa';
    END IF;
  END IF;
END;
$$;


-- ============================================
-- 2. CREAR SUPERADMIN
-- ============================================

DO $$
DECLARE
  v_user_exists BOOLEAN;
  v_user_id UUID;
  v_auth_user_exists BOOLEAN;
  v_users_entry_exists BOOLEAN;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'CREACIÓN DEL SUPERADMIN';
  RAISE NOTICE '================================================';
  RAISE NOTICE '';

  -- Verificar si ya existe en auth.users
  SELECT EXISTS(
    SELECT 1 FROM auth.users WHERE email = 'josivela+super@gmail.com'
  ) INTO v_auth_user_exists;

  -- Verificar si ya existe en redpresu_users
  SELECT EXISTS(
    SELECT 1 FROM public.redpresu_users WHERE email = 'josivela+super@gmail.com'
  ) INTO v_users_entry_exists;

  -- ==========================================
  -- CASO 1: Usuario NO existe en auth.users → CREAR TODO
  -- ==========================================
  IF NOT v_auth_user_exists THEN
    RAISE NOTICE 'CASO 1: Usuario NO existe en auth.users';
    RAISE NOTICE 'Acción: Crear usuario completo en auth.users + redpresu_users';
    RAISE NOTICE '';

    -- Generar UUID para el nuevo usuario
    v_user_id := gen_random_uuid();

    -- Crear usuario en auth.users
    -- NOTA: La contraseña se hashea automáticamente
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      raw_app_meta_data,
      raw_user_meta_data,
      is_super_admin,
      role,
      aud,
      confirmation_token,
      email_change_token_new,
      recovery_token
    )
    VALUES (
      v_user_id,
      '00000000-0000-0000-0000-000000000000',  -- instance_id por defecto
      'josivela+super@gmail.com',
      crypt('Xtatil-2025', gen_salt('bf')),     -- Hashear contraseña con bcrypt
      NOW(),                                     -- Email confirmado inmediatamente
      NOW(),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      '{"nombre":"José Ignacio","apellido":"Vela","tipo":"empresa"}',
      false,                                     -- No es super admin de Supabase
      'authenticated',
      'authenticated',
      '',
      '',
      ''
    );

    RAISE NOTICE '✓ Usuario creado en auth.users';
    RAISE NOTICE '  - ID: %', v_user_id;
    RAISE NOTICE '  - Email: josivela+super@gmail.com';
    RAISE NOTICE '';

    -- Crear entrada en auth.identities
    INSERT INTO auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    )
    VALUES (
      v_user_id,
      v_user_id,
      json_build_object(
        'sub', v_user_id::text,
        'email', 'josivela+super@gmail.com',
        'email_verified', true
      ),
      'email',
      NOW(),
      NOW(),
      NOW()
    );

    RAISE NOTICE '✓ Identity creada en auth.identities';
    RAISE NOTICE '';

    -- Crear entrada en redpresu_users
    INSERT INTO public.redpresu_users (
      id,
      name,
      last_name,
      email,
      role,
      company_id,
      status,
      created_at,
      updated_at
    )
    VALUES (
      v_user_id,
      'José Ignacio',
      'Vela',
      'josivela+super@gmail.com',
      'superadmin',
      1,
      'active',
      NOW(),
      NOW()
    );

    RAISE NOTICE '✓ Usuario creado en redpresu_users';
    RAISE NOTICE '  - Rol: superadmin';
    RAISE NOTICE '  - Empresa: 1';
    RAISE NOTICE '  - Status: active';
    RAISE NOTICE '';

  -- ==========================================
  -- CASO 2: Existe en auth.users pero NO en redpresu_users → CREAR SOLO redpresu_users
  -- ==========================================
  ELSIF v_auth_user_exists AND NOT v_users_entry_exists THEN
    RAISE NOTICE 'CASO 2: Usuario existe en auth.users pero NO en redpresu_users';
    RAISE NOTICE 'Acción: Crear entrada en redpresu_users';
    RAISE NOTICE '';

    -- Obtener user_id de auth.users
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE email = 'josivela+super@gmail.com'
    LIMIT 1;

    -- Crear entrada en redpresu_users
    INSERT INTO public.redpresu_users (
      id,
      name,
      last_name,
      email,
      role,
      company_id,
      status,
      created_at,
      updated_at
    )
    VALUES (
      v_user_id,
      'José Ignacio',
      'Vela',
      'josivela+super@gmail.com',
      'superadmin',
      1,
      'active',
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      name = 'José Ignacio',
      last_name = 'Vela',
      role = 'superadmin',
      company_id = 1,
      status = 'active',
      updated_at = NOW();

    RAISE NOTICE '✓ Usuario creado/actualizado en redpresu_users';
    RAISE NOTICE '  - ID: %', v_user_id;
    RAISE NOTICE '  - Rol: superadmin';
    RAISE NOTICE '  - Empresa: 1';
    RAISE NOTICE '';

    -- Actualizar contraseña en auth.users (por si cambió)
    UPDATE auth.users
    SET
      encrypted_password = crypt('Xtatil-2025', gen_salt('bf')),
      email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
      updated_at = NOW()
    WHERE id = v_user_id;

    RAISE NOTICE '✓ Contraseña actualizada en auth.users';
    RAISE NOTICE '';

  -- ==========================================
  -- CASO 3: Existe en ambos → ACTUALIZAR
  -- ==========================================
  ELSE
    RAISE NOTICE 'CASO 3: Usuario YA existe en auth.users y redpresu_users';
    RAISE NOTICE 'Acción: Actualizar datos y verificar configuración';
    RAISE NOTICE '';

    -- Obtener user_id
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE email = 'josivela+super@gmail.com'
    LIMIT 1;

    -- Actualizar datos en redpresu_users
    UPDATE public.redpresu_users
    SET
      name = 'José Ignacio',
      last_name = 'Vela',
      role = 'superadmin',
      company_id = 1,
      status = 'active',
      updated_at = NOW()
    WHERE id = v_user_id;

    RAISE NOTICE '✓ Datos actualizados en redpresu_users';
    RAISE NOTICE '  - ID: %', v_user_id;
    RAISE NOTICE '  - Rol: superadmin (asegurado)';
    RAISE NOTICE '  - Empresa: 1 (asegurado)';
    RAISE NOTICE '  - Status: active (asegurado)';
    RAISE NOTICE '';

    -- Actualizar contraseña en auth.users
    UPDATE auth.users
    SET
      encrypted_password = crypt('Xtatil-2025', gen_salt('bf')),
      email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
      updated_at = NOW()
    WHERE id = v_user_id;

    RAISE NOTICE '✓ Contraseña actualizada en auth.users';
    RAISE NOTICE '';
  END IF;

  -- ==========================================
  -- RESUMEN FINAL
  -- ==========================================
  RAISE NOTICE '================================================';
  RAISE NOTICE 'SUPERADMIN CONFIGURADO EXITOSAMENTE';
  RAISE NOTICE '================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Credenciales de acceso:';
  RAISE NOTICE '  - Email: josivela+super@gmail.com';
  RAISE NOTICE '  - Contraseña: Xtatil-2025';
  RAISE NOTICE '  - Rol: superadmin';
  RAISE NOTICE '  - Empresa: Jeyca Sistemas (id: 1)';
  RAISE NOTICE '';
  RAISE NOTICE 'IMPORTANTE:';
  RAISE NOTICE '  - El usuario puede iniciar sesión inmediatamente';
  RAISE NOTICE '  - Email ya confirmado automáticamente';
  RAISE NOTICE '  - Protecciones activas (triggers de migración 043)';
  RAISE NOTICE '';
  RAISE NOTICE 'MIGRACIÓN 045: COMPLETADA EXITOSAMENTE';
  RAISE NOTICE '================================================';
  RAISE NOTICE '';
END;
$$;


-- ============================================
-- 3. VERIFICACIÓN FINAL
-- ============================================

DO $$
DECLARE
  v_user_id UUID;
  v_user_email TEXT;
  v_user_role TEXT;
  v_company_id INTEGER;
  v_company_name TEXT;
  v_user_status TEXT;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'VERIFICACIÓN FINAL';
  RAISE NOTICE '================================================';
  RAISE NOTICE '';

  -- Verificar usuario en ambas tablas
  SELECT
    u.id,
    u.email,
    ru.role,
    ru.company_id,
    c.name,
    ru.status
  INTO
    v_user_id,
    v_user_email,
    v_user_role,
    v_company_id,
    v_company_name,
    v_user_status
  FROM auth.users u
  LEFT JOIN public.redpresu_users ru ON ru.id = u.id
  LEFT JOIN public.redpresu_companies c ON c.id = ru.company_id
  WHERE u.email = 'josivela+super@gmail.com';

  IF v_user_id IS NULL THEN
    RAISE WARNING '❌ ERROR: Usuario NO encontrado en auth.users';
  ELSIF v_user_role IS NULL THEN
    RAISE WARNING '❌ ERROR: Usuario NO encontrado en redpresu_users';
  ELSIF v_user_role != 'superadmin' THEN
    RAISE WARNING '❌ ERROR: Usuario NO tiene rol superadmin (tiene: %)', v_user_role;
  ELSIF v_company_id != 1 THEN
    RAISE WARNING '❌ ERROR: Usuario NO está en empresa 1 (está en: %)', v_company_id;
  ELSIF v_user_status != 'active' THEN
    RAISE WARNING '❌ ERROR: Usuario NO está activo (status: %)', v_user_status;
  ELSE
    RAISE NOTICE '✅ VERIFICACIÓN EXITOSA:';
    RAISE NOTICE '  - Usuario existe en auth.users: ✓';
    RAISE NOTICE '  - Usuario existe en redpresu_users: ✓';
    RAISE NOTICE '  - Rol superadmin: ✓';
    RAISE NOTICE '  - Empresa 1 (%): ✓', v_company_name;
    RAISE NOTICE '  - Status active: ✓';
    RAISE NOTICE '';
    RAISE NOTICE 'El superadmin está listo para iniciar sesión.';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE '';
END;
$$;

COMMIT;


-- ============================================
-- ROLLBACK (Documentado, no ejecutar)
-- ============================================

/*
-- ADVERTENCIA: Solo ejecutar si necesitas eliminar el superadmin
-- (NO recomendado, los triggers de migración 043 bloquearán esto)

BEGIN;

-- Intentar eliminar de redpresu_users (bloqueado por trigger)
DELETE FROM public.redpresu_users
WHERE email = 'josivela+super@gmail.com';

-- Eliminar de auth.users (hará CASCADE a redpresu_users si no hay trigger)
DELETE FROM auth.users
WHERE email = 'josivela+super@gmail.com';

COMMIT;
*/
