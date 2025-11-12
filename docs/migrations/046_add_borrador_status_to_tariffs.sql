-- ============================================
-- Migración 046: Añadir estado 'Borrador' a tarifas
-- ============================================
-- Descripción: Añade el estado 'Borrador' al enum de status de tarifas
--              para permitir guardar tarifas incompletas
-- Fecha: 2025-01-29
-- Bloque: 2 - Mejoras Tarifas (Fase 2)
--
-- IMPORTANTE: Ejecutar en Supabase Studio (SQL Editor)
-- ============================================

BEGIN;

-- 1. Añadir 'Borrador' al tipo enum tariff_status_enum
ALTER TYPE tariff_status_enum ADD VALUE IF NOT EXISTS 'Borrador';

-- 2. Actualizar el comentario de la tabla para documentar el cambio
COMMENT ON COLUMN redpresu_tariffs.status IS 'Estado de la tarifa: Borrador (incompleta), Activa (puede usarse), Inactiva (archivada)';

COMMIT;

-- ============================================
-- ROLLBACK (en caso de necesitar revertir)
-- ============================================
-- NOTA: No es posible eliminar valores de un enum en PostgreSQL
-- sin recrear el tipo completo, lo cual requiere migración compleja.
-- Si necesitas revertir:
-- 1. Actualiza todas las tarifas con status='Borrador' a 'Inactiva'
-- 2. Crea un nuevo tipo enum sin 'Borrador'
-- 3. Altera la columna para usar el nuevo tipo
-- 4. Elimina el tipo antiguo
--
-- BEGIN;
--
-- -- Actualizar tarifas en borrador
-- UPDATE redpresu_tariffs SET status = 'Inactiva' WHERE status = 'Borrador';
--
-- -- Crear nuevo tipo sin 'Borrador'
-- CREATE TYPE tariff_status_enum_new AS ENUM ('Activa', 'Inactiva');
--
-- -- Cambiar columna al nuevo tipo
-- ALTER TABLE redpresu_tariffs
--   ALTER COLUMN status TYPE tariff_status_enum_new
--   USING status::text::tariff_status_enum_new;
--
-- -- Eliminar tipo antiguo y renombrar el nuevo
-- DROP TYPE tariff_status_enum;
-- ALTER TYPE tariff_status_enum_new RENAME TO tariff_status_enum;
--
-- COMMIT;
