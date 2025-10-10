-- =====================================================
-- MIGRACIÓN 022: Configuraciones de entorno
-- =====================================================
-- Fecha: 2025-01-10
-- Descripción: Agregar configuraciones de modo (dev/prod) y registro público
-- INSTRUCCIONES: Copiar y pegar todo este contenido en el SQL Editor de Supabase

-- =====================================================
-- Modo de aplicación (development/production)
-- =====================================================
INSERT INTO public.config (key, value, description, category, is_system)
VALUES (
  'app_mode',
  '"development"'::jsonb,
  'Modo de aplicación: development o production. En development se muestran logs y usuarios de prueba',
  'general',
  false
) ON CONFLICT (key) DO NOTHING;

-- =====================================================
-- Permitir registro público
-- =====================================================
INSERT INTO public.config (key, value, description, category, is_system)
VALUES (
  'public_registration_enabled',
  'true'::jsonb,
  'Permitir que empresas y autónomos se registren públicamente. Si es false, solo superadmin puede crear usuarios',
  'general',
  false
) ON CONFLICT (key) DO NOTHING;
