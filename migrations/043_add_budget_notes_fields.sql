-- migrations/043_add_budget_notes_fields.sql
-- Descripción: Añadir campos summary_note y conditions_note a redpresu_budgets
-- Fecha: 2025-01-28
-- Bloque: Fase 2 - Notas Independientes por Presupuesto

-- ============================================
-- UP: Aplicar cambios
-- ============================================

BEGIN;

-- Añadir campos para notas independientes en cada presupuesto
ALTER TABLE public.redpresu_budgets
ADD COLUMN IF NOT EXISTS summary_note TEXT,
ADD COLUMN IF NOT EXISTS conditions_note TEXT;

-- Comentarios para documentar los campos
COMMENT ON COLUMN public.redpresu_budgets.summary_note IS 'Nota personalizada del sumario para este presupuesto (independiente de la tarifa)';
COMMENT ON COLUMN public.redpresu_budgets.conditions_note IS 'Nota personalizada de condiciones para este presupuesto (independiente de la tarifa)';

-- Copiar notas existentes de tarifas a presupuestos que no tengan notas
-- Esto se hace una sola vez para presupuestos existentes
UPDATE public.redpresu_budgets b
SET summary_note = t.summary_note,
    conditions_note = t.conditions_note
FROM public.redpresu_tariffs t
WHERE b.tariff_id = t.id
  AND (b.summary_note IS NULL OR b.summary_note = '')
  AND (b.conditions_note IS NULL OR b.conditions_note = '');

COMMIT;

-- ============================================
-- DOWN: Rollback (documentar, no ejecutar)
-- ============================================

-- ALTER TABLE public.redpresu_budgets DROP COLUMN IF EXISTS summary_note;
-- ALTER TABLE public.redpresu_budgets DROP COLUMN IF EXISTS conditions_note;
