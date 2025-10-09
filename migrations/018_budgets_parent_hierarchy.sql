-- migrations/018_budgets_parent_hierarchy.sql
-- Descripción: Añadir parent_budget_id para jerarquía de versiones de presupuestos
-- Fecha: 2025-01-06
-- Bloque: 5 - Versiones y Notas (refactoring a jerarquía)

-- ============================================
-- UP: Aplicar cambios
-- ============================================

BEGIN;

-- 1. Añadir columna parent_budget_id para vincular presupuestos jerárquicamente
ALTER TABLE public.budgets
ADD COLUMN IF NOT EXISTS parent_budget_id UUID REFERENCES public.budgets(id) ON DELETE SET NULL;

-- 2. Añadir columna version_number para identificar versiones dentro de una jerarquía
ALTER TABLE public.budgets
ADD COLUMN IF NOT EXISTS version_number INTEGER DEFAULT 1;

-- 3. Índices para mejorar rendimiento de queries jerárquicas
CREATE INDEX IF NOT EXISTS idx_budgets_parent_budget_id ON public.budgets(parent_budget_id);
CREATE INDEX IF NOT EXISTS idx_budgets_parent_version ON public.budgets(parent_budget_id, version_number DESC);

-- 4. Función para obtener el siguiente número de versión para un presupuesto padre
CREATE OR REPLACE FUNCTION get_next_budget_version_number(p_parent_budget_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_max_version INTEGER;
BEGIN
  -- Si no hay padre, es la versión 1
  IF p_parent_budget_id IS NULL THEN
    RETURN 1;
  END IF;

  -- Obtener el máximo version_number de los hijos del padre
  SELECT COALESCE(MAX(version_number), 0) + 1
  INTO v_max_version
  FROM public.budgets
  WHERE parent_budget_id = p_parent_budget_id;

  RETURN v_max_version;
END;
$$;

-- 5. Función recursiva para obtener todos los hijos de un presupuesto (árbol completo)
CREATE OR REPLACE FUNCTION get_budget_children_recursive(p_budget_id UUID)
RETURNS TABLE (
  id UUID,
  parent_budget_id UUID,
  version_number INTEGER,
  client_name TEXT,
  total DECIMAL,
  status TEXT,
  created_at TIMESTAMPTZ,
  depth INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE budget_tree AS (
    -- Caso base: el presupuesto raíz
    SELECT
      b.id,
      b.parent_budget_id,
      b.version_number,
      b.client_name,
      b.total,
      b.status,
      b.created_at,
      0 AS depth
    FROM public.budgets b
    WHERE b.id = p_budget_id

    UNION ALL

    -- Caso recursivo: los hijos
    SELECT
      b.id,
      b.parent_budget_id,
      b.version_number,
      b.client_name,
      b.total,
      b.status,
      b.created_at,
      bt.depth + 1
    FROM public.budgets b
    INNER JOIN budget_tree bt ON b.parent_budget_id = bt.id
  )
  SELECT * FROM budget_tree
  ORDER BY depth, version_number;
END;
$$;

-- 6. Comentarios en columnas
COMMENT ON COLUMN public.budgets.parent_budget_id IS 'ID del presupuesto padre (para jerarquía de versiones)';
COMMENT ON COLUMN public.budgets.version_number IS 'Número de versión dentro de la jerarquía (1, 2, 3...)';

COMMIT;

-- ============================================
-- DOWN: Rollback (documentar, no ejecutar)
-- ============================================

-- DROP FUNCTION IF EXISTS get_budget_children_recursive(UUID);
-- DROP FUNCTION IF EXISTS get_next_budget_version_number(UUID);
-- DROP INDEX IF EXISTS idx_budgets_parent_version;
-- DROP INDEX IF EXISTS idx_budgets_parent_budget_id;
-- ALTER TABLE public.budgets DROP COLUMN IF EXISTS version_number;
-- ALTER TABLE public.budgets DROP COLUMN IF EXISTS parent_budget_id;
