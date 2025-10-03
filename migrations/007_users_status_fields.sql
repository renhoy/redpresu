-- migrations/007_users_status_fields.sql
-- Descripción: Añadir campos de gestión a tabla users (status, invited_by, last_login)
-- Fecha: 2025-01-04
-- Bloque: 1 (Usuarios y Seguridad)
-- Fase: 2

-- ============================================
-- UP: Aplicar cambios
-- ============================================

BEGIN;

-- 1. Añadir nuevos campos a tabla users
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS invited_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS last_login timestamp with time zone;

-- 2. Añadir constraint para status
ALTER TABLE public.users
  ADD CONSTRAINT users_status_check
  CHECK (status IN ('active', 'inactive', 'pending'));

-- 3. Crear índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_users_status ON public.users(status);
CREATE INDEX IF NOT EXISTS idx_users_invited_by ON public.users(invited_by);
CREATE INDEX IF NOT EXISTS idx_users_last_login ON public.users(last_login);
CREATE INDEX IF NOT EXISTS idx_users_empresa_status ON public.users(empresa_id, status);

-- 4. Añadir comentarios
COMMENT ON COLUMN public.users.status IS 'User status: active, inactive, pending';
COMMENT ON COLUMN public.users.invited_by IS 'User ID who invited this user (for audit trail)';
COMMENT ON COLUMN public.users.last_login IS 'Timestamp of last successful login';

-- 5. Actualizar RLS policies para gestión de usuarios

-- DROP existing policies if any
DROP POLICY IF EXISTS "users_select_policy" ON public.users;
DROP POLICY IF EXISTS "users_insert_policy" ON public.users;
DROP POLICY IF EXISTS "users_update_policy" ON public.users;
DROP POLICY IF EXISTS "users_delete_policy" ON public.users;

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- SELECT: Users can see users from their company
CREATE POLICY "users_select_policy"
  ON public.users FOR SELECT
  USING (
    empresa_id = (
      SELECT empresa_id
      FROM public.users
      WHERE id = auth.uid()
    )
  );

-- INSERT: Only admin/superadmin can create users in their company
CREATE POLICY "users_insert_policy"
  ON public.users FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('admin', 'superadmin')
      AND empresa_id = users.empresa_id
    )
  );

-- UPDATE: Admin can update users in their company, users can update their own profile
CREATE POLICY "users_update_policy"
  ON public.users FOR UPDATE
  USING (
    -- User updates their own profile
    id = auth.uid()
    OR
    -- Admin/superadmin updates users in their company
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.role IN ('admin', 'superadmin')
      AND u.empresa_id = users.empresa_id
    )
  )
  WITH CHECK (
    -- Same conditions for the updated data
    id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.role IN ('admin', 'superadmin')
      AND u.empresa_id = users.empresa_id
    )
  );

-- DELETE: Only superadmin can delete (soft delete via status preferred)
CREATE POLICY "users_delete_policy"
  ON public.users FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role = 'superadmin'
    )
  );

-- 6. Crear función para actualizar last_login
CREATE OR REPLACE FUNCTION public.update_user_last_login(user_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE public.users
  SET last_login = NOW()
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Comentar función
COMMENT ON FUNCTION public.update_user_last_login(uuid) IS 'Updates last_login timestamp for a user (called from auth actions)';

COMMIT;

-- ============================================
-- DOWN: Rollback (documentar, no ejecutar automáticamente)
-- ============================================
-- Para revertir esta migración, ejecutar:
--
-- BEGIN;
-- DROP FUNCTION IF EXISTS public.update_user_last_login(uuid);
-- DROP POLICY IF EXISTS "users_select_policy" ON public.users;
-- DROP POLICY IF EXISTS "users_insert_policy" ON public.users;
-- DROP POLICY IF EXISTS "users_update_policy" ON public.users;
-- DROP POLICY IF EXISTS "users_delete_policy" ON public.users;
-- DROP INDEX IF EXISTS idx_users_status;
-- DROP INDEX IF EXISTS idx_users_invited_by;
-- DROP INDEX IF EXISTS idx_users_last_login;
-- DROP INDEX IF EXISTS idx_users_empresa_status;
-- ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_status_check;
-- ALTER TABLE public.users DROP COLUMN IF EXISTS status;
-- ALTER TABLE public.users DROP COLUMN IF EXISTS invited_by;
-- ALTER TABLE public.users DROP COLUMN IF EXISTS last_login;
-- COMMIT;
