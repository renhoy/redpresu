-- ============================================
-- EJECUTAR MIGRACIÓN 024: Campos RE en budgets
-- ============================================

-- Copiar y pegar este código en el SQL Editor de Supabase:

-- 1. Añadir columnas para Recargo de Equivalencia
ALTER TABLE public.budgets
  ADD COLUMN IF NOT EXISTS re_aplica BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS re_total DECIMAL(10,2) DEFAULT 0.00;

-- 2. Inicializar valores para registros existentes desde json_budget_data
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

-- 3. Hacer NOT NULL después de inicializar
ALTER TABLE public.budgets
  ALTER COLUMN re_aplica SET NOT NULL,
  ALTER COLUMN re_total SET NOT NULL;

-- 4. Añadir constraint
ALTER TABLE public.budgets
  ADD CONSTRAINT chk_budgets_re_total CHECK (re_total >= 0);

-- 5. Actualizar total_pagar para incluir RE
UPDATE public.budgets
SET total_pagar = total - COALESCE(irpf, 0) + COALESCE(re_total, 0)
WHERE re_total > 0;

-- 6. Verificar que se crearon correctamente
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'budgets'
  AND column_name IN ('re_aplica', 're_total')
ORDER BY column_name;

-- ============================================
-- NOTAS:
-- ============================================
-- - re_aplica: checkbox "Aplicar Recargo de Equivalencia"
-- - re_total: suma total de todos los recargos
-- - Los recargos detallados por IVA se guardan en json_budget_data.recargo.recargos
