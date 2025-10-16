-- ============================================
-- MIGRACIÓN 028: Añadir default_tariff y eliminar default_colors
-- INSTRUCCIONES:
-- 1. Abre Supabase Dashboard > SQL Editor
-- 2. Copia y pega TODO este contenido
-- 3. Ejecuta (Run)
-- 4. Verifica el resultado con la query al final
-- ============================================

BEGIN;

-- ============================================
-- PASO 1: Eliminar clave default_colors (obsoleta)
-- ============================================

DELETE FROM public.config WHERE key = 'default_colors';

-- ============================================
-- PASO 2: Crear clave default_tariff con estructura completa
-- ============================================

INSERT INTO public.config (key, value, description, category, is_system)
VALUES (
  'default_tariff',
  '{
    "tariff_data": {
      "validity": "30",
      "status": "Inactiva"
    },
    "data_company": {
      "logo_url": "https://img.freepik.com/vector-gratis/vector-degradado-logotipo-colorido-pajaro_343694-1365.jpg",
      "name": "Lorem Ipsum S.A.",
      "nif": "V65724866",
      "address": "Calle Real, 325 - 41200, Alcalá del Río (Sevilla)",
      "contact": "939 778 965 - info@loremipsum.com"
    },
    "visual_config": {
      "primary_color": "#84cc16",
      "secondary_color": "#0891b2"
    },
    "pdf_notes": {
      "summary_note": "<p><strong>ACEPTACIÓN Y FORMAS DE PAGO</strong></p><p>El presupuesto se considerará aceptado una vez firmado por el cliente. Formas de pago disponibles: transferencia bancaria, efectivo o tarjeta.</p>",
      "conditions_note": "<p><strong>CONDICIONES GENERALES</strong></p><ul><li>Presupuesto válido por 30 días desde la fecha de emisión</li><li>Los precios incluyen IVA</li><li>Plazo de entrega: según acordado</li></ul>"
    },
    "legal_note": "<p><strong>INFORMACIÓN LEGAL</strong></p><p>En cumplimiento del RGPD, los datos personales recogidos serán tratados de forma confidencial. Puede ejercer sus derechos de acceso, rectificación y supresión contactando con nosotros.</p>"
  }'::jsonb,
  'Valores por defecto para crear nuevas tarifas (cuando no existe tarifa plantilla)',
  'tariffs',
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

-- Ver la configuración default_tariff
SELECT
  key,
  value,
  description,
  category,
  is_system
FROM public.config
WHERE key = 'default_tariff';

-- Verificar que default_colors ya no existe
SELECT
  key,
  value
FROM public.config
WHERE key = 'default_colors';
-- Debe retornar: 0 rows

-- Ver todas las configuraciones de tarifas
SELECT
  key,
  description,
  category
FROM public.config
WHERE category = 'tariffs'
ORDER BY key;

-- ============================================
-- RESULTADO ESPERADO
-- ============================================
--
-- 1. default_tariff debe existir con el JSON completo
-- 2. default_colors NO debe aparecer (eliminada)
-- 3. En category 'tariffs' deberías ver:
--    - default_tariff (nuevo)
--    - default_pdf_template (si existe)
--
-- ============================================
