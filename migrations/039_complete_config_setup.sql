-- ============================================
-- MIGRACIÓN 039: Configuración completa del sistema
-- ============================================
-- Descripción: Insertar TODAS las configuraciones necesarias que faltan
-- Fecha: 2025-01-30
-- Bloque: 3 (Configuración)
-- Idempotente: Sí (usa ON CONFLICT DO NOTHING)
--
-- IMPORTANTE: Esta migración es idempotente y puede ejecutarse
-- múltiples veces sin causar errores. Solo inserta las claves
-- que no existen.
-- ============================================

BEGIN;

-- ============================================
-- CATEGORÍA: GENERAL
-- ============================================

-- app_mode: Modo de la aplicación (development/production)
INSERT INTO public.redpresu_config (key, value, description, category, is_system)
VALUES (
  'app_mode',
  '"development"'::jsonb,
  'Modo de ejecución de la aplicación: development o production',
  'general',
  true
)
ON CONFLICT (key) DO NOTHING;

-- app_name: Nombre de la aplicación
INSERT INTO public.redpresu_config (key, value, description, category, is_system)
VALUES (
  'app_name',
  '"Redpresu"'::jsonb,
  'Nombre de la aplicación mostrado en la interfaz',
  'general',
  false
)
ON CONFLICT (key) DO NOTHING;

-- multiempresa: Modo monoempresa/multiempresa
INSERT INTO public.redpresu_config (key, value, description, category, is_system)
VALUES (
  'multiempresa',
  'true'::jsonb,
  'Modo de operación: true=multiempresa (SaaS), false=monoempresa (on-premise)',
  'general',
  true
)
ON CONFLICT (key) DO NOTHING;

-- default_empresa_id: Empresa por defecto
INSERT INTO public.redpresu_config (key, value, description, category, is_system)
VALUES (
  'default_empresa_id',
  '1'::jsonb,
  'ID de la empresa por defecto para usuarios sin empresa asignada',
  'general',
  false
)
ON CONFLICT (key) DO NOTHING;

-- public_registration_enabled: Registro público habilitado
INSERT INTO public.redpresu_config (key, value, description, category, is_system)
VALUES (
  'public_registration_enabled',
  'true'::jsonb,
  'Permitir registro público de nuevos usuarios (true) o solo por invitación (false)',
  'general',
  false
)
ON CONFLICT (key) DO NOTHING;

-- contact_notification_emails: Emails para notificaciones de contacto
INSERT INTO public.redpresu_config (key, value, description, category, is_system)
VALUES (
  'contact_notification_emails',
  '["admin@redpresu.com"]'::jsonb,
  'Lista de emails que recibirán notificaciones de formularios de contacto',
  'general',
  false
)
ON CONFLICT (key) DO NOTHING;

-- forms_legal_notice: Información legal para formularios
INSERT INTO public.redpresu_config (key, value, description, category, is_system)
VALUES (
  'forms_legal_notice',
  '"<p><strong>Información legal</strong></p><ul class=\"list-disc pl-4\"><li class=\"ml-2\"><p><strong>Responsable de los datos</strong>: REDPRESU.</p></li><li class=\"ml-2\"><p><strong>Finalidad de los datos</strong>: recabar información sobre nuestros servicios, gestionar el envío de información y prospección comercial.</p></li><li class=\"ml-2\"><p><strong>Destinatarios</strong>: Empresas proveedoras nacionales y encargados de tratamiento acogidos a privacy shield y personal de Jeyca.</p></li><li class=\"ml-2\"><p><strong>Información adicional</strong>: En la política de privacidad de <a target=\"_blank\" rel=\"noopener noreferrer\" class=\"text-cyan-600 underline cursor-pointer hover:text-cyan-700\" href=\"http://JEYCA.NET\">JEYCA.NET</a> encontrarás información adicional sobre la recopilación y el uso de su información personal por parte de <a target=\"_blank\" rel=\"noopener noreferrer\" class=\"text-cyan-600 underline cursor-pointer hover:text-cyan-700\" href=\"http://JEYCA.NET\">JEYCA.NET</a>, incluida información sobre acceso, conservación, rectificación, eliminación, seguridad y otros temas.</p></li></ul><p></p>"'::jsonb,
  'Información legal que aparece al final de los formularios públicos',
  'general',
  true
)
ON CONFLICT (key) DO NOTHING;

-- legal_page_content: Contenido de la página /legal
INSERT INTO public.redpresu_config (key, value, description, category, is_system)
VALUES (
  'legal_page_content',
  '"<h1>Aviso Legal</h1><p>En cumplimiento de la Ley 34/2002, de 11 de julio, de Servicios de la Sociedad de la Información y de Comercio Electrónico (LSSI-CE), REDPRESU informa que es titular del sitio web.</p><p>Para más información, contacte con el administrador del sitio.</p>"'::jsonb,
  'Contenido completo de la página de información legal (/legal)',
  'general',
  true
)
ON CONFLICT (key) DO NOTHING;

