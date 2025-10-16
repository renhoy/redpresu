-- ============================================
-- MIGRACIÓN 026b: FIX - Reemplazar políticas RLS de issuers
-- INSTRUCCIONES:
-- 1. Abre Supabase Dashboard > SQL Editor
-- 2. Copia y pega TODO este contenido
-- 3. Ejecuta (Run)
-- 4. Verifica el resultado con la query al final
-- ============================================

BEGIN;

-- ============================================
-- PASO 1: Eliminar políticas existentes (si existen)
-- ============================================

DROP POLICY IF EXISTS issuers_select_superadmin ON public.issuers;
DROP POLICY IF EXISTS issuers_select_own_company ON public.issuers;
DROP POLICY IF EXISTS issuers_insert_superadmin ON public.issuers;
DROP POLICY IF EXISTS issuers_update_own ON public.issuers;
DROP POLICY IF EXISTS issuers_update_superadmin ON public.issuers;
DROP POLICY IF EXISTS issuers_delete_policy ON public.issuers;

-- ============================================
-- PASO 2: Crear políticas SELECT
-- ============================================

-- 2.1. Política SELECT para superadmin (ver todos los issuers)
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

-- 2.2. Política SELECT para usuarios normales (ver solo issuers de su empresa)
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

-- ============================================
-- PASO 3: Crear política INSERT
-- ============================================

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

-- ============================================
-- PASO 4: Crear políticas UPDATE
-- ============================================

-- 4.1. Política UPDATE para usuarios (actualizar su propio issuer)
CREATE POLICY issuers_update_own
ON public.issuers
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 4.2. Política UPDATE para superadmin (actualizar cualquier issuer)
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

-- ============================================
-- PASO 5: Crear política DELETE
-- ============================================

-- 5. Política DELETE solo para superadmin
CREATE POLICY issuers_delete_policy
ON public.issuers
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.users
    WHERE users.id = auth.uid()
      AND users.role = 'superadmin'
  )
);

COMMIT;

-- ============================================
-- VERIFICACIÓN POST-MIGRACIÓN
-- ============================================

-- Ver todas las políticas de issuers (deberías ver 6)
SELECT
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE tablename = 'issuers'
ORDER BY cmd, policyname;

-- ============================================
-- RESULTADO ESPERADO
-- ============================================
--
-- Deberías ver EXACTAMENTE 6 políticas:
--
-- | policyname                      | cmd    | roles          |
-- |---------------------------------|--------|----------------|
-- | issuers_delete_policy           | DELETE | {authenticated}|
-- | issuers_insert_superadmin       | INSERT | {authenticated}|
-- | issuers_select_own_company      | SELECT | {authenticated}|
-- | issuers_select_superadmin       | SELECT | {authenticated}|
-- | issuers_update_own              | UPDATE | {authenticated}|
-- | issuers_update_superadmin       | UPDATE | {authenticated}|
--
-- ============================================
