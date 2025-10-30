-- ============================================
-- EJECUTAR EN SUPABASE SQL EDITOR
-- ============================================
-- Migración: 032_add_subscriptions_config
-- Descripción: Añadir configuración para activar/desactivar módulo de suscripciones
-- ============================================

BEGIN;

-- Insertar config 'subscriptions_enabled' (default: false)
INSERT INTO public.redpresu_config (key, value, description, category, is_system)
VALUES (
  'subscriptions_enabled',
  'false'::jsonb,
  'Activar módulo de suscripciones Stripe (solo disponible en modo multiempresa). Solo superadmin puede modificar.',
  'features',
  true
)
ON CONFLICT (key) DO NOTHING;

-- Verificar inserción
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.redpresu_config WHERE key = 'subscriptions_enabled'
  ) THEN
    RAISE NOTICE '✅ Config subscriptions_enabled creada correctamente';
  ELSE
    RAISE EXCEPTION '❌ Error: Config subscriptions_enabled NO se creó';
  END IF;
END $$;

COMMIT;

-- ============================================
-- VERIFICACIÓN: Ejecutar después para confirmar
-- ============================================

SELECT key, value, description, category, is_system, created_at
FROM public.redpresu_config
WHERE key = 'subscriptions_enabled';

-- Resultado esperado:
-- key                   | value | description                                    | category | is_system
-- subscriptions_enabled | false | Activar módulo de suscripciones Stripe...     | features | true
