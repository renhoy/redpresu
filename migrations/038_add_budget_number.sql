-- migrations/038_add_budget_number.sql
-- Descripción: Añadir campo budget_number a tabla budgets
-- Fecha: 2025-01-25
-- Bloque: MVP (Mejora)
-- Fase: 2

-- ============================================
-- UP: Aplicar cambios
-- ============================================

BEGIN;

-- Añadir columna budget_number con valor por defecto temporal
ALTER TABLE public.redpresu_budgets
ADD COLUMN IF NOT EXISTS budget_number VARCHAR(100);

-- Generar números únicos para presupuestos existentes basados en created_at
UPDATE public.redpresu_budgets
SET budget_number = TO_CHAR(created_at, 'YYYYMMDD-HH24MISS')
WHERE budget_number IS NULL;

-- Hacer la columna NOT NULL después de rellenar valores
ALTER TABLE public.redpresu_budgets
ALTER COLUMN budget_number SET NOT NULL;

-- Crear índice único para garantizar unicidad
CREATE UNIQUE INDEX IF NOT EXISTS idx_budgets_number_unique
ON public.redpresu_budgets(budget_number);

-- Añadir comentario
COMMENT ON COLUMN public.redpresu_budgets.budget_number IS
  'Número único del presupuesto (alfanumérico, editable). Formato por defecto: YYYYMMDD-HHMMSS';

COMMIT;

-- ============================================
-- DOWN: Rollback (documentar, no ejecutar automáticamente)
-- ============================================
-- Para revertir esta migración, ejecutar:
--
-- BEGIN;
-- DROP INDEX IF EXISTS idx_budgets_number_unique;
-- ALTER TABLE public.redpresu_budgets DROP COLUMN IF EXISTS budget_number;
-- COMMIT;

-- ============================================
-- VERIFICACIÓN POST-MIGRACIÓN
-- ============================================
--
-- Ver columna añadida:
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'redpresu_budgets' AND column_name = 'budget_number';
--
-- Ver índice creado:
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename = 'redpresu_budgets' AND indexname = 'idx_budgets_number_unique';
--
-- ============================================
