-- ============================================
-- SEED DATA INICIAL (Datos de Configuración y Empresa por Defecto)
-- ============================================
-- Fecha: 2025-11-03
-- Descripción: Inserta todos los datos iniciales necesarios para el funcionamiento de la aplicación
-- Uso: Copiar y pegar en Supabase SQL Editor
-- ============================================

BEGIN;

-- ============================================
-- 1. VERIFICAR QUE LAS TABLAS EXISTEN
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'redpresu_config'
  ) THEN
    RAISE EXCEPTION 'Tabla redpresu_config no existe. Ejecutar SCHEMA_COMPLETO.sql primero.';
  END IF;

  IF NOT EXISTS (
    SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'redpresu_companies'
  ) THEN
    RAISE EXCEPTION 'Tabla redpresu_companies no existe. Ejecutar SCHEMA_COMPLETO.sql primero.';
  END IF;

  IF NOT EXISTS (
    SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'redpresu_subscriptions'
  ) THEN
    RAISE EXCEPTION 'Tabla redpresu_subscriptions no existe. Ejecutar SCHEMA_COMPLETO.sql primero.';
  END IF;

  RAISE NOTICE '✅ Todas las tablas necesarias existen';
END $$;

-- ============================================
-- 2. EMPRESA POR DEFECTO (ID = 1)
-- ============================================

