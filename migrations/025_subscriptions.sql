-- migrations/025_subscriptions.sql
-- Descripción: Tabla de suscripciones para integración con Stripe
-- Fecha: 2025-01-04
-- Bloque: 11 - Suscripciones

-- ============================================
-- UP: Aplicar cambios
-- ============================================

BEGIN;

-- 1. Crear tabla subscriptions
CREATE TABLE IF NOT EXISTS public.redpresu_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id INTEGER NOT NULL DEFAULT 1,
  plan TEXT NOT NULL CHECK (plan IN ('free', 'pro', 'enterprise')) DEFAULT 'free',
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due', 'trialing')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Índices
CREATE INDEX IF NOT EXISTS idx_redpresu_subscriptions_company ON redpresu_subscriptions(company_id);
CREATE INDEX IF NOT EXISTS idx_redpresu_subscriptions_stripe_customer ON redpresu_subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_redpresu_subscriptions_status ON redpresu_subscriptions(status);

-- 3. RLS Policies
ALTER TABLE redpresu_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "redpresu_subscriptions_select_own_company"
ON redpresu_subscriptions FOR SELECT
USING (company_id = 1); -- Temporalmente company_id = 1 hasta implementar multi-tenant

CREATE POLICY "redpresu_subscriptions_insert_own_company"
ON redpresu_subscriptions FOR INSERT
WITH CHECK (company_id = 1);

CREATE POLICY "redpresu_subscriptions_update_own_company"
ON redpresu_subscriptions FOR UPDATE
USING (company_id = 1);

-- 4. Datos iniciales: crear suscripción Free para empresa 1
INSERT INTO redpresu_subscriptions (company_id, plan, status)
VALUES (1, 'free', 'active')
ON CONFLICT DO NOTHING;

-- 5. Función helper para verificar límites
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
  SELECT value INTO v_config_value
  FROM public.config
  WHERE key = 'stripe_plans';

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

-- DROP FUNCTION IF EXISTS check_plan_limit(INTEGER, TEXT);
-- DROP TABLE IF EXISTS public.redpresu_subscriptions CASCADE;
