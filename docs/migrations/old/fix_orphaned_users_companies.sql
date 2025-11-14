-- ============================================
-- Fix: Limpiar usuarios huérfanos antes de crear FK
-- ============================================
-- Algunos usuarios tienen company_id que no existe en companies
-- Necesitamos corregir esto antes de crear el foreign key
-- ============================================

BEGIN;

-- 1. Identificar usuarios con company_id huérfano
SELECT
    u.id,
    u.email,
    u.name,
    u.last_name,
    u.role,
    u.company_id as company_id_invalido,
    u.status
FROM redpresu.users u
LEFT JOIN redpresu.companies c ON u.company_id = c.id
WHERE c.id IS NULL
ORDER BY u.company_id;

-- 2. Contar cuántos usuarios huérfanos hay
SELECT COUNT(*) as usuarios_huerfanos
FROM redpresu.users u
LEFT JOIN redpresu.companies c ON u.company_id = c.id
WHERE c.id IS NULL;

-- 3. Ver qué companies existen
SELECT id, name, status, created_at
FROM redpresu.companies
ORDER BY id;

-- ============================================
-- DECISIÓN: ¿Qué hacer con los usuarios huérfanos?
-- ============================================
-- Opción A: Asignarlos a company_id = 1 (Demo)
-- Opción B: Crear las companies faltantes
-- Opción C: Eliminar los usuarios huérfanos (si son datos de prueba)
-- ============================================

-- OPCIÓN A: Asignar usuarios huérfanos a company_id = 1 (Demo)
-- Descomentar si quieres usar esta opción:
/*
UPDATE redpresu.users u
SET company_id = 1
WHERE NOT EXISTS (
    SELECT 1 FROM redpresu.companies c WHERE c.id = u.company_id
);
*/

-- OPCIÓN B: Crear las companies faltantes
-- Descomentar y ajustar si quieres crear las empresas:
/*
INSERT INTO redpresu.companies (id, name, status, created_at, updated_at)
SELECT DISTINCT
    u.company_id,
    'Empresa ' || u.company_id,
    'active',
    NOW(),
    NOW()
FROM redpresu.users u
WHERE NOT EXISTS (
    SELECT 1 FROM redpresu.companies c WHERE c.id = u.company_id
);
*/

-- OPCIÓN C: Eliminar usuarios huérfanos (CUIDADO: destructivo)
-- Solo usar si son datos de prueba
/*
DELETE FROM redpresu.users u
WHERE NOT EXISTS (
    SELECT 1 FROM redpresu.companies c WHERE c.id = u.company_id
);
*/

ROLLBACK; -- Por ahora hacemos ROLLBACK para solo ver los datos

-- ============================================
-- DESPUÉS DE DECIDIR
-- ============================================
-- 1. Copia este script
-- 2. Comenta el ROLLBACK de arriba y pon COMMIT
-- 3. Descomenta la opción que quieras usar (A, B o C)
-- 4. Ejecuta el script
-- 5. Luego ejecuta fix_users_company_fk.sql
-- ============================================
