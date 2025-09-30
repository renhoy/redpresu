# Tareas - MÓDULO: Budget Creation

## MÓDULO ACTIVO: Budget Creation
**Tareas Activas:** 0/6

## BACKLOG

### Críticas:
1. **Selector de tarifa y datos cliente** - 1 día
   - Dropdown con tarifas activas de la empresa
   - Formulario datos cliente (nombre, tipo, contacto)
   - Validación campos obligatorios

2. **Formulario dinámico jerárquico** - 2 días
   - Generar formulario desde json_tariff_data
   - Acordeones por capítulo/subcapítulo/sección
   - Input cantidad por cada partida/item
   - Navegación intuitiva en tablet

3. **Cálculos automáticos en tiempo real** - 1 día
   - cantidad × precio unitario por item
   - Suma por sección/subcapítulo/capítulo
   - Aplicación IVA configurable
   - Total general actualizado

4. **Gestión de estados y guardado** - 1 día
   - Estados: borrador → pendiente → enviado → aprobado/rechazado
   - Persistencia automática como borrador
   - Validaciones antes de cambiar estado
   - Historial de cambios

5. **Listado y filtros de presupuestos** - 1 día
   - Tabla con presupuestos del usuario/empresa
   - Filtros por estado, fecha, cliente
   - Acciones: ver, editar, duplicar, eliminar
   - Búsqueda por cliente/título

6. **Edición de presupuestos** - 1 día
   - Cargar presupuesto existente en formulario
   - Mantener datos cliente y cantidades
   - Generar nueva versión/revisión
   - Comparación con versión anterior

## ARCHIVOS DE ESTE MÓDULO:
- src/app/budgets/*
- src/components/budgets/*
- src/app/actions/budgets.ts

## DEPENDENCIAS:
- ✅ Database (tablas budgets, budget_items)
- ✅ Auth (roles y permisos)
- ✅ Common (cálculos, validaciones)
- ✅ Tariff Management (consulta tarifas activas)

## CRITERIOS COMPLETADO:
- [ ] Selector tarifa funcionando
- [ ] Formulario jerárquico con acordeones
- [ ] Cálculos propagados correctamente
- [ ] Estados gestionados (borrador→pendiente→enviado...)
- [ ] Listado con filtros
- [ ] Edición de presupuestos existentes