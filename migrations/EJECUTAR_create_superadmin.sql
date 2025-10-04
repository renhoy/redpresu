-- ============================================
-- CREAR/PROMOVER USUARIO A SUPERADMIN
-- INSTRUCCIONES:
-- 1. Abre Supabase Dashboard > SQL Editor
-- 2. Copia y pega TODO este contenido
-- 3. REEMPLAZA el email con tu usuario real
-- 4. Ejecuta (Run)
-- ============================================

BEGIN;

-- Opción 1: Promover usuario existente a superadmin
-- REEMPLAZA 'tu-email@ejemplo.com' con el email del usuario que quieres promover
UPDATE public.users
SET role = 'superadmin'
WHERE email = 'tu-email@ejemplo.com';

-- Verificar el cambio
SELECT id, email, nombre, apellidos, role, empresa_id
FROM public.users
WHERE email = 'tu-email@ejemplo.com';

COMMIT;

-- ============================================
-- ALTERNATIVA: Ver todos los usuarios y sus roles
-- ============================================
-- Si no estás seguro del email, ejecuta esto primero:
--
-- SELECT id, email, nombre, apellidos, role, empresa_id, status
-- FROM public.users
-- ORDER BY created_at DESC;
--
-- Luego usa el email del usuario que quieras promover
-- ============================================
