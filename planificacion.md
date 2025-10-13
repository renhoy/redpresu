# Planificación - Fase 2: Evolución Funcional

## FASE 2: EVOLUCIÓN Y PREPARACIÓN MULTI-TENANT (12 semanas)

**Objetivo:** Completar funcionalidades fiscales, mejorar UX, preparar arquitectura para SaaS multi-tenant

---

## Timeline General

```
Semanas 1-2:  Usuarios y Autenticación (CRÍTICO)
Semanas 3-4:  Mejoras Tarifas + Configuración
Semanas 5-6:  IRPF y Recargo de Equivalencia
Semanas 7-8:  Versiones y Notas
Semanas 9-10: Navegación Unificada + Rich Text
Semanas 11-12: Import/Export + Responsive Mobile
```

---

## SEMANA 1-2: Usuarios y Autenticación ✅

### Objetivo: Sistema completo de gestión de usuarios

**Bloque 1: Usuarios y Seguridad**

| Día  | Tarea                          | Responsable | Estado |
| ---- | ------------------------------ | ----------- | ------ |
| 1-2  | Tabla emisores + migración     | Backend     | ✅     |
| 3-4  | Página registro + validaciones | Frontend    | ✅     |
| 5-6  | Recuperación contraseña        | Full-stack  | ✅     |
| 7-8  | Perfil usuario + edición       | Frontend    | ✅     |
| 9-10 | CRUD usuarios (admin)          | Full-stack  | ✅     |

**Entregables:**

- ✅ Usuarios pueden registrarse (empresa/autónomo)
- ✅ Recuperación contraseña funcional
- ✅ Admin gestiona usuarios de su empresa
- ✅ RLS policies actualizadas

**Criterio de completado:**

- ✅ Registro desde /register funciona
- ✅ Email recuperación enviado correctamente (bypass en dev)
- ✅ CRUD usuarios con permisos por rol

**🚀 ADICIONAL COMPLETADO: Multi-Tenant Architecture**

- ✅ Tabla `empresas` creada (migration 020)
- ✅ Cada registro crea su propia empresa
- ✅ RLS policies multi-tenant en todas las tablas (migration 021)
- ✅ Aislamiento completo entre empresas
- ✅ Función helper `get_user_empresa_id()`

---

## SEMANA 3-4: Mejoras Tarifas + Configuración ✅

### Objetivo: Preparar base para funcionalidades avanzadas

**Bloque 2: Mejoras Incrementales Tarifas**

| Día | Tarea                           | Responsable | Estado |
| --- | ------------------------------- | ----------- | ------ |
| 1   | user_id en tarifas + migración  | Backend     | ✅     |
| 2   | Detección automática IVAs       | Backend     | ✅     |
| 3-4 | Tarifa plantilla (trigger + UI) | Full-stack  | ✅     |

**Bloque 3: Tabla Configuración**

| Día | Tarea                   | Responsable | Estado |
| --- | ----------------------- | ----------- | ------ |
| 5-7 | Tabla config + helpers  | Backend     | ✅     |
| 8-9 | Selector plantillas PDF | Frontend    | ✅     |
| 10  | Testing integración     | QA          | ✅     |

**Entregables:**

- ✅ Tarifas tienen creador (user_id)
- ✅ IVAs detectados automáticamente
- ✅ Tarifa plantilla pre-carga datos
- ✅ Config centralizada en BD
- ✅ Selector plantillas con preview
- ✅ Datos issuer pre-llenan nueva tarifa sin plantilla

**Criterio de completado:**

- ✅ Columna "Creado por" visible en listado
- ✅ IVAs guardados en array
- ✅ Plantilla funcional con toggle único
- ✅ Config accesible vía helpers
- ✅ Datos issuer (nombre, NIF, dirección, contacto) cargan automáticamente

---

## SEMANA 5-6: IRPF y Recargo de Equivalencia ⏳

### Objetivo: Implementar cálculos fiscales completos

**Bloque 4: IRPF y RE**

