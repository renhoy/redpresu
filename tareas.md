# Tareas - MÓDULO: Budget Creation

## MÓDULO ACTIVO: Budget Creation
**Estado:** ✅ COMPLETADO (Ready for PDF Generation)

## COMPLETADAS ✅

### 1. ✅ Selector de tarifa y datos cliente - COMPLETADO
   - ✅ Selector desde /tariffs con tariff_id en URL
   - ✅ Formulario datos cliente completo (tipo, nombre, NIF/NIE, contacto, dirección)
   - ✅ Validación campos obligatorios con mensajes de error
   - ✅ Diseño adaptado a colores de tarifa (primary/secondary)
   - ✅ Botones de tipo cliente (Empresa/Autónomo/Particular)
   - ✅ Validación formato NIF/NIE según tipo de cliente
   - ✅ Checkbox aceptación con nota legal (tariff.legal_note)
   - ✅ Nota legal visible debajo del checkbox

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

### 4. ✅ Gestión de estados y guardado - COMPLETADO
   - ✅ Interfaz con botones (Atrás, Borrar, Guardar, Generar PDF)
   - ✅ Guardado en base de datos (budgets table)
   - ✅ Estados con transiciones válidas:
     - borrador → pendiente, enviado
     - pendiente → borrador, enviado
     - enviado → pendiente, aprobado, rechazado
     - aprobado/rechazado → borrador
     - caducado → borrador
   - ✅ Validaciones antes de guardar (cantidad > 0)
   - ✅ Sin guardado automático destructivo
   - ✅ Guardado manual solo al pulsar "Guardar"
   - ✅ Estado inicial: BORRADOR (no PENDIENTE)

### 5. ✅ Listado y filtros de presupuestos - COMPLETADO
   - ✅ Tabla con presupuestos del usuario/empresa
   - ✅ Filtros por estado (dropdown)
   - ✅ Búsqueda por cliente/NIF
   - ✅ Columnas: Cliente (nombre+NIF+tipo), Tarifa, Total (con tooltip desglose), Estado, Usuario, PDF, Acciones
   - ✅ Selector de estado interactivo (Select con Badge)
   - ✅ Solo muestra transiciones válidas según estado actual
   - ✅ Confirmación en cambios críticos (aprobar/rechazar)
   - ✅ Acciones: Editar, Eliminar (botón Ver eliminado por redundancia)
   - ✅ Indicador de días restantes de validez
   - ✅ Refresh automático después de acciones

### 6. ✅ Edición de presupuestos - COMPLETADO
   - ✅ Cargar presupuesto existente en formulario
   - ✅ Mantener datos cliente y cantidades guardadas
   - ✅ Flujo correcto: leer de budgets/json_budget_data (no tariff_data)
   - ✅ Preservar cantidades al navegar entre pasos
   - ✅ Actualización correcta en base de datos

## ARCHIVOS DE ESTE MÓDULO:
- src/app/budgets/*
- src/components/budgets/*
- src/app/actions/budgets.ts

## ARCHIVOS CREADOS/MODIFICADOS:
- ✅ src/app/budgets/create/page.tsx - Página creación presupuestos
- ✅ src/app/budgets/page.tsx - Listado presupuestos (con Header)
- ✅ src/app/budgets/layout.tsx - Layout sin Header
- ✅ src/components/budgets/BudgetForm.tsx - Formulario 2 pasos (cliente + presupuesto)
- ✅ src/components/budgets/BudgetHierarchyForm.tsx - Formulario jerárquico con cálculos
- ✅ src/components/budgets/BudgetsTable.tsx - Tabla con filtros y selector estados
- ✅ src/components/ui/accordion.tsx - Componente shadcn/ui
- ✅ src/components/ui/checkbox.tsx - Componente shadcn/ui
- ✅ src/app/actions/budgets.ts - Server Actions (CRUD + estados)

## SERVER ACTIONS IMPLEMENTADAS:
- ✅ `getBudgets()` - Listar presupuestos con joins (tariffs, users)
- ✅ `getBudgetById()` - Obtener presupuesto por ID
- ✅ `createDraftBudget()` - Crear borrador con json_budget_data inicializado
- ✅ `updateBudgetDraft()` - Actualizar borrador existente
- ✅ `saveBudget()` - Guardar presupuesto como BORRADOR (antes saveBudgetAsPending)
- ✅ `updateBudgetStatus()` - Cambiar estado con validación de transiciones
- ✅ `deleteBudget()` - Eliminar presupuesto

## DEPENDENCIAS:
- ✅ Database (tablas budgets, budget_items)
- ✅ Auth (roles y permisos)
- ✅ Common (cálculos, validaciones)
- ✅ Tariff Management (consulta tarifas activas)

## CRITERIOS COMPLETADO:
- ✅ Selector tarifa funcionando
- ✅ Formulario jerárquico con acordeones
- ✅ Cálculos propagados correctamente
- ✅ Estados gestionados con transiciones válidas
- ✅ Listado con filtros funcionando
- ✅ Edición de presupuestos existentes
- ✅ Validación formato español para números
- ✅ Sin guardado automático destructivo
- ✅ Cabecera con datos correctos (address, contact)

## CORRECCIONES RECIENTES:
1. ✅ Validación cantidades con formato español (coma como decimal)
2. ✅ Eliminado bucle infinito en useEffect
3. ✅ Flujo edición: leer de json_budget_data no tariff_data
4. ✅ Inicialización correcta al crear desde tarifa
5. ✅ Eliminado guardado automático al cambiar de paso
6. ✅ Estado inicial: BORRADOR (no PENDIENTE)
7. ✅ Selector estados interactivo con transiciones válidas
8. ✅ Cabecera corregida: tariff.address y tariff.contact
9. ✅ Nota legal corregida: tariff.legal_note (no legal_notes)

## NOTAS TÉCNICAS:
- Formulario usa navegación única: solo un item activo a la vez
- Formato numérico: español para display, inglés para cálculos internos
- Colores dinámicos desde tarifa (primary_color, secondary_color)
- Header solo en /budgets (listado), no en /budgets/create
- Totales con estilos diferenciados y tamaños reducidos
- Validación NIF empresa: letra+8dígitos+letra, DNI/NIE particular/autónomo
- json_budget_data se inicializa con estructura de tarifa + cantidades en 0
- Guardado solo manual (botón "Guardar"), no automático
- Estados con validación: solo permite transiciones válidas
- Selector de estados con confirmación en acciones críticas

## SIGUIENTE MÓDULO:
⏭️ **PDF Generation** - Prerequisitos completados, listo para comenzar
