-- migrations/027_add_app_name_config.sql
-- Descripción: Añadir configuración para el nombre de la aplicación
-- Fecha: 2025-10-16
-- Bloque: 3 (Configuración)
-- Fase: 2

-- ============================================
-- UP: Aplicar cambios
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
-- COMENTARIOS
-- ============================================

COMMENT ON TABLE public.config IS
  'Configuración global del sistema editable por superadmin';

-- ============================================
-- DOWN: Rollback (documentar, no ejecutar automáticamente)
-- ============================================
-- Para revertir esta migración, ejecutar:
--
-- BEGIN;
-- DELETE FROM public.config WHERE key = 'app_name';
-- COMMIT;

-- ============================================
-- VERIFICACIÓN POST-MIGRACIÓN
-- ============================================
--
-- Ver la configuración creada:
-- SELECT key, value, description, category, is_system, created_at
-- FROM public.config
-- WHERE key = 'app_name';
--
-- ============================================
