-- ============================================================================
-- SQL DE EMERGENCIA: Eliminar completamente la protección de superadmins
-- ============================================================================
-- Este SQL ELIMINA el trigger que impide borrar superadmins.
-- Ejecútalo AHORA en Supabase para desbloquear la eliminación.
-- ============================================================================

-- PASO 1: Eliminar el trigger
DROP TRIGGER IF EXISTS prevent_delete_critical_superadmin ON redpresu.users;

-- PASO 2: Eliminar la función
DROP FUNCTION IF EXISTS redpresu.prevent_delete_critical_superadmin();

-- ============================================================================
-- LISTO - La protección ha sido eliminada
-- ============================================================================
-- Ahora puedes eliminar cualquier usuario (incluidos superadmins) desde la UI.
-- La validación en el código TypeScript seguirá requiriendo que el superadmin
-- esté inactivo antes de eliminarlo, pero la base de datos ya no lo bloqueará.
-- ============================================================================
