-- migrations/009_users_nombre_apellidos.sql
-- Descripción: Renombrar 'name' a 'nombre' y agregar campo 'apellidos' en tabla users
-- Fecha: 2025-01-04
-- Bloque: 1 (Usuarios y Seguridad)
-- Fase: 2

-- ============================================
-- UP: Aplicar cambios
-- ============================================

BEGIN;

-- 1. Renombrar columna 'name' a 'nombre'
ALTER TABLE public.users
  RENAME COLUMN name TO nombre;

-- 2. Agregar columna 'apellidos'
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS apellidos text;

-- 3. Migrar datos existentes (dividir 'nombre' en nombre y apellidos)
-- Si hay usuarios con nombre completo, tomar la primera palabra como nombre
-- y el resto como apellidos
UPDATE public.users
SET apellidos = CASE
  WHEN position(' ' in nombre) > 0 THEN substring(nombre from position(' ' in nombre) + 1)
  ELSE ''
END,
nombre = CASE
  WHEN position(' ' in nombre) > 0 THEN substring(nombre from 1 for position(' ' in nombre) - 1)
  ELSE nombre
END
WHERE apellidos IS NULL;

-- 4. Actualizar comentarios
COMMENT ON COLUMN public.users.nombre IS 'Nombre del usuario';
COMMENT ON COLUMN public.users.apellidos IS 'Apellidos del usuario';

COMMIT;

-- ============================================
-- DOWN: Rollback (documentar, no ejecutar automáticamente)
-- ============================================
-- Para revertir esta migración, ejecutar:
--
-- BEGIN;
-- ALTER TABLE public.users DROP COLUMN IF EXISTS apellidos;
-- ALTER TABLE public.users RENAME COLUMN nombre TO name;
-- COMMIT;
