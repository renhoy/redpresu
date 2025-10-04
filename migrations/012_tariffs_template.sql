-- migrations/012_tariffs_template.sql
-- Descripción: Sistema de tarifa plantilla - solo 1 plantilla activa por empresa
-- Fecha: 2025-01-04
-- Bloque: 2 (Mejoras Tarifas)
-- Tarea: 2.3 - Tarifa por Defecto (Plantilla)
-- Fase: 2

-- ============================================
-- UP: Aplicar cambios
-- ============================================

BEGIN;

-- 1. Añadir columna is_template
ALTER TABLE public.tariffs
  ADD COLUMN IF NOT EXISTS is_template boolean DEFAULT false NOT NULL;

-- 2. Crear índice para optimizar consultas de plantillas
CREATE INDEX IF NOT EXISTS idx_tariffs_is_template
  ON public.tariffs(empresa_id, is_template)
  WHERE is_template = true;

-- 3. Añadir comentario explicativo
COMMENT ON COLUMN public.tariffs.is_template IS
  'Indica si esta tarifa es la plantilla por defecto de la empresa. Solo puede haber una plantilla activa por empresa.';

-- 4. Crear función que asegura solo 1 plantilla activa por empresa
CREATE OR REPLACE FUNCTION public.ensure_single_template()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Si se está marcando como plantilla (is_template = true)
  IF NEW.is_template = true THEN
    -- Desmarcar todas las demás plantillas de la misma empresa
    UPDATE public.tariffs
    SET is_template = false
    WHERE empresa_id = NEW.empresa_id
      AND id != NEW.id
      AND is_template = true;

    -- Log para debugging
    RAISE NOTICE 'Plantilla establecida: tariff_id=%, empresa_id=%', NEW.id, NEW.empresa_id;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.ensure_single_template() IS
  'Trigger que garantiza que solo haya una tarifa marcada como plantilla por empresa';

-- 5. Crear trigger que ejecuta la función
DROP TRIGGER IF EXISTS trigger_ensure_single_template ON public.tariffs;

CREATE TRIGGER trigger_ensure_single_template
  BEFORE INSERT OR UPDATE OF is_template
  ON public.tariffs
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_single_template();

COMMENT ON TRIGGER trigger_ensure_single_template ON public.tariffs IS
  'Ejecuta ensure_single_template() antes de INSERT/UPDATE para mantener una sola plantilla por empresa';

COMMIT;

-- ============================================
-- DOWN: Rollback (documentar, no ejecutar automáticamente)
-- ============================================
-- Para revertir esta migración, ejecutar:
--
-- BEGIN;
-- DROP TRIGGER IF EXISTS trigger_ensure_single_template ON public.tariffs;
-- DROP FUNCTION IF EXISTS public.ensure_single_template();
-- DROP INDEX IF EXISTS idx_tariffs_is_template;
-- ALTER TABLE public.tariffs DROP COLUMN IF EXISTS is_template;
-- COMMIT;
