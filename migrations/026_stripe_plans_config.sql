-- migrations/026_stripe_plans_config.sql
-- Descripción: Configuración de planes de Stripe en tabla config
-- Fecha: 2025-01-18
-- Bloque: 11 - Suscripciones

-- ============================================
-- UP: Aplicar cambios
-- ============================================

BEGIN;

-- Insertar configuración de planes Stripe
-- IMPORTANTE: Actualizar priceId con IDs reales de Stripe Dashboard después del deploy
INSERT INTO public.config (key, value, description, category, is_system)
VALUES (
  'stripe_plans',
  '{
    "free": {
      "id": "free",
      "name": "Free",
      "description": "Plan gratuito para comenzar",
      "price": 0,
      "priceId": "",
      "limits": {
        "tariffs": 3,
        "budgets": 10,
        "users": 1,
        "storage_mb": 100
      },
      "features": [
        "Hasta 3 tarifas",
        "Hasta 10 presupuestos",
        "1 usuario",
        "100 MB almacenamiento",
        "Soporte por email"
      ]
    },
    "pro": {
      "id": "pro",
      "name": "Pro",
      "description": "Plan profesional para negocios",
      "price": 29,
      "priceId": "price_REPLACE_WITH_REAL_PRICE_ID",
      "limits": {
        "tariffs": 50,
        "budgets": 500,
        "users": 5,
        "storage_mb": 5000
      },
      "features": [
        "Hasta 50 tarifas",
        "Hasta 500 presupuestos",
        "Hasta 5 usuarios",
        "5 GB almacenamiento",
        "Plantillas personalizadas",
        "Soporte prioritario",
        "Sin marca de agua"
      ]
    },
    "enterprise": {
      "id": "enterprise",
      "name": "Enterprise",
      "description": "Plan empresarial sin límites",
      "price": 99,
      "priceId": "price_REPLACE_WITH_REAL_PRICE_ID",
      "limits": {
        "tariffs": 9999,
        "budgets": 9999,
        "users": 50,
        "storage_mb": 50000
      },
      "features": [
        "Tarifas ilimitadas",
        "Presupuestos ilimitados",
        "Hasta 50 usuarios",
        "50 GB almacenamiento",
        "Plantillas personalizadas",
        "Multi-empresa",
        "Soporte dedicado 24/7",
        "API access",
        "Branding completo"
      ]
    }
  }'::jsonb,
  'Configuración de planes de suscripción con Stripe',
  'subscriptions',
  true
)
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value,
    description = EXCLUDED.description,
    updated_at = NOW();

COMMIT;

-- ============================================
-- DOWN: Rollback (documentar, no ejecutar)
-- ============================================

-- DELETE FROM public.config WHERE key = 'stripe_plans';
