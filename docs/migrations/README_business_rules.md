# Migración: Sistema de Reglas de Negocio

## Descripción

Esta migración crea el sistema de reglas de negocio configurables para Redpresu.

## Archivos

- `create_business_rules.sql` - Crea tablas, índices, RLS policies y triggers

## Tablas Creadas

1. **`redpresu.business_rules`**
   - Almacena las reglas de negocio en formato JSONB
   - Incluye versionado y rollback
   - Restricción: solo 1 regla activa por company_id

2. **`redpresu.rules_audit_log`**
   - Log de auditoría de todos los cambios
   - Registra quién, cuándo y qué cambió
   - Incluye IP y user-agent para trazabilidad

## RLS Policies

### business_rules
- **Superadmin**: Acceso completo (CRUD)
- **Usuarios normales**: Solo lectura de reglas de su propia empresa

### rules_audit_log
- **Superadmin**: Solo lectura del audit log
- **Usuarios normales**: Sin acceso

## Triggers

1. **update_business_rules_updated_at**: Actualiza `updated_at` automáticamente
2. **audit_business_rules_changes**: Registra todos los cambios en `rules_audit_log`

## Cómo Ejecutar

### Opción 1: Supabase Studio (Recomendado)

1. Ir a: https://supabase.com/dashboard
2. Seleccionar tu proyecto Redpresu
3. Ir a: **SQL Editor**
4. Crear nueva query
5. Copiar y pegar el contenido de `create_business_rules.sql`
6. Ejecutar (Run)
7. Verificar que no hay errores

### Opción 2: CLI de Supabase

```bash
# Si tienes Supabase CLI instalado
supabase db reset --db-url "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres"

# O aplicar solo esta migración
psql "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres" -f docs/migrations/create_business_rules.sql
```

### Opción 3: Cliente PostgreSQL

```bash
psql -h [HOST] -U postgres -d postgres -f docs/migrations/create_business_rules.sql
```

## Verificación

Después de ejecutar, verifica que todo está correcto:

```sql
-- Verificar tablas creadas
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'redpresu'
AND table_name IN ('business_rules', 'rules_audit_log');

-- Verificar RLS habilitado
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'redpresu'
AND tablename IN ('business_rules', 'rules_audit_log');

-- Verificar policies
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE schemaname = 'redpresu'
AND tablename IN ('business_rules', 'rules_audit_log');

-- Verificar triggers
SELECT trigger_name, event_object_table, action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'redpresu'
AND event_object_table = 'business_rules';

-- Verificar índices
SELECT tablename, indexname
FROM pg_indexes
WHERE schemaname = 'redpresu'
AND tablename IN ('business_rules', 'rules_audit_log');
```

## Rollback

Si necesitas revertir la migración:

```sql
-- Eliminar triggers
DROP TRIGGER IF EXISTS audit_business_rules_changes ON redpresu.business_rules;
DROP TRIGGER IF EXISTS update_business_rules_updated_at ON redpresu.business_rules;

-- Eliminar función
DROP FUNCTION IF EXISTS log_business_rules_changes();

-- Eliminar tablas (CASCADE elimina todo)
DROP TABLE IF EXISTS redpresu.rules_audit_log CASCADE;
DROP TABLE IF EXISTS redpresu.business_rules CASCADE;
```

## Próximos Pasos

Después de ejecutar esta migración:

1. ✅ Verificar que las tablas existen en Supabase Studio
2. ✅ Probar insertar una regla de prueba manualmente
3. ✅ Verificar que el trigger de auditoría funciona
4. ⏭️ Continuar con Día 2: Servicio de Email y Motor de Evaluación

## Notas Importantes

- **Prerequisito**: La función `update_updated_at_column()` debe existir (debería estar en migraciones anteriores)
- **Schema**: Todo se crea en el schema `redpresu`
- **Superadmin**: El sistema asume que ya existe el rol 'superadmin' en la tabla `users`
- **Constraint unique**: Solo puede haber UNA regla activa (`is_active=true`) por `company_id`

## Estructura JSONB de `rules`

```json
{
  "version": 1,
  "updated_at": "2025-11-14T10:00:00Z",
  "updated_by": "email@example.com",
  "rules": [
    {
      "id": "limit-users-pro",
      "name": "Límite de usuarios en plan PRO",
      "description": "Plan PRO permite máximo 5 usuarios",
      "active": true,
      "priority": 10,
      "condition": {
        "and": [
          { "==": [{ "var": "plan" }, "PRO"] },
          { ">=": [{ "var": "users_count" }, 5] }
        ]
      },
      "action": {
        "allow": false,
        "message": "Plan PRO: máximo 5 usuarios"
      }
    }
  ]
}
```

## Soporte

Si encuentras problemas:
1. Verificar que el schema `redpresu` existe
2. Verificar que la función `update_updated_at_column()` existe
3. Verificar permisos del usuario de PostgreSQL
4. Revisar logs de Supabase para errores detallados
