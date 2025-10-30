-- ============================================
-- EJECUTAR EN SUPABASE SQL EDITOR
-- ============================================
-- Migración: 033b_update_positions
-- Descripción: Añadir campo "position" a los planes existentes
-- Nota: Ejecutar SOLO si ya ejecutaste la migración 033 sin el campo position
-- ============================================

BEGIN;

-- Actualizar config existente añadiendo el campo position a cada plan
UPDATE public.redpresu_config
SET value = jsonb_set(
  jsonb_set(
    jsonb_set(
      value,
      '{free,position}',
      '1'::jsonb
    ),
    '{pro,position}',
    '2'::jsonb
  ),
  '{enterprise,position}',
  '3'::jsonb
)
WHERE key = 'subscription_plans';

-- Verificar actualización
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.redpresu_config
    WHERE key = 'subscription_plans'
    AND value->'free'->'position' IS NOT NULL
  ) THEN
    RAISE NOTICE '✅ Campo position añadido correctamente a todos los planes';
  ELSE
    RAISE EXCEPTION '❌ Error: Campo position NO se añadió';
  END IF;
END $$;

COMMIT;

-- ============================================
-- VERIFICACIÓN: Ejecutar después para confirmar
-- ============================================

-- Ver posiciones de todos los planes
SELECT
  value->'free'->>'position' as position_free,
  value->'pro'->>'position' as position_pro,
  value->'enterprise'->>'position' as position_enterprise
FROM public.redpresu_config
WHERE key = 'subscription_plans';

-- Resultado esperado:
-- position_free | position_pro | position_enterprise
-- 1             | 2            | 3
