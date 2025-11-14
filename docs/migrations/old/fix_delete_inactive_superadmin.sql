-- ============================================================================
-- Migración: Permitir eliminar superadmins solo si están inactivos
-- ============================================================================
-- Fecha: 2025-01-14
-- Descripción: Modifica la protección de usuarios superadmin para permitir
--              su eliminación únicamente si están inactivos.
--
-- ANTES: No se podía eliminar ningún superadmin (protección empresa 1)
-- AHORA: Se puede eliminar cualquier superadmin solo si status = 'inactive'
-- ============================================================================

-- Paso 1: Eliminar el trigger anterior si existe
DROP TRIGGER IF EXISTS prevent_delete_critical_superadmin ON redpresu.users;

-- Paso 2: Eliminar la función anterior si existe
DROP FUNCTION IF EXISTS redpresu.prevent_delete_critical_superadmin();

-- Paso 3: Crear la nueva función con lógica mejorada
CREATE OR REPLACE FUNCTION redpresu.prevent_delete_critical_superadmin()
RETURNS TRIGGER AS $$
BEGIN
  -- Verificar si es un superadmin (cualquier empresa)
  IF OLD.role = 'superadmin' THEN
    -- Si el usuario está ACTIVO, no permitir eliminación
    IF OLD.status = 'active' THEN
      RAISE EXCEPTION 'PROTECCIÓN SISTEMA: No se puede eliminar usuarios superadmin activos (id: %). Desactiva primero el usuario (status=inactive) antes de eliminarlo.', OLD.id
        USING HINT = 'Cambia el status a inactive antes de intentar eliminar';
    END IF;

    -- Si el usuario está INACTIVO, permitir eliminación (no hacer nada, continuar)
    -- Log opcional para auditoría (solo si tienes tabla de logs)
    -- INSERT INTO redpresu.audit_log (action, user_id, details)
    -- VALUES ('delete_inactive_superadmin', OLD.id, 'Superadmin inactivo eliminado');
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Paso 4: Crear el nuevo trigger
CREATE TRIGGER prevent_delete_critical_superadmin
  BEFORE DELETE ON redpresu.users
  FOR EACH ROW
  EXECUTE FUNCTION redpresu.prevent_delete_critical_superadmin();

-- ============================================================================
-- Verificación
-- ============================================================================
-- Para verificar que el trigger funciona correctamente:

-- 1. Intentar eliminar un superadmin ACTIVO (debe fallar):
-- DELETE FROM redpresu.users WHERE id = 'algún-superadmin-activo' AND role = 'superadmin';
-- Resultado esperado: ERROR con mensaje "PROTECCIÓN SISTEMA..."

-- 2. Intentar eliminar un superadmin INACTIVO (debe funcionar):
-- UPDATE redpresu.users SET status = 'inactive' WHERE id = 'algún-superadmin';
-- DELETE FROM redpresu.users WHERE id = 'algún-superadmin';
-- Resultado esperado: Usuario eliminado correctamente

-- 3. Ver triggers existentes:
-- SELECT trigger_name, event_manipulation, event_object_table
-- FROM information_schema.triggers
-- WHERE trigger_schema = 'redpresu' AND trigger_name LIKE '%superadmin%';

-- ============================================================================
-- Rollback (si necesitas revertir)
-- ============================================================================
-- DROP TRIGGER IF EXISTS prevent_delete_critical_superadmin ON redpresu.users;
-- DROP FUNCTION IF EXISTS redpresu.prevent_delete_critical_superadmin();

-- ============================================================================
-- Notas adicionales
-- ============================================================================
-- - Esta protección aplica a TODOS los superadmins de cualquier empresa
-- - Superadmins activos NO pueden ser eliminados (deben desactivarse primero)
-- - Superadmins inactivos SÍ pueden ser eliminados
-- - Otros roles (admin, comercial) pueden eliminarse sin restricción
-- - La validación también existe en el código TypeScript (doble protección)
