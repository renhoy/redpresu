# Planificación - jeyca-presu

## FASE 1: SHARED ✅ COMPLETADO (3 semanas)
1. **✅ Database Module** - ✅ COMPLETADO - Modelos Supabase, migraciones, tipos TypeScript, configuración RLS
2. **✅ Auth Module** - ✅ COMPLETADO - Sistema autenticación, roles (superadmin/admin/vendedor), protección rutas
3. **✅ Common Module** - ✅ COMPLETADO - Validadores CSV, utilidades cálculo, helpers formato, constantes

## FASE 2: FEATURES (Uno por vez - 4 semanas)
1. **✅ Tariff Management** - ✅ COMPLETADO - CRUD tarifas, procesamiento CSV→JSON, validación jerárquica
2. **✅ Budget Creation** - ✅ COMPLETADO (100%) - Formularios dinámicos, cálculos tiempo real, gestión estados, listado, edición
3. **✅ PDF Generation** - ✅ COMPLETADO (100%) - Integración Rapid-PDF, payload construction, almacenamiento local, sistema guardado inteligente
4. **⏳ Dashboard** - **SIGUIENTE MÓDULO** - Estadísticas básicas, listados con filtros, navegación

## FASE 3: INTEGRACIÓN (1 semana)
1. **Testing E2E** - Flujo completo CSV→Formulario→PDF
2. **Optimización** - Performance, UX tablet, validaciones finales
3. **Deployment** - Configuración producción, variables entorno

## DEPENDENCIAS CRÍTICAS
- **✅ Database** → ✅ Base para todos los módulos (COMPLETADO)
- **✅ Auth** → ✅ Necesario antes de cualquier CRUD (COMPLETADO)
- **✅ Common** → ✅ Utilidades para procesamiento CSV y cálculos (COMPLETADO)
- **✅ Tariff Management** → ✅ Prerequisito para Budget Creation (COMPLETADO)
- **✅ Budget Creation** → ✅ COMPLETADO → Prerequisito para PDF Generation
- **✅ PDF Generation** → ✅ COMPLETADO → Prerequisito para Dashboard

## HITOS CLAVE
- **✅ Semana 3:** SHARED completo → ✅ formularios básicos funcionando
- **✅ Semana 4:** Tariff Management → ✅ gestión completa de tarifas con CSV
- **✅ Semana 5-6:** Budget Creation → ✅ COMPLETADO → presupuestos con gestión completa
- **✅ Semana 7:** PDF Generation → ✅ COMPLETADO → flujo completo end-to-end
- **⏳ Semana 8:** Dashboard → **PRÓXIMO** → MVP funcional → comerciales pueden usar en campo

## PROGRESO ACTUAL
**📊 Estado del Proyecto:** 95% Completado
- ✅ **FASE 1 (SHARED):** 100% completado
- ✅ **Tariff Management:** 100% completado
- ✅ **Budget Creation:** 100% completado
  - ✅ Selector tarifa y formulario cliente (100%)
  - ✅ Formulario jerárquico dinámico (100%)
  - ✅ Cálculos automáticos tiempo real (100%)
  - ✅ Gestión estados y guardado (100%)
  - ✅ Listado y filtros (100%)
  - ✅ Edición presupuestos (100%)
  - ✅ Selector estados interactivo (100%)
  - ✅ Validaciones completas (100%)
- ✅ **PDF Generation:** 100% - **MÓDULO COMPLETADO** ✅
  - ✅ Construcción payload desde json_budget_data (100%)
  - ✅ Filtrado y renumeración jerárquica (100%)
  - ✅ Generación summary con chapters (100%)
  - ✅ Cálculo totals formato español (100%)
  - ✅ Integración Rapid-PDF API (100%)
  - ✅ Descarga y almacenamiento /public/pdfs/ (100%)
  - ✅ Actualización budgets.pdf_url (100%)
  - ✅ Columna PDF en listado (100%)
  - ✅ Sistema guardado inteligente (100%)
  - ✅ Advertencias PDF existente (100%)
