-- ============================================
-- MIGRACIÓN 013: Tabla de Configuración Global
-- INSTRUCCIONES:
-- 1. Abre Supabase Dashboard > SQL Editor
-- 2. Copia y pega TODO este contenido
-- 3. Ejecuta (Run)
-- 4. Verifica que no hay errores
-- ============================================

BEGIN;

-- PREREQUISITO: Crear función get_user_role_by_id si no existe
-- (Debería existir desde migración 010, pero la creamos por seguridad)
CREATE OR REPLACE FUNCTION public.get_user_role_by_id(user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  user_role text;
BEGIN
  SELECT role INTO user_role
  FROM public.users
  WHERE id = user_id;

  RETURN user_role;
END;
$$;

COMMENT ON FUNCTION public.get_user_role_by_id(uuid) IS 'Returns role for a specific user (SECURITY DEFINER to avoid RLS recursion)';

-- 1. Crear tabla config
CREATE TABLE IF NOT EXISTS public.config (
  key text NOT NULL,
  value jsonb NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'general',
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT config_pkey PRIMARY KEY (key)
);

-- 2. Crear índices
CREATE INDEX IF NOT EXISTS idx_config_category ON public.config(category);
CREATE INDEX IF NOT EXISTS idx_config_is_system ON public.config(is_system);

-- 3. Comentarios
COMMENT ON TABLE public.config IS 'Tabla de configuración global del sistema (IVA-RE, plantillas PDF, defaults, etc.)';
COMMENT ON COLUMN public.config.key IS 'Clave única de configuración (ej: iva_re_equivalences, pdf_templates)';
COMMENT ON COLUMN public.config.value IS 'Valor en formato JSON para flexibilidad';
COMMENT ON COLUMN public.config.description IS 'Descripción del parámetro de configuración';
COMMENT ON COLUMN public.config.category IS 'Categoría: general, fiscal, pdf, defaults';
COMMENT ON COLUMN public.config.is_system IS 'Si es true, solo superadmin puede modificar';

-- 4. Insertar datos iniciales

-- IVA a Recargo de Equivalencia (valores oficiales España)
INSERT INTO public.config (key, value, description, category, is_system)
VALUES (
  'iva_re_equivalences',
  '{"21": 5.2, "10": 1.4, "4": 0.5}'::jsonb,
  'Equivalencias IVA a Recargo de Equivalencia según normativa española',
  'fiscal',
  true
) ON CONFLICT (key) DO NOTHING;

-- Plantillas PDF disponibles
INSERT INTO public.config (key, value, description, category, is_system)
VALUES (
  'pdf_templates',
  '[
    {"id": "modern", "name": "Moderna", "description": "Diseño limpio y minimalista"},
    {"id": "classic", "name": "Clásica", "description": "Diseño tradicional profesional"},
    {"id": "elegant", "name": "Elegante", "description": "Diseño sofisticado con detalles"}
  ]'::jsonb,
  'Plantillas de PDF disponibles para presupuestos',
  'pdf',
  true
) ON CONFLICT (key) DO NOTHING;

-- Plantilla PDF por defecto
INSERT INTO public.config (key, value, description, category, is_system)
VALUES (
  'pdf_template_default',
  '"modern"'::jsonb,
  'Plantilla PDF por defecto para nuevas tarifas',
  'pdf',
  false
) ON CONFLICT (key) DO NOTHING;

-- Validez por defecto de presupuestos (días)
INSERT INTO public.config (key, value, description, category, is_system)
VALUES (
  'budget_validity_days',
  '30'::jsonb,
  'Días de validez por defecto para nuevos presupuestos',
  'defaults',
  false
) ON CONFLICT (key) DO NOTHING;

-- Validez por defecto de tarifas (días)
INSERT INTO public.config (key, value, description, category, is_system)
VALUES (
  'tariff_validity_days',
  '30'::jsonb,
  'Días de validez por defecto para nuevas tarifas',
  'defaults',
  false
) ON CONFLICT (key) DO NOTHING;

-- Colores por defecto
INSERT INTO public.config (key, value, description, category, is_system)
VALUES (
  'default_colors',
  '{"primary": "#000000", "secondary": "#666666"}'::jsonb,
  'Colores por defecto para nuevas tarifas',
  'defaults',
  false
) ON CONFLICT (key) DO NOTHING;

-- Notas legales por defecto
INSERT INTO public.config (key, value, description, category, is_system)
VALUES (
  'default_legal_note',
  '"Los precios indicados no incluyen IVA salvo indicación contraria. Presupuesto válido durante los días indicados."'::jsonb,
  'Nota legal por defecto para nuevas tarifas',
  'defaults',
  false
) ON CONFLICT (key) DO NOTHING;

-- 5. Crear políticas RLS
ALTER TABLE public.config ENABLE ROW LEVEL SECURITY;

-- SELECT: Todos los usuarios autenticados pueden leer config
CREATE POLICY "config_select_policy"
  ON public.config FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- INSERT: Solo superadmin
CREATE POLICY "config_insert_policy"
  ON public.config FOR INSERT
  WITH CHECK (
    public.get_user_role_by_id(auth.uid()) = 'superadmin'
  );

-- UPDATE: Solo superadmin
CREATE POLICY "config_update_policy"
  ON public.config FOR UPDATE
  USING (
    public.get_user_role_by_id(auth.uid()) = 'superadmin'
  )
  WITH CHECK (
    public.get_user_role_by_id(auth.uid()) = 'superadmin'
  );

-- DELETE: Solo superadmin y solo si no es sistema
CREATE POLICY "config_delete_policy"
  ON public.config FOR DELETE
  USING (
    public.get_user_role_by_id(auth.uid()) = 'superadmin'
    AND is_system = false
  );

COMMIT;

-- ============================================
-- VERIFICACIÓN POST-MIGRACIÓN
-- ============================================
-- Ejecuta estas queries para verificar:
--
-- 1. Ver tabla creada:
-- SELECT * FROM public.config ORDER BY category, key;
--
-- 2. Contar registros:
-- SELECT category, count(*) FROM public.config GROUP BY category;
--
-- 3. Ver políticas RLS:
-- SELECT * FROM pg_policies WHERE tablename = 'config';
-- ============================================
