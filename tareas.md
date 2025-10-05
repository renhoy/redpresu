# Tareas - Fase 2: Evolución Funcional y Multi-tenant

## ✅ MÓDULO COMPLETADO: IRPF y Recargo de Equivalencia (Bloque 4)

**Tareas Completadas:** 3/3

**Estado:** ✅ BLOQUE 4 COMPLETADO

---

## ✅ BLOQUE 1: USUARIOS Y SEGURIDAD (CRÍTICO) - COMPLETADO

### Tareas Críticas:

#### 1.1 Sistema de Registro Completo

**Prioridad:** CRÍTICA | **Estimación:** 3 días | **Estado:** ✅ Completado

- ✅ Crear tabla `emisores` en BD
- ✅ Migración SQL con índices
- ✅ Server Action `registerUser()`
- ✅ Página `/app/(auth)/register/page.tsx`
- ✅ Componente `RegisterForm.tsx`
- ✅ Validación Zod para registro
- ✅ Integración Supabase Auth (signup)
- ✅ Redirect automático a dashboard post-registro

**Archivos nuevos:**

- `migrations/004_emisores_table.sql`
- `src/app/(auth)/register/page.tsx`
- `src/components/auth/RegisterForm.tsx`
- `src/app/actions/auth.ts` (extender existente)

**Criterios de completado:**

- Usuario puede registrarse como empresa o autónomo
- Datos fiscales guardados correctamente
- Email único validado
- Redirect funcional

---

#### 1.2 Recuperación de Contraseña

**Prioridad:** ALTA | **Estimación:** 2 días | **Estado:** ✅ Completado

- ✅ Server Action `requestPasswordReset(email)`
- ✅ Server Action `resetPassword(token, newPassword)`
- ✅ Página `/app/(auth)/forgot-password/page.tsx`
- ✅ Página `/app/(auth)/reset-password/page.tsx`
- ✅ Configurar email templates en Supabase
- ✅ Componente `PasswordResetForm.tsx`
- ✅ Validación tokens expiración

**Archivos nuevos:**

- `src/app/(auth)/forgot-password/page.tsx`
- `src/app/(auth)/reset-password/page.tsx`
- `src/components/auth/PasswordResetForm.tsx`

---

#### 1.3 Perfil de Usuario

**Prioridad:** ALTA | **Estimación:** 2 días | **Estado:** ✅ Completado

- ✅ Página `/app/profile/page.tsx`
- ✅ Server Action `updateUserProfile()`
- ✅ Componente `ProfileForm.tsx`
- ✅ Editar datos fiscales emisor
- ✅ Cambiar contraseña desde perfil
- ✅ Upload avatar (opcional)

**Archivos nuevos:**

- `src/app/profile/page.tsx`
- `src/components/profile/ProfileForm.tsx`

---

#### 1.4 CRUD de Usuarios (Admin)

**Prioridad:** ALTA | **Estimación:** 3 días | **Estado:** ✅ Completado

- ✅ Tabla `users` añadir campos `status`, `invited_by`, `last_login`
- ✅ Server Actions CRUD usuarios
- ✅ Página `/app/users/page.tsx` (listado)
- ✅ Página `/app/users/create/page.tsx`
- ✅ Página `/app/users/[id]/edit/page.tsx`
- ✅ Componente `UserTable.tsx`
- ✅ Componente `UserForm.tsx`
- ✅ RLS policies para usuarios
- ✅ Validación permisos por rol
- ✅ **Acceso vendedor**: Ver lista usuarios, editar solo su perfil
- ✅ **Filtrado roles**: Admin no puede crear superadmin
- ✅ **Ocultación superadmins**: Admin/vendedor no ven superadmins en lista
- ✅ **Header**: Enlaces Usuarios (todos) y Configuración (superadmin)

**Archivos nuevos:**

- `migrations/007_users_status_fields.sql`
- `migrations/014_fix_users_select_self.sql` (RLS fix)
- `src/app/users/page.tsx`
- `src/app/users/create/page.tsx`
- `src/app/users/[id]/edit/page.tsx`
- `src/app/users/layout.tsx`
- `src/app/settings/layout.tsx`
- `src/components/users/UserTable.tsx`
- `src/components/users/UserForm.tsx`
- `src/app/actions/users.ts`