| Día | Tarea                      | Responsable | Estado |
| --- | -------------------------- | ----------- | ------ |
| 1-3 | Lógica IRPF completa       | Backend     | ⏳     |
| 4-7 | Lógica RE + tabla dinámica | Full-stack  | ⏳     |
| 8-9 | Modificar payload PDF      | Backend     | ⏳     |
| 10  | Testing cálculos fiscales  | QA          | ⏳     |

**Entregables:**

- ✅ IRPF aplicado correctamente según matriz
- ✅ RE configurable por IVA
- ✅ Totales calculados: subtotal, base, IVA, IRPF, RE, total a pagar
- ✅ Payload PDF incluye IRPF/RE
- ✅ Documentación para Rapid-PDF

**Criterio de completado:**

- IRPF visible solo si emisor=autónomo Y cliente=empresa|autónomo
- RE aplicable solo si cliente=autónomo + checkbox marcado
- Cálculos validados con casos reales
- PDF renderiza correctamente

---

## SEMANA 7-8: Versiones y Notas ⏳

### Objetivo: Trazabilidad y seguimiento comercial

**Bloque 5: Versiones y Notas**

| Día | Tarea                    | Responsable | Estado |
| --- | ------------------------ | ----------- | ------ |
| 1-3 | Sistema versiones + BD   | Backend     | ⏳     |
| 4-5 | UI timeline versiones    | Frontend    | ⏳     |
| 6-7 | Sistema notas + timeline | Full-stack  | ⏳     |
| 8-9 | Botón "Guardar versión"  | Frontend    | ⏳     |
| 10  | Testing restauración     | QA          | ⏳     |

**Entregables:**

- ✅ Versiones guardan snapshot completo
- ✅ Timeline muestra historial
- ✅ Restaurar versión antigua funcional
- ✅ Notas con timestamp automático
- ✅ Timeline notas con usuario y fecha

**Criterio de completado:**

- Versiones incrementales funcionando
- Restauración sin pérdida datos
- Notas editables solo por creador/admin
- UI intuitiva para ambas features

---

## SEMANA 9-10: Navegación Unificada + Rich Text ⏳

### Objetivo: Consistencia UX y profesionalismo

**Bloque 6: Navegación Unificada**

| Día | Tarea                            | Responsable | Estado |
| --- | -------------------------------- | ----------- | ------ |
| 1-4 | Componente HierarchicalNavigator | Frontend    | ⏳     |
| 5-6 | Migrar TariffPreview             | Frontend    | ⏳     |
| 7-8 | Migrar BudgetHierarchyForm       | Frontend    | ⏳     |

**✅ Bloque 7: Rich Text Editor - COMPLETADO**

| Día  | Tarea                        | Responsable | Estado |
| ---- | ---------------------------- | ----------- | ------ |
| 9-10 | Instalar Tiptap + componente | Frontend    | ✅ COMPLETADO     |

**Implementación (2025-01-13):**
- ✅ Componentes: RichTextEditor + RichTextEditorDialog
- ✅ Toolbar: negrita, cursiva, listas, enlaces
- ✅ Sistema completo de enlaces con tooltip y edición
- ✅ Dialog responsive (90% viewport)
- ✅ Preview HTML en campos
- ✅ Integración en 3 campos de notas
- ✅ Documentación Rapid-PDF

**Entregables:**

- ✅ Navegación consistente en toda la app
- ✅ Un elemento activo + ancestros visibles
- ✅ Estilos unificados
- ✅ Rich text editor funcional con enlaces
- ✅ HTML guardado en notas
- ✅ Preview y edición en modal

**Criterio de completado:**

- ✅ TariffPreview y BudgetForm usan mismo componente
- ✅ Navegación táctil fluida
- ✅ Editor con negrita, cursiva, listas, enlaces
- ✅ Sistema de edición robusto de enlaces
- ✅ UX profesional con dialog responsive

---

## ✅ SEMANA 11-12: Import/Export + Responsive

### Objetivo: Backup, movilidad, experiencia tablet/móvil

