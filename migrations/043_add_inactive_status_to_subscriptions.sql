-- migrations/043_add_inactive_status_to_subscriptions.sql
-- Descripción: Agregar 'inactive' al constraint de status en redpresu_subscriptions
-- Fecha: 2025-01-30
-- Bloque: 11 - Suscripciones

-- ============================================
-- UP: Aplicar cambios
-- ============================================

BEGIN;

-- 1. Eliminar el constraint existente
ALTER TABLE public.redpresu_subscriptions
DROP CONSTRAINT IF EXISTS redpresu_subscriptions_status_check;

-- 2. Agregar nuevo constraint con los 5 estados
ALTER TABLE public.redpresu_subscriptions
ADD CONSTRAINT redpresu_subscriptions_status_check
CHECK (status IN ('active', 'inactive', 'canceled', 'past_due', 'trialing'));

COMMIT;

-- ============================================
-- DOWN: Rollback (documentar, no ejecutar)
-- ============================================

-- ALTER TABLE public.redpresu_subscriptions
-- DROP CONSTRAINT IF EXISTS redpresu_subscriptions_status_check;
--
-- ALTER TABLE public.redpresu_subscriptions
-- ADD CONSTRAINT redpresu_subscriptions_status_check
-- CHECK (status IN ('active', 'canceled', 'past_due', 'trialing'));
