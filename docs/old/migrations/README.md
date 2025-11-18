# Migraciones de Base de Datos - Redpresu

Este directorio contiene las migraciones SQL para la base de datos de Redpresu.

## Estructura

```
docs/migrations/
├── README.md                           # Este archivo
├── 000_create_schema_redpresu.sql      # Migración base: creación del schema
├── 001_exponer_schema_redpresu.sql     # Migración base: exposición del schema
├── create_business_rules.sql           # Sistema de reglas de negocio configurables
├── README_business_rules.md            # Documentación del sistema de business rules
└── old/                                # Migraciones antiguas, fixes y diagnósticos
    ├── diagnose_*.sql
    ├── fix_*.sql
    └── create_superadmin_*.sql
```

## Migraciones Activas

### Migraciones Base (Orden de ejecución)

1. **000_create_schema_redpresu.sql**
   - Crea el schema `redpresu`
   - Configura permisos básicos
   - Estado: ✅ Ejecutado en producción

2. **001_exponer_schema_redpresu.sql**
   - Expone el schema al público
   - Configura acceso para la aplicación
   - Estado: ✅ Ejecutado en producción

### Sistema de Reglas de Negocio (Nuevo)

3. **create_business_rules.sql**
   - Crea tablas: `business_rules` y `rules_audit_log`
   - Implementa RLS policies para superadmin
   - Agrega triggers de auditoría automática
   - Estado: ⏳ Pendiente de ejecutar
   - Documentación: Ver `README_business_rules.md`

## Directorio `old/`

Contiene migraciones históricas, fixes puntuales y scripts de diagnóstico que ya fueron ejecutados o son obsoletos:

- **Diagnósticos**: Scripts para analizar referencias y triggers
- **Fixes**: Correcciones de foreign keys, usuarios huérfanos, etc.
- **Superadmin**: Scripts de creación de usuarios superadmin

**Nota**: Estos archivos se mantienen para referencia histórica pero no deben ejecutarse en nuevas instalaciones.

## Cómo Ejecutar Migraciones

### Opción 1: Supabase Studio (Recomendado)

1. Ir a: https://supabase.com/dashboard
2. Seleccionar proyecto Redpresu
3. Ir a **SQL Editor**
4. Copiar contenido del archivo `.sql`
5. Ejecutar (Run)
6. Verificar que no hay errores

### Opción 2: CLI de PostgreSQL

```bash
psql "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres" \
  -f docs/migrations/[ARCHIVO].sql
```

### Opción 3: Supabase CLI

```bash
supabase db reset --db-url "postgresql://..."
```

## Orden de Ejecución para Nueva Instalación

Si estás configurando Redpresu desde cero:

```bash
# 1. Schema base
psql $DB_URL -f 000_create_schema_redpresu.sql

# 2. Exponer schema
psql $DB_URL -f 001_exponer_schema_redpresu.sql

# 3. Sistema de reglas de negocio (nuevo)
psql $DB_URL -f create_business_rules.sql
```

## Verificación

Después de ejecutar migraciones, verifica:

```sql
-- Ver tablas creadas
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'redpresu'
ORDER BY table_name;

-- Ver RLS policies
SELECT tablename, policyname
FROM pg_policies
WHERE schemaname = 'redpresu';

-- Ver triggers
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE event_object_schema = 'redpresu';
```

## Notas Importantes

- **Schema**: Todo se crea en `redpresu`, no en `public`
- **RLS**: Row Level Security está habilitado en todas las tablas sensibles
- **Superadmin**: El rol `superadmin` debe existir en la tabla `users`
- **Función requerida**: `update_updated_at_column()` debe existir previamente

## Contribuir

Al agregar nuevas migraciones:

1. Crear archivo con nombre descriptivo: `feature_nombre.sql`
2. Documentar en un `README_feature.md` si es complejo
3. Actualizar este README con la nueva migración
4. Incluir instrucciones de rollback si aplica
5. Probar en entorno de desarrollo antes de producción

---

**Proyecto**: Redpresu - Sistema de Gestión de Presupuestos
**Stack**: Next.js 15 + Supabase (PostgreSQL)
**Última actualización**: 14-Nov-2025