INSERT INTO public.redpresu_companies (id, name, status, created_at, updated_at)
VALUES (
  1,
  'Empresa Principal',
  'active',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  status = EXCLUDED.status,
  updated_at = NOW();

-- Asegurar que la secuencia empiece desde 2 (para futuras empresas)
SELECT setval('empresas_id_seq', GREATEST(2, (SELECT MAX(id) FROM redpresu_companies)), false);

-- ============================================
-- 3. SUSCRIPCIÓN FREE PARA EMPRESA POR DEFECTO
-- ============================================

-- Eliminar suscripción existente si hay (para poder re-ejecutar el script)
DELETE FROM public.redpresu_subscriptions WHERE company_id = 1;

-- Insertar nueva suscripción
INSERT INTO public.redpresu_subscriptions (
  company_id,
  plan,
  status,
  stripe_customer_id,
  stripe_subscription_id,
  current_period_start,
  current_period_end,
  cancel_at_period_end,
  created_at,
  updated_at
)
VALUES (
  1,                    -- company_id
  'free',               -- plan
  'active',             -- status
  NULL,                 -- stripe_customer_id (no hay Stripe en plan FREE)
  NULL,                 -- stripe_subscription_id
  NOW(),                -- current_period_start
  NOW() + INTERVAL '1 year', -- current_period_end (1 año)
  false,                -- cancel_at_period_end
  NOW(),
  NOW()
);

-- ============================================
-- 4. CONFIGURACIÓN: Modo Multiempresa
-- ============================================

INSERT INTO public.redpresu_config (key, value, description, category, is_system, created_at, updated_at)
VALUES (
  'multiempresa',
  'true'::jsonb,
  'Modo de operación: true=multiempresa (SaaS), false=monoempresa (on-premise)',
  'general',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (key) DO UPDATE
SET
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  updated_at = NOW();

-- ============================================
-- 5. CONFIGURACIÓN: Suscripciones Habilitadas
-- ============================================

INSERT INTO public.redpresu_config (key, value, description, category, is_system, created_at, updated_at)
VALUES (
  'subscriptions_enabled',
  'false'::jsonb,
  'Activar módulo de suscripciones Stripe (solo disponible en modo multiempresa). Solo superadmin puede modificar.',
  'features',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (key) DO UPDATE
SET
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  updated_at = NOW();

-- ============================================
-- 6. CONFIGURACIÓN: Planes de Suscripción
-- ============================================

INSERT INTO public.redpresu_config (key, value, description, category, is_system, created_at, updated_at)
VALUES (
  'subscription_plans',
  '{
    "free": {
      "id": "free",
      "name": "Free",
      "description": "Plan gratuito para comenzar",
      "price": 0,
      "priceId": "",
      "position": 1,
      "limits": {
        "tariffs": 3,
        "budgets": 10,
        "users": 1,
        "storage_mb": 100
      },
      "features": {
        "tariffs_limit": "Hasta 3 tarifas",
        "budgets_limit": "Hasta 10 presupuestos",
        "users_limit": "1 usuario",
        "storage": "100 MB almacenamiento",
        "support": "Soporte por email",
        "custom_templates": false,
        "priority_support": false,
        "remove_watermark": false,
        "multi_company": false,
        "api_access": false,
        "custom_branding": false
      }
    },
    "pro": {
      "id": "pro",
      "name": "Pro",
      "description": "Plan profesional para negocios",
      "price": 29,
      "priceId": "price_REPLACE_WITH_REAL_PRICE_ID",
      "position": 2,
      "limits": {
        "tariffs": 50,
        "budgets": 500,
        "users": 5,
        "storage_mb": 5000
      },
      "features": {
        "tariffs_limit": "Hasta 50 tarifas",
        "budgets_limit": "Hasta 500 presupuestos",
        "users_limit": "Hasta 5 usuarios",
        "storage": "5 GB almacenamiento",
        "support": "Soporte prioritario",
        "custom_templates": true,
        "priority_support": true,
        "remove_watermark": true,
        "multi_company": false,
        "api_access": false,
        "custom_branding": false
      }
    },
    "enterprise": {
      "id": "enterprise",
      "name": "Enterprise",
      "description": "Plan empresarial sin límites",
      "price": 99,
      "priceId": "price_REPLACE_WITH_REAL_PRICE_ID",
      "position": 3,
      "limits": {
        "tariffs": 9999,
        "budgets": 9999,
        "users": 50,
        "storage_mb": 50000
      },
      "features": {
        "tariffs_limit": "Tarifas ilimitadas",
        "budgets_limit": "Presupuestos ilimitados",
        "users_limit": "Hasta 50 usuarios",
        "storage": "50 GB almacenamiento",
        "support": "Soporte dedicado 24/7",
        "custom_templates": true,
        "priority_support": true,
        "remove_watermark": true,
        "multi_company": true,
        "api_access": true,
        "custom_branding": true
      }
    }
  }'::jsonb,
  'Configuración de planes de suscripción (Free, Pro, Enterprise). Define límites y características de cada plan.',
  'subscriptions',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (key) DO UPDATE
SET
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  updated_at = NOW();

-- ============================================
-- 7. CONFIGURACIÓN: Información Legal (Formularios)
-- ============================================

INSERT INTO public.redpresu_config (key, value, description, category, is_system, created_at, updated_at)
VALUES (
  'forms_legal_notice',
  '"<p><strong>Información legal</strong></p><ul class=\"list-disc pl-4\"><li class=\"ml-2\"><p><strong>Responsable de los datos</strong>: REDPRESU.</p></li><li class=\"ml-2\"><p><strong>Finalidad de los datos</strong>: recabar información sobre nuestros servicios, gestionar el envío de información y prospección comercial.</p></li><li class=\"ml-2\"><p><strong>Destinatarios</strong>: Empresas proveedoras nacionales y encargados de tratamiento acogidos a privacy shield y personal de Jeyca.</p></li><li class=\"ml-2\"><p><strong>Información adicional</strong>: En la política de privacidad de <a target=\"_blank\" rel=\"noopener noreferrer\" class=\"text-cyan-600 underline cursor-pointer hover:text-cyan-700\" href=\"http://JEYCA.NET\">JEYCA.NET</a> encontrarás información adicional sobre la recopilación y el uso de su información personal por parte de <a target=\"_blank\" rel=\"noopener noreferrer\" class=\"text-cyan-600 underline cursor-pointer hover:text-cyan-700\" href=\"http://JEYCA.NET\">JEYCA.NET</a>, incluida información sobre acceso, conservación, rectificación, eliminación, seguridad y otros temas.</p></li></ul><p></p>"'::jsonb,
  'Información legal que aparece al final de los formularios públicos (contacto, registro). Se muestra en formato HTML.',
  'general',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (key) DO UPDATE
SET
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  updated_at = NOW();

-- ============================================
-- 8. CONFIGURACIÓN: Página Legal Completa
-- ============================================

INSERT INTO public.redpresu_config (key, value, description, category, is_system, created_at, updated_at)
VALUES (
  'legal_page_content',
  '"<h1>Aviso Legal</h1><p>En cumplimiento de la Ley 34/2002, de 11 de julio, de Servicios de la Sociedad de la Información y de Comercio Electrónico (LSSI-CE), REDPRESU informa que es titular del sitio web. De acuerdo con la exigencia del artículo 10 de la citada Ley, REDPRESU informa de los siguientes datos:</p><h2>1. Datos Identificativos</h2><ul class=\"list-disc pl-4\"><li class=\"ml-2\"><p><strong>Titular</strong>: REDPRESU</p></li><li class=\"ml-2\"><p><strong>NIF</strong>: [Completar]</p></li><li class=\"ml-2\"><p><strong>Domicilio</strong>: [Completar]</p></li><li class=\"ml-2\"><p><strong>Correo electrónico</strong>: [Completar]</p></li><li class=\"ml-2\"><p><strong>Teléfono</strong>: [Completar]</p></li></ul><h2>2. Objeto</h2><p>REDPRESU, es una plataforma SaaS que proporciona herramientas para la creación, gestión y envío de presupuestos profesionales para empresas y autónomos.</p><h2>3. Condiciones de Uso</h2><p>La utilización del sitio web atribuye la condición de usuario del mismo e implica la aceptación plena y sin reservas de todas y cada una de las disposiciones incluidas en este Aviso Legal.</p><h3>3.1 Uso permitido</h3><p>El usuario se compromete a utilizar el sitio web, sus servicios y contenidos de conformidad con la legislación vigente, el presente Aviso Legal, y demás avisos, reglamentos de uso e instrucciones puestos en su conocimiento.</p><h3>3.2 Prohibiciones</h3><p>Queda prohibido:</p><ul class=\"list-disc pl-4\"><li class=\"ml-2\"><p>Utilizar el sitio web con fines ilícitos o lesivos contra REDPRESU o terceros</p></li><li class=\"ml-2\"><p>Provocar daños en los sistemas físicos y lógicos del sitio web</p></li><li class=\"ml-2\"><p>Introducir o difundir virus informáticos o sistemas que puedan causar daños</p></li><li class=\"ml-2\"><p>Intentar acceder y, en su caso, utilizar las cuentas de correo electrónico de otros usuarios</p></li></ul><h2>4. Propiedad Intelectual e Industrial</h2><p>Todos los contenidos del sitio web, incluyendo, sin carácter limitativo, textos, fotografías, gráficos, imágenes, iconos, tecnología, software, así como su diseño gráfico y códigos fuente, constituyen una obra cuya propiedad pertenece a REDPRESU, sin que puedan entenderse cedidos al usuario ninguno de los derechos de explotación sobre los mismos.</p><h2>5. Protección de Datos</h2><p>REDPRESU cumple con el Reglamento (UE) 2016/679 del Parlamento Europeo y del Consejo, de 27 de abril de 2016, relativo a la protección de las personas físicas en lo que respecta al tratamiento de datos personales (RGPD) y la Ley Orgánica 3/2018, de 5 de diciembre, de Protección de Datos Personales y garantía de los derechos digitales (LOPDGDD).</p><p>Para más información, consulte nuestra Política de Privacidad.</p><h2>6. Responsabilidad</h2><p>REDPRESU no se hace responsable de los daños y perjuicios de cualquier naturaleza que pudieran derivarse de:</p><ul class=\"list-disc pl-4\"><li class=\"ml-2\"><p>La falta de disponibilidad o continuidad del sitio web</p></li><li class=\"ml-2\"><p>El uso inadecuado del sitio web por parte de los usuarios</p></li><li class=\"ml-2\"><p>La presencia de virus o elementos lesivos en los contenidos</p></li></ul><h2>7. Enlaces</h2><p>El sitio web puede contener enlaces a otros sitios web de terceros. REDPRESU no controla ni es responsable del contenido de dichos sitios web.</p><h2>8. Modificaciones</h2><p>REDPRESU se reserva el derecho de efectuar sin previo aviso las modificaciones que considere oportunas en su sitio web, pudiendo cambiar, suprimir o añadir tanto los contenidos y servicios que se presten a través de la misma como la forma en la que éstos aparezcan presentados o localizados.</p><h2>9. Legislación Aplicable y Jurisdicción</h2><p>Las presentes condiciones se rigen por la legislación española. Para la resolución de cualquier conflicto que pueda surgir con ocasión de la visita al sitio web o del uso de los servicios que en él se puedan ofertar, REDPRESU y el usuario acuerdan someterse a los Juzgados y Tribunales de [Ciudad], con renuncia expresa a cualquier otro fuero que pudiera corresponderles.</p><p><br></p><p><strong>Última actualización</strong>: Enero 2025</p>"'::jsonb,
  'Contenido completo de la página de información legal (/legal). Se muestra en formato HTML.',
  'general',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (key) DO UPDATE
SET
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  updated_at = NOW();

-- ============================================
-- 9. CONFIGURACIÓN: Template de Email de Invitación
-- ============================================

INSERT INTO public.redpresu_config (key, value, description, category, is_system, created_at, updated_at)
VALUES (
  'invitation_email_template',
  '{
    "subject": "Has sido invitado a unirte a {company_name} en REDPRESU",
    "body_html": "<div style=\"font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;\"><div style=\"background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);\"><h1 style=\"color: #0891b2; margin-bottom: 20px;\">¡Hola!</h1><p style=\"color: #333; font-size: 16px; line-height: 1.6;\">Has sido invitado por <strong>{inviter_name}</strong> a unirte a <strong>{company_name}</strong> en REDPRESU.</p><p style=\"color: #666; font-size: 14px; line-height: 1.6; margin-top: 20px;\"><strong>Tu rol será:</strong> {role_name}</p><div style=\"margin: 30px 0; text-align: center;\"><a href=\"{accept_url}\" style=\"background-color: #0891b2; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;\">Aceptar Invitación</a></div><p style=\"color: #999; font-size: 12px; line-height: 1.6; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;\">Este enlace expira en 7 días. Si no solicitaste esta invitación, puedes ignorar este mensaje.</p></div><div style=\"text-align: center; margin-top: 20px; color: #999; font-size: 12px;\"><p>REDPRESU - Sistema de Gestión de Presupuestos</p></div></div>",
    "body_text": "¡Hola!\\n\\nHas sido invitado por {inviter_name} a unirte a {company_name} en REDPRESU.\\n\\nTu rol será: {role_name}\\n\\nPara aceptar la invitación, visita el siguiente enlace:\\n{accept_url}\\n\\nEste enlace expira en 7 días. Si no solicitaste esta invitación, puedes ignorar este mensaje.\\n\\n---\\nREDPRESU - Sistema de Gestión de Presupuestos"
  }'::jsonb,
  'Template de email para invitaciones de usuarios. Variables disponibles: {company_name}, {inviter_name}, {role_name}, {accept_url}',
  'email',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (key) DO UPDATE
SET
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  updated_at = NOW();

-- ============================================
-- RESUMEN FINAL
-- ============================================

DO $$
DECLARE
  config_count INTEGER;
  companies_count INTEGER;
  subscriptions_count INTEGER;
BEGIN
  -- Contar configuraciones
  SELECT COUNT(*) INTO config_count FROM public.redpresu_config;

  -- Contar empresas
  SELECT COUNT(*) INTO companies_count FROM public.redpresu_companies;

  -- Contar suscripciones
  SELECT COUNT(*) INTO subscriptions_count FROM public.redpresu_subscriptions;

  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ SEED DATA COMPLETADO EXITOSAMENTE';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE 'Resumen:';
  RAISE NOTICE '  - Configuraciones: % registros', config_count;
  RAISE NOTICE '  - Empresas: % registros', companies_count;
  RAISE NOTICE '  - Suscripciones: % registros', subscriptions_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Datos creados:';
  RAISE NOTICE '  ✅ Empresa por defecto (ID=1): "Empresa Principal"';
  RAISE NOTICE '  ✅ Suscripción FREE para empresa ID=1';
  RAISE NOTICE '  ✅ Config: multiempresa = true';
  RAISE NOTICE '  ✅ Config: subscriptions_enabled = false';
  RAISE NOTICE '  ✅ Config: subscription_plans (Free, Pro, Enterprise)';
  RAISE NOTICE '  ✅ Config: forms_legal_notice';
  RAISE NOTICE '  ✅ Config: legal_page_content';
  RAISE NOTICE '  ✅ Config: invitation_email_template';
  RAISE NOTICE '';
  RAISE NOTICE 'Siguientes pasos:';
  RAISE NOTICE '  1. Login con tu usuario superadmin existente';
  RAISE NOTICE '  2. Crear emisor (Datos del Emisor) desde /profile';
  RAISE NOTICE '  3. Crear tarifas desde /tariffs';
  RAISE NOTICE '  4. Generar presupuestos desde /budgets';
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
END $$;

COMMIT;

-- ============================================
-- VERIFICACIÓN POST-MIGRACIÓN (ejecutar manualmente si deseas)
-- ============================================

/*
-- Ver todas las configuraciones
SELECT key, category, description, created_at
FROM public.redpresu_config
ORDER BY category, key;

-- Ver empresa por defecto
SELECT * FROM public.redpresu_companies WHERE id = 1;

-- Ver suscripción
SELECT company_id, plan, status, current_period_end
FROM public.redpresu_subscriptions
WHERE company_id = 1;

-- Ver planes de suscripción
SELECT
  value->'free'->'limits' as free_limits,
  value->'pro'->'limits' as pro_limits,
  value->'enterprise'->'limits' as enterprise_limits
FROM public.redpresu_config
WHERE key = 'subscription_plans';
*/

-- ============================================
-- ROLLBACK (documentado, NO ejecutar sin necesidad)
-- ============================================

/*
BEGIN;

-- Eliminar configuraciones
DELETE FROM public.redpresu_config WHERE key IN (
  'multiempresa',
  'subscriptions_enabled',
  'subscription_plans',
  'forms_legal_notice',
  'legal_page_content',
  'invitation_email_template'
);

-- Eliminar suscripción
DELETE FROM public.redpresu_subscriptions WHERE company_id = 1;

-- Eliminar empresa (CUIDADO: esto afectará datos relacionados)
-- DELETE FROM public.redpresu_companies WHERE id = 1;

COMMIT;
*/
