-- ============================================
-- MIGRACIÓN 035: Tabla de mensajes de contacto y config emails
-- ============================================
-- Fecha: 2025-01-30
-- Descripción: Crear tabla para almacenar mensajes de contacto y config de emails
-- ============================================

BEGIN;

-- 1. Crear tipo ENUM para estado de mensajes
CREATE TYPE public.contact_message_status AS ENUM ('nuevo', 'leido', 'respondido');

-- 2. Crear tabla contact_messages
CREATE TABLE IF NOT EXISTS public.redpresu_contact_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status public.contact_message_status NOT NULL DEFAULT 'nuevo',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Crear índices para búsqueda eficiente
CREATE INDEX idx_contact_messages_status ON public.redpresu_contact_messages(status);
CREATE INDEX idx_contact_messages_created_at ON public.redpresu_contact_messages(created_at DESC);
CREATE INDEX idx_contact_messages_email ON public.redpresu_contact_messages(email);

-- 4. Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_contact_message_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_contact_message_updated_at
  BEFORE UPDATE ON public.redpresu_contact_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_contact_message_updated_at();

-- 5. Habilitar RLS
ALTER TABLE public.redpresu_contact_messages ENABLE ROW LEVEL SECURITY;

-- 6. Policies RLS: Solo superadmin puede acceder
CREATE POLICY "contact_messages_select_superadmin"
  ON public.redpresu_contact_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.redpresu_users
      WHERE id = auth.uid() AND role = 'superadmin'
    )
  );

CREATE POLICY "contact_messages_update_superadmin"
  ON public.redpresu_contact_messages
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.redpresu_users
      WHERE id = auth.uid() AND role = 'superadmin'
    )
  );

-- 7. Añadir configuración de emails de notificación
INSERT INTO public.redpresu_config (key, value, description, category, is_system)
VALUES (
  'contact_notification_emails',
  '["admin@example.com"]'::jsonb,
  'Lista de emails que recibirán notificaciones de mensajes de contacto. Formato: array de strings.',
  'general',
  true
);

-- Verificar inserción
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.redpresu_contact_messages LIMIT 0
  ) AND EXISTS (
    SELECT 1 FROM public.redpresu_config WHERE key = 'contact_notification_emails'
  ) THEN
    RAISE NOTICE '✅ Tabla contact_messages y config creadas correctamente';
  ELSE
    RAISE EXCEPTION '❌ Error: No se pudieron crear la tabla o config';
  END IF;
END $$;

COMMIT;

-- ============================================
-- ROLLBACK (documentado, no ejecutar)
-- ============================================
-- DROP TABLE IF EXISTS public.redpresu_contact_messages CASCADE;
-- DROP TYPE IF EXISTS public.contact_message_status CASCADE;
-- DROP FUNCTION IF EXISTS update_contact_message_updated_at CASCADE;
-- DELETE FROM public.redpresu_config WHERE key = 'contact_notification_emails';
