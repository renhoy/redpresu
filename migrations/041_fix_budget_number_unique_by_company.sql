-- migrations/041_fix_budget_number_unique_by_company.sql
-- Descripción: Cambiar índice UNIQUE de budget_number para que sea único por empresa
-- Fecha: 2025-01-26
-- Bloque: Fase 2 - Multiempresa
-- Problema: El índice actual es global, causando conflictos entre empresas diferentes
-- Solución: Índice compuesto (company_id, budget_number) para unicidad por empresa

-- ============================================
-- UP: Aplicar cambios
-- ============================================

BEGIN;

-- 1. Eliminar índice UNIQUE global actual
DROP INDEX IF EXISTS public.idx_budgets_number_unique;

-- 2. Crear nuevo índice UNIQUE compuesto por empresa
-- Esto permite que diferentes empresas tengan el mismo budget_number
-- pero mantiene la unicidad dentro de cada empresa
CREATE UNIQUE INDEX idx_budgets_number_unique_by_company
ON public.redpresu_budgets(company_id, budget_number);

-- 3. Actualizar comentario de la columna para reflejar el cambio
COMMENT ON COLUMN public.redpresu_budgets.budget_number IS
  'Número único del presupuesto (alfanumérico, editable). Formato por defecto: YYYYMMDD-HHMMSS. Único dentro de cada empresa (no global).';

COMMIT;

-- ============================================
-- DOWN: Rollback (documentar, no ejecutar automáticamente)
-- ============================================
-- Para revertir esta migración, ejecutar:
--
-- BEGIN;
-- DROP INDEX IF EXISTS public.idx_budgets_number_unique_by_company;
-- CREATE UNIQUE INDEX idx_budgets_number_unique
-- ON public.redpresu_budgets(budget_number);
-- COMMENT ON COLUMN public.redpresu_budgets.budget_number IS
--   'Número único del presupuesto (alfanumérico, editable). Formato por defecto: YYYYMMDD-HHMMSS';
-- COMMIT;

-- ============================================
-- VERIFICACIÓN POST-MIGRACIÓN
-- ============================================
--
-- Ver índice creado:
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename = 'redpresu_budgets'
-- AND indexname = 'idx_budgets_number_unique_by_company';
--
-- Verificar que diferentes empresas pueden tener el mismo budget_number:
-- SELECT company_id, budget_number, COUNT(*)
-- FROM redpresu_budgets
-- GROUP BY company_id, budget_number
-- HAVING COUNT(*) > 1;
-- (Debe retornar 0 filas - no duplicados dentro de cada empresa)
--
-- Verificar que empresas diferentes SÍ pueden tener el mismo número:
-- SELECT budget_number, COUNT(DISTINCT company_id) as empresas
-- FROM redpresu_budgets
-- GROUP BY budget_number
-- HAVING COUNT(DISTINCT company_id) > 1;
-- (Puede retornar filas - esto ahora está permitido)
--
-- ============================================