-- invitation_email_template: Plantilla email invitación
INSERT INTO public.redpresu_config (key, value, description, category, is_system)
VALUES (
  'invitation_email_template',
  '"Has sido invitado al Sistema de Presupuestos.\n\nPor favor, accede al siguiente enlace para configurar tu contraseña y activar tu cuenta:\n\n{{invitationUrl}}\n\nEste enlace es válido por 7 días.\n\n---\nSi no solicitaste esta invitación, puedes ignorar este mensaje."'::jsonb,
  'Plantilla del mensaje de email para invitaciones. Usa {{invitationUrl}} como variable',
  'general',
  false
)
ON CONFLICT (key) DO NOTHING;

-- invitation_token_expiration_days: Días expiración token invitación
INSERT INTO public.redpresu_config (key, value, description, category, is_system)
VALUES (
  'invitation_token_expiration_days',
  '7'::jsonb,
  'Número de días antes de que expire un token de invitación',
  'general',
  false
)
ON CONFLICT (key) DO NOTHING;

-- ============================================
-- CATEGORÍA: PDF
-- ============================================

-- pdf_templates: Plantillas PDF disponibles
INSERT INTO public.redpresu_config (key, value, description, category, is_system)
VALUES (
  'pdf_templates',
  '[
    {
      "id": "modern",
      "name": "Moderna",
      "description": "Diseño limpio y minimalista",
      "default": true
    },
    {
      "id": "classic",
      "name": "Clásica",
      "description": "Diseño tradicional profesional",
      "default": false
    },
    {
      "id": "elegant",
      "name": "Elegante",
      "description": "Diseño sofisticado con detalles",
      "default": false
    }
  ]'::jsonb,
  'Lista de plantillas PDF disponibles para presupuestos',
  'pdf',
  false
)
ON CONFLICT (key) DO NOTHING;

-- rapid_pdf_mode: Modo de generación PDF
INSERT INTO public.redpresu_config (key, value, description, category, is_system)
VALUES (
  'rapid_pdf_mode',
  '"production"'::jsonb,
  'Modo de generación PDF: development (local) o production (servidor)',
  'pdf',
  true
)
ON CONFLICT (key) DO NOTHING;

-- ============================================
-- CATEGORÍA: SUSCRIPCIONES
-- ============================================

-- subscriptions_enabled: Módulo suscripciones habilitado
INSERT INTO public.redpresu_config (key, value, description, category, is_system)
VALUES (
  'subscriptions_enabled',
  'false'::jsonb,
  'Activar módulo de suscripciones Stripe (solo en modo multiempresa)',
  'subscriptions',
  true
)
ON CONFLICT (key) DO NOTHING;

-- subscription_plans: Planes de suscripción
INSERT INTO public.redpresu_config (key, value, description, category, is_system)
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
  'Configuración de planes de suscripción (Free, Pro, Enterprise)',
  'subscriptions',
  true
)
ON CONFLICT (key) DO NOTHING;

-- ============================================
-- CATEGORÍA: TARIFAS
-- ============================================

-- default_tariff: Valores por defecto para nuevas tarifas
INSERT INTO public.redpresu_config (key, value, description, category, is_system)
VALUES (
  'default_tariff',
  '{
    "tariff_data": {
      "validity": "30",
      "status": "Inactiva"
    },
    "data_company": {
      "logo_url": "https://img.freepik.com/vector-gratis/vector-degradado-logotipo-colorido-pajaro_343694-1365.jpg",
      "name": "Lorem Ipsum S.A.",
      "nif": "V65724866",
      "address": "Calle Real, 325 - 41200, Alcalá del Río (Sevilla)",
      "contact": "939 778 965 - info@loremipsum.com"
    },
    "visual_config": {
      "primary_color": "#84cc16",
      "secondary_color": "#0891b2"
    },
    "pdf_notes": {
      "summary_note": "<p><strong>ACEPTACIÓN Y FORMAS DE PAGO</strong></p><p>El presupuesto se considerará aceptado una vez firmado por el cliente. Formas de pago disponibles: transferencia bancaria, efectivo o tarjeta.</p>",
      "conditions_note": "<p><strong>CONDICIONES GENERALES</strong></p><ul><li>Presupuesto válido por 30 días desde la fecha de emisión</li><li>Los precios incluyen IVA</li><li>Plazo de entrega: según acordado</li></ul>"
    },
    "legal_note": "<p><strong>INFORMACIÓN LEGAL</strong></p><p>En cumplimiento del RGPD, los datos personales recogidos serán tratados de forma confidencial. Puede ejercer sus derechos de acceso, rectificación y supresión contactando con nosotros.</p>"
  }'::jsonb,
  'Valores por defecto para crear nuevas tarifas (cuando no existe tarifa plantilla)',
  'tariffs',
  false
)
ON CONFLICT (key) DO NOTHING;

