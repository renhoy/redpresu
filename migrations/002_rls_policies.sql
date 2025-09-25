-- =====================================================
-- MIGRACIÓN 002: Políticas RLS (Row Level Security)
-- =====================================================
-- Configuración de seguridad a nivel de fila por roles
-- Fecha: 2024-09-25
-- Descripción: Políticas de acceso por rol (superadmin, admin, vendedor)

-- =====================================================
-- FUNCIÓN HELPER: get_user_role()
-- =====================================================
-- Función que obtiene el rol del usuario autenticado
-- Utilizada por todas las políticas RLS para verificar permisos
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT role
  FROM public.users
  WHERE id = auth.uid()
  LIMIT 1;
$$;

-- Comentario para la función helper
COMMENT ON FUNCTION public.get_user_role() IS 'Obtiene el rol del usuario autenticado para uso en políticas RLS';

-- =====================================================
-- HABILITAR RLS EN TODAS LAS TABLAS
-- =====================================================
-- Activar Row Level Security en todas las tablas principales

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tariffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- POLÍTICAS RLS PARA TABLA: users
-- =====================================================

-- SELECT: Superadmin ve todos, admin y vendedor solo sus propios datos
CREATE POLICY "users_select_policy" ON public.users
FOR SELECT
USING (
  CASE
    WHEN public.get_user_role() = 'superadmin' THEN true
    WHEN public.get_user_role() IN ('admin', 'vendedor') THEN auth.uid() = id
    ELSE false
  END
);

-- INSERT: Solo superadmin puede crear usuarios
CREATE POLICY "users_insert_policy" ON public.users
FOR INSERT
WITH CHECK (
  public.get_user_role() = 'superadmin'
);

-- UPDATE: Superadmin actualiza todos, admin y vendedor solo sus propios datos
CREATE POLICY "users_update_policy" ON public.users
FOR UPDATE
USING (
  CASE
    WHEN public.get_user_role() = 'superadmin' THEN true
    WHEN public.get_user_role() IN ('admin', 'vendedor') THEN auth.uid() = id
    ELSE false
  END
)
WITH CHECK (
  CASE
    WHEN public.get_user_role() = 'superadmin' THEN true
    WHEN public.get_user_role() IN ('admin', 'vendedor') THEN auth.uid() = id
    ELSE false
  END
);

-- DELETE: Solo superadmin puede eliminar usuarios
CREATE POLICY "users_delete_policy" ON public.users
FOR DELETE
USING (
  public.get_user_role() = 'superadmin'
);

-- =====================================================
-- POLÍTICAS RLS PARA TABLA: tariffs
-- =====================================================

-- SELECT: Superadmin ve todas, admin ve de su empresa, vendedor solo activas de su empresa
CREATE POLICY "tariffs_select_policy" ON public.tariffs
FOR SELECT
USING (
  CASE
    WHEN public.get_user_role() = 'superadmin' THEN true
    WHEN public.get_user_role() = 'admin' THEN empresa_id = 1
    WHEN public.get_user_role() = 'vendedor' THEN empresa_id = 1 AND status = 'Activa'
    ELSE false
  END
);

-- INSERT: Superadmin y admin pueden crear tarifas
CREATE POLICY "tariffs_insert_policy" ON public.tariffs
FOR INSERT
WITH CHECK (
  CASE
    WHEN public.get_user_role() = 'superadmin' THEN true
    WHEN public.get_user_role() = 'admin' THEN empresa_id = 1
    ELSE false
  END
);

-- UPDATE: Superadmin y admin pueden actualizar tarifas de su empresa
CREATE POLICY "tariffs_update_policy" ON public.tariffs
FOR UPDATE
USING (
  CASE
    WHEN public.get_user_role() = 'superadmin' THEN true
    WHEN public.get_user_role() = 'admin' THEN empresa_id = 1
    ELSE false
  END
)
WITH CHECK (
  CASE
    WHEN public.get_user_role() = 'superadmin' THEN true
    WHEN public.get_user_role() = 'admin' THEN empresa_id = 1
    ELSE false
  END
);

-- DELETE: Superadmin y admin pueden eliminar tarifas de su empresa
CREATE POLICY "tariffs_delete_policy" ON public.tariffs
FOR DELETE
USING (
  CASE
    WHEN public.get_user_role() = 'superadmin' THEN true
    WHEN public.get_user_role() = 'admin' THEN empresa_id = 1
    ELSE false
  END
);

-- =====================================================
-- POLÍTICAS RLS PARA TABLA: budgets
-- =====================================================

-- SELECT: Superadmin ve todos, admin ve de su empresa, vendedor solo los suyos de su empresa
CREATE POLICY "budgets_select_policy" ON public.budgets
FOR SELECT
USING (
  CASE
    WHEN public.get_user_role() = 'superadmin' THEN true
    WHEN public.get_user_role() = 'admin' THEN empresa_id = 1
    WHEN public.get_user_role() = 'vendedor' THEN empresa_id = 1 AND user_id = auth.uid()
    ELSE false
  END
);

