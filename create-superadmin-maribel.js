/**
 * Script temporal para crear usuario superadmin: maribel+super@gmail.com
 *
 * EJECUTAR:
 * NEXT_PUBLIC_SUPABASE_URL=tu_url SUPABASE_SERVICE_ROLE_KEY=tu_key node create-superadmin-maribel.js
 *
 * O edita las variables directamente aquí abajo:
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Intentar leer variables del archivo .env.local
let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
let supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Si no están en el proceso, intentar leerlas del archivo .env.local
if (!supabaseUrl || !supabaseServiceKey) {
  try {
    const envPath = path.join(__dirname, '.env.local');
    const envContent = fs.readFileSync(envPath, 'utf8');
    const lines = envContent.split('\n');

    lines.forEach(line => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim().replace(/^["']|["']$/g, '');

        if (key === 'NEXT_PUBLIC_SUPABASE_URL') supabaseUrl = value;
        if (key === 'SUPABASE_SERVICE_ROLE_KEY') supabaseServiceKey = value;
      }
    });
  } catch (error) {
    console.error('⚠️  No se pudo leer .env.local');
  }
}

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Variables de entorno no encontradas\n');
  console.error('Opción 1: Pasar como variables de entorno:');
  console.error('  NEXT_PUBLIC_SUPABASE_URL=tu_url SUPABASE_SERVICE_ROLE_KEY=tu_key node create-superadmin-maribel.js\n');
  console.error('Opción 2: Editar este archivo y agregar las variables directamente:');
  console.error('  const supabaseUrl = "https://tu-proyecto.supabase.co";');
  console.error('  const supabaseServiceKey = "tu-service-role-key";\n');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  db: {
    schema: 'redpresu'
  }
});

async function createSuperadmin() {
  console.log('🚀 Iniciando creación de superadmin...\n');

  try {
    // 1. Crear usuario en auth.users
    console.log('📧 Creando usuario en auth.users...');
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: 'maribel+super@gmail.com',
      password: 'Xtatil-2025',
      email_confirm: true // Auto-confirmar email
    });

    if (authError) {
      console.error('❌ Error creando usuario en auth:', authError.message);
      console.error('📋 Detalles completos del error:', JSON.stringify(authError, null, 2));

      // Si el usuario ya existe, intentar obtener su ID
      if (authError.message.includes('already registered')) {
        console.log('\n⚠️  El usuario ya existe en auth.users');
        console.log('Intentando obtener su ID...');

        const { data: users, error: listError } = await supabase.auth.admin.listUsers();
        if (!listError) {
          const existingUser = users.users.find(u => u.email === 'maribel+super@gmail.com');
          if (existingUser) {
            console.log('✅ Usuario encontrado, ID:', existingUser.id);
            authData = { user: existingUser };
          }
        }
      } else {
        return;
      }
    } else {
      console.log('✅ Usuario creado en auth.users');
      console.log('   ID:', authData.user.id);
    }

    const userId = authData.user.id;

    // 2. Crear registro en redpresu_users
    console.log('\n👤 Creando registro en redpresu_users...');
    const { error: userError } = await supabase
      .from('users')
      .insert({
        id: userId,
        email: 'maribel+super@gmail.com',
        name: 'Maribel',
        last_name: 'Pires',
        role: 'superadmin',
        company_id: 1, // Empresa Demo
        status: 'active',
        invited_by: null,
        last_login: null
      });

    if (userError) {
      console.error('❌ Error creando registro en redpresu_users:', userError.message);

      // Si el usuario ya existe, actualizar
      if (userError.code === '23505') { // Unique violation
        console.log('⚠️  El registro ya existe, actualizando...');
        const { error: updateError } = await supabase
          .from('users')
          .update({
            role: 'superadmin',
            company_id: 1,
            status: 'active'
          })
          .eq('id', userId);

        if (updateError) {
          console.error('❌ Error actualizando:', updateError.message);
          return;
        }
        console.log('✅ Registro actualizado exitosamente');
      } else {
        return;
      }
    } else {
      console.log('✅ Registro creado en redpresu_users');
    }

    // 3. Verificar
    console.log('\n🔍 Verificando usuario creado...');
    const { data: verifyData, error: verifyError } = await supabase
      .from('users')
      .select('id, email, name, last_name, role, company_id, status')
      .eq('email', 'maribel+super@gmail.com')
      .single();

    if (verifyError) {
      console.error('❌ Error verificando:', verifyError.message);
      return;
    }

    console.log('✅ Verificación exitosa:');
    console.log('   Email:', verifyData.email);
    console.log('   Nombre:', verifyData.name, verifyData.last_name);
    console.log('   Rol:', verifyData.role);
    console.log('   Empresa ID:', verifyData.company_id);
    console.log('   Estado:', verifyData.status);

    console.log('\n✅ ¡SUPERADMIN CREADO EXITOSAMENTE!');
    console.log('\n📝 Credenciales:');
    console.log('   Email: maribel+super@gmail.com');
    console.log('   Password: Xtatil-2025');
    console.log('\n🔗 Ahora puedes iniciar sesión en: http://localhost:3000');

  } catch (error) {
    console.error('❌ Error inesperado:', error);
  }
}

// Ejecutar
createSuperadmin()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Error fatal:', error);
    process.exit(1);
  });
