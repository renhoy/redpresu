-- migrations/EJECUTAR_035_user_invitations.sql
-- Descripción: Crear tabla de invitaciones de usuarios con tokens
-- Fecha: 2025-01-24
-- Bloque: Sistema de Invitaciones

-- ============================================
-- UP: Aplicar cambios
-- ============================================

BEGIN;

-- 1. Crear tabla de invitaciones
CREATE TABLE IF NOT EXISTS public.redpresu_user_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_id UUID NOT NULL REFERENCES public.redpresu_users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  CONSTRAINT invitations_status_check CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled'))
);

-- 2. Índices
CREATE INDEX idx_invitations_token ON public.redpresu_user_invitations(token);
CREATE INDEX idx_invitations_email ON public.redpresu_user_invitations(email);
CREATE INDEX idx_invitations_inviter_id ON public.redpresu_user_invitations(inviter_id);
CREATE INDEX idx_invitations_status ON public.redpresu_user_invitations(status);
CREATE INDEX idx_invitations_expires_at ON public.redpresu_user_invitations(expires_at);

-- 3. RLS policies
ALTER TABLE public.redpresu_user_invitations ENABLE ROW LEVEL SECURITY;

-- Política SELECT: Usuarios autenticados de la misma empresa pueden ver invitaciones
CREATE POLICY "invitations_select_policy"
ON public.redpresu_user_invitations FOR SELECT
USING (
  auth.uid() IN (
    SELECT u1.id
    FROM public.redpresu_users u1
    JOIN public.redpresu_users u2 ON u1.company_id = u2.company_id
    WHERE u2.id = inviter_id
  )
);

-- Política INSERT: Solo admin y superadmin pueden crear invitaciones
CREATE POLICY "invitations_insert_policy"
ON public.redpresu_user_invitations FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.redpresu_users
    WHERE id = auth.uid()
    AND role IN ('admin', 'superadmin')
  )
);

-- Política UPDATE: Solo el invitador o admin/superadmin pueden actualizar
CREATE POLICY "invitations_update_policy"
ON public.redpresu_user_invitations FOR UPDATE
USING (
  inviter_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.redpresu_users
    WHERE id = auth.uid()
    AND role IN ('admin', 'superadmin')
  )
);

-- Política DELETE: Solo el invitador o admin/superadmin pueden eliminar
CREATE POLICY "invitations_delete_policy"
ON public.redpresu_user_invitations FOR DELETE
USING (
  inviter_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.redpresu_users
    WHERE id = auth.uid()
    AND role IN ('admin', 'superadmin')
  )
);

-- 4. Función para marcar invitaciones expiradas automáticamente
CREATE OR REPLACE FUNCTION mark_expired_invitations()
RETURNS void AS $$
BEGIN
  UPDATE public.redpresu_user_invitations
  SET status = 'expired', updated_at = NOW()
  WHERE status = 'pending'
  AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Comentarios
COMMENT ON TABLE public.redpresu_user_invitations IS 'Tabla de invitaciones de usuarios con tokens de acceso';
COMMENT ON COLUMN public.redpresu_user_invitations.inviter_id IS 'Usuario que envía la invitación';
COMMENT ON COLUMN public.redpresu_user_invitations.email IS 'Email del usuario invitado';
COMMENT ON COLUMN public.redpresu_user_invitations.token IS 'Token único para validar la invitación';
COMMENT ON COLUMN public.redpresu_user_invitations.expires_at IS 'Fecha de expiración del token';
COMMENT ON COLUMN public.redpresu_user_invitations.status IS 'Estado: pending, accepted, expired, cancelled';

COMMIT;

-- ============================================
-- DOWN: Rollback (documentar, no ejecutar)
-- ============================================

-- DROP FUNCTION IF EXISTS mark_expired_invitations() CASCADE;
-- DROP TABLE IF EXISTS public.redpresu_user_invitations CASCADE;
