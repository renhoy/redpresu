-- migrations/010_fix_users_rls_recursion.sql
-- Descripción: Arreglar recursión infinita en políticas RLS de tabla users
-- Fecha: 2025-01-04
-- Bloque: 1 (Usuarios y Seguridad)
-- Fase: 2
-- Fix: Error "infinite recursion detected in policy for relation users"

-- ============================================
-- UP: Aplicar cambios
-- ============================================

BEGIN;

-- 1. DROP políticas existentes que causan recursión
DROP POLICY IF EXISTS "users_select_policy" ON public.users;
DROP POLICY IF EXISTS "users_insert_policy" ON public.users;
DROP POLICY IF EXISTS "users_update_policy" ON public.users;
DROP POLICY IF EXISTS "users_delete_policy" ON public.users;

-- 2. Crear función helper para obtener empresa_id del usuario actual
-- Esta función usa SECURITY DEFINER para evitar RLS recursion
CREATE OR REPLACE FUNCTION public.get_user_empresa_id(user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  user_empresa_id integer;
BEGIN
  SELECT empresa_id INTO user_empresa_id
  FROM public.users
  WHERE id = user_id;

  RETURN user_empresa_id;
END;
$$;

COMMENT ON FUNCTION public.get_user_empresa_id(uuid) IS 'Returns empresa_id for a user (SECURITY DEFINER to avoid RLS recursion)';

-- 3. Crear función helper para obtener role del usuario actual
CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  user_role text;
BEGIN
  SELECT role INTO user_role
  FROM public.users
  WHERE id = user_id;

  RETURN user_role;
END;
$$;

COMMENT ON FUNCTION public.get_user_role(uuid) IS 'Returns role for a user (SECURITY DEFINER to avoid RLS recursion)';

-- 4. Recrear políticas usando las funciones helper

-- SELECT: Users can see users from their company
CREATE POLICY "users_select_policy"
  ON public.users FOR SELECT
  USING (
    empresa_id = public.get_user_empresa_id(auth.uid())
  );

-- INSERT: Only admin/superadmin can create users in their company
CREATE POLICY "users_insert_policy"
  ON public.users FOR INSERT
  WITH CHECK (
    public.get_user_role(auth.uid()) IN ('admin', 'superadmin')
    AND empresa_id = public.get_user_empresa_id(auth.uid())
  );

-- UPDATE: Admin can update users in their company, users can update their own profile
CREATE POLICY "users_update_policy"
  ON public.users FOR UPDATE
  USING (
    -- User updates their own profile
    id = auth.uid()
    OR
    -- Admin/superadmin updates users in their company
    (
      public.get_user_role(auth.uid()) IN ('admin', 'superadmin')
      AND empresa_id = public.get_user_empresa_id(auth.uid())
    )
  )
  WITH CHECK (
    -- Same conditions for the updated data
    id = auth.uid()
    OR
    (
      public.get_user_role(auth.uid()) IN ('admin', 'superadmin')
      AND empresa_id = public.get_user_empresa_id(auth.uid())
    )
  );

-- DELETE: Only superadmin can delete (soft delete via status preferred)
CREATE POLICY "users_delete_policy"
  ON public.users FOR DELETE
  USING (
    public.get_user_role(auth.uid()) = 'superadmin'
  );

COMMIT;

-- ============================================
-- DOWN: Rollback (documentar, no ejecutar automáticamente)
-- ============================================
-- Para revertir esta migración, ejecutar migration 007 nuevamente