**Archivos modificados (permisos vendedor):**

- `src/app/actions/users.ts`: función `checkUserAccess()`, filtrado superadmins
- `src/components/users/UserTable.tsx`: permisos por rol en acciones
- `src/components/users/UserForm.tsx`: bloqueo campos para vendedor
- `src/components/layout/Header.tsx`: navegación visible para todos

**Criterios de completado:**

- ✅ Admin puede crear/editar admin y vendedor (NO superadmin)
- ✅ Vendedor puede ver lista y editar solo su usuario
- ✅ RLS filtra correctamente por empresa_id
- ✅ Superadmins ocultos para admin/vendedor
- ✅ Header muestra enlaces según rol

---

## ✅ BLOQUE 1 COMPLETADO: 4/4 tareas (100%)

Completado:
✅ 1.1 Sistema Registro (migrations 004-006, registro completo con tooltips)
✅ 1.2 Recuperación Contraseña (flujo completo con emails)
✅ 1.3 Perfil Usuario (edición datos + cambio contraseña)
✅ 1.4 CRUD Usuarios (migration 007, 014, gestión completa con permisos por rol)

**Mejoras adicionales:**
- ✅ Acceso vendedor a gestión usuarios (solo lectura + editar propio perfil)
- ✅ Filtrado de roles según usuario actual (admin NO crea superadmin)
- ✅ Ocultación de superadmins para admin/vendedor
- ✅ Navegación header adaptada por roles

**Migraciones:** 004, 005, 006, 007, 014
**Archivos nuevos:** 18+ (auth, profile, users, layouts)
**Semanas:** 1-2 completadas
**Siguiente bloque:** Bloque 2 - Mejoras Tarifas

---

## ✅ BLOQUE 2: MEJORAS INCREMENTALES TARIFAS - COMPLETADO

### Tareas Críticas:

#### 2.1 Campo user_id en Tarifas

**Prioridad:** ALTA | **Estimación:** 0.5 días | **Estado:** ✅ Completado

- ✅ Migración SQL añadir `user_id` a `tariffs`
- ✅ Migrar datos existentes (asignar a admin)
- ✅ Modificar `createTariff()` para incluir `user_id`
- ✅ Modificar `getTariffs()` con join `users`
- ✅ Añadir columna "Creado por" en listado
- ✅ Filtro por usuario (admin/superadmin)

**Archivos modificados:**

- `migrations/008_tariffs_user_id.sql`
- `src/app/actions/tariffs.ts`
- `src/components/tariffs/TariffList.tsx`
- `src/components/tariffs/TariffRow.tsx`
- `src/components/tariffs/TariffFilters.tsx`

**Criterios de completado:**

- ✅ Campo obligatorio tras migración
- ✅ Join funcional con tabla users
- ✅ Columna visible en UI con tooltip email
- ✅ Filtro por usuario funcionando

---

#### 2.2 Detección Automática IVAs en CSV

**Prioridad:** ALTA | **Estimación:** 1 día | **Estado:** ✅ Completado

- ✅ Función `detectIVAsPresentes()` en csv-converter
- ✅ Migración añadir `ivas_presentes[]` a tariffs
- ✅ Modificar `createTariff()` para detectar y guardar IVAs
- ✅ Modificar `updateTariff()` para actualizar IVAs
- ✅ Validación y redondeo a 2 decimales

**Archivos modificados:**

- `migrations/011_tariffs_ivas_presentes.sql`
- `src/lib/validators/csv-converter.ts`
- `src/lib/validators/index.ts`
- `src/app/actions/tariffs.ts`

**Criterios de completado:**

- ✅ IVAs detectados automáticamente al importar CSV
- ✅ Array guardado correctamente en BD
- ✅ Ordenados descendente (21, 10, 4)
- ✅ Sin cambios UI (campo invisible)

---

#### 2.3 Tarifa por Defecto (Plantilla)

**Prioridad:** MEDIA | **Estimación:** 1.5 días | **Estado:** ✅ Completado

