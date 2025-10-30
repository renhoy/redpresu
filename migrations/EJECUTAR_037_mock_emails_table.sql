-- ============================================
-- EJECUTAR EN SUPABASE SQL EDITOR
-- ============================================
-- Migración: 037_mock_emails_table
-- Descripción: Crear tabla para almacenar emails mockeados (testing only)
-- Fecha: 2025-01-30
-- Bloque: Testing System
-- Idempotente: Sí
-- ============================================

BEGIN;

-- 1. Crear tabla de emails mockeados
CREATE TABLE IF NOT EXISTS public.redpresu_mock_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN (
    'payment_failed',
    'expiring_soon',
    'expired',
    'grace_period_ending',
    'upgraded',
    'canceled',
    'custom'
  )),
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB,
  company_id INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2. Comentario de tabla
COMMENT ON TABLE public.redpresu_mock_emails IS
  'Emails mockeados para testing (NODE_ENV !== production). Se guardan en lugar de enviarse.';

-- 3. Índices para búsqueda eficiente
CREATE INDEX IF NOT EXISTS idx_mock_emails_type
  ON public.redpresu_mock_emails(type);

CREATE INDEX IF NOT EXISTS idx_mock_emails_to_email
  ON public.redpresu_mock_emails(to_email);

CREATE INDEX IF NOT EXISTS idx_mock_emails_company_id
  ON public.redpresu_mock_emails(company_id);

CREATE INDEX IF NOT EXISTS idx_mock_emails_created_at
  ON public.redpresu_mock_emails(created_at DESC);

-- 4. Habilitar RLS
ALTER TABLE public.redpresu_mock_emails ENABLE ROW LEVEL SECURITY;

-- 5. Policies RLS: Solo superadmin puede acceder
DROP POLICY IF EXISTS "mock_emails_select_superadmin"
  ON public.redpresu_mock_emails;

CREATE POLICY "mock_emails_select_superadmin"
  ON public.redpresu_mock_emails
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.redpresu_users
      WHERE id = auth.uid() AND role = 'superadmin'
    )
  );

DROP POLICY IF EXISTS "mock_emails_insert_system"
  ON public.redpresu_mock_emails;

CREATE POLICY "mock_emails_insert_system"
  ON public.redpresu_mock_emails
  FOR INSERT
  WITH CHECK (true);  -- Permitir inserts desde server actions (bypass RLS con supabaseAdmin)

DROP POLICY IF EXISTS "mock_emails_delete_superadmin"
  ON public.redpresu_mock_emails;

CREATE POLICY "mock_emails_delete_superadmin"
  ON public.redpresu_mock_emails
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
    AND table_name = 'redpresu_mock_emails'
  ) THEN
    RAISE NOTICE '✅ Tabla redpresu_mock_emails creada correctamente';
  ELSE
    RAISE EXCEPTION '❌ Error: No se pudo crear la tabla redpresu_mock_emails';
  END IF;
END $$;

COMMIT;

-- ============================================
-- VERIFICACIÓN POST-MIGRACIÓN
-- ============================================
--
-- Ver estructura de la tabla:
-- \d public.redpresu_mock_emails;
--
-- Ver políticas RLS:
-- SELECT * FROM pg_policies
-- WHERE tablename = 'redpresu_mock_emails';
--
-- Probar inserción (desde server action):
-- INSERT INTO public.redpresu_mock_emails
-- (type, to_email, subject, body, data, company_id)
-- VALUES (
--   'expiring_soon',
--   'test@example.com',
--   'Tu suscripción vence pronto',
--   'Tu suscripción Pro vence en 7 días.',
--   '{"plan": "pro", "days": 7}'::jsonb,
--   1
-- );
--
-- Ver emails mockeados:
-- SELECT * FROM public.redpresu_mock_emails
-- ORDER BY created_at DESC
-- LIMIT 10;
--
-- Limpiar todos los emails:
-- DELETE FROM public.redpresu_mock_emails;
--
-- ============================================
-- ROLLBACK (solo si es necesario revertir)
-- ============================================
-- DROP TABLE IF EXISTS public.redpresu_mock_emails CASCADE;
-- ============================================
