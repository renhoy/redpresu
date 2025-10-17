-- ============================================
-- Migración 031: Renombrar tablas y campos a inglés
-- ============================================
-- Descripción: Unificar nomenclatura de tablas y campos a inglés
--              para evitar inconsistencias español/inglés
-- Fecha: 2025-01-17
-- Bloque: Fase 2 - Refactoring nomenclatura
-- ============================================

BEGIN;

-- ============================================
-- PASO 1: Renombrar CAMPOS en tablas existentes
-- ============================================

-- Tabla: budget_versions
ALTER TABLE public.budget_versions
  RENAME COLUMN total_pagar TO total_pay;

COMMENT ON COLUMN public.budget_versions.total_pay IS
  'Total a pagar (con IVA, IRPF y RE aplicados)';

-- Tabla: budgets
ALTER TABLE public.budgets
  RENAME COLUMN empresa_id TO company_id;

ALTER TABLE public.budgets
  RENAME COLUMN total_pagar TO total_pay;

ALTER TABLE public.budgets
  RENAME COLUMN re_aplica TO re_apply;

COMMENT ON COLUMN public.budgets.company_id IS
  'ID de la empresa (company)';

COMMENT ON COLUMN public.budgets.total_pay IS
  'Total a pagar (con IVA, IRPF y RE aplicados)';

COMMENT ON COLUMN public.budgets.re_apply IS
  'Indica si se aplica Recargo de Equivalencia';

-- Tabla: empresas
ALTER TABLE public.empresas
  RENAME COLUMN nombre TO name;

COMMENT ON COLUMN public.empresas.name IS
  'Nombre de la empresa';

-- Tabla: tariffs
ALTER TABLE public.tariffs
  RENAME COLUMN empresa_id TO company_id;

COMMENT ON COLUMN public.tariffs.company_id IS
  'ID de la empresa (company)';

-- ============================================
-- PASO 2: Renombrar TABLAS con prefijo redpresu_
-- ============================================

-- Orden importante: primero las que no tienen dependencias FK complejas

ALTER TABLE public.config
  RENAME TO redpresu_config;

ALTER TABLE public.empresas
  RENAME TO redpresu_companies;

ALTER TABLE public.users
  RENAME TO redpresu_users;

ALTER TABLE public.issuers
  RENAME TO redpresu_issuers;

ALTER TABLE public.tariffs
  RENAME TO redpresu_tariffs;

ALTER TABLE public.budgets
  RENAME TO redpresu_budgets;

ALTER TABLE public.budget_versions
  RENAME TO redpresu_budget_versions;

ALTER TABLE public.budget_notes
  RENAME TO redpresu_budget_notes;

-- ============================================
-- PASO 3: Actualizar COMENTARIOS de tablas
-- ============================================

COMMENT ON TABLE public.redpresu_config IS
  'Configuración global del sistema';

COMMENT ON TABLE public.redpresu_companies IS
  'Empresas del sistema multi-tenant';

COMMENT ON TABLE public.redpresu_users IS
  'Usuarios del sistema con roles y empresa asignada';

COMMENT ON TABLE public.redpresu_issuers IS
  'Datos fiscales de emisores (empresa o autónomo) para facturación';

COMMENT ON TABLE public.redpresu_tariffs IS
  'Tarifas con estructura jerárquica (capítulos, subcapítulos, partidas)';

COMMENT ON TABLE public.redpresu_budgets IS
  'Presupuestos generados a partir de tarifas con datos de cliente';

COMMENT ON TABLE public.redpresu_budget_versions IS
  'Historial de versiones de presupuestos';

COMMENT ON TABLE public.redpresu_budget_notes IS
  'Notas y comentarios asociados a presupuestos';

-- ============================================
-- PASO 4: Actualizar ÍNDICES (renombrar automáticamente)
-- ============================================

-- Los índices se renombran automáticamente al renombrar las tablas
-- PostgreSQL añade el prefijo de la nueva tabla

-- ============================================
-- PASO 5: ELIMINAR POLÍTICAS RLS que dependen de funciones
-- ============================================

-- IMPORTANTE: Debemos eliminar las políticas ANTES de modificar las funciones
-- porque las políticas dependen de las funciones