- ✅ Migración añadir `is_template` a tariffs
- ✅ Trigger SQL `ensure_single_template()`
- ✅ Server Action `setTariffAsTemplate()`
- ✅ Server Action `unsetTariffAsTemplate()`
- ✅ Server Action `getTemplateTariff()`
- ✅ Botón Star "Plantilla" en TariffRow (admin/superadmin)
- ✅ AlertDialog confirmación
- ✅ Pre-cargar datos plantilla al crear tarifa

**Archivos nuevos:**

- `migrations/012_tariffs_template.sql`

**Archivos modificados:**

- `src/app/actions/tariffs.ts`
- `src/components/tariffs/TariffList.tsx`
- `src/components/tariffs/TariffRow.tsx`
- `src/app/tariffs/create/page.tsx`

**Criterios de completado:**

- ✅ Solo 1 tarifa puede ser plantilla (trigger BD)
- ✅ Datos pre-cargados excepto CSV e is_template
- ✅ Botón Star funcional en listado
- ✅ Indicador visual cuando es plantilla

---

## ✅ BLOQUE 2 COMPLETADO: 3/3 tareas (100%)

Completado:
✅ 2.1 Campo user_id (migration 008, trazabilidad + filtro)
✅ 2.2 Detección IVAs (migration 011, automática al crear/editar)
✅ 2.3 Tarifa Plantilla (migration 012, trigger + pre-carga)

**Migraciones:** 008, 011, 012
**Archivos modificados:** 8+
**Funcionalidad nueva:** Auditoría completa de tarifas + sistema de plantillas
**Siguiente bloque:** Bloque 3 - Tabla de Configuración

---

## ✅ BLOQUE 3: TABLA DE CONFIGURACIÓN - COMPLETADO

### Tareas Críticas:

#### 3.1 Tabla Config y Helpers

**Prioridad:** ALTA | **Estimación:** 2 días | **Estado:** ✅ Completado

- ✅ Crear tabla `config` en BD
- ✅ Insertar datos iniciales (IVA-RE, plantillas PDF, defaults)
- ✅ Helper `getConfigValue<T>(key)`
- ✅ Helper `setConfigValue(key, value)`
- ✅ Helpers específicos: `getIVAtoREEquivalences()`, `getPDFTemplates()`
- ✅ Server Actions config (solo superadmin)
- ✅ Página `/app/settings/page.tsx` (solo superadmin)

**Archivos nuevos:**

- `migrations/013_config_table.sql`
- `src/lib/helpers/config-helpers.ts`
- `src/app/actions/config.ts`
- `src/app/settings/page.tsx`
- `src/components/settings/ConfigTable.tsx`

**Criterios de completado:**

- ✅ Tabla config poblada con datos iniciales
- ✅ Helpers funcionando correctamente
- ✅ Solo superadmin accede a settings
- ✅ Eliminadas configs innecesarias (budget_validity_days, default_legal_note, tariff_validity_days)

---

#### 3.2 Selector de Plantillas PDF

**Prioridad:** MEDIA | **Estimación:** 2 días | **Estado:** ✅ Completado
**Dependencia:** 3.1 completado

- ✅ Añadir imágenes preview en `/public/templates/`
- ✅ Modificar formulario tarifa: cambiar input text por Select
- ✅ Tooltip preview al hacer hover
- ✅ Cargar plantillas desde config al montar componente
- ✅ Validar plantilla seleccionada existe

**Archivos nuevos:**

- `src/components/tariffs/TemplateSelector.tsx`
- `public/templates/README.md`

**Archivos modificados:**

- `src/components/tariffs/TariffFormFields.tsx`
- `src/components/tariffs/TariffForm.tsx`

**Criterios de completado:**

- ✅ Selector desplegable funcional
- ✅ Preview visible en hover (con fallback para imágenes faltantes)
- ✅ Plantilla guardada correctamente
- ✅ Default actualizado a "modern"

---

## ✅ BLOQUE 3 COMPLETADO: 2/2 tareas (100%)

Completado:
✅ 3.1 Tabla Config (migration 013, configuración JSONB flexible)
✅ 3.2 Selector Plantillas PDF (TemplateSelector con preview)

