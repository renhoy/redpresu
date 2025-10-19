-- migrations/031_add_multiempresa_config.sql
-- Descripción: Añadir configuración para modo multiempresa/monoempresa
-- Fecha: 2025-01-19
-- Bloque: 12 (Modo Monoempresa/Multiempresa)
-- Fase: 2

-- ============================================
-- UP: Aplicar cambios
-- ============================================

BEGIN;

-- Insertar configuración del modo multiempresa
-- true = modo multiempresa (SaaS con registro público, suscripciones, límites)
-- false = modo monoempresa (1 empresa fija, sin registro, sin límites)
INSERT INTO public.config (key, value, description, category, is_system)
VALUES (
  'multiempresa',
  'true'::jsonb,
  'Modo de operación: true=multiempresa (SaaS), false=monoempresa (on-premise)',
  'general',
  true
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
-- DELETE FROM public.config WHERE key = 'multiempresa';
-- COMMIT;

-- ============================================
-- VERIFICACIÓN POST-MIGRACIÓN
-- ============================================
--
-- Ver la configuración creada:
-- SELECT key, value, description, category, is_system, created_at
-- FROM public.config
-- WHERE key = 'multiempresa';
--
-- Para cambiar el modo (solo superadmin):
-- UPDATE public.config SET value = 'false'::jsonb WHERE key = 'multiempresa'; -- Activar modo monoempresa
-- UPDATE public.config SET value = 'true'::jsonb WHERE key = 'multiempresa'; -- Activar modo multiempresa
--
-- ============================================
