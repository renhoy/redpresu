-- migrations/042_fix_ensure_single_template_function.sql
-- Descripción: Corregir función ensure_single_template para usar nombres correctos de tabla y columna
-- Fecha: 2025-01-26
-- Bloque: Fix crítico
-- Problema: La función usa 'public.tariffs' y 'empresa_id' en vez de 'public.redpresu_tariffs' y 'company_id'
-- Solución: Recrear función con nombres correctos

-- ============================================
-- UP: Aplicar cambios
-- ============================================

BEGIN;

-- 1. Eliminar función antigua
DROP FUNCTION IF EXISTS public.ensure_single_template() CASCADE;

-- 2. Crear función corregida
CREATE FUNCTION public.ensure_single_template() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Si se está marcando como plantilla (is_template = true)
  IF NEW.is_template = true THEN
    -- Desmarcar todas las demás plantillas de la misma empresa
    UPDATE public.redpresu_tariffs
    SET is_template = false
    WHERE company_id = NEW.company_id
      AND id != NEW.id
      AND is_template = true;

    -- Log para debugging
    RAISE NOTICE 'Plantilla establecida: tariff_id=%, company_id=%', NEW.id, NEW.company_id;
  END IF;

  RETURN NEW;
END;
$$;

-- 3. Añadir comentario
COMMENT ON FUNCTION public.ensure_single_template() IS 'Trigger que garantiza que solo haya una tarifa marcada como plantilla por empresa';

-- 4. Recrear trigger (por si acaso fue eliminado al hacer DROP CASCADE)
DROP TRIGGER IF EXISTS trigger_ensure_single_template ON public.redpresu_tariffs;

CREATE TRIGGER trigger_ensure_single_template
BEFORE INSERT OR UPDATE OF is_template
ON public.redpresu_tariffs
FOR EACH ROW
EXECUTE FUNCTION public.ensure_single_template();

COMMENT ON TRIGGER trigger_ensure_single_template ON public.redpresu_tariffs IS
'Ejecuta ensure_single_template() antes de INSERT/UPDATE para mantener una sola plantilla por empresa';

COMMIT;

-- ============================================
-- DOWN: Rollback (documentar, no ejecutar automáticamente)
-- ============================================
-- Para revertir esta migración, ejecutar:
--
-- BEGIN;
-- DROP FUNCTION IF EXISTS public.ensure_single_template() CASCADE;
-- -- Restaurar función antigua (con error)
-- CREATE FUNCTION public.ensure_single_template() RETURNS trigger
--     LANGUAGE plpgsql
--     AS $$
-- BEGIN
--   IF NEW.is_template = true THEN
--     UPDATE public.tariffs
--     SET is_template = false
--     WHERE empresa_id = NEW.empresa_id
--       AND id != NEW.id
--       AND is_template = true;
--     RAISE NOTICE 'Plantilla establecida: tariff_id=%, empresa_id=%', NEW.id, NEW.empresa_id;
--   END IF;
--   RETURN NEW;
-- END;
-- $$;
-- COMMIT;

-- ============================================
-- VERIFICACIÓN POST-MIGRACIÓN
-- ============================================
--
-- Ver función creada:
-- SELECT prosrc FROM pg_proc WHERE proname = 'ensure_single_template';
--
-- Ver trigger:
-- SELECT * FROM pg_trigger WHERE tgname = 'trigger_ensure_single_template';
--
-- Probar función:
-- UPDATE redpresu_tariffs SET is_template = true WHERE id = 'xxx';
-- SELECT id, is_template, company_id FROM redpresu_tariffs WHERE company_id = (SELECT company_id FROM redpresu_tariffs WHERE id = 'xxx');
--
-- ============================================
