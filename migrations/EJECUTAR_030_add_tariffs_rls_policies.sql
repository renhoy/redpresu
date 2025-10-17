-- ============================================
-- Migración 030: Añadir políticas RLS para tabla tariffs
-- ============================================
-- Descripción: La tabla tariffs tiene RLS habilitado pero no tiene políticas definidas,
--              lo que bloquea todas las operaciones. Esta migración añade las políticas
--              correctas para INSERT, SELECT, UPDATE y DELETE.
-- Fecha: 2025-01-17
-- Bloque: Fase 2 - Corrección crítica RLS
-- ============================================

BEGIN;

-- ============================================
-- SELECT: Usuarios de la misma empresa pueden ver tarifas
-- ============================================
CREATE POLICY tariffs_select_policy
ON public.tariffs
FOR SELECT
USING (
  empresa_id = public.get_user_empresa_id(auth.uid())
);

COMMENT ON POLICY tariffs_select_policy ON public.tariffs IS
  'Usuarios pueden ver tarifas de su empresa';

-- ============================================
-- INSERT: Usuarios autenticados pueden crear tarifas en su empresa
-- ============================================
CREATE POLICY tariffs_insert_policy
ON public.tariffs
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND empresa_id = public.get_user_empresa_id(auth.uid())
  AND user_id = auth.uid()
);

COMMENT ON POLICY tariffs_insert_policy ON public.tariffs IS
  'Usuarios autenticados pueden crear tarifas en su empresa';

-- ============================================
-- UPDATE: Solo creador o admin/superadmin de la empresa
-- ============================================
CREATE POLICY tariffs_update_policy
ON public.tariffs
FOR UPDATE
USING (
  -- Es el creador
  user_id = auth.uid()
  OR
  -- Es admin/superadmin de la misma empresa
  (
    public.get_user_role_by_id(auth.uid()) IN ('admin', 'superadmin')
    AND empresa_id = public.get_user_empresa_id(auth.uid())
  )
)
WITH CHECK (
  -- Mismo check para el nuevo estado
  user_id = auth.uid()
  OR
  (
    public.get_user_role_by_id(auth.uid()) IN ('admin', 'superadmin')
    AND empresa_id = public.get_user_empresa_id(auth.uid())
  )
);

COMMENT ON POLICY tariffs_update_policy ON public.tariffs IS
  'Creador o admin/superadmin de la empresa pueden actualizar tarifas';

-- ============================================
-- DELETE: Solo admin/superadmin de la empresa
-- ============================================
CREATE POLICY tariffs_delete_policy
ON public.tariffs
FOR DELETE
USING (
  public.get_user_role_by_id(auth.uid()) IN ('admin', 'superadmin')
  AND empresa_id = public.get_user_empresa_id(auth.uid())
);

COMMENT ON POLICY tariffs_delete_policy ON public.tariffs IS
  'Solo admin/superadmin pueden eliminar tarifas de su empresa';

COMMIT;

-- ============================================
-- DOWN: Rollback (documentar, no ejecutar)
-- ============================================

-- DROP POLICY IF EXISTS tariffs_select_policy ON public.tariffs;
-- DROP POLICY IF EXISTS tariffs_insert_policy ON public.tariffs;
-- DROP POLICY IF EXISTS tariffs_update_policy ON public.tariffs;
-- DROP POLICY IF EXISTS tariffs_delete_policy ON public.tariffs;
