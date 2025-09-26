# Tareas - MÓDULO: Tariff Management

## MÓDULO ACTIVO: Tariff Management
**Tareas Activas:** 0/5

## BACKLOG

### Críticas:
1. **Página listado tarifas** - 1 día
   - Tabla con tarifas activas/inactivas
   - Acciones: ver, editar, activar/desactivar
   - Filtros y búsqueda

2. **Formulario crear/editar tarifa** - 1 día
   - Campos básicos (title, description, validity, etc.)
   - Upload CSV con validación en tiempo real
   - Preview jerarquía procesada
   - Upload logo empresa

3. **Integración validador CSV** - 1 día
   - Server Action para procesar CSV
   - Mostrar errores de validación
   - Guardar json_tariff_data en BD

4. **Gestión estados tarifa** - 0.5 días
   - Activar/desactivar tarifas
   - Solo activas permiten crear presupuestos
   - Validaciones de estado

5. **CRUD completo con RLS** - 0.5 días
   - Crear tarifa (admin, superadmin)
   - Editar tarifa (admin, superadmin)
   - Eliminar tarifa (solo superadmin)
   - Listar tarifas (todos los roles)

## ARCHIVOS DE ESTE MÓDULO:
- src/app/(dashboard)/tariffs/*
- src/components/tariffs/*
- src/app/actions/tariffs.ts

## DEPENDENCIAS:
- ✅ Database (tablas tariffs)
- ✅ Auth (roles y permisos)
- ✅ Common (validador CSV, formateo)