-- INSERT: Superadmin, admin y vendedor pueden crear presupuestos
CREATE POLICY "budgets_insert_policy" ON public.budgets
FOR INSERT
WITH CHECK (
  CASE
    WHEN public.get_user_role() = 'superadmin' THEN true
    WHEN public.get_user_role() = 'admin' THEN empresa_id = 1
    WHEN public.get_user_role() = 'vendedor' THEN empresa_id = 1 AND user_id = auth.uid()
    ELSE false
  END
);

-- UPDATE: Superadmin y admin pueden actualizar todos de su empresa, vendedor solo los suyos
CREATE POLICY "budgets_update_policy" ON public.budgets
FOR UPDATE
USING (
  CASE
    WHEN public.get_user_role() = 'superadmin' THEN true
    WHEN public.get_user_role() = 'admin' THEN empresa_id = 1
    WHEN public.get_user_role() = 'vendedor' THEN empresa_id = 1 AND user_id = auth.uid()
    ELSE false
  END
)
WITH CHECK (
  CASE
    WHEN public.get_user_role() = 'superadmin' THEN true
    WHEN public.get_user_role() = 'admin' THEN empresa_id = 1
    WHEN public.get_user_role() = 'vendedor' THEN empresa_id = 1 AND user_id = auth.uid()
    ELSE false
  END
);

-- DELETE: Superadmin y admin pueden eliminar presupuestos de su empresa, vendedor solo los suyos
CREATE POLICY "budgets_delete_policy" ON public.budgets
FOR DELETE
USING (
  CASE
    WHEN public.get_user_role() = 'superadmin' THEN true
    WHEN public.get_user_role() = 'admin' THEN empresa_id = 1
    WHEN public.get_user_role() = 'vendedor' THEN empresa_id = 1 AND user_id = auth.uid()
    ELSE false
  END
);

-- =====================================================
-- COMENTARIOS SOBRE LAS POLÍTICAS
-- =====================================================

-- Comentarios para las políticas de users
COMMENT ON POLICY "users_select_policy" ON public.users IS 'Superadmin ve todos los usuarios, admin y vendedor solo sus propios datos';
COMMENT ON POLICY "users_insert_policy" ON public.users IS 'Solo superadmin puede crear nuevos usuarios';
COMMENT ON POLICY "users_update_policy" ON public.users IS 'Superadmin actualiza cualquier usuario, admin y vendedor solo sus propios datos';
COMMENT ON POLICY "users_delete_policy" ON public.users IS 'Solo superadmin puede eliminar usuarios';

-- Comentarios para las políticas de tariffs
COMMENT ON POLICY "tariffs_select_policy" ON public.tariffs IS 'Superadmin ve todas, admin ve de su empresa, vendedor solo activas de su empresa';
COMMENT ON POLICY "tariffs_insert_policy" ON public.tariffs IS 'Superadmin y admin pueden crear tarifas';
COMMENT ON POLICY "tariffs_update_policy" ON public.tariffs IS 'Superadmin y admin pueden actualizar tarifas de su empresa';
COMMENT ON POLICY "tariffs_delete_policy" ON public.tariffs IS 'Superadmin y admin pueden eliminar tarifas de su empresa';

-- Comentarios para las políticas de budgets
COMMENT ON POLICY "budgets_select_policy" ON public.budgets IS 'Superadmin ve todos, admin ve de su empresa, vendedor solo los suyos de su empresa';
COMMENT ON POLICY "budgets_insert_policy" ON public.budgets IS 'Todos los roles pueden crear presupuestos con sus restricciones';
COMMENT ON POLICY "budgets_update_policy" ON public.budgets IS 'Superadmin y admin pueden actualizar todos de su empresa, vendedor solo los suyos';
COMMENT ON POLICY "budgets_delete_policy" ON public.budgets IS 'Superadmin y admin pueden eliminar de su empresa, vendedor solo los suyos';

-- =====================================================
-- NOTAS TÉCNICAS SOBRE LAS POLÍTICAS
-- =====================================================
--
-- ROLES Y PERMISOS:
--
-- SUPERADMIN:
--   - Acceso total a todas las tablas y operaciones
--   - Puede gestionar usuarios, tarifas y presupuestos sin restricciones
--   - Único rol que puede crear/eliminar usuarios
--
-- ADMIN:
--   - Acceso completo a su empresa (empresa_id = 1)
--   - Puede gestionar tarifas y presupuestos de su empresa
--   - Puede actualizar sus propios datos de usuario
--   - No puede crear/eliminar usuarios
--
-- VENDEDOR:
--   - Solo puede ver tarifas activas de su empresa
--   - Solo puede gestionar sus propios presupuestos
--   - Puede actualizar sus propios datos de usuario
--   - No puede gestionar tarifas ni otros presupuestos
--
-- EMPRESA_ID:
--   - En el MVP siempre es 1, pero las políticas están preparadas para multi-tenant
--   - Las políticas verifican empresa_id = 1 para admin y vendedor
--   - Superadmin puede acceder a cualquier empresa_id
--
-- FUNCIÓN get_user_role():
--   - Se ejecuta con SECURITY DEFINER para acceso a tabla users
--   - Marcada como STABLE para optimización de consultas
--   - Retorna NULL si el usuario no existe en la tabla users
--