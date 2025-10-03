# Tareas - Fase 2: Evolución Funcional y Multi-tenant

## MÓDULO ACTIVO: Usuarios y Autenticación

**Tareas Activas:** 0/12 (Fase 2 iniciando)

---

## BLOQUE 1: USUARIOS Y SEGURIDAD (CRÍTICO) ⏳

### Tareas Críticas:

#### 1.1 Sistema de Registro Completo

**Prioridad:** CRÍTICA | **Estimación:** 3 días | **Estado:** ⏳ Pendiente

- [ ] Crear tabla `emisores` en BD
- [ ] Migración SQL con índices
- [ ] Server Action `registerUser()`
- [ ] Página `/app/(auth)/register/page.tsx`
- [ ] Componente `RegisterForm.tsx`
- [ ] Validación Zod para registro
- [ ] Integración Supabase Auth (signup)
- [ ] Redirect automático a dashboard post-registro

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

**Prioridad:** ALTA | **Estimación:** 2 días | **Estado:** ⏳ Pendiente

- [ ] Server Action `requestPasswordReset(email)`
- [ ] Server Action `resetPassword(token, newPassword)`
- [ ] Página `/app/(auth)/forgot-password/page.tsx`
- [ ] Página `/app/(auth)/reset-password/page.tsx`
- [ ] Configurar email templates en Supabase
- [ ] Componente `PasswordResetForm.tsx`
- [ ] Validación tokens expiración

**Archivos nuevos:**

- `src/app/(auth)/forgot-password/page.tsx`
- `src/app/(auth)/reset-password/page.tsx`
- `src/components/auth/PasswordResetForm.tsx`

---

#### 1.3 Perfil de Usuario

**Prioridad:** ALTA | **Estimación:** 2 días | **Estado:** ⏳ Pendiente

- [ ] Página `/app/profile/page.tsx`
- [ ] Server Action `updateUserProfile()`
- [ ] Componente `ProfileForm.tsx`
- [ ] Editar datos fiscales emisor
- [ ] Cambiar contraseña desde perfil
- [ ] Upload avatar (opcional)

**Archivos nuevos:**

- `src/app/profile/page.tsx`
- `src/components/profile/ProfileForm.tsx`

---

#### 1.4 CRUD de Usuarios (Admin)

**Prioridad:** ALTA | **Estimación:** 3 días | **Estado:** ⏳ Pendiente

- [ ] Tabla `users` añadir campos `status`, `invited_by`, `last_login`
- [ ] Server Actions CRUD usuarios
- [ ] Página `/app/users/page.tsx` (listado)
- [ ] Página `/app/users/create/page.tsx`
- [ ] Página `/app/users/[id]/edit/page.tsx`
- [ ] Componente `UserTable.tsx`
- [ ] Componente `UserForm.tsx`
- [ ] RLS policies para usuarios
- [ ] Validación permisos por rol

**Archivos nuevos:**

- `migrations/005_users_status_fields.sql`
- `src/app/users/page.tsx`
- `src/app/users/create/page.tsx`
- `src/app/users/[id]/edit/page.tsx`
- `src/components/users/UserTable.tsx`
- `src/components/users/UserForm.tsx`
- `src/app/actions/users.ts`

**Criterios de completado:**

- Admin puede crear/editar usuarios de su empresa
- Vendedor no tiene acceso a gestión usuarios
- RLS filtra correctamente por empresa_id

---

## BLOQUE 2: MEJORAS INCREMENTALES TARIFAS ⏳

### Tareas Críticas:

#### 2.1 Campo user_id en Tarifas

**Prioridad:** ALTA | **Estimación:** 0.5 días | **Estado:** ⏳ Pendiente

- [ ] Migración SQL añadir `user_id` a `tariffs`
- [ ] Migrar datos existentes (asignar a admin)
- [ ] Modificar `createTariff()` para incluir `user_id`
- [ ] Modificar `getTariffs()` con join `users`
- [ ] Añadir columna "Creado por" en listado
- [ ] Filtro por usuario (admin/superadmin)

