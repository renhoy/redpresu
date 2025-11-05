-- ============================================
-- EJECUTAR EN SUPABASE SQL EDITOR
-- ============================================
-- Migración: 039_complete_config_setup
-- Descripción: Insertar TODAS las configuraciones necesarias
-- Fecha: 2025-01-30
-- Estado actual Producción: 6 rows
-- Estado esperado después: 17 rows (mínimo)
--
-- PASOS:
-- 1. Abre Supabase Dashboard > SQL Editor
-- 2. Copia y pega TODO este archivo
-- 3. Ejecuta (botón RUN o Ctrl+Enter)
-- 4. Verifica el resultado (debe mostrar ✅ sin errores)
-- 5. Recarga la página /settings y verifica que aparecen todas las claves
-- ============================================

BEGIN;

-- app_mode
INSERT INTO public.redpresu_config (key, value, description, category, is_system)
VALUES ('app_mode', '"development"'::jsonb, 'Modo de ejecución: development o production', 'general', true)
ON CONFLICT (key) DO NOTHING;

-- app_name
INSERT INTO public.redpresu_config (key, value, description, category, is_system)
VALUES ('app_name', '"Redpresu"'::jsonb, 'Nombre de la aplicación', 'general', false)
ON CONFLICT (key) DO NOTHING;

-- multiempresa
INSERT INTO public.redpresu_config (key, value, description, category, is_system)
VALUES ('multiempresa', 'true'::jsonb, 'Modo: true=multiempresa (SaaS), false=monoempresa', 'general', true)
ON CONFLICT (key) DO NOTHING;

-- default_empresa_id
INSERT INTO public.redpresu_config (key, value, description, category, is_system)
VALUES ('default_empresa_id', '1'::jsonb, 'ID empresa por defecto', 'general', false)
ON CONFLICT (key) DO NOTHING;

-- public_registration_enabled
INSERT INTO public.redpresu_config (key, value, description, category, is_system)
VALUES ('public_registration_enabled', 'true'::jsonb, 'Registro público habilitado', 'general', false)
ON CONFLICT (key) DO NOTHING;

-- contact_notification_emails
INSERT INTO public.redpresu_config (key, value, description, category, is_system)
VALUES ('contact_notification_emails', '["admin@redpresu.com"]'::jsonb, 'Emails para notificaciones de contacto', 'general', false)
ON CONFLICT (key) DO NOTHING;

-- forms_legal_notice
INSERT INTO public.redpresu_config (key, value, description, category, is_system)
VALUES ('forms_legal_notice', '"<p><strong>Información legal</strong></p><ul class=\"list-disc pl-4\"><li class=\"ml-2\"><p><strong>Responsable de los datos</strong>: REDPRESU.</p></li><li class=\"ml-2\"><p><strong>Finalidad de los datos</strong>: recabar información sobre nuestros servicios, gestionar el envío de información y prospección comercial.</p></li><li class=\"ml-2\"><p><strong>Destinatarios</strong>: Empresas proveedoras nacionales y encargados de tratamiento acogidos a privacy shield y personal de Jeyca.</p></li><li class=\"ml-2\"><p><strong>Información adicional</strong>: En la política de privacidad de <a target=\"_blank\" rel=\"noopener noreferrer\" class=\"text-cyan-600 underline cursor-pointer hover:text-cyan-700\" href=\"http://JEYCA.NET\">JEYCA.NET</a> encontrarás información adicional sobre la recopilación y el uso de su información personal por parte de <a target=\"_blank\" rel=\"noopener noreferrer\" class=\"text-cyan-600 underline cursor-pointer hover:text-cyan-700\" href=\"http://JEYCA.NET\">JEYCA.NET</a>, incluida información sobre acceso, conservación, rectificación, eliminación, seguridad y otros temas.</p></li></ul><p></p>"'::jsonb, 'Info legal formularios públicos', 'general', true)
ON CONFLICT (key) DO NOTHING;

