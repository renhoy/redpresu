-- ============================================================
-- Migración: Permitir reglas globales (company_id NULL)
-- Fecha: 2025-11-15
-- ============================================================
-- Esta migración permite crear reglas que se apliquen a TODAS las empresas
-- mediante company_id NULL

-- 1. Eliminar la restricción UNIQUE actual que no permite NULL
ALTER TABLE redpresu.business_rules
DROP CONSTRAINT IF EXISTS unique_active_per_company;

-- 2. Hacer company_id nullable
ALTER TABLE redpresu.business_rules
ALTER COLUMN company_id DROP NOT NULL;

-- 3. Crear nueva restricción UNIQUE que maneje NULL correctamente
-- Para reglas globales (company_id IS NULL): solo puede haber una activa
-- Para reglas específicas: solo puede haber una activa por empresa
CREATE UNIQUE INDEX unique_active_global_rule
ON redpresu.business_rules (is_active)
WHERE company_id IS NULL AND is_active = true;

CREATE UNIQUE INDEX unique_active_per_company_rule
ON redpresu.business_rules (company_id, is_active)
WHERE company_id IS NOT NULL AND is_active = true;

-- 4. Hacer lo mismo para la tabla de audit_log
ALTER TABLE redpresu.rules_audit_log
ALTER COLUMN company_id DROP NOT NULL;

-- 5. Crear índices para mejorar performance en consultas
CREATE INDEX idx_business_rules_company_null
ON redpresu.business_rules (company_id)
WHERE company_id IS NULL;

CREATE INDEX idx_business_rules_active_null
ON redpresu.business_rules (is_active, company_id)
WHERE is_active = true;

-- ============================================================
-- Verificación
-- ============================================================
-- Verificar que la tabla permite NULL:
-- SELECT column_name, is_nullable
-- FROM information_schema.columns
-- WHERE table_schema = 'redpresu'
--   AND table_name = 'business_rules'
--   AND column_name = 'company_id';

-- ============================================================
-- Rollback
-- ============================================================
-- Para revertir estos cambios:
/*
DROP INDEX IF EXISTS redpresu.unique_active_global_rule;
DROP INDEX IF EXISTS redpresu.unique_active_per_company_rule;
DROP INDEX IF EXISTS redpresu.idx_business_rules_company_null;
DROP INDEX IF EXISTS redpresu.idx_business_rules_active_null;

ALTER TABLE redpresu.business_rules
ALTER COLUMN company_id SET NOT NULL;

ALTER TABLE redpresu.rules_audit_log
ALTER COLUMN company_id SET NOT NULL;

ALTER TABLE redpresu.business_rules
ADD CONSTRAINT unique_active_per_company
UNIQUE (company_id, is_active);
*/
