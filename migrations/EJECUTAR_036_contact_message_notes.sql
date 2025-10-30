-- ============================================
-- EJECUTAR EN SUPABASE SQL EDITOR
-- ============================================
-- Migración: 036_contact_message_notes
-- Descripción: Crear tabla de notas para mensajes de contacto
-- Fecha: 2025-01-30
-- Idempotente: Sí
-- ============================================

BEGIN;

-- 1. Crear tabla de notas para mensajes de contacto
CREATE TABLE IF NOT EXISTS public.redpresu_contact_message_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_message_id UUID NOT NULL,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Foreign Keys
  CONSTRAINT contact_message_notes_message_fkey
    FOREIGN KEY (contact_message_id)
    REFERENCES public.redpresu_contact_messages(id)
    ON DELETE CASCADE,

  CONSTRAINT contact_message_notes_user_fkey
    FOREIGN KEY (user_id)
    REFERENCES auth.users(id)
    ON DELETE CASCADE
);

-- 2. Comentario de tabla
COMMENT ON TABLE public.redpresu_contact_message_notes IS
  'Notas internas asociadas a mensajes de contacto (solo superadmin)';

-- 3. Índices para búsqueda eficiente
CREATE INDEX IF NOT EXISTS idx_contact_message_notes_message_id
  ON public.redpresu_contact_message_notes(contact_message_id);

CREATE INDEX IF NOT EXISTS idx_contact_message_notes_created_at
  ON public.redpresu_contact_message_notes(created_at DESC);

-- 4. Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_contact_message_note_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_contact_message_note_updated_at
  ON public.redpresu_contact_message_notes;

CREATE TRIGGER trigger_update_contact_message_note_updated_at
  BEFORE UPDATE ON public.redpresu_contact_message_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_contact_message_note_updated_at();

-- 5. Habilitar RLS
ALTER TABLE public.redpresu_contact_message_notes ENABLE ROW LEVEL SECURITY;

-- 6. Policies RLS: Solo superadmin puede acceder
DROP POLICY IF EXISTS "contact_message_notes_select_superadmin"
  ON public.redpresu_contact_message_notes;

CREATE POLICY "contact_message_notes_select_superadmin"
  ON public.redpresu_contact_message_notes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.redpresu_users
      WHERE id = auth.uid() AND role = 'superadmin'
    )
  );

DROP POLICY IF EXISTS "contact_message_notes_insert_superadmin"
  ON public.redpresu_contact_message_notes;

CREATE POLICY "contact_message_notes_insert_superadmin"
  ON public.redpresu_contact_message_notes
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.redpresu_users
      WHERE id = auth.uid() AND role = 'superadmin'
    )
  );

DROP POLICY IF EXISTS "contact_message_notes_update_superadmin"
  ON public.redpresu_contact_message_notes;

CREATE POLICY "contact_message_notes_update_superadmin"
  ON public.redpresu_contact_message_notes
  FOR UPDATE
  USING (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.redpresu_users
      WHERE id = auth.uid() AND role = 'superadmin'
    )
  )
  WITH CHECK (
    user_id = auth.uid()
  );

DROP POLICY IF EXISTS "contact_message_notes_delete_superadmin"
  ON public.redpresu_contact_message_notes;

CREATE POLICY "contact_message_notes_delete_superadmin"
  ON public.redpresu_contact_message_notes
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.redpresu_users
      WHERE id = auth.uid() AND role = 'superadmin'
    )
  );

-- Verificar creación exitosa
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'redpresu_contact_message_notes'
  ) THEN
    RAISE NOTICE '✅ Tabla redpresu_contact_message_notes creada correctamente';
  ELSE
    RAISE EXCEPTION '❌ Error: No se pudo crear la tabla redpresu_contact_message_notes';
  END IF;
END $$;

COMMIT;

-- ============================================
-- VERIFICACIÓN POST-MIGRACIÓN
-- ============================================
--
-- Ver estructura de la tabla:
-- \d public.redpresu_contact_message_notes;
--
-- Ver políticas RLS:
-- SELECT * FROM pg_policies
-- WHERE tablename = 'redpresu_contact_message_notes';
--
-- Probar inserción (como superadmin):
-- INSERT INTO public.redpresu_contact_message_notes
-- (contact_message_id, user_id, content)
-- VALUES ('uuid-del-mensaje', auth.uid(), 'Nota de prueba');
--
-- Ver notas de un mensaje:
-- SELECT n.*, u.name, u.email
-- FROM public.redpresu_contact_message_notes n
-- LEFT JOIN public.redpresu_users u ON n.user_id = u.id
-- WHERE n.contact_message_id = 'uuid-del-mensaje'
-- ORDER BY n.created_at DESC;
--
-- ============================================
-- ROLLBACK (solo si es necesario revertir)
-- ============================================
-- DROP TABLE IF EXISTS public.redpresu_contact_message_notes CASCADE;
-- DROP FUNCTION IF EXISTS update_contact_message_note_updated_at CASCADE;
-- ============================================