**✅ Bloque 8: Import/Export (COMPLETADO 2025-01-13)**

| Día | Tarea                   | Responsable | Estado |
| --- | ----------------------- | ----------- | ------ |
| 1-2 | Exportar JSON/CSV       | Backend     | ✅     |
| 3-4 | Importar con validación | Backend     | ✅     |
| 5   | UI selección múltiple   | Frontend    | ✅     |

**Implementación completada:**

- ✅ Server Actions exportTariffs() y exportBudgets()
- ✅ Helpers conversión CSV con aplanado jerárquico
- ✅ Checkboxes selección múltiple en TariffList y BudgetsTable
- ✅ Dropdown menu export con contador de seleccionados
- ✅ Server Actions importTariffs() y importBudgets()
- ✅ Validación completa estructura JSON
- ✅ Regeneración automática de IDs
- ✅ Páginas /tariffs/import y /budgets/import
- ✅ Componentes ImportTariffsForm y ImportBudgetsForm
- ✅ Instrucciones detalladas y validación archivos
- ✅ Permisos por rol (solo admin/superadmin)
- ✅ Botones "Importar" en headers de listados

**Commit:** `feat(import-export): implementar sistema completo import/export` (4b44717)

**⏳ Bloque 9: Responsive Mobile-First**

| Día  | Tarea                         | Responsable | Estado |
| ---- | ----------------------------- | ----------- | ------ |
| 6-8  | Listados responsive (cards)   | Frontend    | ⏳     |
| 9-10 | Formulario presupuesto mobile | Frontend    | ⏳     |

**Entregables:**

- ✅ Exportar tarifas/presupuestos a JSON/CSV
- ✅ Importar desde archivo con validación
- ⏳ Listados adaptativos (tabla desktop, cards mobile)
- ⏳ Formulario presupuesto con navegación por niveles en móvil
- ⏳ App completamente funcional en tablet/smartphone

**Criterio de completado Bloque 8:**

- ✅ Backup/restore funcional con export/import
- ✅ Validación exhaustiva en importación
- ✅ Limpieza de campos internos y regeneración IDs
- ✅ UI intuitiva con instrucciones detalladas

**Criterio de completado Bloque 9 (pendiente):**

- ⏳ Responsive fluido sin bugs
- ⏳ Touch-friendly en todas las pantallas
- ⏳ Testing en dispositivos reales

---

## Dependencias Críticas

```
Bloque 1 (Usuarios) ──────────┐
                              ├──> Bloque 4 (IRPF/RE)
Bloque 2 (Tarifas) ───────────┤
Bloque 3 (Config) ────────────┘

Bloque 4 (IRPF/RE) ──> Bloque 5 (Versiones)

Bloque 6 (Navegación) ──> Bloque 9 (Responsive)
```

**Regla fundamental:** No empezar siguiente bloque hasta que dependencias estén completadas

---

## Hitos de Validación

### Hito 1 (Semana 2): Sistema de Usuarios

**Validar:**

- Registro funcional para empresa y autónomo
- Admin puede gestionar usuarios de su empresa
- Recuperación contraseña operativa

### Hito 2 (Semana 4): Configuración Centralizada

**Validar:**

- Tabla config poblada y accesible
- Plantillas PDF con selector y preview
- Tarifa plantilla pre-carga datos

### Hito 3 (Semana 6): Cálculos Fiscales

**Validar:**

- IRPF calculado correctamente según matriz
- RE aplicable con valores configurables
- PDF incluye IRPF/RE en totales

### Hito 4 (Semana 8): Trazabilidad

**Validar:**

- Versiones incrementales funcionando
- Notas con timeline y permisos
- Restauración sin pérdida datos

### Hito 5 (Semana 10): UX Unificada

**Validar:**

- Navegación consistente en toda la app
- Rich text editor operativo
- Estilos coherentes

### Hito 6 (Semana 12): Mobile-Ready

**Validar:**

- App funcional en tablet/móvil
- Backup/restore operativo
- Testing en dispositivos reales

---

## Riesgos Identificados