**Migraciones:** 013
**Archivos nuevos:** config-helpers.ts, config.ts, settings/page.tsx, ConfigTable.tsx, TemplateSelector.tsx
**Funcionalidad nueva:** Configuración global centralizada + selector visual de plantillas
**Siguiente bloque:** Bloque 4 - IRPF y Recargo de Equivalencia

---

## BLOQUE 4: IRPF Y RECARGO DE EQUIVALENCIA ⏳

### Tareas Críticas:

#### 4.1 Implementación IRPF

**Prioridad:** ALTA | **Estimación:** 3 días | **Estado:** ✅ Completado
**Dependencia:** Bloque 1 completado (tabla emisores)

- ✅ Campo `irpf_percentage` en tabla emisores (ya incluido en migration 004)
- ✅ Helper `shouldApplyIRPF(emisor, cliente)`
- ✅ Helper `calculateIRPF(base, percentage)`
- ✅ Modificar `saveBudget()`: calcular y guardar IRPF automáticamente
- ✅ Añadir columnas `irpf`, `irpf_percentage`, `total_pagar` a budgets
- ✅ Modificar formulario presupuesto: mostrar IRPF si aplica
- ✅ Tooltip explicativo IRPF (Dialog con Info icon)
- ✅ "Total a Pagar" visible cuando hay IRPF
- ✅ Función `getUserIssuer()` para obtener datos fiscales

**Archivos nuevos:**

- `migrations/015_budgets_irpf_fields.sql`
- `src/lib/helpers/fiscal-calculations.ts`

**Archivos modificados:**

- `src/app/actions/budgets.ts` (extendido con cálculo IRPF)
- `src/components/budgets/BudgetForm.tsx` (props IRPF)
- `src/components/budgets/BudgetHierarchyForm.tsx` (visualización IRPF)
- `src/lib/types/database.ts` (Budget interface extendida)

**Criterios de completado:**

- ✅ IRPF se aplica solo si emisor = autónomo Y cliente = empresa|autónomo
- ✅ Cálculo correcto: base × (% IRPF / 100)
- ✅ Visible en resumen totales con formato negativo (retención)
- ✅ Total a Pagar = Total con IVA - IRPF
- ✅ Logs detallados de aplicación en servidor

---

#### 4.2 Implementación Recargo de Equivalencia

**Prioridad:** ALTA | **Estimación:** 4 días | **Estado:** ✅ Completado
**Dependencia:** 3.1 (config), 2.2 (detección IVAs)

- ✅ Checkbox "Aplicar RE" en formulario cliente (solo si autónomo)
- ✅ Tabla dinámica recargos por IVA presente (fondo amber-50)
- ✅ Pre-cargar valores RE desde config (getIVAtoREEquivalencesAction)
- ✅ Permitir edición manual de % RE (inputs numéricos)
- ✅ Helper `calculateRecargo(items, recargos)`
- ✅ Helper `getTotalRecargo(reByIVA)`
- ✅ Guardar en `json_budget_data.recargo` (estructura completa)
- ✅ Visualizar RE por IVA en totales
- ✅ Total a Pagar = Total + IVA - IRPF + RE

**Archivos nuevos:**

- (Extendido) `src/lib/helpers/fiscal-calculations.ts`

**Archivos modificados:**

- `src/app/actions/config.ts` (getIVAtoREEquivalencesAction)
- `src/app/actions/budgets.ts` (cálculo y guardado RE)
- `src/components/budgets/BudgetForm.tsx` (UI checkbox + tabla)
- `src/components/budgets/BudgetHierarchyForm.tsx` (visualización RE)
- `src/lib/types/database.ts` (Tariff: ivas_presentes?)

**Estructura json_budget_data:**

```json
{
  "items": [...],
  "recargo": {
    "aplica": true,
    "recargos": {"21": 5.2, "10": 1.4},
    "reByIVA": {"21": 52.00, "10": 14.00},
    "totalRE": 66.00
  }
}
```

**Criterios de completado:**

- ✅ Checkbox visible solo si cliente = autónomo
- ✅ Tabla muestra solo IVAs de la tarifa seleccionada
- ✅ Cálculo correcto por IVA (Base = PVP / (1 + IVA% + RE%))
- ✅ Datos guardados en JSON (estructura recargo)
- ✅ Visualización completa en totales

