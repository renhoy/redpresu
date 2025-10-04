-- ============================================
-- MIGRACIÓN 014: Fix RLS - Permitir lectura propia
-- INSTRUCCIONES:
-- 1. Abre Supabase Dashboard > SQL Editor
-- 2. Copia y pega TODO este contenido
-- 3. Ejecuta (Run)
-- 4. Recarga la app en el navegador
-- ============================================

BEGIN;

-- 1. DROP política actual que causa el problema
DROP POLICY IF EXISTS "users_select_policy" ON public.users;

-- 2. Recrear política permitiendo lectura propia SIN restricciones
CREATE POLICY "users_select_policy"
  ON public.users FOR SELECT
  USING (
    -- Cada usuario puede ver su propio registro
    id = auth.uid()
    OR
    -- O si pertenece a la misma empresa
    empresa_id = public.get_user_empresa_id(auth.uid())
  );

COMMENT ON POLICY "users_select_policy" ON public.users IS
  'Usuarios pueden ver su propio registro y otros usuarios de su empresa';

COMMIT;

-- ============================================
-- VERIFICACIÓN POST-MIGRACIÓN
-- ============================================
-- Ejecuta esta query para verificar la política:
--
-- SELECT * FROM pg_policies WHERE tablename = 'users' AND policyname = 'users_select_policy';
-- ============================================