- ⏳ **Dashboard:** 0% - **SIGUIENTE MÓDULO**

## BUDGET CREATION - RESUMEN DE IMPLEMENTACIÓN

### Funcionalidades Completadas:
1. **Flujo de Creación:**
   - ✅ Selección de tarifa desde /tariffs
   - ✅ Formulario 2 pasos: Cliente → Presupuesto
   - ✅ Validación completa de datos cliente
   - ✅ Formulario jerárquico dinámico con acordeones
   - ✅ Navegación intuitiva (un item activo a la vez)
   - ✅ Cálculos en tiempo real con propagación jerárquica
   - ✅ Guardado manual (sin auto-guardado destructivo)

2. **Gestión de Estados:**
   - ✅ Estado inicial: BORRADOR
   - ✅ Transiciones válidas implementadas
   - ✅ Selector interactivo en listado
   - ✅ Confirmación en cambios críticos
   - ✅ Validación de permisos por usuario

3. **Listado y Filtros:**
   - ✅ Tabla completa con joins (tariffs, users)
   - ✅ Filtros por estado y búsqueda
   - ✅ Acciones: Editar, Eliminar
   - ✅ Indicador días restantes de validez
   - ✅ Tooltip con desglose de totales

4. **Edición:**
   - ✅ Carga correcta de presupuestos existentes
   - ✅ Preservación de cantidades guardadas
   - ✅ Flujo: budgets/json_budget_data → formulario → guardado
   - ✅ Actualización sin pérdida de datos

### Correcciones Críticas Aplicadas:
1. ✅ Formato español para números (coma decimal)
2. ✅ Eliminado bucle infinito en useEffect
3. ✅ Inicialización correcta de json_budget_data
4. ✅ Flujo edición vs creación separado
5. ✅ Sin guardado automático al cambiar pasos
6. ✅ Cabecera con campos correctos (address, contact)
7. ✅ Nota legal visible (legal_note)
8. ✅ Selector estados con transiciones válidas

### Server Actions Implementadas:
- `getBudgets()` - Listar con joins
- `getBudgetById()` - Obtener por ID
- `createDraftBudget()` - Crear borrador
- `updateBudgetDraft()` - Actualizar borrador
- `saveBudget()` - Guardar como BORRADOR
- `updateBudgetStatus()` - Cambiar estado con validación
- `deleteBudget()` - Eliminar presupuesto

## PDF GENERATION - RESUMEN DE IMPLEMENTACIÓN

### Funcionalidades Completadas:
1. **Construcción Payload PDF:**
   - ✅ Transformación json_budget_data → Rapid-PDF format
   - ✅ Filtrado elementos con amount > 0
   - ✅ Renumeración jerárquica automática
   - ✅ Extracción chapters para summary
   - ✅ Cálculo totals con formato español
   - ✅ URLs absolutas para logos

2. **Integración Rapid-PDF API:**
   - ✅ POST /generate_document con timeout 60s
   - ✅ Descarga PDF con retry (2 intentos)
   - ✅ Almacenamiento /public/pdfs/
   - ✅ Formato nombre: presupuesto_nombre_nif_YYYY-MM-DD_HH-MM-SS.pdf
   - ✅ Actualización budgets.pdf_url
   - ✅ Manejo errores completo

3. **Sistema Guardado Inteligente:**
   - ✅ AlertDialog con 3 opciones en edición
   - ✅ Sobrescribir con confirmación doble
   - ✅ Crear nuevo (duplicar) preservando original
   - ✅ Advertencia PDF existente al guardar
   - ✅ Eliminación automática PDF anterior
   - ✅ Guardado completo datos cliente

4. **UI/UX:**
   - ✅ Columna PDF en listado con botón descarga
   - ✅ Botón "Generar PDF" con estados loading
   - ✅ Tooltips informativos en todos los botones
   - ✅ Botón cerrar pestaña con advertencia cambios
   - ✅ Apertura PDF en nueva pestaña

