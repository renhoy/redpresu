-- ============================================
-- Migración 043: Protección del Superadmin y Empresa 1
-- ============================================
-- Descripción: Protege al superadmin y la empresa 1 de ser eliminados
-- Fecha: 2025-01-29
-- Autor: Claude Code
--
-- Cambios:
-- 1. Trigger para prevenir borrado del superadmin (josivela+super@gmail.com)
-- 2. Trigger para prevenir borrado de empresa id=1
-- 3. Trigger para reasignar superadmin a empresa 1 si su empresa se borra
-- 4. Protección extra: UPDATE que cambie company_id del superadmin a NULL
--
-- IMPORTANTE: Estas protecciones son CRÍTICAS para mantener acceso al sistema
-- ============================================

BEGIN;

-- ============================================
-- 1. FUNCIÓN Y TRIGGER: Prevenir borrado del superadmin
-- ============================================

-- Función que previene eliminar el usuario superadmin principal
CREATE OR REPLACE FUNCTION public.prevent_delete_superadmin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Prevenir borrado del superadmin principal del sistema
  IF OLD.email = 'josivela+super@gmail.com' THEN
    RAISE EXCEPTION 'PROTECCIÓN SISTEMA: No se puede eliminar el superadmin principal (%). Este usuario es crítico para el funcionamiento del sistema.', OLD.email
      USING HINT = 'Si necesitas desactivar este usuario, usa status=inactive en lugar de eliminarlo';
  END IF;

  -- Prevenir borrado de cualquier usuario superadmin de empresa 1
  IF OLD.role = 'superadmin' AND OLD.company_id = 1 THEN
    RAISE EXCEPTION 'PROTECCIÓN SISTEMA: No se puede eliminar usuarios superadmin de la empresa 1 (id: %). Esta empresa es crítica para el sistema.', OLD.id
      USING HINT = 'Si necesitas desactivar este usuario, usa status=inactive';
  END IF;

  -- Permitir borrado de otros usuarios
  RETURN OLD;
END;
$$;

-- Comentario de la función
COMMENT ON FUNCTION public.prevent_delete_superadmin() IS
'Trigger function que previene la eliminación del superadmin principal (josivela+super@gmail.com) y cualquier superadmin de empresa 1';

-- Crear trigger BEFORE DELETE en redpresu_users
DROP TRIGGER IF EXISTS trigger_prevent_delete_superadmin ON public.redpresu_users;
CREATE TRIGGER trigger_prevent_delete_superadmin
  BEFORE DELETE ON public.redpresu_users
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_delete_superadmin();

-- Comentario del trigger
COMMENT ON TRIGGER trigger_prevent_delete_superadmin ON public.redpresu_users IS
'Previene la eliminación accidental del superadmin principal del sistema';


-- ============================================
-- 2. FUNCIÓN Y TRIGGER: Prevenir borrado de empresa 1
-- ============================================

-- Función que previene eliminar la empresa con id=1
CREATE OR REPLACE FUNCTION public.prevent_delete_company_1()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Prevenir borrado de empresa id=1 (empresa sistema)
  IF OLD.id = 1 THEN
    RAISE EXCEPTION 'PROTECCIÓN SISTEMA: No se puede eliminar la empresa con id=1 (%). Esta es la empresa del sistema y es crítica para el funcionamiento.', OLD.name
      USING HINT = 'La empresa 1 sirve como fallback para usuarios huérfanos. No debe eliminarse nunca.';
  END IF;

  -- Permitir borrado de otras empresas
  RETURN OLD;
END;
$$;

-- Comentario de la función
COMMENT ON FUNCTION public.prevent_delete_company_1() IS
'Trigger function que previene la eliminación de la empresa con id=1 (empresa del sistema)';

-- Crear trigger BEFORE DELETE en redpresu_companies
DROP TRIGGER IF EXISTS trigger_prevent_delete_company_1 ON public.redpresu_companies;
CREATE TRIGGER trigger_prevent_delete_company_1
  BEFORE DELETE ON public.redpresu_companies
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_delete_company_1();

-- Comentario del trigger
COMMENT ON TRIGGER trigger_prevent_delete_company_1 ON public.redpresu_companies IS
'Previene la eliminación de la empresa con id=1 (empresa del sistema)';


