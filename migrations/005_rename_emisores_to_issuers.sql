-- migrations/005_rename_emisores_to_issuers.sql
-- Descripción: Renombrar tabla emisores a issuers y todos los campos con prefijo issuers_
-- Fecha: 2025-01-04
-- Bloque: 1 (Usuarios y Seguridad)
-- Fase: 2

-- ============================================
-- UP: Aplicar cambios
-- ============================================

BEGIN;

-- 1. Renombrar la tabla
ALTER TABLE public.emisores RENAME TO issuers;

-- 2. Renombrar columnas con prefijo issuers_
ALTER TABLE public.issuers RENAME COLUMN empresa_id TO company_id;
ALTER TABLE public.issuers RENAME COLUMN tipo TO issuers_type;
ALTER TABLE public.issuers RENAME COLUMN nombre_comercial TO issuers_name;
ALTER TABLE public.issuers RENAME COLUMN nif TO issuers_nif;
ALTER TABLE public.issuers RENAME COLUMN direccion_fiscal TO issuers_address;
ALTER TABLE public.issuers RENAME COLUMN codigo_postal TO issuers_postal_code;
ALTER TABLE public.issuers RENAME COLUMN ciudad TO issuers_locality;
ALTER TABLE public.issuers RENAME COLUMN provincia TO issuers_province;
ALTER TABLE public.issuers RENAME COLUMN pais TO issuers_country;
ALTER TABLE public.issuers RENAME COLUMN telefono TO issuers_phone;
ALTER TABLE public.issuers RENAME COLUMN email TO issuers_email;
ALTER TABLE public.issuers RENAME COLUMN web TO issuers_web;
ALTER TABLE public.issuers RENAME COLUMN irpf_percentage TO issuers_irpf_percentage;
ALTER TABLE public.issuers RENAME COLUMN logo_url TO issuers_logo_url;
-- notas no existe en la migración 004, pero lo agregamos por si acaso
-- ALTER TABLE public.issuers RENAME COLUMN notas TO issuers_note;

-- 3. Renombrar índices
ALTER INDEX idx_emisores_user_id RENAME TO idx_issuers_user_id;
ALTER INDEX idx_emisores_empresa_id RENAME TO idx_issuers_company_id;
ALTER INDEX idx_emisores_nif RENAME TO idx_issuers_nif;
ALTER INDEX idx_emisores_tipo RENAME TO idx_issuers_type;
ALTER INDEX idx_emisores_nif_empresa RENAME TO idx_issuers_nif_company;

-- 4. Renombrar constraints
ALTER TABLE public.issuers RENAME CONSTRAINT emisores_email_check TO issuers_email_check;
ALTER TABLE public.issuers RENAME CONSTRAINT emisores_pkey TO issuers_pkey;

-- 5. Eliminar trigger viejo y función vieja
DROP TRIGGER IF EXISTS trigger_emisores_updated_at ON public.issuers;
DROP FUNCTION IF EXISTS public.update_emisores_updated_at();

-- Crear nueva función
CREATE OR REPLACE FUNCTION public.update_issuers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear nuevo trigger
CREATE TRIGGER trigger_issuers_updated_at
  BEFORE UPDATE ON public.issuers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_issuers_updated_at();

-- 6. Eliminar RLS policies viejas
DROP POLICY IF EXISTS "emisores_select_policy" ON public.issuers;
DROP POLICY IF EXISTS "emisores_insert_policy" ON public.issuers;
DROP POLICY IF EXISTS "emisores_update_policy" ON public.issuers;
DROP POLICY IF EXISTS "emisores_delete_policy" ON public.issuers;

-- 7. Crear nuevas RLS policies con nombres de campos actualizados
CREATE POLICY "issuers_select_policy"
  ON public.issuers FOR SELECT
  USING (
    company_id = (
      SELECT empresa_id
      FROM public.users
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "issuers_insert_policy"
  ON public.issuers FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND company_id = (
      SELECT empresa_id
      FROM public.users
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "issuers_update_policy"
  ON public.issuers FOR UPDATE
  USING (
    company_id = (
      SELECT empresa_id
      FROM public.users
      WHERE id = auth.uid()
    )
    AND (
      user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
        AND role IN ('admin', 'superadmin')
      )
    )
  );

CREATE POLICY "issuers_delete_policy"
  ON public.issuers FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role = 'superadmin'
    )
  );