---

#### 4.3 Modificación Payload PDF

**Prioridad:** ALTA | **Estimación:** 2 días | **Estado:** ✅ Completado
**Dependencia:** 4.1, 4.2 completados

- ✅ Modificar `buildPDFPayload()`: añadir IRPF y RE a totals
- ✅ Formato correcto: IRPF negativo, RE positivo
- ✅ Cambiar "Total Presupuesto" → "Total con IVA" + agregar "Total a Pagar"
- ✅ Formato moneda español con formatSpanishCurrency()
- ✅ Estructura payload extendida con campos opcionales

**Archivos modificados:**

- `src/lib/helpers/pdf-payload-builder.ts`

**Estructura payload actualizada:**

```json
{
  "totals": {
    "base": {"name": "Base Imponible", "amount": "..."},
    "ivas": [...],
    "irpf": {"name": "IRPF", "amount": "-150,00 €", "percentage": "15,00"},  // opcional
    "recargos": [{"name": "RE 21,00%", "amount": "52,00 €"}],  // opcional
    "total": {"name": "Total con IVA", "amount": "..."},
    "total_pagar": {"name": "Total a Pagar", "amount": "..."}  // si hay IRPF o RE
  }
}
```

**Criterios de completado:**

- ✅ Payload incluye IRPF si existe y es > 0
- ✅ Payload incluye RE si aplica (desde json_budget_data.recargo)
- ✅ Formato moneda español correcto (coma decimal)
- ✅ IRPF con signo negativo (retención)
- ✅ Total a Pagar calculado: Total + IVA - IRPF + RE

---

## ✅ BLOQUE 4 COMPLETADO: 3/3 tareas (100%)

Completado:
✅ 4.1 Implementación IRPF (migration 015, cálculo automático según matriz)
✅ 4.2 Recargo de Equivalencia (UI checkbox + tabla, cálculos fiscales)
✅ 4.3 Modificación Payload PDF (IRPF y RE incluidos en totals)

**Mejoras adicionales:**
- ✅ Formato español en todos los campos numéricos (coma decimal)
- ✅ Advertencia visual para IVAs no reconocidos en configuración
- ✅ Detección automática de IVAs presentes en tarifas
- ✅ Validación automática de aplicación IRPF según tipo emisor/cliente
- ✅ Total a Pagar calculado correctamente: Total + IVA - IRPF + RE

**Migraciones:** 015, 016
**Archivos nuevos:** fiscal-calculations.ts, migrations RE
**Archivos modificados:** budgets.ts, BudgetForm.tsx, BudgetHierarchyForm.tsx, pdf-payload-builder.ts, config.ts, csv-converter.ts, ConfigTable.tsx
**Funcionalidad nueva:** Sistema fiscal completo (IRPF + RE) con cálculos automáticos
**Siguiente bloque:** Bloque 5 - Versiones y Notas

---

## BLOQUE 5: VERSIONES Y NOTAS ⏳

### Tareas Críticas:

#### 5.1 Sistema de Versiones

**Prioridad:** MEDIA | **Estimación:** 3 días | **Estado:** ⏳ Pendiente

- [ ] Crear tabla `budget_versions`
- [ ] Migrar campo `json_client_data` en budgets
- [ ] Server Action `createBudgetVersion()`
- [ ] Server Action `getBudgetVersions()`
- [ ] Server Action `restoreBudgetVersion()`
- [ ] Página `/app/budgets/[id]/versions/page.tsx`
- [ ] Componente timeline versiones
- [ ] Botón "Guardar versión" en formulario
- [ ] Confirmar restauración (AlertDialog)

**Archivos nuevos:**

- `migrations/010_budget_versions.sql`
- `src/app/actions/budget-versions.ts`
- `src/app/budgets/[id]/versions/page.tsx`
- `src/components/budgets/VersionTimeline.tsx`

**Criterios de completado:**

- Versiones guardan snapshot completo
- Timeline muestra historial
- Restauración funciona sin pérdida datos

---

#### 5.2 Sistema de Notas

**Prioridad:** MEDIA | **Estimación:** 2 días | **Estado:** ⏳ Pendiente

