-- ============================================
-- Crear Usuario Superadmin: maribel+super@gmail.com
-- ============================================
-- IMPORTANTE: Ejecutar en Supabase Studio (SQL Editor)
-- ============================================

-- Paso 1: Crear usuario en auth.users usando extensión pgcrypto
DO $$
DECLARE
  new_user_id uuid;
  hashed_password text;
BEGIN
  -- Generar UUID para el nuevo usuario
  new_user_id := gen_random_uuid();

  -- Hashear la contraseña con bcrypt (lo hace Supabase internamente)
  -- Nota: Usaremos la función de Supabase para crear el usuario

  -- Insertar en auth.users (si tienes permisos directos)
  -- Si esto falla, usa el Paso 2 alternativo abajo
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    role,
    aud,
    confirmation_token,
    recovery_token,
    email_change_token_new
  )
  VALUES (
    new_user_id,
    '00000000-0000-0000-0000-000000000000',
    'maribel+super@gmail.com',
    crypt('Xtatil-2025', gen_salt('bf')), -- Hashear con bcrypt
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    false,
    'authenticated',
    'authenticated',
    '',
    '',
    ''
  );

  -- Paso 2: Crear registro en redpresu_users
  INSERT INTO public.redpresu_users (
    id,
    email,
    name,
    last_name,
    role,
    company_id,
    status,
    created_at,
    updated_at,
    invited_by,
    last_login
  )
  VALUES (
    new_user_id,
    'maribel+super@gmail.com',
    'Maribel',
    'Pires',
    'superadmin',
    1, -- Empresa Demo
    'active', -- Activo inmediatamente
    NOW(),
    NOW(),
    NULL,
    NULL
  );

  RAISE NOTICE 'Usuario superadmin creado exitosamente con ID: %', new_user_id;
END $$;

-- Verificar que se creó correctamente
SELECT
  u.id,
  u.email,
  u.name,
  u.last_name,
  u.role,
  u.company_id,
  u.status
FROM public.redpresu_users u
WHERE u.email = 'maribel+super@gmail.com';
