-- migrations/033_add_subscription_plans_config.sql
-- Descripción: Añadir configuración de planes de suscripción (Free, Pro, Enterprise)
-- Fecha: 2025-01-29
-- Bloque: 11 (Suscripciones Stripe)

-- ============================================
-- UP: Aplicar cambios
-- ============================================

BEGIN;

-- Insertar config 'subscription_plans' con definición completa de planes
-- Permite al superadmin modificar límites y características desde /settings
INSERT INTO public.redpresu_config (key, value, description, category, is_system)
VALUES (
  'subscription_plans',
  '{
    "free": {
      "id": "free",
      "name": "Free",
      "description": "Plan gratuito para comenzar",
      "price": 0,
      "priceId": "",
      "position": 1,
      "limits": {
        "tariffs": 3,
        "budgets": 10,
        "users": 1,
        "storage_mb": 100
      },
      "features": {
        "tariffs_limit": "Hasta 3 tarifas",
        "budgets_limit": "Hasta 10 presupuestos",
        "users_limit": "1 usuario",
        "storage": "100 MB almacenamiento",
        "support": "Soporte por email",
        "custom_templates": false,
        "priority_support": false,
        "remove_watermark": false,
        "multi_company": false,
        "api_access": false,
        "custom_branding": false
      }
    },
    "pro": {
      "id": "pro",
      "name": "Pro",
      "description": "Plan profesional para negocios",
      "price": 29,
      "priceId": "price_REPLACE_WITH_REAL_PRICE_ID",
      "position": 2,
      "limits": {
        "tariffs": 50,
        "budgets": 500,
        "users": 5,
        "storage_mb": 5000
      },
      "features": {
        "tariffs_limit": "Hasta 50 tarifas",
        "budgets_limit": "Hasta 500 presupuestos",
        "users_limit": "Hasta 5 usuarios",
        "storage": "5 GB almacenamiento",
        "support": "Soporte prioritario",
        "custom_templates": true,
        "priority_support": true,
        "remove_watermark": true,
        "multi_company": false,
        "api_access": false,
        "custom_branding": false
      }
    },
    "enterprise": {
      "id": "enterprise",
      "name": "Enterprise",
      "description": "Plan empresarial sin límites",
      "price": 99,
      "priceId": "price_REPLACE_WITH_REAL_PRICE_ID",
      "position": 3,
      "limits": {
        "tariffs": 9999,
        "budgets": 9999,
        "users": 50,
        "storage_mb": 50000
      },
      "features": {
        "tariffs_limit": "Tarifas ilimitadas",
        "budgets_limit": "Presupuestos ilimitados",
        "users_limit": "Hasta 50 usuarios",
        "storage": "50 GB almacenamiento",
        "support": "Soporte dedicado 24/7",
        "custom_templates": true,
        "priority_support": true,
        "remove_watermark": true,
        "multi_company": true,
        "api_access": true,
        "custom_branding": true
      }
    }
  }'::jsonb,
  'Configuración de planes de suscripción (Free, Pro, Enterprise). Define límites y características de cada plan.',
  'subscriptions',
  true
)
ON CONFLICT (key) DO NOTHING;

-- Verificar inserción
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.redpresu_config WHERE key = 'subscription_plans'
  ) THEN
    RAISE NOTICE '✅ Config subscription_plans creada correctamente';
  ELSE
    RAISE EXCEPTION '❌ Error: Config subscription_plans NO se creó';
  END IF;
END $$;

COMMIT;

-- ============================================
-- Verificación manual (ejecutar después)
-- ============================================

/*
SELECT key, value->'free' as plan_free, value->'pro' as plan_pro, value->'enterprise' as plan_enterprise
FROM public.redpresu_config
WHERE key = 'subscription_plans';

-- Verificar límites de plan Pro
SELECT
  value->'pro'->'limits'->>'tariffs' as tariffs,
  value->'pro'->'limits'->>'budgets' as budgets,
  value->'pro'->'limits'->>'users' as users
FROM public.redpresu_config
WHERE key = 'subscription_plans';
*/

-- ============================================
-- DOWN: Rollback (documentar, no ejecutar)
-- ============================================

-- DELETE FROM public.redpresu_config WHERE key = 'subscription_plans';
