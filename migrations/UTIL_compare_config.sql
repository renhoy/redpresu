-- ============================================
-- COMPARACIÓN ESPECÍFICA: redpresu_config
-- ============================================
-- INSTRUCCIONES:
-- 1. Ejecuta este script en BASE DE DATOS 1 (ej: Desarrollo - 19 rows)
-- 2. Guarda resultado como "config_dev.txt"
-- 3. Ejecuta en BASE DE DATOS 2 (ej: Producción - 6 rows)
-- 4. Guarda resultado como "config_prod.txt"
-- 5. Compara ambos archivos con diff/meld/VSCode
-- ============================================

-- Mostrar todas las claves de configuración ordenadas
SELECT
  key,
  category,
  is_system,
  description,
  created_at::date as created,
  updated_at::date as updated
FROM public.redpresu_config
ORDER BY category, key;

-- ============================================
-- RESUMEN POR CATEGORÍA
-- ============================================
SELECT
  'RESUMEN' as tipo,
  category,
  COUNT(*) as total_keys,
  COUNT(*) FILTER (WHERE is_system = true) as system_keys,
  COUNT(*) FILTER (WHERE is_system = false) as editable_keys
FROM public.redpresu_config
GROUP BY category
ORDER BY category;

-- ============================================
-- TOTAL GENERAL
-- ============================================
SELECT
  'TOTAL GENERAL' as tipo,
  COUNT(*) as total_rows
FROM public.redpresu_config;

-- ============================================
-- LISTADO SIMPLE DE KEYS (para diff rápido)
-- ============================================
SELECT
  '--- KEYS LIST ---' as header
UNION ALL
SELECT key FROM public.redpresu_config ORDER BY key;
