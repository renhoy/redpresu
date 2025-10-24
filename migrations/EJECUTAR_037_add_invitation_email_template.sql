-- migrations/EJECUTAR_037_add_invitation_email_template.sql
-- Para ejecutar en interfaz web de Supabase (idempotente)
-- Descripción: Añadir configuración para plantilla de email de invitación
-- Fecha: 2025-10-24
-- Bloque: 1 (Usuarios y Seguridad)
-- Fase: 2

-- ============================================
-- UP: Aplicar cambios
-- ============================================

-- Insertar configuración de plantilla de email de invitación
INSERT INTO public.config (key, value, description, category, is_system)
VALUES (
  'invitation_email_template',
  '"Has sido invitado al Sistema de Presupuestos.\n\nPor favor, accede al siguiente enlace para configurar tu contraseña y activar tu cuenta:\n\n{{invitationUrl}}\n\nEste enlace es válido por 7 días.\n\n---\nSi no solicitaste esta invitación, puedes ignorar este mensaje."'::jsonb,
  'Plantilla del mensaje de email para invitaciones. Usa {{invitationUrl}} como variable para el enlace con token',
  'usuarios',
  false
)
ON CONFLICT (key) DO UPDATE
SET
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  updated_at = NOW();

-- ============================================
-- VERIFICACIÓN POST-MIGRACIÓN
-- ============================================
--
-- Ver la configuración creada:
-- SELECT key, value, description, category, is_system, created_at
-- FROM public.config
-- WHERE key = 'invitation_email_template';
--
-- ============================================
