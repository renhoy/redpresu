-- ============================================
-- Migración 031b: Renombrar SOLO CAMPOS a inglés
-- ============================================
-- Descripción: La migración 031 renombró las tablas pero falló
--              en renombrar los campos. Esta migración corrige
--              SOLO los nombres de campos.
-- Fecha: 2025-01-17
-- Bloque: Fase 2 - Refactoring nomenclatura (corrección)
-- ============================================

BEGIN;

-- ============================================
-- PASO 1: Renombrar CAMPOS en tablas YA renombradas
-- ============================================

-- Tabla: redpresu_budget_versions (antes: budget_versions)
ALTER TABLE public.redpresu_budget_versions
  RENAME COLUMN total_pagar TO total_pay;

COMMENT ON COLUMN public.redpresu_budget_versions.total_pay IS
  'Total a pagar (con IVA, IRPF y RE aplicados)';

-- Tabla: redpresu_budgets (antes: budgets)
ALTER TABLE public.redpresu_budgets
  RENAME COLUMN empresa_id TO company_id;

ALTER TABLE public.redpresu_budgets
  RENAME COLUMN total_pagar TO total_pay;

ALTER TABLE public.redpresu_budgets
  RENAME COLUMN re_aplica TO re_apply;

COMMENT ON COLUMN public.redpresu_budgets.company_id IS
  'ID de la empresa (company)';

COMMENT ON COLUMN public.redpresu_budgets.total_pay IS
  'Total a pagar (con IVA, IRPF y RE aplicados)';

COMMENT ON COLUMN public.redpresu_budgets.re_apply IS
  'Indica si se aplica Recargo de Equivalencia';

-- Tabla: redpresu_companies (antes: empresas)
ALTER TABLE public.redpresu_companies
  RENAME COLUMN nombre TO name;

COMMENT ON COLUMN public.redpresu_companies.name IS
  'Nombre de la empresa';

-- Tabla: redpresu_tariffs (antes: tariffs)
ALTER TABLE public.redpresu_tariffs
  RENAME COLUMN empresa_id TO company_id;

COMMENT ON COLUMN public.redpresu_tariffs.company_id IS
  'ID de la empresa (company)';

-- Tabla: redpresu_users (CRÍTICO - faltó en migración anterior)
-- Verificar si existe el campo empresa_id antes de renombrar
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'redpresu_users'
      AND column_name = 'empresa_id'
  ) THEN
    ALTER TABLE public.redpresu_users
      RENAME COLUMN empresa_id TO company_id;

    COMMENT ON COLUMN public.redpresu_users.company_id IS
      'ID de la empresa (company)';
  END IF;
END $$;

-- Tabla: redpresu_issuers (verificar si tiene empresa_id)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'redpresu_issuers'
      AND column_name = 'empresa_id'
  ) THEN
    ALTER TABLE public.redpresu_issuers
      RENAME COLUMN empresa_id TO company_id;

    COMMENT ON COLUMN public.redpresu_issuers.company_id IS
      'ID de la empresa (company)';
  END IF;
END $$;

COMMIT;

-- ============================================
-- Verificación post-migración
-- ============================================

-- Ejecuta estas queries para verificar:

-- 1. Verificar company_id en redpresu_budgets
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'redpresu_budgets'
--   AND column_name = 'company_id';

-- 2. Verificar company_id en redpresu_users
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'redpresu_users'
--   AND column_name = 'company_id';

-- 3. Verificar company_id en redpresu_tariffs
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'redpresu_tariffs'
--   AND column_name = 'company_id';

-- 4. Verificar total_pay en redpresu_budgets
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'redpresu_budgets'
--   AND column_name = 'total_pay';

-- 5. Verificar name en redpresu_companies
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'redpresu_companies'
--   AND column_name = 'name';

-- ============================================
-- DOWN: Rollback (documentar, no ejecutar)
-- ============================================

-- BEGIN;
-- ALTER TABLE public.redpresu_budget_versions RENAME COLUMN total_pay TO total_pagar;
-- ALTER TABLE public.redpresu_budgets RENAME COLUMN company_id TO empresa_id;
-- ALTER TABLE public.redpresu_budgets RENAME COLUMN total_pay TO total_pagar;
-- ALTER TABLE public.redpresu_budgets RENAME COLUMN re_apply TO re_aplica;
-- ALTER TABLE public.redpresu_companies RENAME COLUMN name TO nombre;
-- ALTER TABLE public.redpresu_tariffs RENAME COLUMN company_id TO empresa_id;
-- ALTER TABLE public.redpresu_users RENAME COLUMN company_id TO empresa_id;
-- ALTER TABLE public.redpresu_issuers RENAME COLUMN company_id TO empresa_id;
-- COMMIT;
