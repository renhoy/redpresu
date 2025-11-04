-- ============================================
-- Migración 044: Restaurar Superadmin si fue Borrado
-- ============================================
-- Descripción: Detecta y restaura el superadmin principal si fue eliminado de redpresu_users
-- Fecha: 2025-01-29
-- Autor: Claude Code
--
-- Casos cubiertos:
-- 1. Superadmin existe en auth.users pero NO en redpresu_users → RESTAURAR
-- 2. Superadmin existe en ambos con company_id NULL → REASIGNAR a empresa 1
-- 3. Superadmin existe en ambos con company_id inválido → REASIGNAR a empresa 1
-- 4. Superadmin existe en ambos con status inactive → REACTIVAR (opcional)
-- 5. Garantizar que empresa 1 existe antes de cualquier operación
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

    RAISE NOTICE 'RESTAURACIÓN: Empresa 1 creada como empresa del sistema';
  ELSE
    -- Asegurar que está activa
    UPDATE public.redpresu_companies
    SET status = 'active', updated_at = NOW()
    WHERE id = 1 AND status != 'active';

    IF FOUND THEN
      RAISE NOTICE 'RESTAURACIÓN: Empresa 1 reactivada';
    END IF;
  END IF;
END;
$$;


-- ============================================
-- 2. DETECTAR Y RESTAURAR SUPERADMIN
-- ============================================

DO $$
DECLARE
  v_auth_user_id UUID;
  v_auth_email TEXT;
  v_users_exists BOOLEAN;
  v_current_company_id INTEGER;
  v_current_status TEXT;
  v_action_taken TEXT := 'NINGUNA';
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'MIGRACIÓN 044: RESTAURACIÓN DEL SUPERADMIN';
  RAISE NOTICE '================================================';
  RAISE NOTICE '';

  -- Buscar superadmin en auth.users
  SELECT id, email
  INTO v_auth_user_id, v_auth_email
  FROM auth.users
  WHERE email = 'josivela+super@gmail.com'
  LIMIT 1;

  IF v_auth_user_id IS NULL THEN
    RAISE WARNING 'CRÍTICO: El superadmin NO existe en auth.users';
    RAISE WARNING 'Acción requerida: Crear manualmente el usuario en auth.users con email josivela+super@gmail.com';
    RAISE NOTICE '';
    RAISE NOTICE '================================================';
    RETURN;
  END IF;

  RAISE NOTICE 'Usuario encontrado en auth.users:';
  RAISE NOTICE '  - ID: %', v_auth_user_id;
  RAISE NOTICE '  - Email: %', v_auth_email;
  RAISE NOTICE '';

  -- Verificar si existe en redpresu_users
  SELECT
    EXISTS(SELECT 1 FROM public.redpresu_users WHERE id = v_auth_user_id),
    company_id,
    status
  INTO v_users_exists, v_current_company_id, v_current_status
  FROM public.redpresu_users
  WHERE id = v_auth_user_id;

  -- ==========================================
  -- CASO 1: NO EXISTE EN redpresu_users → RESTAURAR
  -- ==========================================
  IF NOT v_users_exists THEN
    RAISE NOTICE 'DETECTADO: Superadmin NO existe en redpresu_users';
    RAISE NOTICE 'Acción: RESTAURAR entrada con valores por defecto';
    RAISE NOTICE '';

    -- Insertar en redpresu_users con valores por defecto
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
      v_auth_user_id,
      'José Ignacio',        -- name por defecto
      'Vela',                -- last_name por defecto
      v_auth_email,
      'superadmin',
      1,                     -- Asignar a empresa 1
      'active',              -- Activado
      NOW(),
      NOW()
    );

    v_action_taken := 'RESTAURADO EN redpresu_users CON company_id=1';

    RAISE NOTICE '✓ Superadmin RESTAURADO exitosamente';
    RAISE NOTICE '  - Asignado a empresa 1';
    RAISE NOTICE '  - Rol: superadmin';
    RAISE NOTICE '  - Status: active';
    RAISE NOTICE '';

  -- ==========================================
  -- CASO 2: EXISTE PERO company_id ES NULL → REASIGNAR
  -- ==========================================
  ELSIF v_current_company_id IS NULL THEN
    RAISE NOTICE 'DETECTADO: Superadmin existe pero company_id=NULL';
    RAISE NOTICE 'Acción: REASIGNAR a empresa 1';
    RAISE NOTICE '';

    UPDATE public.redpresu_users
    SET
      company_id = 1,
      updated_at = NOW()
    WHERE id = v_auth_user_id;

    v_action_taken := 'REASIGNADO A company_id=1 (era NULL)';

    RAISE NOTICE '✓ Superadmin REASIGNADO a empresa 1';
    RAISE NOTICE '';

  -- ==========================================
  -- CASO 3: EXISTE PERO company_id INVÁLIDO → REASIGNAR
  -- ==========================================
  ELSIF NOT EXISTS (SELECT 1 FROM public.redpresu_companies WHERE id = v_current_company_id) THEN
    RAISE NOTICE 'DETECTADO: Superadmin tiene company_id=% pero esa empresa NO existe', v_current_company_id;
    RAISE NOTICE 'Acción: REASIGNAR a empresa 1';
    RAISE NOTICE '';

    UPDATE public.redpresu_users
    SET
      company_id = 1,
      updated_at = NOW()
    WHERE id = v_auth_user_id;

    v_action_taken := format('REASIGNADO A company_id=1 (tenía %s inválido)', v_current_company_id);

    RAISE NOTICE '✓ Superadmin REASIGNADO a empresa 1';
    RAISE NOTICE '';

  -- ==========================================
  -- CASO 4: EXISTE Y ES VÁLIDO → SOLO VERIFICACIÓN
  -- ==========================================
  ELSE
    RAISE NOTICE 'Superadmin encontrado en redpresu_users:';
    RAISE NOTICE '  - Company ID: %', v_current_company_id;
    RAISE NOTICE '  - Status: %', v_current_status;
    RAISE NOTICE '';

    -- Verificar si está inactivo
    IF v_current_status = 'inactive' THEN
      RAISE WARNING 'ADVERTENCIA: Superadmin está con status=inactive';
      RAISE WARNING 'Si deseas reactivarlo, ejecuta:';
      RAISE WARNING '  UPDATE public.redpresu_users SET status=''active'', updated_at=NOW() WHERE id=''%'';', v_auth_user_id;
      RAISE NOTICE '';
      v_action_taken := 'NINGUNA (existe pero está inactive)';
    ELSE
      RAISE NOTICE '✓ Superadmin verificado correctamente';
      RAISE NOTICE '  - Datos correctos en redpresu_users';
      RAISE NOTICE '  - Empresa válida';
      RAISE NOTICE '  - Status activo';
      RAISE NOTICE '';
      v_action_taken := 'NINGUNA (todo correcto)';
    END IF;
  END IF;

  -- ==========================================
  -- RESUMEN FINAL
  -- ==========================================
  RAISE NOTICE '================================================';
  RAISE NOTICE 'RESUMEN DE ACCIONES:';
  RAISE NOTICE '  Acción tomada: %', v_action_taken;
  RAISE NOTICE '';
  RAISE NOTICE 'Estado final del superadmin:';

  -- Obtener estado final
  SELECT
    u.id,
    u.email,
    u.role,
    u.company_id,
    c.name AS company_name,
    u.status,
    u.created_at,
    u.updated_at
  FROM public.redpresu_users u
  LEFT JOIN public.redpresu_companies c ON u.company_id = c.id
  WHERE u.id = v_auth_user_id
  INTO STRICT
    v_auth_user_id,
    v_auth_email,
    v_current_status,  -- reusing variable for role
    v_current_company_id,
    v_action_taken,    -- reusing variable for company name
    v_current_status;  -- reusing for final status

  RAISE NOTICE '  - ID: %', v_auth_user_id;
  RAISE NOTICE '  - Email: %', v_auth_email;
  RAISE NOTICE '  - Rol: superadmin';
  RAISE NOTICE '  - Empresa: % (id=%)', v_action_taken, v_current_company_id;
  RAISE NOTICE '  - Status: %', v_current_status;
  RAISE NOTICE '';
  RAISE NOTICE 'MIGRACIÓN 044: COMPLETADA EXITOSAMENTE';
  RAISE NOTICE '================================================';
  RAISE NOTICE '';

