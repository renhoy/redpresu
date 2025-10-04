-- ============================================
-- PROMOVER josivela@gmail.com A SUPERADMIN
-- INSTRUCCIONES:
-- 1. Abre Supabase Dashboard > SQL Editor
-- 2. Copia y pega TODO este contenido
-- 3. Ejecuta (Run)
-- 4. Cierra sesión y vuelve a iniciar sesión
-- 5. Accede a /settings
-- ============================================

BEGIN;

-- Promover usuario a superadmin
UPDATE public.users
SET role = 'superadmin',
    updated_at = now()
WHERE email = 'josivela@gmail.com';

-- Verificar el cambio
SELECT
  id,
  email,
  nombre,
  apellidos,
  role,
  empresa_id,
  status,
  created_at
FROM public.users
WHERE email = 'josivela@gmail.com';

COMMIT;

-- ============================================
-- RESULTADO ESPERADO:
-- Deberías ver tu usuario con role = 'superadmin'
-- ============================================