-- ============================================
-- 3. FUNCIÓN Y TRIGGER: Reasignar superadmin a empresa 1 si su empresa se borra
-- ============================================

-- Función que reasigna usuarios superadmin a empresa 1 antes de borrar su empresa
CREATE OR REPLACE FUNCTION public.reassign_superadmin_on_company_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_reassigned_count INTEGER;
BEGIN
  -- Si se va a borrar una empresa (que NO sea la 1),
  -- reasignar todos sus usuarios superadmin a empresa 1
  IF OLD.id != 1 THEN
    -- Reasignar superadmins de la empresa a borrar → empresa 1
    UPDATE public.redpresu_users
    SET
      company_id = 1,
      updated_at = NOW()
    WHERE company_id = OLD.id
      AND role = 'superadmin';

    -- Obtener cantidad de usuarios reasignados
    GET DIAGNOSTICS v_reassigned_count = ROW_COUNT;

    -- Log si se reasignaron usuarios
    IF v_reassigned_count > 0 THEN
      RAISE NOTICE 'PROTECCIÓN SISTEMA: Se reasignaron % usuarios superadmin de empresa % a empresa 1 antes de eliminarla',
        v_reassigned_count, OLD.id;
    END IF;
  END IF;

  -- Permitir el borrado de la empresa
  RETURN OLD;
END;
$$;

-- Comentario de la función
COMMENT ON FUNCTION public.reassign_superadmin_on_company_delete() IS
'Trigger function que reasigna automáticamente usuarios superadmin a empresa 1 si su empresa va a ser eliminada';

-- Crear trigger BEFORE DELETE en redpresu_companies
DROP TRIGGER IF EXISTS trigger_reassign_superadmin_company ON public.redpresu_companies;
CREATE TRIGGER trigger_reassign_superadmin_company
  BEFORE DELETE ON public.redpresu_companies
  FOR EACH ROW
  EXECUTE FUNCTION public.reassign_superadmin_on_company_delete();

-- Comentario del trigger
COMMENT ON TRIGGER trigger_reassign_superadmin_company ON public.redpresu_companies IS
'Reasigna usuarios superadmin a empresa 1 antes de eliminar su empresa';


-- ============================================
-- 4. FUNCIÓN Y TRIGGER: Prevenir UPDATE que cambie company_id del superadmin a NULL
-- ============================================

-- Función que previene cambiar company_id del superadmin a NULL o empresa inválida
CREATE OR REPLACE FUNCTION public.protect_superadmin_company()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Solo para el superadmin principal
  IF OLD.email = 'josivela+super@gmail.com' THEN
    -- Prevenir cambio a company_id NULL
    IF NEW.company_id IS NULL THEN
      RAISE EXCEPTION 'PROTECCIÓN SISTEMA: No se puede asignar company_id=NULL al superadmin principal (%)', OLD.email
        USING HINT = 'El superadmin debe estar siempre asociado a una empresa válida';
    END IF;

    -- Si cambia de empresa, validar que la nueva empresa existe
    IF NEW.company_id != OLD.company_id THEN
      -- Verificar que existe empresa destino
      IF NOT EXISTS (SELECT 1 FROM public.redpresu_companies WHERE id = NEW.company_id) THEN
        RAISE EXCEPTION 'PROTECCIÓN SISTEMA: No se puede asignar el superadmin a empresa inexistente (company_id=%)', NEW.company_id;
      END IF;

      -- Log del cambio
      RAISE NOTICE 'PROTECCIÓN SISTEMA: Superadmin % cambió de empresa % a empresa %',
        OLD.email, OLD.company_id, NEW.company_id;
    END IF;
  END IF;

  -- Permitir la actualización
  RETURN NEW;
END;
$$;

-- Comentario de la función
COMMENT ON FUNCTION public.protect_superadmin_company() IS
'Trigger function que previene cambios inválidos en company_id del superadmin principal';

-- Crear trigger BEFORE UPDATE en redpresu_users
DROP TRIGGER IF EXISTS trigger_protect_superadmin_company ON public.redpresu_users;
CREATE TRIGGER trigger_protect_superadmin_company
  BEFORE UPDATE OF company_id ON public.redpresu_users
  FOR EACH ROW
  WHEN (OLD.company_id IS DISTINCT FROM NEW.company_id)
  EXECUTE FUNCTION public.protect_superadmin_company();

