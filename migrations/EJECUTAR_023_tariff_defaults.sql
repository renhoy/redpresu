-- ============================================
-- EJECUTAR MIGRACIÓN 023: Valores por defecto para tarifas
-- ============================================

-- Copiar y pegar este código en el SQL Editor de Supabase:

-- 1. Verificar configuraciones actuales
SELECT key, value, description
FROM public.config
WHERE key IN ('default_primary_color', 'default_secondary_color', 'default_pdf_template')
ORDER BY key;

-- 2. Insertar valores por defecto

-- Color primario por defecto
INSERT INTO public.config (key, value, description, category, is_system)
VALUES (
  'default_primary_color',
  '"#e8951c"'::jsonb,
  'Color primario por defecto para nuevas tarifas (cuando no hay plantilla)',
  'general',
  false
)
ON CONFLICT (key) DO NOTHING;

-- Color secundario por defecto
INSERT INTO public.config (key, value, description, category, is_system)
VALUES (
  'default_secondary_color',
  '"#109c61"'::jsonb,
  'Color secundario por defecto para nuevas tarifas (cuando no hay plantilla)',
  'general',
  false
)
ON CONFLICT (key) DO NOTHING;

-- Plantilla PDF por defecto (Color)
INSERT INTO public.config (key, value, description, category, is_system)
VALUES (
  'default_pdf_template',
  '"41200-00001"'::jsonb,
  'Plantilla PDF por defecto para nuevas tarifas (cuando no hay plantilla). Valor: id de plantilla (ej: 41200-00001 para Color)',
  'general',
  false
)
ON CONFLICT (key) DO NOTHING;

-- 3. Verificar que se insertaron correctamente
SELECT key, value, description
FROM public.config
WHERE key IN ('default_primary_color', 'default_secondary_color', 'default_pdf_template')
ORDER BY key;

-- ============================================
-- NOTAS:
-- ============================================
-- - Los colores están en formato hexadecimal (#rrggbb)
-- - La plantilla por defecto debe coincidir con un id de pdf_templates
-- - Estos valores se usan SOLO cuando no hay tarifa marcada como plantilla
-- - Son editables por superadmin desde /settings
