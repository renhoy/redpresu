-- ============================================
-- EJECUTAR EN SUPABASE SQL EDITOR
-- ============================================
-- Migración: 038_add_grace_period_config
-- Descripción: Añadir configuración de grace period para suscripciones expiradas
-- Fecha: 2025-01-30
-- Bloque: Testing System
-- Idempotente: Sí
-- ============================================

BEGIN;

-- Añadir config para grace period
INSERT INTO public.redpresu_config (key, value, description, category, is_system, created_at)
VALUES (
  'subscription_grace_period_days',
  '3'::jsonb,
  'Días de gracia después de expirar la suscripción antes de bloquear la cuenta. Durante este período el usuario puede seguir usando la app normalmente. Default: 3 días',
  'subscriptions',
  true,
  NOW()
)
ON CONFLICT (key) DO UPDATE
SET
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  updated_at = NOW();

-- Verificar creación exitosa
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.redpresu_config
    WHERE key = 'subscription_grace_period_days'
  ) THEN
    RAISE NOTICE '✅ Config subscription_grace_period_days creado/actualizado correctamente';
  ELSE
    RAISE EXCEPTION '❌ Error: No se pudo crear config subscription_grace_period_days';
  END IF;
END $$;

COMMIT;

-- ============================================
-- VERIFICACIÓN POST-MIGRACIÓN
-- ============================================
--
-- Ver config:
-- SELECT key, value, description, category, is_system
-- FROM public.redpresu_config
-- WHERE key = 'subscription_grace_period_days';
--
-- Cambiar grace period (ejemplo: 7 días):
-- UPDATE public.redpresu_config
-- SET value = '7'::jsonb
-- WHERE key = 'subscription_grace_period_days';
--
-- Deshabilitar grace period (0 días = bloqueo inmediato):
-- UPDATE public.redpresu_config
-- SET value = '0'::jsonb
-- WHERE key = 'subscription_grace_period_days';
--
-- ============================================
-- ROLLBACK (solo si es necesario revertir)
-- ============================================
-- DELETE FROM public.redpresu_config WHERE key = 'subscription_grace_period_days';
-- ============================================