-- Comentario del trigger
COMMENT ON TRIGGER trigger_protect_superadmin_company ON public.redpresu_users IS
'Previene cambios inválidos en company_id del superadmin principal (NULL o empresa inexistente)';


-- ============================================
-- 5. VERIFICACIÓN: Garantizar que empresa 1 existe y está activa
-- ============================================

-- Verificar que empresa 1 existe
DO $$
DECLARE
  v_company_exists BOOLEAN;
  v_company_name TEXT;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM public.redpresu_companies WHERE id = 1
  ) INTO v_company_exists;

  IF NOT v_company_exists THEN
    -- Crear empresa 1 si no existe
    INSERT INTO public.redpresu_companies (id, name, status, created_at, updated_at)
    VALUES (1, 'Jeyca Sistemas (Sistema)', 'active', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;

    RAISE NOTICE 'PROTECCIÓN SISTEMA: Empresa 1 creada como empresa del sistema';
  ELSE
    -- Verificar que está activa
    SELECT name INTO v_company_name
    FROM public.redpresu_companies
    WHERE id = 1;

    -- Asegurar que está activa
    UPDATE public.redpresu_companies
    SET status = 'active', updated_at = NOW()
    WHERE id = 1 AND status != 'active';

    IF FOUND THEN
      RAISE NOTICE 'PROTECCIÓN SISTEMA: Empresa 1 (%) reactivada', v_company_name;
    ELSE
      RAISE NOTICE 'PROTECCIÓN SISTEMA: Empresa 1 (%) verificada y activa', v_company_name;
    END IF;
  END IF;
END;
$$;


-- ============================================
-- 6. VERIFICACIÓN FINAL: Testear triggers
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'MIGRACIÓN 043: PROTECCIONES DEL SUPERADMIN';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'Triggers creados exitosamente:';
  RAISE NOTICE '  ✓ trigger_prevent_delete_superadmin';
  RAISE NOTICE '  ✓ trigger_prevent_delete_company_1';
  RAISE NOTICE '  ✓ trigger_reassign_superadmin_company';
  RAISE NOTICE '  ✓ trigger_protect_superadmin_company';
  RAISE NOTICE '';
  RAISE NOTICE 'Protecciones activas:';
  RAISE NOTICE '  ✓ No se puede borrar el superadmin (josivela+super@gmail.com)';
  RAISE NOTICE '  ✓ No se puede borrar ningún superadmin de empresa 1';
  RAISE NOTICE '  ✓ No se puede borrar la empresa 1';
  RAISE NOTICE '  ✓ Si se borra empresa de superadmin, se reasigna a empresa 1';
  RAISE NOTICE '  ✓ No se puede cambiar company_id del superadmin a NULL';
  RAISE NOTICE '';
  RAISE NOTICE 'IMPORTANTE:';
  RAISE NOTICE '  - Para desactivar el superadmin, usar status=inactive';
  RAISE NOTICE '  - La empresa 1 es crítica para el sistema';
  RAISE NOTICE '  - Estos triggers previenen pérdida de acceso al sistema';
  RAISE NOTICE '================================================';
  RAISE NOTICE '';
END;
$$;

COMMIT;


-- ============================================
-- ROLLBACK (Documentado, no ejecutar)
-- ============================================

/*
BEGIN;

-- Eliminar triggers
DROP TRIGGER IF EXISTS trigger_prevent_delete_superadmin ON public.redpresu_users;
DROP TRIGGER IF EXISTS trigger_prevent_delete_company_1 ON public.redpresu_companies;
DROP TRIGGER IF EXISTS trigger_reassign_superadmin_company ON public.redpresu_companies;
DROP TRIGGER IF EXISTS trigger_protect_superadmin_company ON public.redpresu_users;

-- Eliminar funciones
DROP FUNCTION IF EXISTS public.prevent_delete_superadmin();
DROP FUNCTION IF EXISTS public.prevent_delete_company_1();
DROP FUNCTION IF EXISTS public.reassign_superadmin_on_company_delete();
DROP FUNCTION IF EXISTS public.protect_superadmin_company();

COMMIT;
*/
