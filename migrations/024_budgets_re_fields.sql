-- migrations/024_budgets_re_fields.sql
-- Descripción: Añadir columnas para Recargo de Equivalencia en tabla budgets
-- Fecha: 2025-10-10
-- Bloque: 4 (IRPF y RE)
-- Fase: 2

-- ============================================
-- UP: Aplicar cambios
-- ============================================

BEGIN;

-- 1. Añadir columnas para Recargo de Equivalencia
ALTER TABLE public.budgets
  ADD COLUMN IF NOT EXISTS re_aplica BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS re_total DECIMAL(10,2) DEFAULT 0.00;

-- 2. Comentarios
COMMENT ON COLUMN public.budgets.re_aplica IS 'Indica si se aplica Recargo de Equivalencia (solo si cliente es autónomo)';
COMMENT ON COLUMN public.budgets.re_total IS 'Importe total del Recargo de Equivalencia aplicado';

-- 3. Inicializar re_aplica y re_total para registros existentes
-- Intentar extraer del json_budget_data si existe
UPDATE public.budgets
SET
  re_aplica = COALESCE(
    (json_budget_data->'recargo'->>'aplica')::boolean,
    false
  ),
  re_total = COALESCE(
    (json_budget_data->'recargo'->>'totalRE')::decimal(10,2),
    0.00
  )
WHERE re_aplica IS NULL OR re_total IS NULL;

-- 4. Hacer NOT NULL después de inicializar
ALTER TABLE public.budgets
  ALTER COLUMN re_aplica SET NOT NULL,
  ALTER COLUMN re_total SET NOT NULL;

-- 5. Añadir constraint
ALTER TABLE public.budgets
  ADD CONSTRAINT chk_budgets_re_total CHECK (re_total >= 0);

-- 6. Actualizar total_pagar para incluir RE si existe
-- total_pagar = total (con IVA) - IRPF + RE
UPDATE public.budgets
SET total_pagar = total - COALESCE(irpf, 0) + COALESCE(re_total, 0)
WHERE re_total > 0;

COMMIT;

-- ============================================
-- DOWN: Rollback (documentar, no ejecutar automáticamente)
-- ============================================
-- Para revertir esta migración, ejecutar:
--
-- BEGIN;
-- ALTER TABLE public.budgets DROP CONSTRAINT IF EXISTS chk_budgets_re_total;
-- ALTER TABLE public.budgets DROP COLUMN IF EXISTS re_total;
-- ALTER TABLE public.budgets DROP COLUMN IF EXISTS re_aplica;
-- COMMIT;