### Riesgo 1: Complejidad IRPF/RE

**Probabilidad:** Media | **Impacto:** Alto
**Mitigación:**

- Matriz de aplicación clara y documentada
- Tests exhaustivos con casos reales
- Validación con contador antes de implementar

### Riesgo 2: Migración datos existentes

**Probabilidad:** Alta | **Impacto:** Medio
**Mitigación:**

- Scripts SQL probados en staging
- Backup antes de cada migración
- Rollback plan documentado

### Riesgo 3: Responsive complejo

**Probabilidad:** Media | **Impacto:** Medio
**Mitigación:**

- Mobile-first desde diseño
- Testing continuo en dispositivos reales
- Componentes adaptativos bien estructurados

### Riesgo 4: Cambios en Rapid-PDF

**Probabilidad:** Baja | **Impacto:** Alto
**Mitigación:**

- Documentar cambios payload claramente
- Comunicación temprana con equipo Rapid-PDF
- Plan B: renderizar HTML básico en servidor si falla

---

## Métricas de Progreso

### Semanales:

- Tareas completadas vs planificadas
- Bugs encontrados/resueltos
- Code review completados

### Por Bloque:

- % completado del bloque
- Tiempo real vs estimado
- Deuda técnica introducida

### Global Fase 2:

- **Progreso:** Tareas completadas / Total tareas
- **Bloques completados:** X / 9
- **Semanas consumidas:** X / 12
- **Calidad:** Bugs críticos pendientes

---

## Testing y QA

### Por Bloque:

- Unit tests (helpers, cálculos)
- Integration tests (Server Actions)
- E2E tests (flujos críticos)

### Testing Final (Semana 12):

- Regresión completa MVP Fase 1
- Flujos nuevos Fase 2
- Performance (carga, queries)
- Responsive (3 dispositivos mínimo)
- Accesibilidad básica

---

## Criterios de Completado Fase 2

### Funcionalidades:

- ✅ Registro usuarios completo
- ✅ CRUD usuarios operativo
- ✅ IRPF implementado y validado
- ✅ RE implementado y validado
- ✅ Versiones de presupuestos funcional
- ✅ Notas con timeline operativo
- ✅ Navegación unificada
- ✅ Rich text editor integrado
- ✅ Import/Export funcional
- ✅ Responsive completo

### Calidad:

- ✅ 0 bugs críticos
- ✅ < 5 bugs menores conocidos
- ✅ Tests unitarios > 60% coverage
- ✅ Tests E2E flujos principales
- ✅ Performance mantenida (< 3s carga)
- ✅ Documentación actualizada

### Preparación SaaS:

- ✅ Arquitectura multi-tenant preparada
- ✅ Configuración centralizada en BD
- ✅ Permisos por rol robustos
- ✅ Backup/restore operativo

---

## FASE 3 (Largo Plazo) - Preview

### Funcionalidades Fase 3:

1. **Sistema Suscripciones** (4 semanas)

   - Planes: Free, Pro, Enterprise
   - Integración Stripe
   - Límites por plan

2. **Paletas y Modo Oscuro** (2 semanas)

   - 5-6 temas predefinidos
   - Dark mode completo
   - Selector de tema

3. **Multi-tenant Completo** (3 semanas)

   - Registro público
   - Dashboard multi-empresa
   - Facturación

4. **Análisis Avanzados** (3 semanas)

   - Gráficas conversión
   - Análisis por comercial
   - Reportes PDF

5. **Notificaciones** (2 semanas)

   - Email automático
   - Recordatorios
   - Alertas configurables

6. **Integraciones** (4 semanas)
   - CRM (HubSpot, Salesforce)
   - Contabilidad (Holded, A3)
   - Calendar sync

**Duración estimada Fase 3:** 18 semanas adicionales

---

## Roadmap Visual

