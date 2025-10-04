-- ============================================
-- LIMPIAR CONFIGURACIÓN INNECESARIA
-- INSTRUCCIONES:
-- 1. Abre Supabase Dashboard > SQL Editor
-- 2. Copia y pega TODO este contenido
-- 3. Ejecuta (Run)
-- ============================================

BEGIN;

-- Eliminar configuraciones que no se usan
DELETE FROM public.config
WHERE key IN (
  'budget_validity_days',      -- No tiene sentido: el presupuesto hereda validez de la tarifa
  'default_legal_note',         -- No se usa: cada tarifa tiene su legal_note específico
  'tariff_validity_days'        -- No se usa: el formulario ya tiene 30 como default hardcoded
);

-- Verificar configuración restante
SELECT key, description, category, is_system
FROM public.config
ORDER BY category, key;

COMMIT;

-- ============================================
-- RESULTADO ESPERADO:
-- Solo deberían quedar estas configuraciones:
--
-- defaults:
--   - default_colors (usado para pre-cargar colores en tarifas)
--
-- fiscal:
--   - iva_re_equivalences (usado para calcular RE desde IVA)
--
-- pdf:
--   - pdf_template_default (será usado cuando implementemos selector)
--   - pdf_templates (será usado cuando implementemos selector)
-- ============================================