-- Eliminar políticas de redpresu_users (antes: users)
DROP POLICY IF EXISTS users_select_policy ON public.redpresu_users;
DROP POLICY IF EXISTS users_insert_policy ON public.redpresu_users;
DROP POLICY IF EXISTS users_update_policy ON public.redpresu_users;
DROP POLICY IF EXISTS users_delete_policy ON public.redpresu_users;

-- Eliminar políticas de redpresu_tariffs (antes: tariffs)
DROP POLICY IF EXISTS tariffs_select_policy ON public.redpresu_tariffs;
DROP POLICY IF EXISTS tariffs_insert_policy ON public.redpresu_tariffs;
DROP POLICY IF EXISTS tariffs_update_policy ON public.redpresu_tariffs;
DROP POLICY IF EXISTS tariffs_delete_policy ON public.redpresu_tariffs;

-- Eliminar políticas de redpresu_budgets (antes: budgets)
DROP POLICY IF EXISTS budgets_select_policy ON public.redpresu_budgets;
DROP POLICY IF EXISTS budgets_insert_policy ON public.redpresu_budgets;
DROP POLICY IF EXISTS budgets_update_policy ON public.redpresu_budgets;
DROP POLICY IF EXISTS budgets_delete_policy ON public.redpresu_budgets;

-- ============================================
-- PASO 6: Actualizar FUNCIONES que referencian tablas
-- ============================================

-- Función: get_next_budget_version_number
-- DROP y recrear para evitar error de parámetros
DROP FUNCTION IF EXISTS public.get_next_budget_version_number(uuid);

