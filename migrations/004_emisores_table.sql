-- migrations/004_emisores_table.sql
-- Descripción: Crear tabla emisores para gestión de datos fiscales empresa/autónomo
-- Fecha: 2025-01-04
-- Bloque: 1 (Usuarios y Seguridad)
-- Fase: 2

-- ============================================
-- UP: Aplicar cambios
-- ============================================

BEGIN;

-- 1. Crear tabla emisores
CREATE TABLE IF NOT EXISTS public.emisores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  empresa_id INTEGER NOT NULL DEFAULT 1,
  tipo TEXT NOT NULL CHECK (tipo IN ('empresa', 'autonomo')),
  nombre_comercial TEXT NOT NULL,
  nif TEXT NOT NULL,
  direccion_fiscal TEXT NOT NULL,
  codigo_postal TEXT,
  ciudad TEXT,
  provincia TEXT,
  pais TEXT DEFAULT 'España',
  telefono TEXT,
  email TEXT,
  web TEXT,
  irpf_percentage DECIMAL(5,2) CHECK (irpf_percentage >= 0 AND irpf_percentage <= 100),
  logo_url TEXT,
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Comentarios de documentación
COMMENT ON TABLE public.emisores IS 'Datos fiscales del emisor (empresa o autónomo) para facturación y presupuestos';
COMMENT ON COLUMN public.emisores.user_id IS 'Usuario propietario/responsable del emisor';
COMMENT ON COLUMN public.emisores.empresa_id IS 'ID de empresa para multi-tenant (default 1 = primera empresa)';
COMMENT ON COLUMN public.emisores.tipo IS 'Tipo de emisor: empresa o autonomo';
COMMENT ON COLUMN public.emisores.nif IS 'NIF/CIF del emisor';
COMMENT ON COLUMN public.emisores.irpf_percentage IS 'Porcentaje IRPF aplicable (solo para autónomos, típicamente 15%)';

-- 3. Índices para optimización
CREATE INDEX idx_emisores_user_id ON public.emisores(user_id);
CREATE INDEX idx_emisores_empresa_id ON public.emisores(empresa_id);
CREATE INDEX idx_emisores_nif ON public.emisores(nif);
CREATE INDEX idx_emisores_tipo ON public.emisores(tipo);

-- 4. Constraints adicionales
-- Unique constraint: un NIF por empresa (permite mismo NIF en diferentes empresas)
CREATE UNIQUE INDEX idx_emisores_nif_empresa ON public.emisores(nif, empresa_id);

-- Validación: email válido si se proporciona
ALTER TABLE public.emisores
  ADD CONSTRAINT emisores_email_check
  CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- 5. Trigger para updated_at automático
CREATE OR REPLACE FUNCTION public.update_emisores_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_emisores_updated_at
  BEFORE UPDATE ON public.emisores
  FOR EACH ROW
  EXECUTE FUNCTION public.update_emisores_updated_at();

-- 6. RLS (Row Level Security) policies
ALTER TABLE public.emisores ENABLE ROW LEVEL SECURITY;

-- Policy: Los usuarios pueden ver emisores de su empresa
CREATE POLICY "emisores_select_policy"
  ON public.emisores FOR SELECT
  USING (
    empresa_id = (
      SELECT empresa_id
      FROM public.users
      WHERE id = auth.uid()
    )
  );

-- Policy: Los usuarios pueden insertar su propio emisor
CREATE POLICY "emisores_insert_policy"
  ON public.emisores FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND empresa_id = (
      SELECT empresa_id
      FROM public.users
      WHERE id = auth.uid()
    )
  );

-- Policy: Solo admin/superadmin o el propio usuario pueden actualizar
CREATE POLICY "emisores_update_policy"
  ON public.emisores FOR UPDATE
  USING (
    empresa_id = (
      SELECT empresa_id
      FROM public.users
      WHERE id = auth.uid()
    )
    AND (
      user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
        AND role IN ('admin', 'superadmin')
      )
    )
  );

-- Policy: Solo superadmin puede eliminar emisores
CREATE POLICY "emisores_delete_policy"
  ON public.emisores FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role = 'superadmin'
    )
  );

COMMIT;

-- ============================================
-- DOWN: Rollback (documentar, no ejecutar automáticamente)
-- ============================================
-- Para revertir esta migración, ejecutar:
--
-- BEGIN;
-- DROP TRIGGER IF EXISTS trigger_emisores_updated_at ON public.emisores;
-- DROP FUNCTION IF EXISTS public.update_emisores_updated_at();
-- DROP TABLE IF EXISTS public.emisores CASCADE;
-- COMMIT;