- [ ] Crear tabla `budget_notes`
- [ ] Server Action `addBudgetNote()`
- [ ] Server Action `getBudgetNotes()`
- [ ] Server Action `deleteBudgetNote()`
- [ ] Componente `BudgetNotes.tsx`
- [ ] Textarea + botón añadir
- [ ] Timeline cronológico notas
- [ ] Formato fecha relativo
- [ ] Botón eliminar (solo creador/admin)

**Archivos nuevos:**

- `migrations/011_budget_notes.sql`
- `src/app/actions/budget-notes.ts`
- `src/components/budgets/BudgetNotes.tsx`

**Criterios de completado:**

- Notas se guardan con timestamp automático
- Timeline muestra usuario y fecha
- Solo creador/admin puede eliminar

---

## BLOQUE 6: NAVEGACIÓN UNIFICADA ⏳

### Tareas Altas:

#### 6.1 Componente HierarchicalNavigator

**Prioridad:** ALTA | **Estimación:** 4 días | **Estado:** ⏳ Pendiente

- [ ] Componente base `HierarchicalNavigator.tsx`
- [ ] Props: data, mode, renderItem, onItemClick
- [ ] Lógica: un elemento abierto + ancestros visibles
- [ ] Función `closeSiblings()`
- [ ] Función `removeDescendants()`
- [ ] Estilos por nivel (chapter, subchapter, section, item)
- [ ] Migrar `TariffPreview` a usar componente
- [ ] Migrar `BudgetHierarchyForm` a usar componente
- [ ] Tests interacción

**Archivos nuevos:**

- `src/components/shared/HierarchicalNavigator.tsx`

**Archivos modificados:**

- `src/components/tariffs/HierarchyPreview.tsx`
- `src/components/budgets/BudgetHierarchyForm.tsx`

**Criterios de completado:**

- Navegación consistente en tariff preview y budget form
- Solo un elemento activo a la vez
- Ancestros siempre visibles
- Estilos unificados

---

## BLOQUE 7: RICH TEXT EDITOR ⏳

### Tareas Medias:

#### 7.1 Editor de Texto Enriquecido

**Prioridad:** MEDIA | **Estimación:** 3 días | **Estado:** ⏳ Pendiente

- [ ] Instalar Tiptap: `@tiptap/react`, `@tiptap/starter-kit`
- [ ] Componente `RichTextEditor.tsx`
- [ ] Toolbar: negrita, cursiva, listas
- [ ] Integrar en formulario tarifa (summary_note, conditions_note, legal_note)
- [ ] Guardar HTML en BD
- [ ] Modificar `buildPDFPayload()` para parsear HTML
- [ ] Documentar cambios Rapid-PDF (renderizar HTML básico)

**Archivos nuevos:**

- `src/components/shared/RichTextEditor.tsx`

**Archivos modificados:**

- `src/components/tariffs/TariffForm.tsx`
- `src/lib/helpers/pdf-payload-builder.ts`

**Criterios de completado:**

- Editor funcional con toolbar básico
- HTML guardado correctamente
- Rapid-PDF renderiza negritas, cursivas, listas

---

## BLOQUE 8: IMPORT/EXPORT ⏳

### Tareas Medias:

#### 8.1 Exportar Tarifas/Presupuestos

**Prioridad:** MEDIA | **Estimación:** 2 días | **Estado:** ⏳ Pendiente

- [ ] Server Action `exportTariffs(ids, format)`
- [ ] Server Action `exportBudgets(ids, format)`
- [ ] Función `convertTariffsToCSV()`
- [ ] Función `convertBudgetsToCSV()`
- [ ] UI: checkboxes selección múltiple
- [ ] DropdownMenu exportar (JSON/CSV)
- [ ] Generar y descargar archivo

**Archivos nuevos:**

- `src/app/actions/export.ts`
- `src/lib/helpers/export-helpers.ts`

**Archivos modificados:**

- `src/components/tariffs/TariffList.tsx`
- `src/components/budgets/BudgetList.tsx`

**Criterios de completado:**

- Exportar JSON completo
- Exportar CSV solo items
- Descarga archivo automática

---

#### 8.2 Importar Tarifas/Presupuestos

**Prioridad:** MEDIA | **Estimación:** 2 días | **Estado:** ⏳ Pendiente

