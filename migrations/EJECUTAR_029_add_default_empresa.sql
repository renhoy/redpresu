-- ============================================
-- MIGRACIÓN 029: Añadir default_empresa_id a configuración
-- INSTRUCCIONES:
-- 1. Abre Supabase Dashboard > SQL Editor
-- 2. Copia y pega TODO este contenido
-- 3. Ejecuta (Run)
-- 4. Verifica el resultado con la query al final
-- ============================================

BEGIN;

-- ============================================
-- PASO 1: Crear clave default_empresa_id
-- ============================================

INSERT INTO public.config (key, value, description, category, is_system)
VALUES (
  'default_empresa_id',
  '1'::jsonb,
  'ID de la empresa por defecto para usuarios sin empresa asignada (superadmin, nuevos usuarios, etc.)',
  'general',
  false
)
ON CONFLICT (key) DO UPDATE
SET
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  updated_at = NOW();

-- ============================================
-- PASO 2: Verificar que empresa con id=1 existe
-- ============================================

-- Esta query debe retornar 1 fila con nombre "Empresa Demo"
SELECT
  id,
  nombre,
  status,
  created_at
FROM public.empresas
WHERE id = 1;

COMMIT;

-- ============================================
-- VERIFICACIÓN POST-MIGRACIÓN
-- ============================================

-- Ver la configuración default_empresa_id
SELECT
  key,
  value,
  description,
  category,
  is_system
FROM public.config
WHERE key = 'default_empresa_id';

-- Ver todas las configuraciones generales
SELECT
  key,
  value,
  description
FROM public.config
WHERE category = 'general'
ORDER BY key;

-- Verificar empresa por defecto
SELECT
  id,
  nombre,
  status
FROM public.empresas
WHERE id = (
  SELECT (value)::int
  FROM public.config
  WHERE key = 'default_empresa_id'
);

-- ============================================
-- RESULTADO ESPERADO
-- ============================================
--
-- 1. default_empresa_id debe existir con valor: 1
-- 2. Empresa con id=1 debe existir y estar activa
-- 3. Nombre de la empresa: "Empresa Demo"
--
-- CASO DE USO:
-- Cuando un superadmin (sin empresa_id) crea una tarifa,
-- el sistema usará empresa_id = 1 (Empresa Demo) por defecto
--
-- ============================================
