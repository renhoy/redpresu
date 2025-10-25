-- migrations/039_rename_vendedor_to_comercial.sql
-- Descripción: Renombrar rol 'vendedor' a 'comercial'
-- Fecha: 2025-01-25
-- Bloque: 1 (Usuarios y Seguridad)
-- Fase: 2

-- ============================================
-- UP: Aplicar cambios
-- ============================================

BEGIN;

-- PASO 1: Eliminar constraint antiguo PRIMERO (antes del UPDATE)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_role_check'
  ) THEN
    ALTER TABLE public.redpresu_users
    DROP CONSTRAINT users_role_check;
  END IF;
END $$;

-- PASO 2: Actualizar todos los usuarios con rol 'vendedor' a 'comercial'
UPDATE public.redpresu_users
SET role = 'comercial'
WHERE role = 'vendedor';

-- PASO 3: Crear nuevo constraint con 'comercial' en lugar de 'vendedor'
ALTER TABLE public.redpresu_users
ADD CONSTRAINT users_role_check
CHECK (role IN ('superadmin', 'admin', 'comercial'));

COMMIT;

-- ============================================
-- DOWN: Rollback (documentar, no ejecutar automáticamente)
-- ============================================
-- Para revertir esta migración, ejecutar:
--
-- BEGIN;
-- UPDATE public.redpresu_users SET role = 'vendedor' WHERE role = 'comercial';
-- ALTER TABLE public.redpresu_users DROP CONSTRAINT IF EXISTS users_role_check;
-- ALTER TABLE public.redpresu_users ADD CONSTRAINT users_role_check CHECK (role IN ('superadmin', 'admin', 'vendedor'));
-- COMMIT;

-- ============================================
-- VERIFICACIÓN POST-MIGRACIÓN
-- ============================================
--
-- Ver usuarios con rol comercial:
-- SELECT id, name, email, role FROM public.redpresu_users WHERE role = 'comercial';
--
-- Verificar que no quedan vendedores:
-- SELECT COUNT(*) FROM public.redpresu_users WHERE role = 'vendedor';
--
-- Ver constraint actualizado:
-- SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = 'users_role_check';
--
-- ============================================