-- legal_page_content
INSERT INTO public.redpresu_config (key, value, description, category, is_system)
VALUES ('legal_page_content', '"<h1>Aviso Legal</h1><p>En cumplimiento de la Ley 34/2002, de 11 de julio, de Servicios de la Sociedad de la Información y de Comercio Electrónico (LSSI-CE), REDPRESU informa que es titular del sitio web.</p><p>Para más información, contacte con el administrador del sitio.</p>"'::jsonb, 'Contenido página /legal', 'general', true)
ON CONFLICT (key) DO NOTHING;

-- invitation_email_template
INSERT INTO public.redpresu_config (key, value, description, category, is_system)
VALUES ('invitation_email_template', '"Has sido invitado al Sistema de Presupuestos.\n\nPor favor, accede al siguiente enlace para configurar tu contraseña y activar tu cuenta:\n\n{{invitationUrl}}\n\nEste enlace es válido por 7 días.\n\n---\nSi no solicitaste esta invitación, puedes ignorar este mensaje."'::jsonb, 'Plantilla email invitación', 'general', false)
ON CONFLICT (key) DO NOTHING;

-- invitation_token_expiration_days
INSERT INTO public.redpresu_config (key, value, description, category, is_system)
VALUES ('invitation_token_expiration_days', '7'::jsonb, 'Días expiración token invitación', 'general', false)
ON CONFLICT (key) DO NOTHING;

-- pdf_templates
INSERT INTO public.redpresu_config (key, value, description, category, is_system)
VALUES ('pdf_templates', '[{"id":"modern","name":"Moderna","description":"Diseño limpio y minimalista","default":true},{"id":"classic","name":"Clásica","description":"Diseño tradicional profesional","default":false},{"id":"elegant","name":"Elegante","description":"Diseño sofisticado con detalles","default":false}]'::jsonb, 'Plantillas PDF disponibles', 'pdf', false)
ON CONFLICT (key) DO NOTHING;

-- rapid_pdf_mode
INSERT INTO public.redpresu_config (key, value, description, category, is_system)
VALUES ('rapid_pdf_mode', '"production"'::jsonb, 'Modo generación PDF: development o production', 'pdf', true)
ON CONFLICT (key) DO NOTHING;

-- subscriptions_enabled
INSERT INTO public.redpresu_config (key, value, description, category, is_system)
VALUES ('subscriptions_enabled', 'false'::jsonb, 'Módulo suscripciones Stripe habilitado', 'subscriptions', true)
ON CONFLICT (key) DO NOTHING;

-- subscription_plans
INSERT INTO public.redpresu_config (key, value, description, category, is_system)
VALUES ('subscription_plans', '{"free":{"id":"free","name":"Free","description":"Plan gratuito para comenzar","price":0,"priceId":"","position":1,"limits":{"tariffs":3,"budgets":10,"users":1,"storage_mb":100},"features":{"tariffs_limit":"Hasta 3 tarifas","budgets_limit":"Hasta 10 presupuestos","users_limit":"1 usuario","storage":"100 MB almacenamiento","support":"Soporte por email","custom_templates":false,"priority_support":false,"remove_watermark":false,"multi_company":false,"api_access":false,"custom_branding":false}},"pro":{"id":"pro","name":"Pro","description":"Plan profesional para negocios","price":29,"priceId":"price_REPLACE_WITH_REAL_PRICE_ID","position":2,"limits":{"tariffs":50,"budgets":500,"users":5,"storage_mb":5000},"features":{"tariffs_limit":"Hasta 50 tarifas","budgets_limit":"Hasta 500 presupuestos","users_limit":"Hasta 5 usuarios","storage":"5 GB almacenamiento","support":"Soporte prioritario","custom_templates":true,"priority_support":true,"remove_watermark":true,"multi_company":false,"api_access":false,"custom_branding":false}},"enterprise":{"id":"enterprise","name":"Enterprise","description":"Plan empresarial sin límites","price":99,"priceId":"price_REPLACE_WITH_REAL_PRICE_ID","position":3,"limits":{"tariffs":9999,"budgets":9999,"users":50,"storage_mb":50000},"features":{"tariffs_limit":"Tarifas ilimitadas","budgets_limit":"Presupuestos ilimitados","users_limit":"Hasta 50 usuarios","storage":"50 GB almacenamiento","support":"Soporte dedicado 24/7","custom_templates":true,"priority_support":true,"remove_watermark":true,"multi_company":true,"api_access":true,"custom_branding":true}}}'::jsonb, 'Planes de suscripción (Free/Pro/Enterprise)', 'subscriptions', true)
ON CONFLICT (key) DO NOTHING;