- [ ] Server Action `importTariffs(content, format)`
- [ ] Server Action `importBudgets(content, format)`
- [ ] Validar estructura JSON
- [ ] Limpiar IDs (generar nuevos)
- [ ] Página `/app/tariffs/import/page.tsx`
- [ ] Página `/app/budgets/import/page.tsx`
- [ ] Input file + validación

**Archivos nuevos:**

- `src/app/actions/import.ts`
- `src/app/tariffs/import/page.tsx`
- `src/app/budgets/import/page.tsx`

**Criterios de completado:**

- Importar JSON válido
- IDs regenerados correctamente
- Errores manejados con mensajes claros

---

## BLOQUE 9: RESPONSIVE MOBILE-FIRST ⏳

### Tareas Altas:

#### 9.1 Listados Responsive (Cards Mobile)

**Prioridad:** ALTA | **Estimación:** 3 días | **Estado:** ⏳ Pendiente

- [ ] Componente `TariffCard.tsx` (mobile)
- [ ] Componente `BudgetCard.tsx` (mobile)
- [ ] Condicional desktop: tabla, mobile: cards
- [ ] useMediaQuery hook
- [ ] Botones/acciones adaptados a mobile
- [ ] Filtros responsive

**Archivos nuevos:**

- `src/components/tariffs/TariffCard.tsx`
- `src/components/budgets/BudgetCard.tsx`
- `src/hooks/useMediaQuery.ts`

**Archivos modificados:**

- `src/components/tariffs/TariffList.tsx`
- `src/components/budgets/BudgetList.tsx`

**Criterios de completado:**

- Desktop: tabla tradicional
- Mobile: cards verticales
- Transición suave entre breakpoints

---

#### 9.2 Formulario Presupuesto Mobile

**Prioridad:** ALTA | **Estimación:** 4 días | **Estado:** ⏳ Pendiente

- [ ] Componente `BudgetFormMobile.tsx`
- [ ] Navegación por niveles (breadcrumb)
- [ ] Stack de navegación
- [ ] Botón "Atrás"
- [ ] Cards por nivel actual
- [ ] Modal editar cantidad (partidas)
- [ ] Resumen sticky inferior
- [ ] Condicional: mobile usa BudgetFormMobile, desktop usa BudgetFormDesktop

**Archivos nuevos:**

- `src/components/budgets/BudgetFormMobile.tsx`

**Archivos modificados:**

- `src/components/budgets/BudgetHierarchyForm.tsx`

**Criterios de completado:**

- Navegación táctil fluida
- Breadcrumb funcional
- Edición cantidad fácil en móvil

---

## RESUMEN DE PRIORIDADES

### INMEDIATO (Semanas 1-2):

- ✅ Bloque 1.1-1.2: Registro y recuperación contraseña
- ✅ Bloque 2.1-2.2: user_id en tarifas + detección IVAs

### CORTO PLAZO (Semanas 3-4):

- ✅ Bloque 1.3-1.4: Perfil usuario + CRUD usuarios
- ✅ Bloque 3.1-3.2: Tabla config + selector plantillas
- ✅ Bloque 2.3: Tarifa plantilla

### MEDIO PLAZO (Semanas 5-8):

- ✅ Bloque 4: IRPF y RE completos
- ✅ Bloque 5: Versiones y notas

### LARGO PLAZO (Semanas 9-12):

- ✅ Bloque 6: Navegación unificada
- ✅ Bloque 7: Rich text editor
- ✅ Bloque 8: Import/Export
- ✅ Bloque 9: Responsive completo

---

## ESTADO GLOBAL FASE 2

**Progreso:** 31% (15/49 tareas)
**Bloques completados:** 4/9 (Usuarios ✅, Mejoras Tarifas ✅, Configuración ✅, IRPF y RE ✅)
**Semanas transcurridas:** 6/12
**Duración estimada:** 12 semanas

**Bloque activo:** Bloque 5 - Versiones y Notas
**Próximo paso:** Sistema de Versiones (5.1)

---

**Documento:** Tareas Fase 2
**Versión:** 1.0
**Fecha:** 2025-01-04
**Estado:** Activo
