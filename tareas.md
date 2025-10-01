# Tareas - MÓDULO: Budget Creation

## MÓDULO ACTIVO: Budget Creation
**Tareas Activas:** 3/6

## COMPLETADAS ✅

### 1. ✅ Selector de tarifa y datos cliente - COMPLETADO
   - ✅ Selector desde /tariffs con tariff_id en URL
   - ✅ Formulario datos cliente completo (tipo, nombre, NIF/NIE, contacto, dirección)
   - ✅ Validación campos obligatorios con mensajes de error
   - ✅ Diseño adaptado a colores de tarifa (primary/secondary)
   - ✅ Botones de tipo cliente (Empresa/Autónomo/Particular)
   - ✅ Validación formato NIF/NIE según tipo de cliente
   - ✅ Checkbox aceptación con notas legales

### 2. ✅ Formulario dinámico jerárquico - COMPLETADO
   - ✅ Generación desde json_tariff_data (estructura plana con IDs jerárquicos)
   - ✅ Acordeones por capítulo/subcapítulo/sección
   - ✅ Input cantidad por cada partida/item
   - ✅ Navegación intuitiva: un solo item activo, click para siguiente, wrap-around
   - ✅ Solo se expanden ancestros del item activo
   - ✅ Controles en línea 2 del item activo (Unidad, %IVA, Cantidad, Precio)
   - ✅ Diseño optimizado para tablet con chevrons y espaciado adecuado

### 3. ✅ Cálculos automáticos en tiempo real - COMPLETADO
   - ✅ Cantidad × precio unitario por item
   - ✅ Suma propagada por sección/subcapítulo/capítulo
   - ✅ Aplicación IVA configurable por item
   - ✅ Cálculo correcto de IVA incluido: `iva_amount = total × (% / (100 + %))`
   - ✅ Total general actualizado en tiempo real
   - ✅ Formato numérico español (1.234,56) con parseador inteligente
   - ✅ Totales desglosados: Base Imponible, IVA por porcentaje, Total Presupuesto
   - ✅ Estilos diferenciados por color (Base=secundario, IVA=negro, Total=primario con borde)

## EN PROGRESO 🔄

### 4. 🔄 Gestión de estados y guardado - EN PROGRESO
   - ✅ Interfaz con botones (Atrás, Borrar, Guardar, Generar PDF)
   - ⏳ Implementar guardado en base de datos
   - ⏳ Estados: borrador → pendiente → enviado → aprobado/rechazado
   - ⏳ Validaciones antes de cambiar estado
   - ⏳ Historial de cambios/revisiones

## PENDIENTES ⏳

### 5. ⏳ Listado y filtros de presupuestos
   - ⏳ Tabla con presupuestos del usuario/empresa
   - ⏳ Filtros por estado, fecha, cliente
   - ⏳ Acciones: ver, editar, duplicar, eliminar
   - ⏳ Búsqueda por cliente/título

### 6. ⏳ Edición de presupuestos
   - ⏳ Cargar presupuesto existente en formulario
   - ⏳ Mantener datos cliente y cantidades
   - ⏳ Generar nueva versión/revisión
   - ⏳ Comparación con versión anterior

## ARCHIVOS DE ESTE MÓDULO:
- src/app/budgets/*
- src/components/budgets/*
- src/app/actions/budgets.ts

## ARCHIVOS CREADOS/MODIFICADOS:
- ✅ src/app/budgets/create/page.tsx - Página creación presupuestos
- ✅ src/app/budgets/page.tsx - Listado presupuestos (con Header)
- ✅ src/app/budgets/layout.tsx - Layout sin Header
- ✅ src/components/budgets/BudgetForm.tsx - Formulario 2 pasos
- ✅ src/components/budgets/BudgetHierarchyForm.tsx - Formulario jerárquico con cálculos
- ✅ src/components/ui/accordion.tsx - Componente shadcn/ui
- ✅ src/components/ui/checkbox.tsx - Componente shadcn/ui

## DEPENDENCIAS:
- ✅ Database (tablas budgets, budget_items)
- ✅ Auth (roles y permisos)
- ✅ Common (cálculos, validaciones)
- ✅ Tariff Management (consulta tarifas activas)

## CRITERIOS COMPLETADO:
- ✅ Selector tarifa funcionando
- ✅ Formulario jerárquico con acordeones
- ✅ Cálculos propagados correctamente
- ⏳ Estados gestionados (borrador→pendiente→enviado...)
- ⏳ Listado con filtros
- ⏳ Edición de presupuestos existentes

## NOTAS TÉCNICAS:
- Formulario usa navegación única: solo un item activo a la vez
- Formato numérico: español para display, inglés para cálculos internos
- Colores dinámicos desde tarifa (primary_color, secondary_color)
- Header solo en /budgets (listado), no en /budgets/create
- Totales con estilos diferenciados y tamaños reducidos
- Validación NIF empresa: letra+8dígitos+letra, DNI/NIE particular/autónomo