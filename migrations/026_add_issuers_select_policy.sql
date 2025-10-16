-- migrations/026_add_issuers_select_policy.sql
-- Descripción: Añadir políticas SELECT para la tabla issuers
-- Fecha: 2025-01-16
-- Bloque: 1 (Usuarios y Seguridad)
-- Fase: 2

-- ============================================
-- UP: Aplicar cambios
-- ============================================

BEGIN;

-- 1. Política SELECT para superadmin (ver todos los issuers)
CREATE POLICY issuers_select_superadmin
ON public.issuers
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.users
    WHERE users.id = auth.uid()
      AND users.role = 'superadmin'
  )
);

-- 2. Política SELECT para usuarios normales (ver solo issuers de su empresa)
CREATE POLICY issuers_select_own_company
ON public.issuers
FOR SELECT
TO authenticated
USING (
  company_id IN (
    SELECT empresa_id
    FROM public.users
    WHERE users.id = auth.uid()
  )
);

-- 3. Política INSERT para superadmin (crear issuers para cualquier empresa)
CREATE POLICY issuers_insert_superadmin
ON public.issuers
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.users
    WHERE users.id = auth.uid()
      AND users.role = 'superadmin'
  )
);

-- 4. Política UPDATE para usuarios (actualizar su propio issuer)
CREATE POLICY issuers_update_own
ON public.issuers
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 5. Política UPDATE para superadmin (actualizar cualquier issuer)
CREATE POLICY issuers_update_superadmin
ON public.issuers
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.users
    WHERE users.id = auth.uid()
      AND users.role = 'superadmin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.users
    WHERE users.id = auth.uid()
      AND users.role = 'superadmin'
  )
);

COMMIT;

-- ============================================
-- COMENTARIOS
-- ============================================

COMMENT ON POLICY issuers_select_superadmin ON public.issuers IS
  'Superadmin puede ver todos los issuers del sistema';

COMMENT ON POLICY issuers_select_own_company ON public.issuers IS
  'Usuarios pueden ver issuers de su propia empresa';

COMMENT ON POLICY issuers_insert_superadmin ON public.issuers IS
  'Solo superadmin puede crear issuers (registro normal crea via admin API)';

COMMENT ON POLICY issuers_update_own ON public.issuers IS
  'Usuarios pueden actualizar su propio issuer (perfil)';

COMMENT ON POLICY issuers_update_superadmin ON public.issuers IS
  'Superadmin puede actualizar cualquier issuer';

-- ============================================
-- DOWN: Rollback (documentar, no ejecutar automáticamente)
-- ============================================
-- Para revertir esta migración, ejecutar:
--
-- BEGIN;
-- DROP POLICY IF EXISTS issuers_select_superadmin ON public.issuers;
-- DROP POLICY IF EXISTS issuers_select_own_company ON public.issuers;
-- DROP POLICY IF EXISTS issuers_insert_superadmin ON public.issuers;
-- DROP POLICY IF EXISTS issuers_update_own ON public.issuers;
-- DROP POLICY IF EXISTS issuers_update_superadmin ON public.issuers;
-- COMMIT;

-- ============================================
-- VERIFICACIÓN POST-MIGRACIÓN
-- ============================================
--
-- Ver todas las políticas de issuers:
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
-- FROM pg_policies
-- WHERE tablename = 'issuers';
--
-- ============================================
