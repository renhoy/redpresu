-- migrations/016_make_iva_re_editable.sql
-- Descripción: Hacer editable la configuración iva_re_equivalences
-- Fecha: 2025-01-XX
-- Bloque: 4 (IRPF y RE)

-- ============================================
-- UP: Aplicar cambios
-- ============================================

BEGIN;

-- Cambiar iva_re_equivalences de sistema a editable
-- y actualizar el formato para usar números con 2 decimales
UPDATE public.config
SET
  is_system = false,
  value = '{"4.00": 0.50, "10.00": 1.40, "21.00": 5.20}'::jsonb,
  description = 'Equivalencias IVA a Recargo de Equivalencia según normativa española. Los valores de IVA deben tener 2 decimales (4.00, 10.00, 21.00) y los porcentajes de RE también (0.50, 1.40, 5.20).',
  updated_at = NOW()
WHERE key = 'iva_re_equivalences';

COMMIT;

-- ============================================
-- DOWN: Rollback (documentar, no ejecutar)
-- ============================================

-- UPDATE public.config
-- SET
--   is_system = true,
--   value = '{"21": 5.2, "10": 1.4, "4": 0.5}'::jsonb,
--   description = 'Equivalencias IVA a Recargo de Equivalencia según normativa española',
--   updated_at = NOW()
-- WHERE key = 'iva_re_equivalences';