### Correcciones Críticas Aplicadas:
1. ✅ Modo desarrollo llama API (no solo debug)
2. ✅ Formato nombre archivo con timestamp completo
3. ✅ Detección cambios sin guardar
4. ✅ Inicio siempre en paso 1 al editar
5. ✅ Validación items > 0 antes generar PDF

### Server Actions Añadidas:
- `generateBudgetPDF()` - Generación completa PDF
- `duplicateBudget()` - Crear copia presupuesto
- `saveBudget()` - Extendida con eliminación PDF

### Helper Functions:
- `buildPDFPayload()` - Construcción payload
- `filterNonZeroItems()` - Filtrado elementos
- `renumberHierarchicalIds()` - Renumeración IDs
- `extractChapters()` - Extracción chapters
- `calculateTotals()` - Cálculo totals con IVA

## REGLA FUNDAMENTAL
❌ NO empezar siguiente módulo hasta que anterior esté READ-ONLY
✅ PDF Generation = ✅ COMPLETADO → Listo para marcar como READ-ONLY

## PRÓXIMO PASO
🎯 **Dashboard** - Último módulo antes de MVP
- Estadísticas básicas de presupuestos
- Accesos directos a funciones principales
- Listado presupuestos recientes
- KPIs visuales

## RIESGOS IDENTIFICADOS
1. **✅ CSV Procesamiento** - Resuelto, validaciones funcionando
2. **✅ Cálculos Tiempo Real** - Resuelto, formato español implementado
3. **✅ UX Tablet** - Resuelto, navegación optimizada
4. **✅ Rapid-PDF externo** - Resuelto, integración completa con timeout y retry
5. **✅ Performance PDF** - Resuelto, generación ~1-2 segundos (muy por debajo del límite 60s)

## COMMITS RECIENTES (PDF Generation):
- feat: tooltips informativos en botones
- feat: botón cerrar con advertencia cambios
- feat: reorganización layout botones
- fix: formato nombre PDF con timestamp
- fix: modo desarrollo llama API correctamente
- feat: sistema guardado inteligente con AlertDialogs
- feat: duplicateBudget con fechas actualizadas
- feat: integración completa Rapid-PDF
- feat: construcción payload PDF con helpers

## COMMITS RECIENTES (Budget Creation):
- `cb3a21a` - fix: corregir cabecera y nota legal
- `c7f9b77` - feat: selector estados interactivo
- `c4c5924` - fix: eliminar guardado automático
- `176c6cc` - fix: inicializar json_budget_data
- `d3abd34` - fix: flujo edición y guardado
- `313e6b5` - debug: logs detallados
- `2376321` - fix: bucle infinito useEffect
- `7040cc3` - fix: validación formato español
- `f5b16e0` - feat: listado completo
- `506b20e` - feat: sistema guardado
- `c6cc79d` - feat: formulario completo

## ESTADO ARCHIVOS
**ARCHIVOS READ-ONLY (No modificar):**
- ✅ src/lib/database/* (Database)
- ✅ src/lib/types/* (Database)
- ✅ src/lib/supabase/* (Database)
- ✅ src/lib/auth/* (Auth)
- ✅ src/components/auth/* (Auth)
- ✅ src/lib/utils/* (Common)
- ✅ src/lib/validators/* (Common)
- ✅ src/lib/helpers/* (Common - incluye pdf-payload-builder.ts)
- ✅ src/lib/constants/* (Common)
- ✅ src/app/tariffs/* (Tariff Management)
- ✅ src/components/tariffs/* (Tariff Management)
- ✅ src/app/actions/tariffs.ts (Tariff Management)
- ✅ src/app/budgets/* (Budget Creation)
- ✅ src/components/budgets/* (Budget Creation)
- ✅ src/app/actions/budgets.ts (Budget Creation + PDF Generation)

**PRÓXIMO MÓDULO (Permitido modificar):**
- ⏭️ src/app/dashboard/* (Dashboard) - **SIGUIENTE**
- ⏭️ src/components/dashboard/* (Dashboard) - **SIGUIENTE**
