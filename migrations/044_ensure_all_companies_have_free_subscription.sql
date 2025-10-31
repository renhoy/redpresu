-- migrations/044_ensure_all_companies_have_free_subscription.sql
-- Descripción: Asegurar que todas las empresas tengan una suscripción FREE por defecto
-- Fecha: 2025-01-31
-- Bloque: 11 - Suscripciones

-- ============================================
-- UP: Aplicar cambios
-- ============================================

BEGIN;

-- Insertar suscripciones FREE para todas las empresas que no tengan ninguna suscripción
INSERT INTO public.redpresu_subscriptions (company_id, plan, status, created_at, updated_at)
SELECT
  e.id AS company_id,
  'free' AS plan,
  'active' AS status,
  NOW() AS created_at,
  NOW() AS updated_at
FROM public.redpresu_companies e
WHERE NOT EXISTS (
  SELECT 1
  FROM public.redpresu_subscriptions s
  WHERE s.company_id = e.id
);

-- Verificar resultado
SELECT
  COUNT(*) as total_empresas,
  (SELECT COUNT(*) FROM public.redpresu_subscriptions) as total_suscripciones
FROM public.redpresu_companies;

COMMIT;

-- ============================================
-- DOWN: Rollback (documentar, no ejecutar)
-- ============================================

-- Para revertir, eliminar solo las suscripciones FREE creadas por esta migración
-- (No recomendado - mejor mantener las suscripciones FREE)
-- DELETE FROM public.redpresu_subscriptions
-- WHERE plan = 'free'
-- AND stripe_customer_id IS NULL
-- AND stripe_subscription_id IS NULL;
