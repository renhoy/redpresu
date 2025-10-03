-- migrations/008_tariffs_user_id.sql
-- Descripción: Añadir campo user_id a tabla tariffs para trazabilidad de creación
-- Fecha: 2025-01-04
-- Bloque: 2 (Mejoras Tarifas)
-- Fase: 2

-- ============================================
-- UP: Aplicar cambios
-- ============================================

BEGIN;

-- 1. Añadir columna user_id (nullable temporalmente)
ALTER TABLE public.tariffs
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. Migrar datos existentes: asignar al primer admin de cada empresa
-- Por cada tarifa, buscar el primer admin de su empresa y asignarlo
UPDATE public.tariffs t
SET user_id = (
  SELECT u.id
  FROM public.users u
  WHERE u.empresa_id = t.empresa_id
    AND u.role IN ('admin', 'superadmin')
    AND u.status = 'active'
  ORDER BY u.created_at ASC
  LIMIT 1
)
WHERE t.user_id IS NULL;

-- 3. Si alguna tarifa no tiene admin asignado (empresa sin admins activos),
--    asignar al primer usuario activo de la empresa
UPDATE public.tariffs t
SET user_id = (
  SELECT u.id
  FROM public.users u
  WHERE u.empresa_id = t.empresa_id
    AND u.status = 'active'
  ORDER BY u.created_at ASC
  LIMIT 1
)
WHERE t.user_id IS NULL;

-- 4. Hacer el campo obligatorio
-- NOTA: Si aún hay tarifas sin user_id después de la migración,
-- esta sentencia fallará y deberás revisar manualmente
ALTER TABLE public.tariffs
  ALTER COLUMN user_id SET NOT NULL;

-- 5. Crear índice para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_tariffs_user_id ON public.tariffs(user_id);

-- 6. Crear índice compuesto para filtrar por empresa y usuario
CREATE INDEX IF NOT EXISTS idx_tariffs_empresa_user ON public.tariffs(empresa_id, user_id);

-- 7. Añadir comentario
COMMENT ON COLUMN public.tariffs.user_id IS 'User who created this tariff (for audit trail)';

-- 8. Actualizar RLS policies para incluir user_id en logs
-- Las policies existentes no necesitan cambios, pero añadimos comentario
COMMENT ON POLICY "tariffs_select_policy" ON public.tariffs IS 'Users can see tariffs from their company';
COMMENT ON POLICY "tariffs_insert_policy" ON public.tariffs IS 'Users can create tariffs in their company with their user_id';

COMMIT;

-- ============================================
-- VERIFICACIÓN POST-MIGRACIÓN
-- ============================================
-- Ejecutar estas queries después de aplicar la migración:
--
-- 1. Verificar que todas las tarifas tienen user_id:
-- SELECT COUNT(*) FROM public.tariffs WHERE user_id IS NULL;
-- (Debe retornar 0)
--
-- 2. Verificar distribución de tarifas por usuario:
-- SELECT
--   u.nombre || ' ' || u.apellidos AS usuario,
--   u.email,
--   COUNT(t.id) AS num_tarifas
-- FROM public.tariffs t
-- JOIN public.users u ON t.user_id = u.id
-- GROUP BY u.id, u.nombre, u.apellidos, u.email
-- ORDER BY num_tarifas DESC;

-- ============================================
-- DOWN: Rollback (documentar, no ejecutar automáticamente)
-- ============================================
-- Para revertir esta migración, ejecutar:
--
-- BEGIN;
-- DROP INDEX IF EXISTS idx_tariffs_user_id;
-- DROP INDEX IF EXISTS idx_tariffs_empresa_user;
-- ALTER TABLE public.tariffs DROP COLUMN IF EXISTS user_id;
-- COMMIT;
