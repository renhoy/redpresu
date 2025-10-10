-- ============================================
-- EJECUTAR MIGRACIÓN 019: Sistema de notas para presupuestos
-- ============================================

-- Copiar y pegar este código en el SQL Editor de Supabase:

-- 1. Crear tabla budget_notes
CREATE TABLE IF NOT EXISTS public.budget_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id UUID NOT NULL REFERENCES public.budgets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Índices para optimizar queries
CREATE INDEX IF NOT EXISTS idx_budget_notes_budget_id ON public.budget_notes(budget_id);
CREATE INDEX IF NOT EXISTS idx_budget_notes_user_id ON public.budget_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_budget_notes_created_at ON public.budget_notes(created_at DESC);

-- 3. Trigger para updated_at
CREATE OR REPLACE FUNCTION update_budget_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER budget_notes_updated_at
  BEFORE UPDATE ON public.budget_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_budget_notes_updated_at();

-- 4. Habilitar RLS
ALTER TABLE public.budget_notes ENABLE ROW LEVEL SECURITY;

-- 5. Eliminar policies existentes si existen (para re-ejecución limpia)
DROP POLICY IF EXISTS "budget_notes_select_policy" ON public.budget_notes;
DROP POLICY IF EXISTS "budget_notes_insert_policy" ON public.budget_notes;
DROP POLICY IF EXISTS "budget_notes_update_policy" ON public.budget_notes;
DROP POLICY IF EXISTS "budget_notes_delete_policy" ON public.budget_notes;

-- 6. Policies RLS
-- SELECT: usuarios pueden ver notas de presupuestos de su empresa
CREATE POLICY "budget_notes_select_policy"
ON public.budget_notes FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.budgets b
    INNER JOIN public.users u ON b.user_id = u.id
    WHERE b.id = budget_notes.budget_id
    AND u.empresa_id = (
      SELECT empresa_id FROM public.users WHERE id = auth.uid()
    )
  )
);

-- INSERT: usuarios autenticados pueden crear notas
CREATE POLICY "budget_notes_insert_policy"
ON public.budget_notes FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.budgets b
    INNER JOIN public.users u ON b.user_id = u.id
    WHERE b.id = budget_id
    AND u.empresa_id = (
      SELECT empresa_id FROM public.users WHERE id = auth.uid()
    )
  )
);

-- UPDATE: solo el creador puede editar sus notas
CREATE POLICY "budget_notes_update_policy"
ON public.budget_notes FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- DELETE: solo el creador o superadmin pueden eliminar
CREATE POLICY "budget_notes_delete_policy"
ON public.budget_notes FOR DELETE
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND role = 'superadmin'
  )
);

-- 7. Verificar que se creó correctamente
SELECT
  'Tabla budget_notes creada' as status,
  COUNT(*) as policy_count
FROM pg_policies
WHERE tablename = 'budget_notes';

-- ============================================
-- NOTAS:
-- ============================================
-- - Esta migración crea el sistema de bitácora/notas para presupuestos
-- - Cada nota está asociada a un presupuesto y un usuario
-- - Las policies RLS garantizan aislamiento multi-tenant por empresa
-- - Solo el creador puede editar sus notas
-- - Solo el creador o superadmin pueden eliminar notas
