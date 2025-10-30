-- ============================================
-- EJECUTAR EN SUPABASE SQL EDITOR
-- ============================================
-- Migración: 036_add_mock_time_config
-- Descripción: Añadir configuración de mock time para testing de suscripciones
-- Fecha: 2025-01-30
-- Bloque: Testing System
-- Idempotente: Sí
-- ============================================

BEGIN;

-- Añadir config para mock time (testing only)
INSERT INTO public.redpresu_config (key, value, description, category, is_system, created_at)
VALUES (
  'mock_time',
  'null'::jsonb,
  'Fecha/hora simulada para testing (ISO 8601 string o null). Solo funciona en NODE_ENV !== production. Ejemplo: "2025-12-31T23:59:59Z"',
  'testing',
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
    WHERE key = 'mock_time'
  ) THEN
    RAISE NOTICE '✅ Config mock_time creado/actualizado correctamente';
  ELSE
    RAISE EXCEPTION '❌ Error: No se pudo crear config mock_time';
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
-- WHERE key = 'mock_time';
--
-- Probar mock time (ejemplo):
-- UPDATE public.redpresu_config
-- SET value = '"2025-12-31T23:59:59Z"'::jsonb
-- WHERE key = 'mock_time';
--
-- Limpiar mock time:
-- UPDATE public.redpresu_config
-- SET value = 'null'::jsonb
-- WHERE key = 'mock_time';
--
-- ============================================
-- ROLLBACK (solo si es necesario revertir)
-- ============================================
-- DELETE FROM public.redpresu_config WHERE key = 'mock_time';
-- ============================================
