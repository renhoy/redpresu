-- ============================================
-- MIGRACIÓN 027: Añadir configuración nombre de aplicación
-- INSTRUCCIONES:
-- 1. Abre Supabase Dashboard > SQL Editor
-- 2. Copia y pega TODO este contenido
-- 3. Ejecuta (Run)
-- 4. Verifica el resultado con las queries al final
-- ============================================

BEGIN;

-- Insertar configuración del nombre de la aplicación
INSERT INTO public.config (key, value, description, category, is_system)
VALUES (
  'app_name',
  '"Redpresu"'::jsonb,
  'Nombre de la aplicación mostrado en la interfaz',
  'general',
  false
)
ON CONFLICT (key) DO UPDATE
SET
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  updated_at = NOW();

COMMIT;

-- ============================================
-- VERIFICACIÓN POST-MIGRACIÓN
-- ============================================

-- Ver la configuración creada
SELECT key, value, description, category, is_system, created_at
FROM public.config
WHERE key = 'app_name';

-- ============================================
-- RESULTADO ESPERADO
-- ============================================
--
-- Deberías ver:
-- key: app_name
-- value: "Redpresu"
-- description: Nombre de la aplicación mostrado en la interfaz
-- category: general
-- is_system: false
--
-- ============================================
