-- ============================================
-- Migration 041: Optimize get_user_role_by_id function
-- ============================================
-- Descripción: Optimizar función para cacheo y reducir lentitud en políticas RLS
-- Fecha: 2025-01-27
-- Problema: Función se ejecuta muchas veces sin cacheo, causando lentitud de 12-14s
-- Solución: Marcar como STABLE para permitir cacheo durante la transacción
-- ============================================

-- Recrear función con STABLE para permitir cacheo
CREATE OR REPLACE FUNCTION public.get_user_role_by_id(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE  -- ← CRÍTICO: permite cacheo durante la transacción
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

-- Añadir comentario explicativo
COMMENT ON FUNCTION public.get_user_role_by_id(uuid) IS
'Obtiene el rol de un usuario. Marcada como STABLE para permitir cacheo durante transacciones y mejorar performance en políticas RLS.';

-- ============================================
-- COMPLETADO
-- ============================================
-- Verificar con:
-- EXPLAIN ANALYZE SELECT * FROM redpresu_users WHERE id = auth.uid();
