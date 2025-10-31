-- ============================================
-- MIGRACIÓN 043: Agregar 'inactive' al constraint de status
-- ============================================
-- IMPORTANTE: Copiar y pegar TODO este contenido en el editor SQL de Supabase
-- Fecha: 2025-01-30
-- Bloque: 11 - Suscripciones

-- 1. Eliminar el constraint existente
ALTER TABLE public.redpresu_subscriptions
DROP CONSTRAINT IF EXISTS redpresu_subscriptions_status_check;

-- 2. Agregar nuevo constraint con los 5 estados (active, inactive, canceled, past_due, trialing)
ALTER TABLE public.redpresu_subscriptions
ADD CONSTRAINT redpresu_subscriptions_status_check
CHECK (status IN ('active', 'inactive', 'canceled', 'past_due', 'trialing'));

-- Verificar que el constraint se creó correctamente
SELECT
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conname = 'redpresu_subscriptions_status_check';
