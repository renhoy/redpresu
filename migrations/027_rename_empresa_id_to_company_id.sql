-- migrations/027_rename_empresa_id_to_company_id.sql
-- Descripción: Renombrar campo empresa_id a company_id en redpresu_subscriptions
-- Fecha: 2025-01-18
-- Bloque: 11 - Suscripciones

-- ============================================
-- UP: Aplicar cambios
-- ============================================

BEGIN;

-- 1. Renombrar columna empresa_id a company_id
ALTER TABLE redpresu_subscriptions
RENAME COLUMN empresa_id TO company_id;

-- 2. Renombrar índice
DROP INDEX IF EXISTS idx_redpresu_subscriptions_empresa;
CREATE INDEX IF NOT EXISTS idx_redpresu_subscriptions_company
ON redpresu_subscriptions(company_id);

-- 3. Eliminar políticas RLS antiguas
DROP POLICY IF EXISTS "redpresu_subscriptions_select_own_empresa" ON redpresu_subscriptions;
DROP POLICY IF EXISTS "redpresu_subscriptions_insert_own_empresa" ON redpresu_subscriptions;
DROP POLICY IF EXISTS "redpresu_subscriptions_update_own_empresa" ON redpresu_subscriptions;

-- 4. Crear nuevas políticas RLS con nombre correcto
CREATE POLICY "redpresu_subscriptions_select_own_company"
ON redpresu_subscriptions FOR SELECT
USING (company_id = 1); -- Temporalmente company_id = 1 hasta implementar multi-tenant

CREATE POLICY "redpresu_subscriptions_insert_own_company"
ON redpresu_subscriptions FOR INSERT
WITH CHECK (company_id = 1);

CREATE POLICY "redpresu_subscriptions_update_own_company"
ON redpresu_subscriptions FOR UPDATE
USING (company_id = 1);

-- 5. Recrear función check_plan_limit con parámetro correcto
DROP FUNCTION IF EXISTS check_plan_limit(INTEGER, TEXT);

CREATE OR REPLACE FUNCTION check_plan_limit(
  p_company_id INTEGER,
  p_resource_type TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_plan TEXT;
  v_limits JSONB;
  v_current_count INTEGER;
  v_max_limit INTEGER;
  v_config_value JSONB;
BEGIN
  -- Obtener plan actual
  SELECT plan INTO v_plan
  FROM redpresu_subscriptions
  WHERE company_id = p_company_id AND status = 'active'
  LIMIT 1;

  IF v_plan IS NULL THEN
    v_plan := 'free';
  END IF;

  -- Obtener configuración de planes
  SELECT config_value::JSONB INTO v_config_value
  FROM redpresu_config
  WHERE config_key = 'stripe_plans';

  IF v_config_value IS NULL THEN
    RETURN true; -- Sin configuración, permitir todo
  END IF;

  -- Obtener límites del plan
  v_limits := v_config_value->v_plan->'limits';

  IF v_limits IS NULL THEN
    RETURN true; -- Plan sin límites definidos
  END IF;

  -- Obtener límite del recurso
  v_max_limit := (v_limits->>p_resource_type)::INTEGER;

  IF v_max_limit IS NULL THEN
    RETURN true; -- Recurso sin límite
  END IF;

  -- Contar recursos actuales
  IF p_resource_type = 'tariffs' THEN
    SELECT COUNT(*) INTO v_current_count FROM redpresu_tariffs WHERE company_id = p_company_id;
  ELSIF p_resource_type = 'budgets' THEN
    SELECT COUNT(*) INTO v_current_count FROM redpresu_budgets WHERE company_id = p_company_id;
  ELSIF p_resource_type = 'users' THEN
    SELECT COUNT(*) INTO v_current_count FROM redpresu_users WHERE company_id = p_company_id;
  ELSE
    RETURN true; -- Recurso no limitado
  END IF;

  -- Verificar si puede crear más
  RETURN v_current_count < v_max_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;

-- ============================================
-- DOWN: Rollback (documentar, no ejecutar)
-- ============================================

-- BEGIN;
--
-- ALTER TABLE redpresu_subscriptions
-- RENAME COLUMN company_id TO empresa_id;
--
-- DROP INDEX IF EXISTS idx_redpresu_subscriptions_company;
-- CREATE INDEX idx_redpresu_subscriptions_empresa ON redpresu_subscriptions(empresa_id);
--
-- DROP POLICY IF EXISTS "redpresu_subscriptions_select_own_company" ON redpresu_subscriptions;
-- DROP POLICY IF EXISTS "redpresu_subscriptions_insert_own_company" ON redpresu_subscriptions;
-- DROP POLICY IF EXISTS "redpresu_subscriptions_update_own_company" ON redpresu_subscriptions;
--
-- CREATE POLICY "redpresu_subscriptions_select_own_empresa"
-- ON redpresu_subscriptions FOR SELECT
-- USING (empresa_id = 1);
--
-- CREATE POLICY "redpresu_subscriptions_insert_own_empresa"
-- ON redpresu_subscriptions FOR INSERT
-- WITH CHECK (empresa_id = 1);
--
-- CREATE POLICY "redpresu_subscriptions_update_own_empresa"
-- ON redpresu_subscriptions FOR UPDATE
-- USING (empresa_id = 1);
--
-- DROP FUNCTION IF EXISTS check_plan_limit(INTEGER, TEXT);
-- [Recrear función con p_empresa_id]
--
-- COMMIT;
