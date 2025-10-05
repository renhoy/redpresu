-- migrations/017_budget_versions.sql
-- Descripción: Crear tabla budget_versions y añadir json_client_data a budgets
-- Fecha: 2025-01-06
-- Bloque: 5 - Versiones y Notas

-- ============================================
-- UP: Aplicar cambios
-- ============================================

BEGIN;

-- 1. Añadir columna json_client_data a budgets para almacenar snapshot de datos del cliente
ALTER TABLE public.budgets
ADD COLUMN IF NOT EXISTS json_client_data JSONB;

-- Poblar json_client_data con datos existentes de clientes
UPDATE public.budgets
SET json_client_data = jsonb_build_object(
  'client_type', client_type,
  'client_name', client_name,
  'client_nif_nie', client_nif_nie,
  'client_phone', client_phone,
  'client_email', client_email,
  'client_web', client_web,
  'client_address', client_address,
  'client_postal_code', client_postal_code,
  'client_locality', client_locality,
  'client_province', client_province,
  'client_acceptance', client_acceptance
)
WHERE json_client_data IS NULL;

-- 2. Crear tabla budget_versions para almacenar historial de versiones
CREATE TABLE IF NOT EXISTS public.budget_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id UUID NOT NULL REFERENCES public.budgets(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  version_name TEXT,

  -- Snapshot completo del presupuesto en el momento de crear la versión
  json_budget_data JSONB NOT NULL,
  json_client_data JSONB NOT NULL,

  -- Totales en el momento de la versión
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  base_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  irpf DECIMAL(10,2) DEFAULT 0,
  irpf_percentage DECIMAL(5,2) DEFAULT 0,
  total_pagar DECIMAL(10,2) DEFAULT 0,

  -- Metadatos
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,

  -- Constraint: combinación budget_id + version_number única
  CONSTRAINT unique_budget_version UNIQUE(budget_id, version_number)
);

-- 3. Índices para mejor rendimiento
CREATE INDEX idx_budget_versions_budget_id ON public.budget_versions(budget_id);
CREATE INDEX idx_budget_versions_created_at ON public.budget_versions(created_at DESC);
CREATE INDEX idx_budget_versions_created_by ON public.budget_versions(created_by);

-- 4. RLS policies para budget_versions
ALTER TABLE public.budget_versions ENABLE ROW LEVEL SECURITY;

-- Policy SELECT: usuarios pueden ver versiones de presupuestos de su empresa
CREATE POLICY "budget_versions_select_policy"
ON public.budget_versions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.budgets b
    JOIN public.users u ON b.user_id = u.id
    WHERE b.id = budget_versions.budget_id
    AND u.empresa_id = (
      SELECT empresa_id FROM public.users WHERE id = auth.uid()
    )
  )
);

-- Policy INSERT: usuarios pueden crear versiones de presupuestos propios o si son admin
CREATE POLICY "budget_versions_insert_policy"
ON public.budget_versions FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.budgets b
    JOIN public.users u ON b.user_id = u.id
    WHERE b.id = budget_versions.budget_id
    AND (
      b.user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
        AND role IN ('admin', 'superadmin')
        AND empresa_id = u.empresa_id
      )
    )
  )
);

-- Policy DELETE: solo admin/superadmin pueden eliminar versiones
CREATE POLICY "budget_versions_delete_policy"
ON public.budget_versions FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.budgets b
    JOIN public.users u ON b.user_id = u.id
    WHERE b.id = budget_versions.budget_id
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('admin', 'superadmin')
      AND empresa_id = u.empresa_id
    )
  )
);

-- 5. Función para obtener el siguiente número de versión
CREATE OR REPLACE FUNCTION get_next_version_number(p_budget_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_max_version INTEGER;
BEGIN
  SELECT COALESCE(MAX(version_number), 0) + 1
  INTO v_max_version
  FROM public.budget_versions
  WHERE budget_id = p_budget_id;

  RETURN v_max_version;
END;
$$;

-- 6. Comentarios en tablas y columnas
COMMENT ON TABLE public.budget_versions IS 'Almacena versiones históricas de presupuestos';
COMMENT ON COLUMN public.budget_versions.version_number IS 'Número secuencial de versión por presupuesto';
COMMENT ON COLUMN public.budget_versions.json_budget_data IS 'Snapshot completo de json_budget_data en el momento de la versión';
COMMENT ON COLUMN public.budget_versions.json_client_data IS 'Snapshot completo de json_client_data en el momento de la versión';
COMMENT ON COLUMN public.budgets.json_client_data IS 'Snapshot de datos del cliente para versionado';

COMMIT;

-- ============================================
-- DOWN: Rollback (documentar, no ejecutar)
-- ============================================

-- DROP FUNCTION IF EXISTS get_next_version_number(UUID);
-- DROP TABLE IF EXISTS public.budget_versions CASCADE;
-- ALTER TABLE public.budgets DROP COLUMN IF EXISTS json_client_data;