**Archivos modificados:**

- `migrations/006_tariffs_user_id.sql`
- `src/app/actions/tariffs.ts`
- `src/components/tariffs/TariffList.tsx`

**Criterios de completado:**

- Campo obligatorio tras migración
- Join funcional con tabla users
- Columna visible en UI

---

#### 2.2 Detección Automática IVAs en CSV

**Prioridad:** ALTA | **Estimación:** 1 día | **Estado:** ⏳ Pendiente

- [ ] Función `detectIVAsPresentes()` en csv-converter
- [ ] Migración añadir `ivas_presentes[]` a tariffs
- [ ] Modificar `createTariff()` para detectar y guardar IVAs
- [ ] Tests unitarios detección IVAs

**Archivos modificados:**

- `migrations/007_tariffs_ivas_presentes.sql`
- `src/lib/validators/csv-converter.ts`
- `src/app/actions/tariffs.ts`

**Criterios de completado:**

- IVAs detectados automáticamente al importar CSV
- Array guardado correctamente en BD
- Sin cambios UI (campo invisible)

---

#### 2.3 Tarifa por Defecto (Plantilla)

**Prioridad:** MEDIA | **Estimación:** 1.5 días | **Estado:** ⏳ Pendiente

- [ ] Migración añadir `is_template` a tariffs
- [ ] Trigger SQL `ensure_single_template()`
- [ ] Server Action `setTariffAsTemplate()`
- [ ] Server Action `getTemplateTariff()`
- [ ] Server Action `createTariffFromTemplate()`
- [ ] Checkbox "Plantilla" en listado
- [ ] Pre-cargar datos plantilla al crear tarifa

**Archivos nuevos:**

- `migrations/008_tariffs_template.sql`

**Archivos modificados:**

- `src/app/actions/tariffs.ts`
- `src/components/tariffs/TariffList.tsx`
- `src/app/tariffs/create/page.tsx`

**Criterios de completado:**

- Solo 1 tarifa puede ser plantilla (trigger)
- Datos pre-cargados excepto CSV
- Checkbox funcional en listado

---

## BLOQUE 3: TABLA DE CONFIGURACIÓN ⏳

### Tareas Críticas:

#### 3.1 Tabla Config y Helpers

**Prioridad:** ALTA | **Estimación:** 2 días | **Estado:** ⏳ Pendiente

- [ ] Crear tabla `config` en BD
- [ ] Insertar datos iniciales (IVA-RE, plantillas PDF, defaults)
- [ ] Helper `getConfigValue<T>(key)`
- [ ] Helper `setConfigValue(key, value)`
- [ ] Helpers específicos: `getIVAtoREEquivalences()`, `getPDFTemplates()`
- [ ] Server Actions config (solo superadmin)
- [ ] Página `/app/settings/page.tsx` (solo superadmin)

**Archivos nuevos:**

- `migrations/009_config_table.sql`
- `src/lib/helpers/config-helpers.ts`
- `src/app/actions/config.ts`
- `src/app/settings/page.tsx`

**Criterios de completado:**

- Tabla config poblada con datos iniciales
- Helpers funcionando correctamente
- Solo superadmin accede a settings

---

#### 3.2 Selector de Plantillas PDF

**Prioridad:** MEDIA | **Estimación:** 2 días | **Estado:** ⏳ Pendiente
**Dependencia:** 3.1 completado

- [ ] Añadir imágenes preview en `/public/templates/`
- [ ] Modificar formulario tarifa: cambiar input text por Select
- [ ] Tooltip preview al hacer hover
- [ ] Cargar plantillas desde config al montar componente
- [ ] Validar plantilla seleccionada existe

**Archivos modificados:**

- `src/components/tariffs/TariffForm.tsx`
- `public/templates/` (añadir imágenes)

