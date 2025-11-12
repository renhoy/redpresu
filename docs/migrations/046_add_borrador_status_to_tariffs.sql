-- ============================================
-- Migración 046: Añadir estado 'Borrador' a tarifas
-- ============================================
-- Descripción: Añade el estado 'Borrador' al constraint CHECK del campo status
--              para permitir guardar tarifas incompletas
-- Fecha: 2025-01-29
-- Bloque: 2 - Mejoras Tarifas (Fase 2)
--
-- IMPORTANTE: Ejecutar en Supabase Studio (SQL Editor)
-- ============================================

BEGIN;

-- 1. Eliminar el constraint CHECK actual (solo permite 'Activa' e 'Inactiva')
ALTER TABLE public.redpresu_tariffs
  DROP CONSTRAINT IF EXISTS tariffs_status_check;

-- 2. Crear nuevo constraint CHECK que incluye 'Borrador'
ALTER TABLE public.redpresu_tariffs
  ADD CONSTRAINT tariffs_status_check
  CHECK (status = ANY (ARRAY['Borrador'::text, 'Activa'::text, 'Inactiva'::text]));

-- 3. Actualizar el comentario de la columna para documentar el cambio
COMMENT ON COLUMN public.redpresu_tariffs.status IS
  'Estado de la tarifa: Borrador (incompleta), Activa (puede usarse en presupuestos), Inactiva (archivada)';

COMMIT;

-- ============================================
-- ROLLBACK (en caso de necesitar revertir)
-- ============================================
-- BEGIN;
--
-- -- 1. Actualizar tarifas en borrador a Inactiva (para no perder datos)
-- UPDATE public.redpresu_tariffs
-- SET status = 'Inactiva'
-- WHERE status = 'Borrador';
--
-- -- 2. Eliminar constraint actual
-- ALTER TABLE public.redpresu_tariffs
--   DROP CONSTRAINT IF EXISTS tariffs_status_check;
--
-- -- 3. Recrear constraint original (solo Activa e Inactiva)
-- ALTER TABLE public.redpresu_tariffs
--   ADD CONSTRAINT tariffs_status_check
--   CHECK (status = ANY (ARRAY['Activa'::text, 'Inactiva'::text]));
--
-- COMMIT;