CREATE FUNCTION public.get_next_budget_version_number(p_parent_budget_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_max_version integer;
BEGIN
  SELECT COALESCE(MAX(version_number), 0) + 1
  INTO v_max_version
  FROM public.redpresu_budgets
  WHERE parent_budget_id = p_parent_budget_id;

  RETURN v_max_version;
END;
$$;

COMMENT ON FUNCTION public.get_next_budget_version_number(uuid) IS
  'Obtiene el siguiente número de versión para un presupuesto hijo';

-- Función: get_user_empresa_id (mantener nombre, actualizar implementación)
-- NOTA: Mantenemos el nombre get_user_empresa_id para compatibilidad con políticas RLS
DROP FUNCTION IF EXISTS public.get_user_empresa_id(uuid) CASCADE;

CREATE FUNCTION public.get_user_empresa_id(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_company_id integer;
BEGIN
  SELECT company_id
  INTO v_company_id
  FROM public.redpresu_users
  WHERE id = p_user_id;

  RETURN v_company_id;
END;
$$;

COMMENT ON FUNCTION public.get_user_empresa_id(uuid) IS
  'Obtiene el company_id de un usuario dado su user_id (nombre mantenido para compatibilidad)';

-- Función: get_user_role_by_id
DROP FUNCTION IF EXISTS public.get_user_role_by_id(uuid) CASCADE;

CREATE FUNCTION public.get_user_role_by_id(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_role text;
BEGIN
  SELECT role
  INTO v_role
  FROM public.redpresu_users
  WHERE id = p_user_id;

  RETURN v_role;
END;
$$;

COMMENT ON FUNCTION public.get_user_role_by_id(uuid) IS
  'Obtiene el rol de un usuario dado su user_id';

-- ============================================
-- PASO 7: Verificar RLS activo en todas las tablas
-- ============================================

ALTER TABLE public.redpresu_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.redpresu_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.redpresu_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.redpresu_issuers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.redpresu_tariffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.redpresu_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.redpresu_budget_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.redpresu_budget_notes ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PASO 8: Recrear POLÍTICAS RLS con nuevos nombres de tablas y columnas
-- ============================================

-- redpresu_users: Recrear políticas
CREATE POLICY users_select_policy
ON public.redpresu_users
FOR SELECT
USING (
  id = auth.uid()
  OR
  public.get_user_role_by_id(auth.uid()) IN ('admin', 'superadmin')
);

CREATE POLICY users_insert_policy
ON public.redpresu_users
FOR INSERT
WITH CHECK (
  public.get_user_role_by_id(auth.uid()) = 'superadmin'
);

CREATE POLICY users_update_policy
ON public.redpresu_users
FOR UPDATE
USING (
  id = auth.uid()
  OR
  public.get_user_role_by_id(auth.uid()) IN ('admin', 'superadmin')
)
WITH CHECK (
  id = auth.uid()
  OR
  public.get_user_role_by_id(auth.uid()) IN ('admin', 'superadmin')
);

CREATE POLICY users_delete_policy
ON public.redpresu_users
FOR DELETE
USING (
  public.get_user_role_by_id(auth.uid()) = 'superadmin'
);

-- redpresu_tariffs: Recrear políticas

CREATE POLICY tariffs_select_policy
ON public.redpresu_tariffs
FOR SELECT
USING (
  company_id = public.get_user_empresa_id(auth.uid())
);

CREATE POLICY tariffs_insert_policy
ON public.redpresu_tariffs
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND company_id = public.get_user_empresa_id(auth.uid())
  AND user_id = auth.uid()
);

CREATE POLICY tariffs_update_policy
ON public.redpresu_tariffs
FOR UPDATE
USING (
  user_id = auth.uid()
  OR
  (
    public.get_user_role_by_id(auth.uid()) IN ('admin', 'superadmin')
    AND company_id = public.get_user_empresa_id(auth.uid())
  )
)
WITH CHECK (
  user_id = auth.uid()
  OR
  (
    public.get_user_role_by_id(auth.uid()) IN ('admin', 'superadmin')
    AND company_id = public.get_user_empresa_id(auth.uid())
  )
);

CREATE POLICY tariffs_delete_policy
ON public.redpresu_tariffs
FOR DELETE
USING (
  public.get_user_role_by_id(auth.uid()) IN ('admin', 'superadmin')
  AND company_id = public.get_user_empresa_id(auth.uid())
);

-- redpresu_budgets: Recrear políticas
CREATE POLICY budgets_select_policy
ON public.redpresu_budgets
FOR SELECT
USING (
  company_id = public.get_user_empresa_id(auth.uid())
  OR
  public.get_user_role_by_id(auth.uid()) = 'superadmin'
);

CREATE POLICY budgets_insert_policy
ON public.redpresu_budgets
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND user_id = auth.uid()
);

CREATE POLICY budgets_update_policy
ON public.redpresu_budgets
FOR UPDATE
USING (
  user_id = auth.uid()
  OR
  (
    public.get_user_role_by_id(auth.uid()) IN ('admin', 'superadmin')
    AND company_id = public.get_user_empresa_id(auth.uid())
  )
)
WITH CHECK (
  user_id = auth.uid()
  OR
  (
    public.get_user_role_by_id(auth.uid()) IN ('admin', 'superadmin')
    AND company_id = public.get_user_empresa_id(auth.uid())
  )
);

CREATE POLICY budgets_delete_policy
ON public.redpresu_budgets
FOR DELETE
USING (
  public.get_user_role_by_id(auth.uid()) IN ('admin', 'superadmin')
  AND company_id = public.get_user_empresa_id(auth.uid())
);

COMMIT;

-- ============================================
-- DOWN: Rollback (documentar, no ejecutar)
-- ============================================

-- PASO 1: Renombrar tablas a nombres originales
-- ALTER TABLE public.redpresu_config RENAME TO config;
-- ALTER TABLE public.redpresu_companies RENAME TO empresas;
-- ALTER TABLE public.redpresu_users RENAME TO users;
-- ALTER TABLE public.redpresu_issuers RENAME TO issuers;
-- ALTER TABLE public.redpresu_tariffs RENAME TO tariffs;
-- ALTER TABLE public.redpresu_budgets RENAME TO budgets;
-- ALTER TABLE public.redpresu_budget_versions RENAME TO budget_versions;
-- ALTER TABLE public.redpresu_budget_notes RENAME TO budget_notes;

-- PASO 2: Renombrar campos a nombres originales
-- ALTER TABLE public.budget_versions RENAME COLUMN total_pay TO total_pagar;
-- ALTER TABLE public.budgets RENAME COLUMN company_id TO empresa_id;
-- ALTER TABLE public.budgets RENAME COLUMN total_pay TO total_pagar;
-- ALTER TABLE public.budgets RENAME COLUMN re_apply TO re_aplica;
-- ALTER TABLE public.empresas RENAME COLUMN name TO nombre;
-- ALTER TABLE public.tariffs RENAME COLUMN company_id TO empresa_id;

-- PASO 3: Recrear función get_user_empresa_id
-- CREATE OR REPLACE FUNCTION public.get_user_empresa_id(p_user_id uuid) ...
-- DROP FUNCTION public.get_user_empresa_id(uuid);
