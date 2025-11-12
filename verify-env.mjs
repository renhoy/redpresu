#!/usr/bin/env node
/**
 * Script de verificación de variables de entorno
 * Verifica que todas las variables críticas estén configuradas
 */

const requiredEnvVars = {
  'NEXT_PUBLIC_SUPABASE_URL': 'URL de Supabase (pública)',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY': 'Clave anónima de Supabase (pública)',
  'SUPABASE_SERVICE_ROLE_KEY': 'Clave de servicio de Supabase (PRIVADA - necesaria para bypass RLS)',
};

const optionalEnvVars = {
  'NEXT_PUBLIC_APP_URL': 'URL de la aplicación (para emails)',
  'STRIPE_SECRET_KEY': 'Clave secreta de Stripe (solo si usas subscripciones)',
  'STRIPE_WEBHOOK_SECRET': 'Secret del webhook de Stripe',
};

console.log('🔍 Verificando variables de entorno...\n');

let hasErrors = false;

// Verificar variables requeridas
console.log('📋 Variables REQUERIDAS:');
for (const [key, description] of Object.entries(requiredEnvVars)) {
  const value = process.env[key];
  if (!value) {
    console.log(`❌ ${key}: NO DEFINIDA`);
    console.log(`   ${description}`);
    hasErrors = true;
  } else {
    // Mostrar solo los primeros 20 caracteres para seguridad
    const maskedValue = value.substring(0, 20) + '...' + value.substring(value.length - 4);
    console.log(`✅ ${key}: ${maskedValue}`);
  }
}

console.log('\n📋 Variables OPCIONALES:');
for (const [key, description] of Object.entries(optionalEnvVars)) {
  const value = process.env[key];
  if (!value) {
    console.log(`⚠️  ${key}: NO DEFINIDA (opcional)`);
    console.log(`   ${description}`);
  } else {
    const maskedValue = value.substring(0, 20) + '...' + value.substring(value.length - 4);
    console.log(`✅ ${key}: ${maskedValue}`);
  }
}

console.log('\n' + '='.repeat(60));

if (hasErrors) {
  console.log('\n❌ FALTAN VARIABLES DE ENTORNO CRÍTICAS');
  console.log('\n📝 Para configurarlas:');
  console.log('1. Crea un archivo .env.local en la raíz del proyecto');
  console.log('2. Añade las variables faltantes:');
  console.log('\n   NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co');
  console.log('   NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-clave-anonima');
  console.log('   SUPABASE_SERVICE_ROLE_KEY=tu-clave-service-role');
  console.log('\n3. Reinicia el servidor de desarrollo (npm run dev)');
  console.log('\n🔐 IMPORTANTE: NUNCA compartas SUPABASE_SERVICE_ROLE_KEY públicamente');
  console.log('   Esta clave bypass TODAS las políticas RLS y tiene acceso total a la BD');
  process.exit(1);
} else {
  console.log('\n✅ Todas las variables requeridas están configuradas');

  // Verificar que la SERVICE_ROLE_KEY sea diferente de la ANON_KEY
  if (process.env.SUPABASE_SERVICE_ROLE_KEY === process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.log('\n⚠️  ADVERTENCIA: SERVICE_ROLE_KEY es igual a ANON_KEY');
    console.log('   Esto está MAL. Deben ser claves diferentes.');
    console.log('   Encuentra SERVICE_ROLE_KEY en: Supabase Dashboard > Settings > API');
    process.exit(1);
  }

  console.log('✅ Las claves son diferentes (correcto)');
  process.exit(0);
}
