-- ============================================
-- ALTERNATIVA: Crear Superadmin usando HTTP Request
-- ============================================
-- Si el script anterior falla, usa este método
-- ============================================

-- OPCIÓN 1: Usar la API de Supabase desde código Node.js
-- Copia este código y ejecútalo en Node.js o en la terminal:

/*
// Archivo: create-superadmin.js
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createSuperadmin() {
  try {
    // 1. Crear usuario en auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: 'maribel+super@gmail.com',
      password: 'Xtatil-2025',
      email_confirm: true
    });

    if (authError) {
      console.error('Error creando auth user:', authError);
      return;
    }

    console.log('Usuario auth creado:', authData.user.id);

    // 2. Crear registro en users
    const { error: userError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email: 'maribel+super@gmail.com',
        name: 'Maribel',
        last_name: 'Pires',
        role: 'superadmin',
        company_id: 1,
        status: 'active'
      });

    if (userError) {
      console.error('Error creando registro users:', userError);
      return;
    }

    console.log('✅ Superadmin creado exitosamente');
  } catch (error) {
    console.error('Error:', error);
  }
}

createSuperadmin();
*/

-- OPCIÓN 2: Crear solo el registro en users (si ya existe en auth)
-- Si el usuario ya existe en auth.users pero falta en users:

/*
INSERT INTO redpresu.users (
  id,
  email,
  name,
  last_name,
  role,
  company_id,
  status,
  created_at,
  updated_at
)
VALUES (
  '4c9c91d6-XXXX-XXXX-XXXX-XXXXXXXXXXXX', -- Reemplazar con el UUID del usuario de auth.users
  'maribel+super@gmail.com',
  'Maribel',
  'Pires',
  'superadmin',
  1,
  'active',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  role = 'superadmin',
  company_id = 1,
  status = 'active';
*/
