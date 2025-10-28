-- ============================================
-- Migración 042: Añadir foreign key entre users y companies
-- ============================================
-- Descripción: Añade constraint de foreign key entre redpresu_users.company_id
--              y redpresu_companies.id para integridad referencial
-- Fecha: 2025-01-27
-- Bloque: Usuarios (Fase 2)
-- ============================================

BEGIN;

-- Verificar que no hay users con company_id inválido antes de crear la FK
DO $$
DECLARE
  v_invalid_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_invalid_count
  FROM public.redpresu_users u
  WHERE NOT EXISTS (
    SELECT 1 FROM public.redpresu_companies c WHERE c.id = u.company_id
  );

  IF v_invalid_count > 0 THEN
    RAISE EXCEPTION 'Existen % usuarios con company_id inválido. Corregir antes de ejecutar migración.', v_invalid_count;
  END IF;
END $$;

-- Añadir foreign key entre users y companies
ALTER TABLE public.redpresu_users
  ADD CONSTRAINT redpresu_users_company_id_fkey
  FOREIGN KEY (company_id)
  REFERENCES public.redpresu_companies(id)
  ON DELETE RESTRICT;

-- Comentario para documentación
COMMENT ON CONSTRAINT redpresu_users_company_id_fkey ON public.redpresu_users
IS 'Foreign key que vincula usuarios con empresas. ON DELETE RESTRICT previene eliminar empresas con usuarios activos.';

COMMIT;

-- ============================================
-- ROLLBACK (documentar, no ejecutar automáticamente)
-- ============================================
-- BEGIN;
-- ALTER TABLE public.redpresu_users DROP CONSTRAINT IF EXISTS redpresu_users_company_id_fkey;
-- COMMIT;
