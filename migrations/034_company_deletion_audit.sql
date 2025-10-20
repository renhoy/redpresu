-- Migration 034: Company Deletion Audit Log
-- Descripción: Tabla de auditoría para rastrear eliminaciones de empresas
-- Fecha: 2025-01-20
-- VULN-007: Soft-delete con auditoría completa

BEGIN;

-- ============================================
-- Tabla de auditoría de eliminaciones
-- ============================================

CREATE TABLE IF NOT EXISTS public.redpresu_company_deletion_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id INTEGER NOT NULL REFERENCES public.redpresu_companies(id) ON DELETE CASCADE,
  issuer_id UUID REFERENCES public.redpresu_issuers(id) ON DELETE SET NULL,
  deleted_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  deletion_type TEXT NOT NULL CHECK (deletion_type IN ('soft_delete', 'hard_delete', 'restore')),

  -- Snapshot de datos al momento de eliminación
  company_snapshot JSONB NOT NULL,
  issuer_snapshot JSONB,

  -- Estadísticas al momento de eliminación
  users_count INTEGER DEFAULT 0,
  tariffs_count INTEGER DEFAULT 0,
  budgets_count INTEGER DEFAULT 0,

  -- Razón de eliminación (opcional)
  deletion_reason TEXT,

  -- Metadata
  ip_address TEXT,
  user_agent TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Índices para búsqueda eficiente
CREATE INDEX idx_deletion_log_company_id ON public.redpresu_company_deletion_log(company_id);
CREATE INDEX idx_deletion_log_deleted_by ON public.redpresu_company_deletion_log(deleted_by);
CREATE INDEX idx_deletion_log_created_at ON public.redpresu_company_deletion_log(created_at DESC);
CREATE INDEX idx_deletion_log_type ON public.redpresu_company_deletion_log(deletion_type);

-- ============================================
-- RLS Policies (solo superadmin)
-- ============================================

ALTER TABLE public.redpresu_company_deletion_log ENABLE ROW LEVEL SECURITY;

-- Solo superadmin puede ver el log de eliminaciones
CREATE POLICY "deletion_log_select_superadmin"
ON public.redpresu_company_deletion_log FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.redpresu_users
    WHERE id = auth.uid()
    AND role = 'superadmin'
  )
);

-- Solo superadmin puede insertar registros (vía Server Action)
-- Esta policy se puede omitir si solo usamos supabaseAdmin para insertar
CREATE POLICY "deletion_log_insert_superadmin"
ON public.redpresu_company_deletion_log FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.redpresu_users
    WHERE id = auth.uid()
    AND role = 'superadmin'
  )
);

-- ============================================
-- Comentarios de documentación
-- ============================================

COMMENT ON TABLE public.redpresu_company_deletion_log IS
'Registro de auditoría de eliminaciones de empresas. Rastrea soft-deletes, hard-deletes y restauraciones.';

COMMENT ON COLUMN public.redpresu_company_deletion_log.company_snapshot IS
'Snapshot JSON de redpresu_companies al momento de eliminación';

COMMENT ON COLUMN public.redpresu_company_deletion_log.issuer_snapshot IS
'Snapshot JSON de redpresu_issuers al momento de eliminación';

COMMENT ON COLUMN public.redpresu_company_deletion_log.deletion_type IS
'Tipo de operación: soft_delete (marcar deleted_at), hard_delete (borrado permanente), restore (recuperación)';

COMMIT;

-- ============================================
-- Rollback (ejecutar manualmente si necesario)
-- ============================================

-- DROP TABLE IF EXISTS public.redpresu_company_deletion_log CASCADE;
