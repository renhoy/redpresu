-- migrations/015_budgets_irpf_fields.sql
-- Descripción: Añadir columnas para IRPF en tabla budgets
-- Fecha: 2025-01-05
-- Bloque: 4 (IRPF y Recargo de Equivalencia)
-- Fase: 2

-- ============================================
-- UP: Aplicar cambios
-- ============================================

BEGIN;

-- 1. Añadir columnas para IRPF
ALTER TABLE public.budgets
  ADD COLUMN IF NOT EXISTS irpf DECIMAL(10,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS irpf_percentage DECIMAL(5,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS total_pagar DECIMAL(10,2);

-- 2. Comentarios
COMMENT ON COLUMN public.budgets.irpf IS 'Importe de IRPF a retener (solo si emisor es autónomo y cliente es empresa/autónomo)';
COMMENT ON COLUMN public.budgets.irpf_percentage IS 'Porcentaje de IRPF aplicado (típicamente 15%)';
COMMENT ON COLUMN public.budgets.total_pagar IS 'Total a pagar final (total con IVA - IRPF + RE)';

-- 3. Inicializar total_pagar para registros existentes
-- total_pagar = total (que ya incluye IVA) - irpf (inicialmente 0)
UPDATE public.budgets
SET total_pagar = total
WHERE total_pagar IS NULL;

-- 4. Hacer NOT NULL después de inicializar
ALTER TABLE public.budgets
  ALTER COLUMN total_pagar SET NOT NULL;

-- 5. Añadir constraints
ALTER TABLE public.budgets
  ADD CONSTRAINT chk_budgets_irpf CHECK (irpf >= 0),
  ADD CONSTRAINT chk_budgets_irpf_percentage CHECK (irpf_percentage >= 0 AND irpf_percentage <= 100);

-- 6. MODIFICAR constraint existente de totales
-- Eliminar constraint viejo que valida (base + iva) = total
ALTER TABLE public.budgets DROP CONSTRAINT IF EXISTS chk_budgets_totals;

-- Nuevo constraint: validar que los valores sean positivos
ALTER TABLE public.budgets ADD CONSTRAINT chk_budgets_totals CHECK (
    total >= 0
    AND iva >= 0
    AND base >= 0
    AND irpf >= 0
    AND total_pagar >= 0
);

COMMIT;

-- ============================================
-- DOWN: Rollback (documentar, no ejecutar automáticamente)
-- ============================================
-- Para revertir esta migración, ejecutar:
--
-- BEGIN;
-- ALTER TABLE public.budgets DROP CONSTRAINT IF EXISTS chk_budgets_totals;
-- ALTER TABLE public.budgets DROP CONSTRAINT IF EXISTS chk_budgets_irpf_percentage;
-- ALTER TABLE public.budgets DROP CONSTRAINT IF EXISTS chk_budgets_irpf;
-- ALTER TABLE public.budgets DROP COLUMN IF EXISTS total_pagar;
-- ALTER TABLE public.budgets DROP COLUMN IF EXISTS irpf_percentage;
-- ALTER TABLE public.budgets DROP COLUMN IF EXISTS irpf;
-- -- Restaurar constraint original
-- ALTER TABLE public.budgets ADD CONSTRAINT chk_budgets_totals CHECK (
--     total >= 0 AND iva >= 0 AND base >= 0 AND (base + iva) = total
-- );
-- COMMIT;
