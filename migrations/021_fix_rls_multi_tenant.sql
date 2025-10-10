-- =====================================================
-- MIGRACIÓN 021: Actualizar RLS policies para multi-tenant
-- =====================================================
-- Fecha: 2025-01-10
-- Descripción: Actualizar políticas RLS para soportar múltiples empresas

-- =====================================================
-- FUNCIÓN HELPER: Obtener empresa_id del usuario actual
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_user_empresa_id()
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT empresa_id
  FROM public.users
  WHERE id = auth.uid()
$$;

-- =====================================================
-- TARIFFS: Actualizar políticas RLS
-- =====================================================

-- Eliminar políticas antiguas
DROP POLICY IF EXISTS "tariffs_select_policy" ON public.tariffs;
DROP POLICY IF EXISTS "tariffs_insert_policy" ON public.tariffs;
DROP POLICY IF EXISTS "tariffs_update_policy" ON public.tariffs;
DROP POLICY IF EXISTS "tariffs_delete_policy" ON public.tariffs;

-- SELECT: Usuarios ven tarifas de su empresa
CREATE POLICY "tariffs_select_policy" ON public.tariffs
FOR SELECT
USING (
  CASE
    WHEN public.get_user_role() = 'superadmin' THEN true
    WHEN public.get_user_role() = 'admin' THEN empresa_id = public.get_user_empresa_id()
    WHEN public.get_user_role() = 'vendedor' THEN empresa_id = public.get_user_empresa_id() AND status = 'Activa'
    ELSE false
  END
);

-- INSERT: Admin puede crear tarifas en su empresa
CREATE POLICY "tariffs_insert_policy" ON public.tariffs
FOR INSERT
WITH CHECK (
  CASE
    WHEN public.get_user_role() = 'superadmin' THEN true
    WHEN public.get_user_role() = 'admin' THEN empresa_id = public.get_user_empresa_id()
    ELSE false
  END
);

-- UPDATE: Admin puede actualizar tarifas de su empresa
CREATE POLICY "tariffs_update_policy" ON public.tariffs
FOR UPDATE
USING (
  CASE
    WHEN public.get_user_role() = 'superadmin' THEN true
    WHEN public.get_user_role() = 'admin' THEN empresa_id = public.get_user_empresa_id()
    ELSE false
  END
)
WITH CHECK (
  CASE
    WHEN public.get_user_role() = 'superadmin' THEN true
    WHEN public.get_user_role() = 'admin' THEN empresa_id = public.get_user_empresa_id()
    ELSE false
  END
);

-- DELETE: Admin puede eliminar tarifas de su empresa
CREATE POLICY "tariffs_delete_policy" ON public.tariffs
FOR DELETE
USING (
  CASE
    WHEN public.get_user_role() = 'superadmin' THEN true
    WHEN public.get_user_role() = 'admin' THEN empresa_id = public.get_user_empresa_id()
    ELSE false
  END
);

-- =====================================================
-- BUDGETS: Actualizar políticas RLS
-- =====================================================

-- Eliminar políticas antiguas
DROP POLICY IF EXISTS "budgets_select_policy" ON public.budgets;
DROP POLICY IF EXISTS "budgets_insert_policy" ON public.budgets;
DROP POLICY IF EXISTS "budgets_update_policy" ON public.budgets;
DROP POLICY IF EXISTS "budgets_delete_policy" ON public.budgets;

-- SELECT: Usuarios ven presupuestos de su empresa
CREATE POLICY "budgets_select_policy" ON public.budgets
FOR SELECT
USING (
  CASE
    WHEN public.get_user_role() = 'superadmin' THEN true
    WHEN public.get_user_role() IN ('admin', 'vendedor') THEN empresa_id = public.get_user_empresa_id()
    ELSE false
  END
);

-- INSERT: Admin y vendedor pueden crear presupuestos en su empresa
CREATE POLICY "budgets_insert_policy" ON public.budgets
FOR INSERT
WITH CHECK (
  CASE
    WHEN public.get_user_role() = 'superadmin' THEN true
    WHEN public.get_user_role() IN ('admin', 'vendedor') THEN empresa_id = public.get_user_empresa_id()
    ELSE false
  END
);

-- UPDATE: Admin y vendedor pueden actualizar presupuestos de su empresa
CREATE POLICY "budgets_update_policy" ON public.budgets
FOR UPDATE
USING (
  CASE
    WHEN public.get_user_role() = 'superadmin' THEN true
    WHEN public.get_user_role() IN ('admin', 'vendedor') THEN empresa_id = public.get_user_empresa_id()
    ELSE false
  END
)
WITH CHECK (
  CASE
    WHEN public.get_user_role() = 'superadmin' THEN true
    WHEN public.get_user_role() IN ('admin', 'vendedor') THEN empresa_id = public.get_user_empresa_id()
    ELSE false
  END
);

-- DELETE: Solo admin puede eliminar presupuestos de su empresa
CREATE POLICY "budgets_delete_policy" ON public.budgets
FOR DELETE
USING (
  CASE
    WHEN public.get_user_role() = 'superadmin' THEN true
    WHEN public.get_user_role() = 'admin' THEN empresa_id = public.get_user_empresa_id()
    ELSE false
  END
);

-- =====================================================
-- ISSUERS: Actualizar políticas RLS
-- =====================================================

-- Eliminar políticas antiguas
DROP POLICY IF EXISTS "issuers_select_policy" ON public.issuers;
DROP POLICY IF EXISTS "issuers_insert_policy" ON public.issuers;
DROP POLICY IF EXISTS "issuers_update_policy" ON public.issuers;

-- SELECT: Usuarios ven issuers de su empresa
CREATE POLICY "issuers_select_policy" ON public.issuers
FOR SELECT
USING (
  CASE
    WHEN public.get_user_role() = 'superadmin' THEN true
    ELSE company_id = public.get_user_empresa_id()
  END
);

-- INSERT: Solo mediante service_role en registro
-- No crear policy de INSERT

-- UPDATE: Admin puede actualizar issuer de su empresa
CREATE POLICY "issuers_update_policy" ON public.issuers
FOR UPDATE
USING (
  CASE
    WHEN public.get_user_role() = 'superadmin' THEN true
    WHEN public.get_user_role() = 'admin' THEN company_id = public.get_user_empresa_id()
    ELSE false
  END
)
WITH CHECK (
  CASE
    WHEN public.get_user_role() = 'superadmin' THEN true
    WHEN public.get_user_role() = 'admin' THEN company_id = public.get_user_empresa_id()
    ELSE false
  END
);

-- =====================================================
-- CONFIG: No requiere cambios (tabla global sin empresa_id)
-- =====================================================
-- La tabla config es global y sus políticas RLS ya están correctamente configuradas
-- para permitir a superadmin modificar y a todos los usuarios leer
