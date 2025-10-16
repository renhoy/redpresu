-- ============================================
-- MIGRACIÓN 026: Añadir políticas RLS SELECT para issuers
-- INSTRUCCIONES:
-- 1. Abre Supabase Dashboard > SQL Editor
-- 2. Copia y pega TODO este contenido
-- 3. Ejecuta (Run)
-- 4. Verifica el resultado con las queries al final
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
-- VERIFICACIÓN POST-MIGRACIÓN
-- ============================================

-- Ver todas las políticas de issuers
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'issuers'
ORDER BY cmd, policyname;

-- Contar issuers en el sistema (como superadmin deberías ver todos)
SELECT COUNT(*) as total_issuers FROM public.issuers;

-- Ver issuers con sus datos básicos
SELECT
  id,
  issuers_type,
  issuers_name,
  issuers_nif,
  company_id,
  created_at
FROM public.issuers
ORDER BY created_at DESC;

-- ============================================
-- RESULTADO ESPERADO
-- ============================================
--
-- Deberías ver 5 políticas para la tabla issuers:
-- 1. issuers_delete_policy (DELETE)
-- 2. issuers_insert_superadmin (INSERT)
-- 3. issuers_select_own_company (SELECT)
-- 4. issuers_select_superadmin (SELECT)
-- 5. issuers_update_own (UPDATE)
-- 6. issuers_update_superadmin (UPDATE)
--
-- Como superadmin, la query SELECT debe mostrar todos los issuers
-- existentes en el sistema.
--
-- ============================================
