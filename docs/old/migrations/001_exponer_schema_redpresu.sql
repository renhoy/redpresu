-- ============================================
-- Migración 001: Exponer Schema redpresu en PostgREST
-- ============================================
-- PostgREST solo expone los schemas configurados explícitamente
-- Por defecto: public, storage, graphql_public
-- Necesitamos añadir 'redpresu' a la lista
--
-- IMPORTANTE: Ejecutar en Supabase Studio (SQL Editor)
-- Después de ejecutar, esperar 1-2 minutos para que PostgREST se recargue
-- ============================================

-- Opción A: Configurar schemas expuestos (Si tienes permisos de superuser)
ALTER DATABASE postgres SET "app.settings.db_schema" = 'redpresu, public, storage';

-- Notificar a PostgREST que recargue la configuración
NOTIFY pgrst, 'reload config';

-- ============================================
-- Verificación
-- ============================================
-- Ejecutar esto para verificar que se aplicó:
-- SHOW "app.settings.db_schema";
-- Debería devolver: redpresu, public, storage

-- ============================================
-- ALTERNATIVA: Si el ALTER DATABASE no funciona
-- ============================================
-- En algunos entornos de Supabase Cloud, puede que necesites
-- contactar soporte para exponer schemas adicionales.
--
-- Otra opción es usar search_path (menos recomendado):
-- ALTER ROLE authenticator SET search_path TO redpresu, public;
-- ALTER ROLE anon SET search_path TO redpresu, public;
-- ALTER ROLE authenticated SET search_path TO redpresu, public;
-- ALTER ROLE service_role SET search_path TO redpresu, public;

-- ============================================
-- ROLLBACK (Si necesitas revertir)
-- ============================================
-- ALTER DATABASE postgres SET "app.settings.db_schema" = 'public, storage';
-- NOTIFY pgrst, 'reload config';