-- 8. Actualizar comentarios
COMMENT ON TABLE public.issuers IS 'Fiscal data for issuers (company or freelancer) for invoicing and budgets';
COMMENT ON COLUMN public.issuers.user_id IS 'Owner/responsible user for this issuer';
COMMENT ON COLUMN public.issuers.company_id IS 'Company ID for multi-tenant (default 1 = first company)';
COMMENT ON COLUMN public.issuers.issuers_type IS 'Issuer type: empresa (company) or autonomo (freelancer)';
COMMENT ON COLUMN public.issuers.issuers_name IS 'Business/commercial name';
COMMENT ON COLUMN public.issuers.issuers_nif IS 'Tax identification number (NIF/CIF)';
COMMENT ON COLUMN public.issuers.issuers_address IS 'Fiscal/legal address';
COMMENT ON COLUMN public.issuers.issuers_postal_code IS 'Postal/ZIP code';
COMMENT ON COLUMN public.issuers.issuers_locality IS 'City/Locality';
COMMENT ON COLUMN public.issuers.issuers_province IS 'State/Province';
COMMENT ON COLUMN public.issuers.issuers_country IS 'Country';
COMMENT ON COLUMN public.issuers.issuers_phone IS 'Contact phone number';
COMMENT ON COLUMN public.issuers.issuers_email IS 'Contact email';
COMMENT ON COLUMN public.issuers.issuers_web IS 'Website URL';
COMMENT ON COLUMN public.issuers.issuers_irpf_percentage IS 'IRPF withholding percentage (only for freelancers, typically 15%)';
COMMENT ON COLUMN public.issuers.issuers_logo_url IS 'Logo image URL';

COMMIT;

-- ============================================
-- DOWN: Rollback (documentar, no ejecutar automáticamente)
-- ============================================
-- Para revertir esta migración, ejecutar:
--
-- BEGIN;
-- ALTER TABLE public.issuers RENAME TO emisores;
-- ALTER TABLE public.emisores RENAME COLUMN company_id TO empresa_id;
-- ALTER TABLE public.emisores RENAME COLUMN issuers_type TO tipo;
-- ALTER TABLE public.emisores RENAME COLUMN issuers_name TO nombre_comercial;
-- ALTER TABLE public.emisores RENAME COLUMN issuers_nif TO nif;
-- ALTER TABLE public.emisores RENAME COLUMN issuers_address TO direccion_fiscal;
-- ALTER TABLE public.emisores RENAME COLUMN issuers_postal_code TO codigo_postal;
-- ALTER TABLE public.emisores RENAME COLUMN issuers_locality TO ciudad;
-- ALTER TABLE public.emisores RENAME COLUMN issuers_province TO provincia;
-- ALTER TABLE public.emisores RENAME COLUMN issuers_country TO pais;
-- ALTER TABLE public.emisores RENAME COLUMN issuers_phone TO telefono;
-- ALTER TABLE public.emisores RENAME COLUMN issuers_email TO email;
-- ALTER TABLE public.emisores RENAME COLUMN issuers_web TO web;
-- ALTER TABLE public.emisores RENAME COLUMN issuers_irpf_percentage TO irpf_percentage;
-- ALTER TABLE public.emisores RENAME COLUMN issuers_logo_url TO logo_url;
-- ALTER INDEX idx_issuers_user_id RENAME TO idx_emisores_user_id;
-- ALTER INDEX idx_issuers_company_id RENAME TO idx_emisores_empresa_id;
-- ALTER INDEX idx_issuers_nif RENAME TO idx_emisores_nif;
-- ALTER INDEX idx_issuers_type RENAME TO idx_emisores_tipo;
-- ALTER INDEX idx_issuers_nif_company RENAME TO idx_emisores_nif_empresa;
-- ALTER TABLE public.emisores RENAME CONSTRAINT issuers_email_check TO emisores_email_check;
-- ALTER TABLE public.emisores RENAME CONSTRAINT issuers_pkey TO emisores_pkey;
-- DROP TRIGGER IF EXISTS trigger_issuers_updated_at ON public.emisores;
-- DROP FUNCTION IF EXISTS public.update_issuers_updated_at();
-- CREATE OR REPLACE FUNCTION public.update_emisores_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;
-- CREATE TRIGGER trigger_emisores_updated_at BEFORE UPDATE ON public.emisores FOR EACH ROW EXECUTE FUNCTION public.update_emisores_updated_at();
-- DROP POLICY IF EXISTS "issuers_select_policy" ON public.emisores;
-- DROP POLICY IF EXISTS "issuers_insert_policy" ON public.emisores;
-- DROP POLICY IF EXISTS "issuers_update_policy" ON public.emisores;
-- DROP POLICY IF EXISTS "issuers_delete_policy" ON public.emisores;
-- [... crear policies originales ...]
-- COMMIT;
