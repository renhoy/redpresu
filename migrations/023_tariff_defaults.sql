-- Migration: 023 - Valores por defecto para tarifas
-- Descripción: Añade configuraciones por defecto para colores y plantilla PDF
-- Fecha: 2025-01-10
-- Autor: Claude Code Assistant

-- ============================================
-- UP: Aplicar cambios
-- ============================================

BEGIN;

-- Insertar color primario por defecto
INSERT INTO public.config (key, value, description, category, is_system)
VALUES (
  'default_primary_color',
  '"#e8951c"'::jsonb,
  'Color primario por defecto para nuevas tarifas (cuando no hay plantilla)',
  'general',
  false
)
ON CONFLICT (key) DO NOTHING;

-- Insertar color secundario por defecto
INSERT INTO public.config (key, value, description, category, is_system)
VALUES (
  'default_secondary_color',
  '"#109c61"'::jsonb,
  'Color secundario por defecto para nuevas tarifas (cuando no hay plantilla)',
  'general',
  false
)
ON CONFLICT (key) DO NOTHING;

-- Insertar plantilla PDF por defecto
INSERT INTO public.config (key, value, description, category, is_system)
VALUES (
  'default_pdf_template',
  '"41200-00001"'::jsonb,
  'Plantilla PDF por defecto para nuevas tarifas (cuando no hay plantilla). Valor: id de plantilla (ej: 41200-00001 para Color)',
  'general',
  false
)
ON CONFLICT (key) DO NOTHING;

COMMIT;

-- ============================================
-- DOWN: Rollback (documentar, no ejecutar)
-- ============================================

-- DELETE FROM public.config WHERE key = 'default_primary_color';
-- DELETE FROM public.config WHERE key = 'default_secondary_color';
-- DELETE FROM public.config WHERE key = 'default_pdf_template';
