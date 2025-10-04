-- migrations/014_fix_users_select_self.sql
-- Descripción: Permitir que usuarios lean su propio registro sin restricciones
-- Fecha: 2025-01-04
-- Fix: Header no puede leer rol del usuario (RLS bloquea lectura propia)
-- Bloque: 1 (Usuarios y Seguridad)

-- ============================================
-- UP: Aplicar cambios
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
-- DOWN: Rollback (documentar, no ejecutar automáticamente)
-- ============================================
-- Para revertir esta migración, ejecutar:
--
-- BEGIN;
-- DROP POLICY IF EXISTS "users_select_policy" ON public.users;
-- CREATE POLICY "users_select_policy"
--   ON public.users FOR SELECT
--   USING (empresa_id = public.get_user_empresa_id(auth.uid()));
-- COMMIT;
