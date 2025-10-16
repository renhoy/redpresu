-- ============================================
-- VERIFICACIÓN: Políticas RLS en tabla issuers
-- INSTRUCCIONES:
-- 1. Abre Supabase Dashboard > SQL Editor
-- 2. Copia y pega este contenido
-- 3. Ejecuta (Run)
-- 4. Revisa qué políticas existen y cuáles faltan
-- ============================================

-- Ver TODAS las políticas de la tabla issuers
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'issuers'
ORDER BY cmd, policyname;

-- Políticas ESPERADAS (deberían existir 6):
--
-- SELECT:
--   - issuers_select_superadmin
--   - issuers_select_own_company
--
-- INSERT:
--   - issuers_insert_superadmin
--
-- UPDATE:
--   - issuers_update_own
--   - issuers_update_superadmin
--
-- DELETE:
--   - issuers_delete_policy (o similar)
--
-- ============================================
