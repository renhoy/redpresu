-- migrations/033_soft_delete_issuers.sql
-- Descripción: Implementar soft-delete para redpresu_issuers
-- Fecha: 2025-01-20
-- Vulnerabilidad: VULN-007 - Eliminación en cascada sin confirmación
-- Esfuerzo: 4h

-- ============================================
-- UP: Aplicar cambios
-- ============================================

BEGIN;

-- 1. Añadir columna deleted_at a redpresu_issuers
ALTER TABLE public.redpresu_issuers
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;

-- 2. Crear índice parcial para soft-deleted (solo empresas eliminadas)
CREATE INDEX IF NOT EXISTS idx_issuers_deleted_at
ON public.redpresu_issuers(deleted_at)
WHERE deleted_at IS NOT NULL;

-- 3. Crear índice para consultas de empresas activas
CREATE INDEX IF NOT EXISTS idx_issuers_active
ON public.redpresu_issuers(company_id)
WHERE deleted_at IS NULL;

-- 4. Comentarios
COMMENT ON COLUMN public.redpresu_issuers.deleted_at IS 'Timestamp de eliminación (soft-delete). NULL = activo, timestamp = eliminado';

-- 5. Actualizar RLS policies para excluir empresas eliminadas

-- 5.1 Drop existing policies
DROP POLICY IF EXISTS "issuers_select_own_company" ON public.redpresu_issuers;
DROP POLICY IF EXISTS "issuers_insert_own_company" ON public.redpresu_issuers;
DROP POLICY IF EXISTS "issuers_update_own_company" ON public.redpresu_issuers;
DROP POLICY IF EXISTS "issuers_delete_own_company" ON public.redpresu_issuers;

-- 5.2 Recreate policies con filtro deleted_at IS NULL

-- SELECT: Solo empresas activas (no eliminadas)
CREATE POLICY "issuers_select_own_company"
ON public.redpresu_issuers FOR SELECT
USING (
  company_id IN (
    SELECT company_id
    FROM public.redpresu_users
    WHERE id = auth.uid()
  )
  AND deleted_at IS NULL
);

-- INSERT: Solo en empresa propia (siempre activa al crear)
CREATE POLICY "issuers_insert_own_company"
ON public.redpresu_issuers FOR INSERT
WITH CHECK (
  company_id IN (
    SELECT company_id
    FROM public.redpresu_users
    WHERE id = auth.uid()
  )
  AND deleted_at IS NULL
);

-- UPDATE: Solo empresa propia activa
CREATE POLICY "issuers_update_own_company"
ON public.redpresu_issuers FOR UPDATE
USING (
  company_id IN (
    SELECT company_id
    FROM public.redpresu_users
    WHERE id = auth.uid()
  )
  AND deleted_at IS NULL
)
WITH CHECK (
  company_id IN (
    SELECT company_id
    FROM public.redpresu_users
    WHERE id = auth.uid()
  )
);

-- DELETE: Solo superadmin puede hacer soft-delete
-- (En realidad se hace UPDATE deleted_at, no DELETE)
CREATE POLICY "issuers_delete_own_company"
ON public.redpresu_issuers FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.redpresu_users
    WHERE id = auth.uid()
    AND role = 'superadmin'
  )
);

-- 6. Crear vista de empresas activas (helper para queries)
CREATE OR REPLACE VIEW public.active_issuers AS
SELECT *
FROM public.redpresu_issuers
WHERE deleted_at IS NULL;

COMMENT ON VIEW public.active_issuers IS 'Vista de empresas activas (no eliminadas). Usar en queries normales.';

COMMIT;

-- ============================================
-- DOWN: Rollback (documentar, no ejecutar)
-- ============================================

/*
BEGIN;

-- Eliminar vista
DROP VIEW IF EXISTS public.active_issuers;

-- Eliminar índices
DROP INDEX IF EXISTS public.idx_issuers_deleted_at;
DROP INDEX IF EXISTS public.idx_issuers_active;

-- Eliminar columna (¡CUIDADO! pérdida de datos)
ALTER TABLE public.redpresu_issuers
DROP COLUMN IF EXISTS deleted_at;

-- Recrear policies originales (sin filtro deleted_at)
DROP POLICY IF EXISTS "issuers_select_own_company" ON public.redpresu_issuers;
DROP POLICY IF EXISTS "issuers_insert_own_company" ON public.redpresu_issuers;
DROP POLICY IF EXISTS "issuers_update_own_company" ON public.redpresu_issuers;
DROP POLICY IF EXISTS "issuers_delete_own_company" ON public.redpresu_issuers;

CREATE POLICY "issuers_select_own_company"
ON public.redpresu_issuers FOR SELECT
USING (
  company_id IN (
    SELECT company_id FROM public.redpresu_users WHERE id = auth.uid()
  )
);

CREATE POLICY "issuers_insert_own_company"
ON public.redpresu_issuers FOR INSERT
WITH CHECK (
  company_id IN (
    SELECT company_id FROM public.redpresu_users WHERE id = auth.uid()
  )
);

CREATE POLICY "issuers_update_own_company"
ON public.redpresu_issuers FOR UPDATE
USING (
  company_id IN (
    SELECT company_id FROM public.redpresu_users WHERE id = auth.uid()
  )
);

CREATE POLICY "issuers_delete_own_company"
ON public.redpresu_issuers FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.redpresu_users
    WHERE id = auth.uid() AND role = 'superadmin'
  )
);

COMMIT;
*/
