-- ============================================
-- INSERTAR CONFIGURACIONES POR DEFECTO
-- ============================================
-- Propósito: Crear todas las claves de configuración necesarias
--            con valores por defecto en la tabla config
--
-- EJECUTAR EN: Supabase Cloud → SQL Editor
-- ============================================

BEGIN;

-- ============================================
-- CATEGORÍA: Aplicación
-- ============================================

INSERT INTO public.config (key, value, description, category)
VALUES
  ('app_name', '"RedPresu"', 'Nombre de la aplicación', 'aplicacion'),
  ('app_mode', '"development"', 'Modo de la aplicación (development/production)', 'aplicacion'),
  ('multiempresa', 'false', 'Habilitar modo multiempresa', 'aplicacion'),
  ('public_registration_enabled', 'true', 'Permitir registro público de nuevos usuarios', 'aplicacion')
ON CONFLICT (key) DO NOTHING;

-- ============================================
-- CATEGORÍA: Suscripciones y Pagos
-- ============================================

INSERT INTO public.config (key, value, description, category)
VALUES
  ('subscriptions_enabled', 'false', 'Habilitar sistema de suscripciones', 'suscripciones'),
  ('subscription_grace_period_days', '7', 'Días de gracia después de que expire una suscripción', 'suscripciones'),
  (
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
    }',
    'Planes de suscripción disponibles',
    'suscripciones'
  )
ON CONFLICT (key) DO NOTHING;

-- ============================================
-- CATEGORÍA: Usuarios e Invitaciones
-- ============================================

INSERT INTO public.config (key, value, description, category)
VALUES
  ('default_empresa_id', '1', 'ID de la empresa por defecto para nuevos usuarios', 'usuarios'),
  ('invitation_token_expiration_days', '7', 'Días de validez de los tokens de invitación', 'usuarios'),
  (
    'invitation_email_template',
    '{"subject": "Invitación a RedPresu", "body": "Has sido invitado a unirte a RedPresu. Usa el siguiente enlace para completar tu registro: {invitation_link}"}',
    'Plantilla de email de invitación',
    'usuarios'
  )
ON CONFLICT (key) DO NOTHING;

-- ============================================
-- CATEGORÍA: Tarifas y Presupuestos
-- ============================================

INSERT INTO public.config (key, value, description, category)
VALUES
  ('default_tariff', 'null', 'ID de la tarifa por defecto', 'tarifas'),
  (
    'iva_re_equivalences',
    '{"21": 5.2, "10": 1.4, "4": 0.5}',
    'Equivalencias de IVA a Recargo de Equivalencia',
    'tarifas'
  )
ON CONFLICT (key) DO NOTHING;

-- ============================================
-- CATEGORÍA: PDF
-- ============================================

INSERT INTO public.config (key, value, description, category)
VALUES
  ('rapid_pdf_mode', '"production"', 'Modo de generación de PDFs (development/production)', 'pdf'),
  (
    'pdf_templates',
    '[
      {"id": "modern", "name": "Moderna", "description": "Diseño limpio y minimalista", "default": true},
      {"id": "classic", "name": "Clásica", "description": "Diseño tradicional profesional"},
      {"id": "elegant", "name": "Elegante", "description": "Diseño sofisticado con detalles"}
    ]',
    'Plantillas PDF disponibles',
    'pdf'
  )
ON CONFLICT (key) DO NOTHING;

-- ============================================
-- CATEGORÍA: Contacto y Legal
-- ============================================

INSERT INTO public.config (key, value, description, category)
VALUES
  (
    'contact_notification_emails',
    '["admin@redpresu.com"]',
    'Emails que reciben notificaciones de formularios de contacto',
    'contacto'
  ),
  (
    'forms_legal_notice',
    '"<p><strong>Información legal</strong></p><ul class=\"list-disc pl-4\"><li class=\"ml-2\"><p><strong>Responsable de los datos</strong>: REDPRESU.</p></li><li class=\"ml-2\"><p><strong>Finalidad de los datos</strong>: recabar información sobre nuestros servicios, gestionar el envío de información y prospección comercial.</p></li><li class=\"ml-2\"><p><strong>Destinatarios</strong>: Empresas proveedoras nacionales y encargados de tratamiento acogidos a privacy shield y personal de Jeyca.</p></li><li class=\"ml-2\"><p><strong>Información adicional</strong>: En la política de privacidad de <a target=\"_blank\" rel=\"noopener noreferrer\" class=\"text-cyan-600 underline cursor-pointer hover:text-cyan-700\" href=\"http://JEYCA.NET\">JEYCA.NET</a> encontrarás información adicional sobre la recopilación y el uso de su información personal por parte de <a target=\"_blank\" rel=\"noopener noreferrer\" class=\"text-cyan-600 underline cursor-pointer hover:text-cyan-700\" href=\"http://JEYCA.NET\">JEYCA.NET</a>, incluida información sobre acceso, conservación, rectificación, eliminación, seguridad y otros temas.</p></li></ul><p></p>"',
    'Texto legal para formularios',
    'legal'
  ),
  (
    'legal_page_content',
    '"<h1>Aviso Legal</h1><p>En cumplimiento de la Ley 34/2002, de 11 de julio, de Servicios de la Sociedad de la Información y de Comercio Electrónico (LSSI-CE), REDPRESU informa que es titular del sitio web.</p><p>Para más información, contacte con el administrador del sitio.</p>"',
    'Contenido de la página legal',
    'legal'
  )
ON CONFLICT (key) DO NOTHING;

-- ============================================
-- VERIFICACIÓN
-- ============================================

SELECT
  category,
  COUNT(*) as total_configuraciones
FROM public.config
GROUP BY category
ORDER BY category;

-- Verificar que todas las claves importantes existen
DO $$
DECLARE
  total_keys INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_keys
  FROM public.config
  WHERE key IN (
    'app_name',
    'app_mode',
    'multiempresa',
    'public_registration_enabled',
    'subscriptions_enabled',
    'subscription_plans',
    'iva_re_equivalences',
    'pdf_templates',
    'rapid_pdf_mode'
  );

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Claves de configuración creadas: %', total_keys;

  IF total_keys >= 9 THEN
    RAISE NOTICE '✅ CONFIGURACIONES CREADAS CORRECTAMENTE';
  ELSE
    RAISE WARNING '⚠️  Faltan % configuraciones', (9 - total_keys);
  END IF;
  RAISE NOTICE '========================================';
END $$;

COMMIT;
