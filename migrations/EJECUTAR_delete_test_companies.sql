-- ============================================
-- SQL para eliminar empresas de prueba: 3, 4, 5, 6, 7, 8, 9, 10, 11
-- ============================================
-- IMPORTANTE: Copiar y pegar TODO este contenido en el editor SQL de Supabase
-- Mantener solo empresas: 1, 16, 17
-- ADVERTENCIA: Esta operación NO se puede deshacer
--
-- ⚠️ CRÍTICO - PROTECCIONES IMPLEMENTADAS:
--   1. La empresa con id=1 NUNCA debe estar en la lista de empresas a eliminar
--   2. Los usuarios con rol 'superadmin' NO serán eliminados (se reasignarán automáticamente a empresa 1)
--   3. El usuario josivela+super@gmail.com NUNCA será eliminado
--   4. Si ejecutas este script y alguna empresa contiene usuarios superadmin, estos se PRESERVARÁN
--
-- Si modificas este script, VERIFICA que la empresa 1 NO esté en los DELETE
-- ============================================

BEGIN;

-- IDs de empresas a eliminar
-- 3, 4, 5, 6, 7, 8, 9, 10, 11

-- 1. Eliminar suscripciones de estas empresas
DELETE FROM public.redpresu_subscriptions
WHERE company_id IN (3, 4, 5, 6, 7, 8, 9, 10, 11);

-- 2. Eliminar mock emails de estas empresas
DELETE FROM public.redpresu_mock_emails
WHERE company_id IN (3, 4, 5, 6, 7, 8, 9, 10, 11);

-- 3. Eliminar notas de presupuestos de estas empresas
DELETE FROM public.redpresu_budget_notes
WHERE budget_id IN (
  SELECT id FROM public.redpresu_budgets
  WHERE company_id IN (3, 4, 5, 6, 7, 8, 9, 10, 11)
);

-- 4. Eliminar versiones de presupuestos de estas empresas
DELETE FROM public.redpresu_budget_versions
WHERE budget_id IN (
  SELECT id FROM public.redpresu_budgets
  WHERE company_id IN (3, 4, 5, 6, 7, 8, 9, 10, 11)
);

-- 5. Eliminar presupuestos de estas empresas
DELETE FROM public.redpresu_budgets
WHERE company_id IN (3, 4, 5, 6, 7, 8, 9, 10, 11);

-- 6. Eliminar tarifas de estas empresas
DELETE FROM public.redpresu_tariffs
WHERE company_id IN (3, 4, 5, 6, 7, 8, 9, 10, 11);

-- 7. Eliminar usuarios de estas empresas
-- NOTA: Esto solo elimina de redpresu_users, NO de auth.users
-- PROTECCIÓN: NO eliminar usuarios superadmin ni el usuario protegido del sistema
DELETE FROM public.redpresu_users
WHERE company_id IN (3, 4, 5, 6, 7, 8, 9, 10, 11)
  AND role != 'superadmin'                      -- ✅ Proteger todos los superadmin
  AND email != 'josivela+super@gmail.com';      -- ✅ Protección extra por email

-- 8. Eliminar invitaciones (si existen)
DELETE FROM public.redpresu_user_invitations
WHERE inviter_id IN (
  SELECT id FROM public.redpresu_users
  WHERE company_id IN (3, 4, 5, 6, 7, 8, 9, 10, 11)
);

-- 9. Eliminar issuers (datos fiscales) de estas empresas
DELETE FROM public.redpresu_issuers
WHERE company_id IN (3, 4, 5, 6, 7, 8, 9, 10, 11);

-- 10. Finalmente, eliminar las empresas
DELETE FROM public.redpresu_companies
WHERE id IN (3, 4, 5, 6, 7, 8, 9, 10, 11);

-- Verificar resultado final
SELECT
  'Empresas restantes:' as info,
  COUNT(*) as total
FROM public.redpresu_companies;

SELECT
  'Detalle empresas:' as info,
  id,
  name,
  status,
  created_at
FROM public.redpresu_companies
ORDER BY id;

SELECT
  'Suscripciones restantes:' as info,
  COUNT(*) as total
FROM public.redpresu_subscriptions;

SELECT
  'Detalle suscripciones:' as info,
  company_id,
  plan,
  status
FROM public.redpresu_subscriptions
ORDER BY company_id;

COMMIT;
