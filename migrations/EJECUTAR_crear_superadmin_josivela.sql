-- ============================================
-- CREAR USUARIO SUPERADMIN: josivela@gmail.com
-- INSTRUCCIONES:
-- 1. Primero DEBES crear el usuario en Supabase Auth:
--    - Ve a Authentication > Users en Supabase Dashboard
--    - Click "Add user" > "Create new user"
--    - Email: josivela@gmail.com
--    - Password: (elige una contraseña)
--    - Auto Confirm User: YES
--    - Copia el UUID generado
--
-- 2. Luego ejecuta este SQL REEMPLAZANDO el UUID:
-- ============================================

BEGIN;

-- PASO 1: Insertar en public.users
-- IMPORTANTE: Reemplaza 'UUID-GENERADO-POR-SUPABASE-AUTH' con el UUID real
INSERT INTO public.users (
    id,
    role,
    empresa_id,
    nombre,
    apellidos,
    email,
    created_at,
    updated_at,
    status,
    invited_by,
    last_login
) VALUES (
    'UUID-GENERADO-POR-SUPABASE-AUTH',  -- REEMPLAZAR CON UUID REAL
    'superadmin',
    1,
    'José',
    'Sivela',
    'josivela@gmail.com',
    now(),
    now(),
    'active',
    NULL,
    NULL
);

-- PASO 2: Verificar creación
SELECT
    id,
    email,
    nombre,
    apellidos,
    role,
    empresa_id,
    status
FROM public.users
WHERE email = 'josivela@gmail.com';

COMMIT;

-- ============================================
-- ALTERNATIVA MÁS SIMPLE:
-- Si ya existe josivela@gmail.com en auth.users,
-- puedes obtener su UUID y solo hacer el INSERT
-- ============================================
-- Para ver usuarios en auth.users:
-- SELECT id, email FROM auth.users WHERE email = 'josivela@gmail.com';
--
-- Si ya existe, usa ese UUID en el INSERT de arriba
-- ============================================