-- iva_re_equivalences: Equivalencias IVA a Recargo de Equivalencia
INSERT INTO public.redpresu_config (key, value, description, category, is_system)
VALUES (
  'iva_re_equivalences',
  '{
    "21": 5.2,
    "10": 1.4,
    "4": 0.5
  }'::jsonb,
  'Equivalencias de IVA a Recargo de Equivalencia según normativa española',
  'tariffs',
  true
)
ON CONFLICT (key) DO NOTHING;

-- ============================================
-- CATEGORÍA: TESTING (opcional)
-- ============================================

-- mock_time: Tiempo simulado para testing
INSERT INTO public.redpresu_config (key, value, description, category, is_system)
VALUES (
  'mock_time',
  'null'::jsonb,
  'Fecha/hora simulada para testing (ISO 8601 string o null). Solo funciona en NODE_ENV !== production',
  'testing',
  true
)
ON CONFLICT (key) DO NOTHING;

-- ============================================
-- VERIFICACIÓN
-- ============================================

DO $$
DECLARE
  config_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO config_count FROM public.redpresu_config;

  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Migración 039 completada';
  RAISE NOTICE 'Total configuraciones: %', config_count;
  RAISE NOTICE '========================================';

  -- Verificar claves críticas
  IF NOT EXISTS (SELECT 1 FROM public.redpresu_config WHERE key = 'app_mode') THEN
    RAISE EXCEPTION '❌ Falta config: app_mode';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.redpresu_config WHERE key = 'subscription_plans') THEN
    RAISE EXCEPTION '❌ Falta config: subscription_plans';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.redpresu_config WHERE key = 'iva_re_equivalences') THEN
    RAISE EXCEPTION '❌ Falta config: iva_re_equivalences';
  END IF;

  RAISE NOTICE '✅ Todas las configuraciones críticas verificadas';
END $$;

COMMIT;

-- ============================================
-- VERIFICACIÓN POST-MIGRACIÓN
-- ============================================

-- Ver todas las configuraciones creadas
SELECT
  key,
  category,
  is_system,
  CASE
    WHEN length(description) > 50 THEN substring(description, 1, 50) || '...'
    ELSE description
  END as description_short,
  created_at::date as created
FROM public.redpresu_config
ORDER BY category, key;

-- Resumen por categoría
SELECT
  category,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE is_system = true) as system_keys,
  COUNT(*) FILTER (WHERE is_system = false) as editable_keys
FROM public.redpresu_config
GROUP BY category
ORDER BY category;

-- Total general
SELECT
  'TOTAL CONFIGURACIONES' as descripcion,
  COUNT(*) as total
FROM public.redpresu_config;

-- ============================================
-- LISTADO COMPLETO DE KEYS ESPERADAS (19 claves)
-- ============================================
/*
CLAVES ESPERADAS EN PRODUCCIÓN:

GENERAL (10):
  ✅ app_mode
  ✅ app_name
  ✅ contact_notification_emails
  ✅ default_empresa_id
  ✅ forms_legal_notice
  ✅ invitation_email_template
  ✅ invitation_token_expiration_days
  ✅ legal_page_content
  ✅ multiempresa
  ✅ public_registration_enabled

PDF (2):
  ✅ pdf_templates
  ✅ rapid_pdf_mode

SUSCRIPCIONES (2):
  ✅ subscription_plans
  ✅ subscriptions_enabled

TARIFAS (2):
  ✅ default_tariff
  ✅ iva_re_equivalences

TESTING (1):
  ✅ mock_time

TOTAL: 17 claves (+ 2 opcionales futuras)
*/

-- ============================================
-- ROLLBACK (solo si es necesario)
-- ============================================
/*
-- Para eliminar TODAS las configuraciones añadidas:
DELETE FROM public.redpresu_config WHERE key IN (
  'app_mode',
  'app_name',
  'contact_notification_emails',
  'default_empresa_id',
  'forms_legal_notice',
  'invitation_email_template',
  'invitation_token_expiration_days',
  'legal_page_content',
  'multiempresa',
  'public_registration_enabled',
  'pdf_templates',
  'rapid_pdf_mode',
  'subscription_plans',
  'subscriptions_enabled',
  'default_tariff',
  'iva_re_equivalences',
  'mock_time'
);
*/
