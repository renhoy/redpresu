-- migrations/006_rename_issuers_columns.sql
-- Descripción: Renombrar columnas de issuers con prefijo issuers_
-- Fecha: 2025-01-04
-- Bloque: 1 (Usuarios y Seguridad)
-- Fase: 2

-- ============================================
-- UP: Aplicar cambios
-- ============================================

BEGIN;

-- 1. Renombrar columnas con prefijo issuers_
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
ALTER TABLE public.issuers RENAME COLUMN notas TO issuers_note;

-- 2. Renombrar índices
ALTER INDEX idx_issuers_empresa_id RENAME TO idx_issuers_company_id;
ALTER INDEX idx_issuers_tipo RENAME TO idx_issuers_type;
ALTER INDEX idx_issuers_nif RENAME TO idx_issuers_nif_original;
ALTER INDEX idx_issuers_nif_empresa RENAME TO idx_issuers_nif_company;

-- 3. Renombrar constraints (los que tengan nombres viejos)
ALTER TABLE public.issuers RENAME CONSTRAINT emisores_tipo_check TO issuers_type_check;
ALTER TABLE public.issuers RENAME CONSTRAINT emisores_irpf_percentage_check TO issuers_irpf_percentage_check;

-- 4. Actualizar CHECK constraint para usar nuevo nombre de columna
-- Primero eliminamos el constraint viejo
ALTER TABLE public.issuers DROP CONSTRAINT issuers_type_check;

-- Creamos el nuevo con el nombre de columna correcto
ALTER TABLE public.issuers ADD CONSTRAINT issuers_type_check
  CHECK (issuers_type = ANY (ARRAY['empresa'::text, 'autonomo'::text]));

-- 5. Actualizar comentarios
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
COMMENT ON COLUMN public.issuers.issuers_note IS 'Additional notes';

COMMIT;

-- ============================================
-- DOWN: Rollback (documentar, no ejecutar automáticamente)
-- ============================================
-- Para revertir esta migración, ejecutar:
--
-- BEGIN;
-- ALTER TABLE public.issuers RENAME COLUMN company_id TO empresa_id;
-- ALTER TABLE public.issuers RENAME COLUMN issuers_type TO tipo;
-- ALTER TABLE public.issuers RENAME COLUMN issuers_name TO nombre_comercial;
-- ALTER TABLE public.issuers RENAME COLUMN issuers_nif TO nif;
-- ALTER TABLE public.issuers RENAME COLUMN issuers_address TO direccion_fiscal;
-- ALTER TABLE public.issuers RENAME COLUMN issuers_postal_code TO codigo_postal;
-- ALTER TABLE public.issuers RENAME COLUMN issuers_locality TO ciudad;
-- ALTER TABLE public.issuers RENAME COLUMN issuers_province TO provincia;
-- ALTER TABLE public.issuers RENAME COLUMN issuers_country TO pais;
-- ALTER TABLE public.issuers RENAME COLUMN issuers_phone TO telefono;
-- ALTER TABLE public.issuers RENAME COLUMN issuers_email TO email;
-- ALTER TABLE public.issuers RENAME COLUMN issuers_web TO web;
-- ALTER TABLE public.issuers RENAME COLUMN issuers_irpf_percentage TO irpf_percentage;
-- ALTER TABLE public.issuers RENAME COLUMN issuers_logo_url TO logo_url;
-- ALTER TABLE public.issuers RENAME COLUMN issuers_note TO notas;
-- ALTER INDEX idx_issuers_company_id RENAME TO idx_issuers_empresa_id;
-- ALTER INDEX idx_issuers_type RENAME TO idx_issuers_tipo;
-- ALTER INDEX idx_issuers_nif_original RENAME TO idx_issuers_nif;
-- ALTER INDEX idx_issuers_nif_company RENAME TO idx_issuers_nif_empresa;
-- ALTER TABLE public.issuers RENAME CONSTRAINT issuers_type_check TO emisores_tipo_check;
-- ALTER TABLE public.issuers RENAME CONSTRAINT issuers_irpf_percentage_check TO emisores_irpf_percentage_check;
-- ALTER TABLE public.issuers DROP CONSTRAINT issuers_type_check;
-- ALTER TABLE public.issuers ADD CONSTRAINT emisores_tipo_check CHECK (tipo = ANY (ARRAY['empresa'::text, 'autonomo'::text]));
-- COMMIT;
