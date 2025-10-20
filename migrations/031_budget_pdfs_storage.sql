-- migrations/031_budget_pdfs_storage.sql
-- Descripción: Crear bucket privado para PDFs de presupuestos con RLS
-- Fecha: 2025-01-20
-- Bloque: SECURITY - VULN-004

-- ============================================
-- UP: Crear bucket privado y RLS policies
-- ============================================

BEGIN;

-- 1. Crear bucket privado para PDFs (si no existe)
-- NOTA: Este SQL debe ejecutarse en Supabase Dashboard > Storage
-- ya que CREATE BUCKET no está soportado en SQL directo

-- Manual: Supabase Dashboard > Storage > Create Bucket:
-- - Name: budget-pdfs
-- - Public: false (PRIVADO)
-- - File size limit: 10MB
-- - Allowed MIME types: application/pdf

-- 2. RLS Policies para bucket 'budget-pdfs'
-- IMPORTANTE: Las policies de Storage se configuran en storage.objects

-- Policy: SELECT - Ver PDFs de mi empresa
CREATE POLICY "budget_pdfs_select_policy"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'budget-pdfs'
  AND (
    -- Permitir si el usuario pertenece a la empresa del PDF
    -- Formato filename: {company_id}/presupuesto_{client_name}_{nif}_{timestamp}.pdf
    auth.uid() IN (
      SELECT u.id
      FROM auth.users u
      JOIN public.redpresu_users ru ON ru.id = u.id
      WHERE CAST(ru.company_id AS TEXT) = SPLIT_PART(storage.objects.name, '/', 1)
    )
    OR
    -- Superadmin puede ver todos
    EXISTS (
      SELECT 1 FROM public.redpresu_users
      WHERE id = auth.uid() AND role = 'superadmin'
    )
  )
);

-- Policy: INSERT - Subir PDFs solo de mi empresa
CREATE POLICY "budget_pdfs_insert_policy"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'budget-pdfs'
  AND (
    -- Solo puede subir si pertenece a la empresa (prefijo del path)
    auth.uid() IN (
      SELECT u.id
      FROM auth.users u
      JOIN public.redpresu_users ru ON ru.id = u.id
      WHERE CAST(ru.company_id AS TEXT) = SPLIT_PART(storage.objects.name, '/', 1)
    )
  )
);

-- Policy: UPDATE - Actualizar PDFs de mi empresa
CREATE POLICY "budget_pdfs_update_policy"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'budget-pdfs'
  AND (
    auth.uid() IN (
      SELECT u.id
      FROM auth.users u
      JOIN public.redpresu_users ru ON ru.id = u.id
      WHERE CAST(ru.company_id AS TEXT) = SPLIT_PART(storage.objects.name, '/', 1)
    )
  )
);

-- Policy: DELETE - Eliminar PDFs de mi empresa (solo superadmin/admin)
CREATE POLICY "budget_pdfs_delete_policy"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'budget-pdfs'
  AND (
    auth.uid() IN (
      SELECT u.id
      FROM auth.users u
      JOIN public.redpresu_users ru ON ru.id = u.id
      WHERE CAST(ru.company_id AS TEXT) = SPLIT_PART(storage.objects.name, '/', 1)
        AND ru.role IN ('superadmin', 'admin')
    )
  )
);

-- 3. Índice para mejorar performance de las queries
-- (Las policies de storage usan joins, esto optimiza)
CREATE INDEX IF NOT EXISTS idx_users_company
ON public.redpresu_users(company_id);

COMMIT;

-- ============================================
-- DOWN: Rollback (documentar, no ejecutar)
-- ============================================

-- DROP POLICY IF EXISTS "budget_pdfs_select_policy" ON storage.objects;
-- DROP POLICY IF EXISTS "budget_pdfs_insert_policy" ON storage.objects;
-- DROP POLICY IF EXISTS "budget_pdfs_update_policy" ON storage.objects;
-- DROP POLICY IF EXISTS "budget_pdfs_delete_policy" ON storage.objects;
-- DROP INDEX IF EXISTS public.idx_users_company;

-- Manual: Supabase Dashboard > Storage > Delete Bucket 'budget-pdfs'

-- ============================================
-- INSTRUCCIONES DE EJECUCIÓN
-- ============================================

-- 1. PRIMERO: Crear bucket en Supabase Dashboard > Storage:
--    - Name: budget-pdfs
--    - Public: false
--    - File size limit: 10MB
--    - Allowed MIME types: application/pdf

-- 2. SEGUNDO: Ejecutar este SQL para crear policies:
--    psql -d postgres -f migrations/031_budget_pdfs_storage.sql

-- 3. TERCERO: Migrar PDFs existentes desde /public/pdfs/ a Storage
--    (Ver script de migración en comentarios abajo)

-- 4. CUARTO: Verificar policies:
--    SELECT * FROM pg_policies WHERE tablename = 'objects' AND policyname LIKE 'budget_pdfs%';

-- ============================================
-- SCRIPT DE MIGRACIÓN DE PDFs (Node.js)
-- ============================================

/*
// migrations/migrate-pdfs-to-storage.ts

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function migratePDFs() {
  const publicPdfsDir = path.join(process.cwd(), 'public', 'pdfs');
  const files = fs.readdirSync(publicPdfsDir);

  console.log(`Migrando ${files.length} PDFs a Supabase Storage...`);

  for (const filename of files) {
    if (!filename.endsWith('.pdf')) continue;

    const filePath = path.join(publicPdfsDir, filename);
    const fileBuffer = fs.readFileSync(filePath);

    // Obtener company_id del budget asociado
    const { data: budget } = await supabase
      .from('redpresu_budgets')
      .select('company_id')
      .eq('pdf_url', `/pdfs/${filename}`)
      .single();

    if (!budget) {
      console.warn(`Budget no encontrado para ${filename}, usando company_id=1`);
    }

    const companyId = budget?.company_id || 1;
    const storagePath = `${companyId}/${filename}`;

    // Subir a Storage
    const { error } = await supabase.storage
      .from('budget-pdfs')
      .upload(storagePath, fileBuffer, {
        contentType: 'application/pdf',
        upsert: false
      });

    if (error) {
      console.error(`Error migrando ${filename}:`, error);
    } else {
      console.log(`✅ Migrado: ${filename} → ${storagePath}`);

      // Actualizar pdf_url en BD
      await supabase
        .from('redpresu_budgets')
        .update({ pdf_url: storagePath })
        .eq('pdf_url', `/pdfs/${filename}`);
    }
  }

  console.log('Migración completada');
}

migratePDFs().catch(console.error);
*/
