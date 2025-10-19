-- SCRIPT DE EJECUCIÓN: migrations/031_add_multiempresa_config.sql
-- Ejecutar desde psql o cliente de Supabase

-- Ver el contenido de la migración:
\i migrations/031_add_multiempresa_config.sql

-- Verificar que se creó correctamente:
SELECT key, value, description, category, is_system, created_at, updated_at
FROM public.config
WHERE key = 'multiempresa';

-- Resultado esperado:
-- key           | value | description                                                           | category | is_system | created_at | updated_at
-- multiempresa  | true  | Modo de operación: true=multiempresa (SaaS), false=monoempresa (...) | general  | true      | ...        | ...