-- default_tariff
INSERT INTO public.redpresu_config (key, value, description, category, is_system)
VALUES ('default_tariff', '{"tariff_data":{"validity":"30","status":"Inactiva"},"data_company":{"logo_url":"https://img.freepik.com/vector-gratis/vector-degradado-logotipo-colorido-pajaro_343694-1365.jpg","name":"Lorem Ipsum S.A.","nif":"V65724866","address":"Calle Real, 325 - 41200, Alcalá del Río (Sevilla)","contact":"939 778 965 - info@loremipsum.com"},"visual_config":{"primary_color":"#84cc16","secondary_color":"#0891b2"},"pdf_notes":{"summary_note":"<p><strong>ACEPTACIÓN Y FORMAS DE PAGO</strong></p><p>El presupuesto se considerará aceptado una vez firmado por el cliente. Formas de pago disponibles: transferencia bancaria, efectivo o tarjeta.</p>","conditions_note":"<p><strong>CONDICIONES GENERALES</strong></p><ul><li>Presupuesto válido por 30 días desde la fecha de emisión</li><li>Los precios incluyen IVA</li><li>Plazo de entrega: según acordado</li></ul>"},"legal_note":"<p><strong>INFORMACIÓN LEGAL</strong></p><p>En cumplimiento del RGPD, los datos personales recogidos serán tratados de forma confidencial. Puede ejercer sus derechos de acceso, rectificación y supresión contactando con nosotros.</p>"}'::jsonb, 'Valores por defecto nuevas tarifas', 'tariffs', false)
ON CONFLICT (key) DO NOTHING;

-- iva_re_equivalences
INSERT INTO public.redpresu_config (key, value, description, category, is_system)
VALUES ('iva_re_equivalences', '{"21":5.2,"10":1.4,"4":0.5}'::jsonb, 'Equivalencias IVA a Recargo Equivalencia', 'tariffs', true)
ON CONFLICT (key) DO NOTHING;

-- mock_time (opcional, para testing)
INSERT INTO public.redpresu_config (key, value, description, category, is_system)
VALUES ('mock_time', 'null'::jsonb, 'Tiempo simulado para testing (solo development)', 'testing', true)
ON CONFLICT (key) DO NOTHING;

-- Verificación
DO $$
DECLARE
  total_configs INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_configs FROM public.redpresu_config;

  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Migración completada exitosamente';
  RAISE NOTICE 'Total configuraciones: % rows', total_configs;
  RAISE NOTICE '========================================';

  IF total_configs < 17 THEN
    RAISE WARNING '⚠️  Se esperaban al menos 17 configuraciones, hay %', total_configs;
  ELSE
    RAISE NOTICE '✅ Número de configuraciones correcto';
  END IF;
END $$;

COMMIT;

-- Mostrar resultado final
SELECT
  '✅ CONFIGURACIONES INSERTADAS' as status,
  COUNT(*) as total_rows,
  COUNT(*) FILTER (WHERE category = 'general') as general,
  COUNT(*) FILTER (WHERE category = 'pdf') as pdf,
  COUNT(*) FILTER (WHERE category = 'subscriptions') as subscriptions,
  COUNT(*) FILTER (WHERE category = 'tariffs') as tariffs,
  COUNT(*) FILTER (WHERE category = 'testing') as testing
FROM public.redpresu_config;

-- Listar todas las claves por categoría
SELECT
  category,
  key,
  is_system,
  substring(description, 1, 50) as description_preview
FROM public.redpresu_config
ORDER BY category, key;
