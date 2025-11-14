-- ============================================
-- Fix: Actualizar función protect_superadmin_company
-- ============================================
-- La función tenía referencia a public.redpresu_companies (tabla antigua)
-- Ahora apunta correctamente a redpresu.companies
-- ============================================

BEGIN;

-- 1. Eliminar el trigger
DROP TRIGGER IF EXISTS trigger_protect_superadmin_company ON redpresu.users;

-- 2. Eliminar la función antigua
DROP FUNCTION IF EXISTS public.protect_superadmin_company() CASCADE;

-- 3. Recrear la función con la referencia correcta
CREATE OR REPLACE FUNCTION public.protect_superadmin_company()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
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
      -- Verificar que existe empresa destino (CORREGIDO: redpresu.companies en lugar de public.redpresu_companies)
      IF NOT EXISTS (SELECT 1 FROM redpresu.companies WHERE id = NEW.company_id) THEN
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
$function$;

-- 4. Recrear el trigger
CREATE TRIGGER trigger_protect_superadmin_company
  BEFORE UPDATE ON redpresu.users
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_superadmin_company();

COMMIT;

-- ============================================
-- Verificación
-- ============================================
-- Ver que el trigger se creó correctamente
SELECT
    t.tgname as trigger_nombre,
    c.relname as tabla,
    pg_get_triggerdef(t.oid) as definicion
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
WHERE t.tgname = 'trigger_protect_superadmin_company';