END;
$$;


-- ============================================
-- 3. VERIFICAR ISSUER DEL SUPERADMIN
-- ============================================

DO $$
DECLARE
  v_auth_user_id UUID;
  v_issuer_exists BOOLEAN;
BEGIN
  -- Obtener ID del superadmin
  SELECT id
  INTO v_auth_user_id
  FROM auth.users
  WHERE email = 'josivela+super@gmail.com'
  LIMIT 1;

  IF v_auth_user_id IS NULL THEN
    RETURN;  -- Ya se reportó en el bloque anterior
  END IF;

  -- Verificar si tiene issuer
  SELECT EXISTS(
    SELECT 1 FROM public.redpresu_issuers WHERE user_id = v_auth_user_id
  ) INTO v_issuer_exists;

  IF NOT v_issuer_exists THEN
    RAISE NOTICE '';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'ADVERTENCIA: El superadmin NO tiene entrada en redpresu_issuers';
    RAISE NOTICE '';
    RAISE NOTICE 'Esto puede causar problemas al crear tarifas o presupuestos.';
    RAISE NOTICE '';
    RAISE NOTICE 'Para crear el issuer manualmente, ejecuta:';
    RAISE NOTICE '';
    RAISE NOTICE 'INSERT INTO public.redpresu_issuers (';
    RAISE NOTICE '  user_id, company_id, type, name, nif, address,';
    RAISE NOTICE '  locality, province, country, email';
    RAISE NOTICE ') VALUES (';
    RAISE NOTICE '  ''%'',  -- user_id', v_auth_user_id;
    RAISE NOTICE '  1,                                    -- company_id';
    RAISE NOTICE '  ''empresa'',                          -- type';
    RAISE NOTICE '  ''Jeyca Sistemas'',                   -- name';
    RAISE NOTICE '  ''B12345678'',                        -- nif';
    RAISE NOTICE '  ''Calle Principal 1'',                -- address';
    RAISE NOTICE '  ''Madrid'',                           -- locality';
    RAISE NOTICE '  ''Madrid'',                           -- province';
    RAISE NOTICE '  ''España'',                           -- country';
    RAISE NOTICE '  ''josivela+super@gmail.com''          -- email';
    RAISE NOTICE ');';
    RAISE NOTICE '';
    RAISE NOTICE '================================================';
  ELSE
    RAISE NOTICE '';
    RAISE NOTICE '✓ Issuer del superadmin verificado correctamente';
    RAISE NOTICE '';
  END IF;
END;
$$;

COMMIT;


-- ============================================
-- ROLLBACK (Documentado, no ejecutar)
-- ============================================

/*
-- Esta migración es de recuperación, no tiene rollback.
-- Si necesitas deshacer los cambios, revisa manualmente los logs y ejecuta:

BEGIN;

-- Ejemplo de reversión (AJUSTAR SEGÚN LOG):
-- Si se restauró el superadmin:
DELETE FROM public.redpresu_users
WHERE email = 'josivela+super@gmail.com'
  AND created_at > NOW() - INTERVAL '1 hour';

COMMIT;
*/
