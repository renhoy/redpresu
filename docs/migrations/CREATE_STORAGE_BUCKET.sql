-- ============================================
-- CREAR Y CONFIGURAR BUCKET DE STORAGE
-- ============================================
-- Propósito: Crear bucket 'tariff-logos' para almacenar logos de tarifas
--            y configurar políticas de acceso público
--
-- EJECUTAR EN: Supabase Cloud → SQL Editor
-- ============================================

BEGIN;

-- ============================================
-- PASO 1: Crear bucket si no existe
-- ============================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('tariff-logos', 'tariff-logos', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- PASO 2: Configurar políticas de acceso
-- ============================================

-- Eliminar políticas existentes si existen (para hacer el script idempotente)
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete" ON storage.objects;
DROP POLICY IF EXISTS "Service role has full access" ON storage.objects;

-- Política 1: Permitir lectura pública (GET)
-- Cualquiera puede ver las imágenes
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'tariff-logos');

-- Política 2: Permitir subida a usuarios autenticados (INSERT)
-- Solo usuarios autenticados pueden subir archivos
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'tariff-logos');

-- Política 3: Permitir actualización a usuarios autenticados (UPDATE)
-- Solo usuarios autenticados pueden actualizar archivos
CREATE POLICY "Authenticated users can update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'tariff-logos')
WITH CHECK (bucket_id = 'tariff-logos');

-- Política 4: Permitir eliminación a usuarios autenticados (DELETE)
-- Solo usuarios autenticados pueden eliminar archivos
CREATE POLICY "Authenticated users can delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'tariff-logos');

-- Política 5: Service role tiene acceso completo
-- El service_role (usado por supabaseAdmin) tiene acceso total
CREATE POLICY "Service role has full access"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'tariff-logos')
WITH CHECK (bucket_id = 'tariff-logos');

-- ============================================
-- PASO 3: Verificar configuración
-- ============================================

-- Mostrar información del bucket
SELECT
    id,
    name,
    public,
    created_at
FROM storage.buckets
WHERE id = 'tariff-logos';

-- Mostrar políticas del bucket
SELECT
    policyname as nombre_politica,
    roles as roles_aplicables,
    cmd as comando
FROM pg_policies
WHERE schemaname = 'storage'
AND tablename = 'objects'
AND policyname LIKE '%tariff-logos%'
ORDER BY policyname;

-- Confirmar que está todo OK
DO $$
DECLARE
    bucket_exists BOOLEAN;
    policies_count INTEGER;
BEGIN
    -- Verificar bucket
    SELECT EXISTS (
        SELECT 1 FROM storage.buckets WHERE id = 'tariff-logos'
    ) INTO bucket_exists;

    -- Contar políticas
    SELECT COUNT(*) INTO policies_count
    FROM pg_policies
    WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname LIKE '%tariff%';

    RAISE NOTICE '========================================';
    RAISE NOTICE 'Bucket "tariff-logos" existe: %', CASE WHEN bucket_exists THEN '✅ SI' ELSE '❌ NO' END;
    RAISE NOTICE 'Políticas de acceso configuradas: %', policies_count;

    IF bucket_exists AND policies_count >= 5 THEN
        RAISE NOTICE '✅ STORAGE CONFIGURADO CORRECTAMENTE';
    ELSE
        RAISE WARNING '⚠️  Configuración incompleta';
    END IF;
    RAISE NOTICE '========================================';
END $$;

COMMIT;
