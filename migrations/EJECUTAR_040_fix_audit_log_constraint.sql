-- ============================================
-- Migration 040: Create company_deletion_log audit table
-- ============================================
-- Descripción: Crear tabla de auditoría para eliminaciones de empresas
-- Fecha: 2025-01-27
-- IMPORTANTE: Ejecutar en Supabase SQL Editor
-- ============================================

-- Paso 1: Eliminar objetos existentes (si existen) en orden correcto
DROP POLICY IF EXISTS "deletion_log_insert_superadmin" ON public.redpresu_company_deletion_log;
DROP POLICY IF EXISTS "deletion_log_select_superadmin" ON public.redpresu_company_deletion_log;
DROP INDEX IF EXISTS public.idx_deletion_log_type;
DROP INDEX IF EXISTS public.idx_deletion_log_created_at;
DROP INDEX IF EXISTS public.idx_deletion_log_deleted_by;
DROP INDEX IF EXISTS public.idx_deletion_log_company_id;
DROP TABLE IF EXISTS public.redpresu_company_deletion_log CASCADE;

-- Paso 2: Crear tabla de auditoría
CREATE TABLE public.redpresu_company_deletion_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id INTEGER REFERENCES public.redpresu_companies(id) ON DELETE SET NULL,
  issuer_id UUID REFERENCES public.redpresu_issuers(id) ON DELETE SET NULL,
  deleted_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  deletion_type TEXT NOT NULL CHECK (deletion_type IN ('soft_delete', 'permanent_delete', 'restore')),
  company_snapshot JSONB NOT NULL,
  issuer_snapshot JSONB,
  full_backup JSONB,
  users_count INTEGER DEFAULT 0,
  tariffs_count INTEGER DEFAULT 0,
  budgets_count INTEGER DEFAULT 0,
  deletion_reason TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Paso 3: Crear índices
CREATE INDEX idx_deletion_log_company_id ON public.redpresu_company_deletion_log(company_id);
CREATE INDEX idx_deletion_log_deleted_by ON public.redpresu_company_deletion_log(deleted_by);
CREATE INDEX idx_deletion_log_created_at ON public.redpresu_company_deletion_log(created_at DESC);
CREATE INDEX idx_deletion_log_type ON public.redpresu_company_deletion_log(deletion_type);

-- Paso 4: Habilitar RLS
ALTER TABLE public.redpresu_company_deletion_log ENABLE ROW LEVEL SECURITY;

-- Paso 5: Crear policies
CREATE POLICY "deletion_log_select_superadmin"
ON public.redpresu_company_deletion_log FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.redpresu_users
    WHERE id = auth.uid()
    AND role = 'superadmin'
  )
);

CREATE POLICY "deletion_log_insert_superadmin"
ON public.redpresu_company_deletion_log FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.redpresu_users
    WHERE id = auth.uid()
    AND role = 'superadmin'
  )
);

-- Paso 6: Comentarios de documentación
COMMENT ON TABLE public.redpresu_company_deletion_log IS 'Registro de auditoría de eliminaciones de empresas';
COMMENT ON COLUMN public.redpresu_company_deletion_log.company_id IS 'ID de la empresa eliminada (nullable con ON DELETE SET NULL)';
COMMENT ON COLUMN public.redpresu_company_deletion_log.deletion_type IS 'soft_delete, permanent_delete o restore';

-- ============================================
-- COMPLETADO
-- ============================================
-- Verificar con:
-- SELECT tablename, indexname FROM pg_indexes WHERE tablename = 'redpresu_company_deletion_log';
