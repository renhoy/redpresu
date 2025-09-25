# Tareas - MÓDULO: Database

## MÓDULO ACTIVO: Database
**Tareas Activas:** 0/5

## BACKLOG
### Críticas (obligatorias para completar módulo):
1. **Configuración Supabase inicial** - 1 día
   - Setup proyecto Supabase
   - Configuración variables entorno
   - Conexión desde Next.js

2. **Esquema base de datos** - 1 día  
   - Tabla users (auth + roles personalizados)
   - Tabla tariffs (empresa_id=1, json_tariff_data, configuración)
   - Tabla budgets (referencia tariff, datos cliente, json_budget_data, estados)

3. **Tipos TypeScript** - 1 día
   - Interfaces para tariffs, budgets, users
   - Tipos para JSON structures (tariff_data, budget_data)
   - Enums para estados y roles

4. **Políticas RLS** - 1 día
   - Políticas por rol: superadmin (todo), admin (su empresa), vendedor (sus presupuestos)
   - Restricciones empresa_id = 1 en MVP
   - Testing de permisos por rol

5. **Migraciones y seeds** - 1 día
   - Scripts SQL para estructura inicial
   - Datos semilla: usuario admin inicial, empresa base
   - Validation helpers para constraints

### Alta (importantes pero no críticas):
1. **Índices optimización** - 0.5 días
   - Índices para queries frecuentes (listados, filtros)
   - Optimización para búsquedas por estado, fecha

2. **Helpers database** - 0.5 días
   - Funciones reutilizables para queries comunes
   - Wrappers con manejo errores

## ARCHIVOS DE ESTE MÓDULO:
- lib/database/supabase.ts
- lib/database/types.ts  
- lib/database/helpers.ts
- lib/types/index.ts
- lib/types/database.ts
- migrations/001_initial_schema.sql
- migrations/002_rls_policies.sql
- database.types.ts (generado por Supabase)

## CRITERIOS COMPLETADO DATABASE:
- [ ] Conexión Supabase funcionando
- [ ] Esquema completo desplegado
- [ ] Tipos TypeScript generados y validados
- [ ] RLS funcionando por rol
- [ ] Seeds con datos iniciales
- [ ] Tests básicos de conexión y permisos
- [ ] Documentación schema y relaciones

## NOTAS TÉCNICAS:
- **JSON Fields**: json_tariff_data y json_budget_data para estructura flexible
- **Estados**: usar enums SQL para estados de presupuesto
- **Empresa**: empresa_id siempre = 1 en MVP, preparado para multi-tenant futuro
- **Fechas**: usar timestamptz para start_date, end_date, created_at, updated_at
- **Cálculos**: campos total, iva, base como DECIMAL(10,2) para listados rápidos

## TESTING MÍNIMO:
- Conexión a Supabase exitosa
- CRUD básico en cada tabla
- RLS bloqueando accesos incorrectos por rol
- Validación constraints (empresa_id, estados válidos)