-- ============================================
-- Migración 031: Agregar Config Modo Multiempresa
-- ============================================
-- Fecha: 2025-11-17
-- Descripción: Agregar configuración 'multiempresa' para alternar entre
--              modo SaaS (multiempresa) y modo on-premise (monoempresa)
--
-- Cambios:
-- 1. Insertar config 'multiempresa' con valor true (default)
--

-- ============================================
-- 1. Insertar config 'multiempresa'
-- ============================================

INSERT INTO public.config (config_key, config_value, description)
VALUES (
  'multiempresa',
  'true',
  'Modo de operación: true = multiempresa (SaaS), false = monoempresa (on-premise)'
)
ON CONFLICT (company_id, config_key)
DO UPDATE SET
  config_value = EXCLUDED.config_value,
  description = EXCLUDED.description;

-- ============================================
-- 2. Verificar
-- ============================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.config
    WHERE config_key = 'multiempresa'
  ) THEN
    RAISE NOTICE 'Config multiempresa creada correctamente';
  ELSE
    RAISE EXCEPTION 'Error: Config multiempresa no se creó';
  END IF;
END $$;

-- ============================================
-- ROLLBACK (si es necesario)
-- ============================================
-- DELETE FROM public.config WHERE config_key = 'multiempresa';
