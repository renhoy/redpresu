-- ============================================
-- MIGRACIÓN 044: Asegurar suscripción FREE por defecto para todas las empresas
-- ============================================
-- IMPORTANTE: Copiar y pegar TODO este contenido en el editor SQL de Supabase
-- Fecha: 2025-01-31
-- Bloque: 11 - Suscripciones

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
  (SELECT COUNT(*) FROM public.redpresu_subscriptions) as total_suscripciones,
  (SELECT COUNT(*) FROM public.redpresu_subscriptions WHERE plan = 'free') as suscripciones_free
FROM public.redpresu_companies;