**Criterios de completado:**

- Selector desplegable funcional
- Preview visible en hover
- Plantilla guardada correctamente

---

## BLOQUE 4: IRPF Y RECARGO DE EQUIVALENCIA ⏳

### Tareas Críticas:

#### 4.1 Implementación IRPF

**Prioridad:** ALTA | **Estimación:** 3 días | **Estado:** ⏳ Pendiente
**Dependencia:** Bloque 1 completado (tabla emisores)

- [ ] Campo `irpf_percentage` en tabla emisores (ya incluido)
- [ ] Helper `shouldApplyIRPF(emisor, cliente)`
- [ ] Helper `calculateIRPF(base, percentage)`
- [ ] Modificar `saveBudget()`: calcular y guardar IRPF
- [ ] Modificar formulario presupuesto: mostrar IRPF si aplica
- [ ] Tooltip explicativo IRPF
- [ ] Tests cálculo IRPF

**Archivos nuevos:**

- `src/lib/helpers/fiscal-calculations.ts`

**Archivos modificados:**

- `src/app/actions/budgets.ts`
- `src/components/budgets/BudgetForm.tsx`

**Criterios de completado:**

- IRPF se aplica solo si emisor = autónomo Y cliente = empresa|autónomo
- Cálculo correcto: base × (% IRPF / 100)
- Visible en resumen totales

---

#### 4.2 Implementación Recargo de Equivalencia

**Prioridad:** ALTA | **Estimación:** 4 días | **Estado:** ⏳ Pendiente
**Dependencia:** 3.1 (config), 2.2 (detección IVAs)

- [ ] Checkbox "Aplicar RE" en formulario cliente (solo si autónomo)
- [ ] Tabla dinámica recargos por IVA presente
- [ ] Pre-cargar valores RE desde config
- [ ] Permitir edición manual de % RE
- [ ] Helper `calculateRecargo(items, recargos)`
- [ ] Guardar en `json_budget_data.cliente.recargos`
- [ ] Guardar en `json_budget_data.totales.re`
- [ ] Tests cálculo RE

**Archivos modificados:**

- `src/lib/helpers/fiscal-calculations.ts`
- `src/components/budgets/BudgetForm.tsx`
- `src/app/actions/budgets.ts`

**Criterios de completado:**

- Checkbox visible solo si cliente = autónomo
- Tabla muestra solo IVAs de la tarifa seleccionada
- Cálculo correcto por IVA
- Datos guardados en JSON

---

#### 4.3 Modificación Payload PDF

**Prioridad:** ALTA | **Estimación:** 2 días | **Estado:** ⏳ Pendiente
**Dependencia:** 4.1, 4.2 completados

- [ ] Modificar `buildPDFPayload()`: añadir IRPF y RE a totals
- [ ] Formato correcto: IRPF negativo, RE positivo
- [ ] Cambiar "Total Presupuesto" → "Total a Pagar"
- [ ] Tests payload con IRPF/RE
- [ ] Documentar cambios para Rapid-PDF

**Archivos modificados:**

- `src/lib/helpers/pdf-payload-builder.ts`

**Estructura payload:**

```json
{
  "totals": {
    "subtotal": {...},
    "base": {...},
    "ivas": [...],
    "irpf": {...},  // nuevo
    "re": [...],    // nuevo
    "total": {...}
  }
}
```

**Criterios de completado:**

- Payload incluye IRPF si aplica
- Payload incluye RE si aplica
- Formato moneda español correcto
- Rapid-PDF renderiza correctamente

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

**Progreso:** 0% (0/49 tareas)
**Bloques completados:** 0/9
**Duración estimada:** 12 semanas

**Próximo paso:** Iniciar Bloque 1 - Registro de usuarios

---

**Documento:** Tareas Fase 2
**Versión:** 1.0
**Fecha:** 2025-01-04
**Estado:** Activo
