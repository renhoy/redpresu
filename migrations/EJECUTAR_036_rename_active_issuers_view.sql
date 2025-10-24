-- migrations/EJECUTAR_036_rename_active_issuers_view.sql
-- Descripción: Renombrar vista active_issuers a redpresu_active_issuers (consistencia prefijos)
-- Fecha: 2025-01-24
-- Bloque: Normalización nombres

-- ============================================
-- UP: Aplicar cambios
-- ============================================

BEGIN;

-- 1. Eliminar vista antigua
DROP VIEW IF EXISTS public.active_issuers CASCADE;

-- 2. Crear vista con nuevo nombre
CREATE VIEW public.redpresu_active_issuers AS
 SELECT redpresu_issuers.id,
    redpresu_issuers.user_id,
    redpresu_issuers.company_id,
    redpresu_issuers.type,
    redpresu_issuers.name,
    redpresu_issuers.nif,
    redpresu_issuers.address,
    redpresu_issuers.postal_code,
    redpresu_issuers.locality,
    redpresu_issuers.province,
    redpresu_issuers.country,
    redpresu_issuers.phone,
    redpresu_issuers.email,
    redpresu_issuers.web,
    redpresu_issuers.irpf_percentage,
    redpresu_issuers.logo_url,
    redpresu_issuers.note,
    redpresu_issuers.created_at,
    redpresu_issuers.updated_at,
    redpresu_issuers.deleted_at
   FROM public.redpresu_issuers
  WHERE (redpresu_issuers.deleted_at IS NULL);

-- 3. Añadir comentario
COMMENT ON VIEW public.redpresu_active_issuers IS 'Vista de emisores activos (no eliminados). Usar en queries normales.';

COMMIT;

-- ============================================
-- DOWN: Rollback (documentar, no ejecutar)
-- ============================================

-- BEGIN;
-- DROP VIEW IF EXISTS public.redpresu_active_issuers CASCADE;
-- CREATE VIEW public.active_issuers AS ...
-- COMMIT;
