-- =====================================================
-- MIGRACIÓN 020: Tabla empresas para multi-tenant
-- =====================================================
-- Fecha: 2025-01-10
-- Descripción: Crear tabla empresas para soportar múltiples emisores independientes

-- =====================================================
-- PASO 1: Eliminar constraints que fuerzan empresa_id = 1
-- =====================================================
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS chk_users_empresa_id;
ALTER TABLE public.tariffs DROP CONSTRAINT IF EXISTS chk_tariffs_empresa_id;
ALTER TABLE public.budgets DROP CONSTRAINT IF EXISTS chk_budgets_empresa_id;

-- =====================================================
-- PASO 2: Crear TABLA empresas
-- =====================================================
CREATE TABLE IF NOT EXISTS public.empresas (
    id SERIAL PRIMARY KEY,
    nombre TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive'))
);

-- Comentarios
COMMENT ON TABLE public.empresas IS 'Empresas/Emisores del sistema - cada registro es un tenant independiente';
COMMENT ON COLUMN public.empresas.id IS 'ID único de la empresa';
COMMENT ON COLUMN public.empresas.nombre IS 'Nombre de la empresa/emisor';
COMMENT ON COLUMN public.empresas.status IS 'Estado de la empresa: active o inactive';

-- Crear empresa por defecto (ID 1) si no existe
INSERT INTO public.empresas (id, nombre, status)
VALUES (1, 'Empresa por defecto', 'active')
ON CONFLICT (id) DO NOTHING;

-- Resetear sequence para que empiece desde 2
SELECT setval('empresas_id_seq', GREATEST(2, (SELECT MAX(id) + 1 FROM empresas)));

-- Índices
CREATE INDEX IF NOT EXISTS idx_empresas_status ON public.empresas(status);

-- RLS Policies para empresas
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;

-- Eliminar policies existentes si existen
DROP POLICY IF EXISTS "empresas_select_superadmin" ON public.empresas;
DROP POLICY IF EXISTS "empresas_select_own" ON public.empresas;

-- Superadmin puede ver todas las empresas
CREATE POLICY "empresas_select_superadmin" ON public.empresas
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid()
        AND users.role = 'superadmin'
    )
);

-- Usuarios pueden ver su propia empresa
CREATE POLICY "empresas_select_own" ON public.empresas
FOR SELECT
TO authenticated
USING (
    id IN (
        SELECT empresa_id FROM public.users
        WHERE users.id = auth.uid()
    )
);

-- Solo service_role puede insertar empresas (mediante registro)
-- No crear policy de INSERT ya que se usará service_role key
