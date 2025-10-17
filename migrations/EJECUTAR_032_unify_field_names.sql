-- ============================================
-- Migración 032: Unificar nombres de campos a inglés
-- ============================================
-- Descripción: Renombrar campos restantes en redpresu_users
--              e redpresu_issuers para unificar nomenclatura
-- Fecha: 2025-01-17
-- Bloque: Fase 2 - Refactoring nomenclatura (completar)
-- ============================================

BEGIN;

-- ============================================
-- PASO 1: Renombrar campos en redpresu_users
-- ============================================

ALTER TABLE public.redpresu_users
  RENAME COLUMN empresa_id TO company_id;

ALTER TABLE public.redpresu_users
  RENAME COLUMN nombre TO name;

ALTER TABLE public.redpresu_users
  RENAME COLUMN apellidos TO last_name;

COMMENT ON COLUMN public.redpresu_users.company_id IS
  'ID de la empresa (company)';

COMMENT ON COLUMN public.redpresu_users.name IS
  'Nombre del usuario';

COMMENT ON COLUMN public.redpresu_users.last_name IS
  'Apellidos del usuario';

-- ============================================
-- PASO 2: Renombrar campos en redpresu_issuers
-- ============================================

ALTER TABLE public.redpresu_issuers
  RENAME COLUMN issuers_type TO type;

ALTER TABLE public.redpresu_issuers
  RENAME COLUMN issuers_name TO name;

ALTER TABLE public.redpresu_issuers
  RENAME COLUMN issuers_nif TO nif;

ALTER TABLE public.redpresu_issuers
  RENAME COLUMN issuers_address TO address;

ALTER TABLE public.redpresu_issuers
  RENAME COLUMN issuers_postal_code TO postal_code;

ALTER TABLE public.redpresu_issuers
  RENAME COLUMN issuers_locality TO locality;

ALTER TABLE public.redpresu_issuers
  RENAME COLUMN issuers_province TO province;

ALTER TABLE public.redpresu_issuers
  RENAME COLUMN issuers_country TO country;

ALTER TABLE public.redpresu_issuers
  RENAME COLUMN issuers_phone TO phone;

ALTER TABLE public.redpresu_issuers
  RENAME COLUMN issuers_email TO email;

ALTER TABLE public.redpresu_issuers
  RENAME COLUMN issuers_web TO web;

ALTER TABLE public.redpresu_issuers
  RENAME COLUMN issuers_irpf_percentage TO irpf_percentage;

ALTER TABLE public.redpresu_issuers
  RENAME COLUMN issuers_logo_url TO logo_url;

ALTER TABLE public.redpresu_issuers
  RENAME COLUMN issuers_note TO note;

-- ============================================
-- PASO 3: Actualizar comentarios
-- ============================================

COMMENT ON COLUMN public.redpresu_issuers.type IS
  'Tipo de emisor: empresa o autonomo';

COMMENT ON COLUMN public.redpresu_issuers.name IS
  'Nombre o razón social del emisor';

COMMENT ON COLUMN public.redpresu_issuers.nif IS
  'NIF/CIF del emisor';

COMMENT ON COLUMN public.redpresu_issuers.address IS
  'Dirección del emisor';

COMMENT ON COLUMN public.redpresu_issuers.postal_code IS
  'Código postal';

COMMENT ON COLUMN public.redpresu_issuers.locality IS
  'Localidad';

COMMENT ON COLUMN public.redpresu_issuers.province IS
  'Provincia';

COMMENT ON COLUMN public.redpresu_issuers.country IS
  'País';

COMMENT ON COLUMN public.redpresu_issuers.phone IS
  'Teléfono de contacto';

COMMENT ON COLUMN public.redpresu_issuers.email IS
  'Email de contacto';

COMMENT ON COLUMN public.redpresu_issuers.web IS
  'Sitio web';

COMMENT ON COLUMN public.redpresu_issuers.irpf_percentage IS
  'Porcentaje de IRPF (solo autónomos)';

COMMENT ON COLUMN public.redpresu_issuers.logo_url IS
  'URL del logo del emisor';

COMMENT ON COLUMN public.redpresu_issuers.note IS
  'Nota o descripción adicional';

COMMIT;

-- ============================================
-- Verificación post-migración
-- ============================================

-- 1. Verificar campos en redpresu_users
-- SELECT column_name
-- FROM information_schema.columns
-- WHERE table_name = 'redpresu_users'
--   AND column_name IN ('company_id', 'name', 'last_name')
-- ORDER BY column_name;
-- Esperado: 3 filas

-- 2. Verificar campos en redpresu_issuers
-- SELECT column_name
-- FROM information_schema.columns
-- WHERE table_name = 'redpresu_issuers'
--   AND column_name IN ('type', 'name', 'nif', 'address', 'postal_code', 'locality', 'province', 'country', 'phone', 'email', 'web', 'irpf_percentage', 'logo_url', 'note')
-- ORDER BY column_name;
-- Esperado: 14 filas

-- ============================================
-- DOWN: Rollback (documentar, no ejecutar)
-- ============================================

-- BEGIN;
--
-- -- Revertir redpresu_users
-- ALTER TABLE public.redpresu_users RENAME COLUMN company_id TO empresa_id;
-- ALTER TABLE public.redpresu_users RENAME COLUMN name TO nombre;
-- ALTER TABLE public.redpresu_users RENAME COLUMN last_name TO apellidos;
--
-- -- Revertir redpresu_issuers
-- ALTER TABLE public.redpresu_issuers RENAME COLUMN type TO issuers_type;
-- ALTER TABLE public.redpresu_issuers RENAME COLUMN name TO issuers_name;
-- ALTER TABLE public.redpresu_issuers RENAME COLUMN nif TO issuers_nif;
-- ALTER TABLE public.redpresu_issuers RENAME COLUMN address TO issuers_address;
-- ALTER TABLE public.redpresu_issuers RENAME COLUMN postal_code TO issuers_postal_code;
-- ALTER TABLE public.redpresu_issuers RENAME COLUMN locality TO issuers_locality;
-- ALTER TABLE public.redpresu_issuers RENAME COLUMN province TO issuers_province;
-- ALTER TABLE public.redpresu_issuers RENAME COLUMN country TO issuers_country;
-- ALTER TABLE public.redpresu_issuers RENAME COLUMN phone TO issuers_phone;
-- ALTER TABLE public.redpresu_issuers RENAME COLUMN email TO issuers_email;
-- ALTER TABLE public.redpresu_issuers RENAME COLUMN web TO issuers_web;
-- ALTER TABLE public.redpresu_issuers RENAME COLUMN irpf_percentage TO issuers_irpf_percentage;
-- ALTER TABLE public.redpresu_issuers RENAME COLUMN logo_url TO issuers_logo_url;
-- ALTER TABLE public.redpresu_issuers RENAME COLUMN note TO issuers_note;
--
-- COMMIT;
