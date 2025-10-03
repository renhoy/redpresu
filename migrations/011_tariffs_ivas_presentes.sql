-- migrations/011_tariffs_ivas_presentes.sql
-- Descripción: Añadir campo ivas_presentes a tabla tariffs para almacenar IVAs detectados
-- Fecha: 2025-01-04
-- Bloque: 2 (Mejoras Tarifas)
-- Tarea: 2.2 - Detección Automática IVAs en CSV
-- Fase: 2

-- ============================================
-- UP: Aplicar cambios
-- ============================================

BEGIN;

-- 1. Añadir columna ivas_presentes como array de decimales
ALTER TABLE public.tariffs
  ADD COLUMN IF NOT EXISTS ivas_presentes numeric(5,2)[] DEFAULT '{}';

-- 2. Crear índice GIN para búsquedas eficientes en array
-- GIN (Generalized Inverted Index) es óptimo para arrays
CREATE INDEX IF NOT EXISTS idx_tariffs_ivas_presentes
  ON public.tariffs USING GIN (ivas_presentes);

-- 3. Añadir comentario explicativo
COMMENT ON COLUMN public.tariffs.ivas_presentes IS
  'Array de porcentajes de IVA presentes en la tarifa (ej: {21.00, 10.00, 4.00}). Detectado automáticamente al importar CSV.';

COMMIT;

-- ============================================
-- DOWN: Rollback (documentar, no ejecutar automáticamente)
-- ============================================
-- Para revertir esta migración, ejecutar:
--
-- BEGIN;
-- DROP INDEX IF EXISTS idx_tariffs_ivas_presentes;
-- ALTER TABLE public.tariffs DROP COLUMN IF EXISTS ivas_presentes;
-- COMMIT;
