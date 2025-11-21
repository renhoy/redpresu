-- Migración: 050_add_pendiente_status_to_users.sql
-- Fecha: 2025-11-21
-- Descripción: Añade el estado 'pendiente' y 'rejected' al constraint CHECK del campo status en users
-- Autor: Claude Code

-- ═══════════════════════════════════════════════════════════════
-- PASO 1: Eliminar el constraint actual
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE redpresu.users DROP CONSTRAINT IF EXISTS users_status_check;

-- ═══════════════════════════════════════════════════════════════
-- PASO 2: Crear el nuevo constraint con los estados adicionales
-- ═══════════════════════════════════════════════════════════════
-- Estados permitidos:
-- - active: Usuario activo, puede usar la plataforma
-- - inactive: Usuario desactivado por admin
-- - pending: Usuario pendiente de completar perfil (login OAuth)
-- - pendiente: Usuario pendiente de aprobación por superadmin
-- - rejected: Usuario rechazado por superadmin
ALTER TABLE redpresu.users
ADD CONSTRAINT users_status_check
CHECK (status = ANY (ARRAY['active'::text, 'inactive'::text, 'pending'::text, 'pendiente'::text, 'rejected'::text]));

-- ═══════════════════════════════════════════════════════════════
-- PASO 3: Migrar datos existentes de awaiting_approval a pendiente
-- ═══════════════════════════════════════════════════════════════
UPDATE redpresu.users
SET status = 'pendiente'
WHERE status = 'awaiting_approval';

-- ═══════════════════════════════════════════════════════════════
-- VERIFICACIÓN
-- ═══════════════════════════════════════════════════════════════
-- Ejecutar para verificar que el constraint se aplicó correctamente:
-- SELECT conname, pg_get_constraintdef(oid)
-- FROM pg_constraint
-- WHERE conrelid = 'redpresu.users'::regclass AND conname = 'users_status_check';