```
FASE 1 (COMPLETADA) ✅
├─ Semanas 1-3: SHARED (Database, Auth, Common)
├─ Semana 4: Tariff Management
├─ Semanas 5-6: Budget Creation
├─ Semana 7: PDF Generation
└─ Semana 8: Dashboard

FASE 2 (EN CURSO) ⏳ - 39% Completado
├─ Semanas 1-2: Usuarios y Seguridad ✅ + Multi-Tenant ✅
├─ Semanas 3-4: Mejoras Tarifas ✅ + Config ✅
├─ Semanas 5-6: IRPF y RE ✅
├─ Semanas 7-8: Versiones ✅ + Notas ✅
├─ Semanas 9-10: Navegación ⏳ + Rich Text ⏳
└─ Semanas 11-12: Import/Export ⏳ + Responsive ⏳

FASE 3 (PLANIFICADA) 📋
├─ Suscripciones
├─ Temas y Dark Mode
├─ Multi-tenant
├─ Analytics
├─ Notificaciones
└─ Integraciones
```

---

## Próximos Pasos Inmediatos

### ✅ Completado Recientemente (2025-01-10):

1. ✅ Arquitectura multi-tenant implementada
2. ✅ Tabla `empresas` creada con RLS
3. ✅ Registro crea empresa automáticamente
4. ✅ RLS policies actualizadas en todas las tablas
5. ✅ Función helper `get_user_empresa_id()`
6. ✅ Validación NIF global (todas las empresas)
7. ✅ Botón logout con estilo verde

### Esta Semana:

1. Testing completo flujo multi-tenant
2. Validar aislamiento entre empresas
3. Testing registro múltiples empresas
4. Comenzar Bloque 6: Navegación Unificada

### Próxima Semana:

5. Componente HierarchicalNavigator
6. Migrar TariffPreview a componente unificado
7. Migrar BudgetHierarchyForm a componente unificado
8. Rich Text Editor (Tiptap)

---

## Comunicación y Reportes

### Daily:

- Slack: update progreso diario
- Blockers identificados

### Semanal:

- Reunión review: viernes 16:00
- Demo funcionalidades completadas
- Planning próxima semana

### Por Hito (cada 2 semanas):

- Presentación stakeholders
- Validación funcionalidades
- Ajuste prioridades si necesario

---

## Recursos Necesarios

### Desarrollo:

- 1 Full-stack developer (principal)
- 0.5 Frontend specialist (responsive)
- 0.5 Backend specialist (cálculos fiscales)

### QA:

- 0.5 QA engineer (testing continuo)
- Dispositivos: 1 tablet, 2 smartphones

### Infraestructura:

- Supabase (plan actual suficiente)
- Rapid-PDF (documentar cambios)
- Email service (recuperación contraseñas)

---

---

## 🎯 Hitos Alcanzados Fase 2

### Hito 1: Sistema de Usuarios Completo ✅
- Registro, recuperación contraseña, CRUD usuarios
- **Fecha completado:** 2025-01-08

### Hito 2: Mejoras Tarifas y Configuración ✅
- user_id, detección IVAs, tarifa plantilla, tabla config
- **Fecha completado:** 2025-01-09

### Hito 3: Sistema Fiscal Completo ✅
- IRPF y Recargo de Equivalencia implementados
- **Fecha completado:** 2025-01-09

### Hito 4: Versiones y Notas de Presupuestos ✅
- Jerarquía padre-hijo con accordion
- Sistema de notas con timeline
- **Fecha completado:** 2025-01-09

### **🚀 Hito 5: Arquitectura Multi-Tenant ✅**
- **Tabla empresas + RLS multi-tenant en todas las tablas**
- **Aislamiento completo entre empresas**
- **Fecha completado:** 2025-01-10

### Hito 6: Navegación Unificada ⏳
- HierarchicalNavigator component
- **Fecha estimada:** 2025-01-17

---

**Documento:** Planificación Fase 2
**Versión:** 1.2
**Fecha:** 2025-01-13 (actualizado)
**Última actualización:** Bloque 8 Import/Export completado
**Estado:** Activo - 78% completado (7/9 bloques)
**Próxima revisión:** Fin Semana 12 (Hito 8)
